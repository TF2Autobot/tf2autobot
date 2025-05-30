import fs from 'fs';
import path from 'path';
import Bot from '../Bot';
import log from '../../lib/logger';
import SKU from '@tf2autobot/tf2-sku';
import { UnknownDictionary } from '../../types/common';
import { TradeOffer } from '@tf2autobot/tradeoffer-manager';

interface TradeRecord {
    timestamp: number;
    tradeId: string;
    partnerSteamId: string;
    partnerName: string;
    k_r_ratio: string;
    sku: string;
    itemName: string;
    buyPrice: string;
    sellPrice: string;
    custom_name?: string;
}

export default class CSVExport {
    private readonly boughtFilePath: string;
    private readonly tradedFilePath: string;
    private boughtRecords: UnknownDictionary<TradeRecord[]> = {};
    private tradedRecords: UnknownDictionary<TradeRecord[]> = {};
    private writeQueue: Promise<void> = Promise.resolve();
    private readonly writeLock: { [key: string]: boolean } = {};

    constructor(private bot: Bot) {
        // Ensure the files directory exists
        const filesDir = path.join(process.cwd(), 'files');
        if (!fs.existsSync(filesDir)) {
            fs.mkdirSync(filesDir, { recursive: true });
        }

        this.boughtFilePath = path.join(filesDir, 'bought.csv');
        this.tradedFilePath = path.join(filesDir, 'traded.csv');

        // Create files if they don't exist
        if (!fs.existsSync(this.boughtFilePath)) {
            this.writeCSVHeader(this.boughtFilePath, false);
        }
        if (!fs.existsSync(this.tradedFilePath)) {
            this.writeCSVHeader(this.tradedFilePath, true);
        }

        // Load existing records
        this.loadRecords();
    }

    private writeCSVHeader(filePath: string, isSales: boolean = false): void {
        const header = isSales
            ? 'buy_date,trade_id,custom_name,cost_k,cost_r,k/r_ratio,seller steamid64,original name (backpack.tf one),sku,sell_date,trade_id,custom_name,k/r_ratio,cost_k,cost_r,buyer steamid64,original name (backpack.tf one),sku\n'
            : 'buy_date,trade_id,custom_name,cost_k,cost_r,k/r_ratio,seller steamid64,original name (backpack.tf one),sku\n';
        fs.writeFileSync(filePath, header);
    }

    private loadRecords(): void {
        try {
            // Load bought records
            if (fs.existsSync(this.boughtFilePath)) {
                const boughtContent = fs.readFileSync(this.boughtFilePath, 'utf8');
                const boughtLines = boughtContent.split('\n').slice(1); // Skip header
                this.boughtRecords = this.parseCSVRecords(boughtLines);
            }

            // Load traded records
            if (fs.existsSync(this.tradedFilePath)) {
                const tradedContent = fs.readFileSync(this.tradedFilePath, 'utf8');
                const tradedLines = tradedContent.split('\n').slice(1); // Skip header
                this.tradedRecords = this.parseCSVRecords(tradedLines);
            }
        } catch (err) {
            log.error('Failed to load CSV records:', err);
        }
    }

    private parseCSVRecords(lines: string[]): UnknownDictionary<TradeRecord[]> {
        const records: UnknownDictionary<TradeRecord[]> = {};

        for (const line of lines) {
            if (!line.trim()) continue;

            const [buy_date, trade_id, custom_name, cost_k, cost_r, k_r_ratio, seller_steamid64, original_name, sku] =
                line.split(',');

            if (!records[sku]) {
                records[sku] = [];
            }

            const record: TradeRecord = {
                timestamp: new Date(buy_date).getTime(),
                tradeId: trade_id,
                partnerSteamId: seller_steamid64,
                k_r_ratio: k_r_ratio,
                partnerName: 'Unknown',
                sku,
                itemName: original_name,
                buyPrice: `${cost_k} key ${cost_r} ref`,
                sellPrice: '',
                custom_name
            };

            records[sku].push(record);
        }

        return records;
    }

    private async removeFromCSV(filePath: string, record: TradeRecord): Promise<void> {
        // Add to write queue
        this.writeQueue = this.writeQueue.then(async () => {
            // Wait for any existing write operation to complete
            while (this.writeLock[filePath]) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            try {
                this.writeLock[filePath] = true;
                const content = await fs.promises.readFile(filePath, 'utf8');
                const lines = content.split('\n');
                const header = lines[0];
                const dataLines = lines.slice(1);

                // Find and remove the matching record by both tradeID and SKU
                const updatedLines = dataLines.filter(line => {
                    if (!line.trim()) return true;
                    const [, trade_id, , , , , , , sku] = line.split(',');
                    return !(trade_id === record.tradeId && sku === record.sku);
                });

                // Write back to file
                await fs.promises.writeFile(filePath, header + '\n' + updatedLines.join('\n'));
            } finally {
                this.writeLock[filePath] = false;
            }
        });
    }

