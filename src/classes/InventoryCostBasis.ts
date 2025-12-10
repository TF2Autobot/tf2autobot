import Bot from './Bot';
import { promises as fs } from 'fs';
import path from 'path';
import log from '../lib/logger';

const CURRENT_DIFF_VERSION = 2;

/**
 * FIFO entry for tracking item cost basis with distributed overpay/underpay
 */
export interface FIFOEntry {
    sku: string;
    costKeys: number;
    costMetal: number;
    diffKeys: number; // Distributed (actual - pricelist) delta in keys, negative means we underpaid
    diffMetal: number; // Distributed (actual - pricelist) delta in refined, negative means we underpaid
    tradeId: string;
    timestamp: number;
    diffVersion?: number;
}

/**
 * Manages inventory cost basis using FIFO (First In, First Out) accounting
 * Tracks pricelist costs with distributed overpay/underpay for accurate profit calculation
 */
export default class InventoryCostBasis {
    private readonly bot: Bot;

    private fifoEntries: FIFOEntry[] = [];

    private readonly filePath: string;

    constructor(bot: Bot) {
        this.bot = bot;
        // Use proper files directory path (files/{steamAccountName}/costBasis.json)
        this.filePath = path.join(
            __dirname,
            '../../files',
            this.bot.options.steamAccountName || 'unknown',
            'costBasis.json'
        );
    }