    private getCustomName(sku: string): string {
        const entry = this.bot.pricelist.getPriceBySkuOrAsset({ priceKey: sku, onlyEnabled: false });
        if (entry && entry.custom_name) {
            return entry.custom_name;
        }
        return sku;
    }

    private static parseCurrenciesString(str: string): { keys: string; metal: string } {
        let keys = '0';
        let metal = '0';
        if (str.includes('key')) {
            const match = str.match(/([0-9.]+) key/);
            if (match) keys = match[1];
        }
        if (str.includes('ref')) {
            const match = str.match(/([0-9.]+) ref/);
            if (match) metal = match[1];
        }
        return { keys, metal };
    }

    private convertEconItemToSKUObject(item: any): any {
        return {
            defindex: item.defindex,
            quality: item.quality,
            craftable: item.craftable,
            tradable: item.tradable,
            killstreak: item.killstreak,
            australium: item.australium,
            effect: item.effect,
            festive: item.festive,
            paintkit: item.paintkit,
            wear: item.wear,
            quality2: item.quality2,
            target: item.target,
            craftnumber: item.craftnumber,
            crateseries: item.crateseries,
            output: item.output,
            outputQuality: item.outputQuality,
            paint: item.paint
        };
    }

    public async onTradeAccepted(offer: TradeOffer): Promise<void> {
        const timestamp = Date.now();
        const tradeId = offer.id;
        const partnerSteamId = offer.partner.getSteamID64();
        const partnerName = this.bot.friends.getFriend(partnerSteamId)?.player_name || 'Unknown';
        const keyPrice = this.bot.pricelist.getKeyPrice.metal;

        // Get items from the trade
        const ourItems = offer.itemsToGive || [];
        const theirItems = offer.itemsToReceive || [];

        // Process items we received (purchases)
        for (const item of theirItems) {
            if (!item) continue;

            const skuObject = this.convertEconItemToSKUObject(item);
            const sku = SKU.fromObject(skuObject);
            if (!sku) continue;

            const price = this.bot.pricelist.getPriceBySkuOrAsset({ priceKey: sku, onlyEnabled: false });
            if (!price) continue;

            const itemName = this.bot.schema.getName(SKU.fromString(sku), false);
            const buyPrice = price.buy.toString();
            const { keys: cost_k, metal: cost_r } = CSVExport.parseCurrenciesString(buyPrice);
            const custom_name = this.getCustomName(sku);
            const buy_date = new Date(timestamp).toISOString();

            const row = `${buy_date},${tradeId},${custom_name},${cost_k},${cost_r},${keyPrice},${partnerSteamId},${itemName},${sku}\n`;
            await fs.promises.appendFile(this.boughtFilePath, row);

            if (!this.boughtRecords[sku]) {
                this.boughtRecords[sku] = [];
            }
            this.boughtRecords[sku].push({
                timestamp: timestamp,
                tradeId,
                partnerSteamId,
                partnerName,
                k_r_ratio: `${keyPrice}`,
                sku,
                itemName,
                buyPrice,
                sellPrice: '',
                custom_name
            });
        }

        // Process items we gave (sales)
        for (const item of ourItems) {
            if (!item) continue;

            const skuObject = this.convertEconItemToSKUObject(item);
            const sku = SKU.fromObject(skuObject);
            if (!sku) continue;

            const price = this.bot.pricelist.getPriceBySkuOrAsset({ priceKey: sku, onlyEnabled: false });
            if (!price) continue;

            const itemName = this.bot.schema.getName(SKU.fromString(sku), false);
            const sellPrice = price.sell.toString();
            const { keys: cost_k, metal: cost_r } = CSVExport.parseCurrenciesString(sellPrice);
            const custom_name = this.getCustomName(sku);
            const sell_date = new Date(timestamp).toISOString();

            // Find matching bought record
            let buyRow = '';
            if (this.boughtRecords[sku] && this.boughtRecords[sku].length > 0) {
                const boughtRecord = this.boughtRecords[sku].shift();
                if (boughtRecord) {
                    await this.removeFromCSV(this.boughtFilePath, boughtRecord);
                    const { keys: buy_cost_k, metal: buy_cost_r } = CSVExport.parseCurrenciesString(
                        boughtRecord.buyPrice
                    );
                    buyRow = `${new Date(boughtRecord.timestamp).toISOString()},${boughtRecord.tradeId},${
                        boughtRecord.custom_name || this.getCustomName(sku)
                    },${buy_cost_k},${buy_cost_r},${keyPrice},${boughtRecord.partnerSteamId},${
                        boughtRecord.itemName
                    },${sku}`;
                }
            }

            const sellRow = `${sell_date},${tradeId},${custom_name},${keyPrice},${cost_k},${cost_r},${partnerSteamId},${itemName},${sku}`;
            const row = `${buyRow},${sellRow}\n`;
            await fs.promises.appendFile(this.tradedFilePath, row);
        }
    }
}