    /**
     * Load FIFO entries from disk
     */
    async load(): Promise<void> {
        try {
            const data = await fs.readFile(this.filePath, 'utf8');
            const rawEntries = JSON.parse(data);
            let needsMigrationSave = false;

            // Migrate old entries that have single 'diff' field to new diffKeys/diffMetal fields
            this.fifoEntries = rawEntries.map((entry: any) => {
                let normalizedEntry = entry;

                if ('diff' in normalizedEntry && !('diffKeys' in normalizedEntry)) {
                    // Very old format: convert single diff (metal) to new format
                    normalizedEntry = {
                        ...normalizedEntry,
                        diffKeys: 0,
                        diffMetal: normalizedEntry.diff
                    };
                    needsMigrationSave = true;
                }

                if (normalizedEntry.diffVersion !== CURRENT_DIFF_VERSION) {
                    // Version 1 had the sign backwards (pricelist - actual); flip it to match spec (actual - pricelist)
                    normalizedEntry = {
                        ...normalizedEntry,
                        diffKeys: -(normalizedEntry.diffKeys ?? 0),
                        diffMetal: -(normalizedEntry.diffMetal ?? 0),
                        diffVersion: CURRENT_DIFF_VERSION
                    };
                    needsMigrationSave = true;
                }

                return normalizedEntry;
            });

            if (needsMigrationSave) {
                await this.save();
            }

            log.debug(`Loaded ${this.fifoEntries.length} FIFO entries from ${this.filePath}`);
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
                log.debug('No existing cost basis file found, starting fresh');
                this.fifoEntries = [];
            } else {
                log.error('Failed to load cost basis:', err);
                throw err;
            }
        }
    }

    /**
     * Save FIFO entries to disk
     */
    private async save(): Promise<void> {
        try {
            const dir = path.dirname(this.filePath);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(this.filePath, JSON.stringify(this.fifoEntries, null, 2), 'utf8');
            log.debug(`Saved ${this.fifoEntries.length} FIFO entries to ${this.filePath}`);
        } catch (err) {
            log.error('Failed to save cost basis:', err);
            throw err;
        }
    }

    /**
     * Add an item to FIFO inventory
     * @param sku Item SKU
     * @param costKeys Pricelist cost in keys at time of purchase
     * @param costMetal Pricelist cost in metal at time of purchase
     * @param diffKeys Distributed overpay/underpay in keys from multi-item trade
     * @param diffMetal Distributed overpay/underpay in refined from multi-item trade
     * @param tradeId Trade offer ID
     */
    async addItem(
        sku: string,
        costKeys: number,
        costMetal: number,
        diffKeys: number,
        diffMetal: number,
        tradeId: string
    ): Promise<void> {
        const entry: FIFOEntry = {
            sku,
            costKeys,
            costMetal,
            diffKeys,
            diffMetal,
            tradeId,
            timestamp: Date.now(),
            diffVersion: CURRENT_DIFF_VERSION
        };

        this.fifoEntries.push(entry);
        await this.save();

        log.debug(
            `Added FIFO entry: ${sku} @ ${costKeys}k ${costMetal}r (diff: ${diffKeys}k ${diffMetal}r) [${tradeId}]`
        );
    }

    /**
     * Remove items from FIFO inventory (oldest first)
     * Fallback to pricelist if entries are missing (shouldn't happen but handles edge cases)
     * @param sku Item SKU
     * @param quantity Number of items to remove
     * @param fallbackBuyPrice Optional pricelist buy price for fallback (if FIFO missing)
     * @returns Object with removed entries and flag indicating if estimates were used
     */
    async removeItem(
        sku: string,
        quantity: number,
        fallbackBuyPrice?: { keys: number; metal: number }
    ): Promise<{ entries: FIFOEntry[]; hasEstimates: boolean }> {
        const removed: FIFOEntry[] = [];
        let remaining = quantity;
        let hasEstimates = false;

        // Find and remove entries for this SKU (FIFO order)
        while (remaining > 0) {
            const index = this.fifoEntries.findIndex(entry => entry.sku === sku);

            if (index === -1) {
                // FIFO entry missing - use fallback if available
                if (fallbackBuyPrice) {
                    log.warn(
                        `FIFO entry not found for ${sku}. Using pricelist fallback for ${remaining} items (ESTIMATE).`
                    );

                    // Create synthetic FIFO entries from pricelist (one per remaining item)
                    for (let i = 0; i < remaining; i++) {
                        const syntheticEntry: FIFOEntry = {
                            sku,
                            costKeys: fallbackBuyPrice.keys,
                            costMetal: fallbackBuyPrice.metal,
                            diffKeys: 0,
                            diffMetal: 0,
                            tradeId: 'ESTIMATE',
                            timestamp: Date.now(),
                            diffVersion: CURRENT_DIFF_VERSION
                        };
                        removed.push(syntheticEntry);
                    }
                    hasEstimates = true;
                    remaining = 0; // All items accounted for via fallback
                } else {
                    log.error(
                        `FIFO entry not found for ${sku} and no fallback price provided. ${remaining} items missing!`
                    );
                }
                break;
            }

            const entry = this.fifoEntries.splice(index, 1)[0];
            removed.push(entry);
            remaining--;
        }

        if (removed.length > 0 && !hasEstimates) {
            // Only save if we actually removed real entries (not just estimates)
            await this.save();
            log.debug(`Removed ${removed.length} FIFO entries for ${sku}`);
        }

        return { entries: removed, hasEstimates };
    }

    /**
     * Get the current FIFO cost for an item (without removing it)
     * @param sku Item SKU
     * @returns First FIFO entry for this SKU, or null if not found
     */
    peekItem(sku: string): FIFOEntry | null {
        return this.fifoEntries.find(entry => entry.sku === sku) || null;
    }

    /**
     * Get the count of items in FIFO for a specific SKU
     * @param sku Item SKU
     * @returns Number of entries
     */
    getItemCount(sku: string): number {
        return this.fifoEntries.filter(entry => entry.sku === sku).length;
    }

    /**
     * Get total inventory value (unrealized cost basis)
     * @returns Total cost basis in keys and metal
     */
    getInventoryValue(): { keys: number; metal: number } {
        let totalKeys = 0;
        let totalMetal = 0;

        for (const entry of this.fifoEntries) {
            // Actual cost basis = pricelist cost minus distributed diff (positive diff means we paid less)
            totalKeys += entry.costKeys - entry.diffKeys;
            totalMetal += entry.costMetal - entry.diffMetal;
        }

        return { keys: totalKeys, metal: totalMetal };
    }

    /**
     * Get all FIFO entries (for debugging/inspection)
     */
    getAllEntries(): FIFOEntry[] {
        return [...this.fifoEntries];
    }

    /**
     * Clear all FIFO entries (use with caution!)
     */
    async clear(): Promise<void> {
        this.fifoEntries = [];
        await this.save();
        log.warn('Cleared all FIFO entries');
    }
}
