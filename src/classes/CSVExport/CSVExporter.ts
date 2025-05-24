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
    sku: string;
    itemName: string;
    quantity: number;
    buyPrice: number;
    sellPrice: number;
    profit: number;
}

export default class CSVExport {
    private readonly boughtFilePath: string;
    private readonly tradedFilePath: string;
    private boughtRecords: UnknownDictionary<TradeRecord[]> = {};
    private tradedRecords: UnknownDictionary<TradeRecord[]> = {};

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
            this.writeCSVHeader(this.boughtFilePath);
        }
        if (!fs.existsSync(this.tradedFilePath)) {
            this.writeCSVHeader(this.tradedFilePath);
        }

        // Load existing records
        this.loadRecords();
    }

    private writeCSVHeader(filePath: string): void {
        const header = 'Timestamp,TradeID,PartnerSteamID,PartnerName,SKU,ItemName,Quantity,BuyPrice,SellPrice,Profit\n';
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

            const [
                timestamp,
                tradeId,
                partnerSteamId,
                partnerName,
                sku,
                itemName,
                quantity,
                buyPrice,
                sellPrice,
                profit
            ] = line.split(',');

            if (!records[sku]) {
                records[sku] = [];
            }

            records[sku].push({
                timestamp: parseInt(timestamp),
                tradeId,
                partnerSteamId,
                partnerName,
                sku,
                itemName,
                quantity: parseInt(quantity),
                buyPrice: parseFloat(buyPrice),
                sellPrice: parseFloat(sellPrice),
                profit: parseFloat(profit)
            });
        }

        return records;
    }

    private appendToCSV(filePath: string, record: TradeRecord): void {
        const line = `${record.timestamp},${record.tradeId},${record.partnerSteamId},${record.partnerName},${record.sku},${record.itemName},${record.quantity},${record.buyPrice},${record.sellPrice},${record.profit}\n`;
        fs.appendFileSync(filePath, line);
    }

    public onTradeAccepted(offer: TradeOffer): void {
        const timestamp = Date.now();
        const tradeId = offer.id;
        const partnerSteamId = offer.partner.getSteamID64();
        const partnerName = this.bot.friends.getFriend(partnerSteamId)?.player_name || 'Unknown';
        const keyPrice = this.bot.pricelist.getKeyPrice.metal;

        // Get the offer data
        const offerData = offer.data('dict') as UnknownDictionary<{
            our: UnknownDictionary<number | { amount: number }>;
            their: UnknownDictionary<number | { amount: number }>;
        }>;
        const prices = offer.data('prices') as UnknownDictionary<{
            buy: { toValue: (keyPrice: number) => number };
            sell: { toValue: (keyPrice: number) => number };
        }>;

        // Process items we bought
        for (const sku in offerData.their) {
            if (!Object.prototype.hasOwnProperty.call(offerData.their, sku)) continue;

            const itemCount =
                typeof offerData.their[sku] === 'object'
                    ? (offerData.their[sku]['amount'] as number)
                    : offerData.their[sku];

            if (!prices || !prices[sku]) continue;

            const itemName = this.bot.schema.getName(SKU.fromString(sku), false);
            const buyPrice = prices[sku].buy.toValue(keyPrice);
            const sellPrice = prices[sku].sell.toValue(keyPrice);
            const profit = 0; // No profit yet since we just bought it

            const record: TradeRecord = {
                timestamp,
                tradeId,
                partnerSteamId,
                partnerName,
                sku,
                itemName,
                quantity: itemCount,
                buyPrice,
                sellPrice,
                profit
            };

            // Add to bought records
            if (!this.boughtRecords[sku]) {
                this.boughtRecords[sku] = [];
            }
            this.boughtRecords[sku].push(record);
            this.appendToCSV(this.boughtFilePath, record);
        }

        // Process items we sold
        for (const sku in offerData.our) {
            if (!Object.prototype.hasOwnProperty.call(offerData.our, sku)) continue;

            const itemCount =
                typeof offerData.our[sku] === 'object' ? (offerData.our[sku]['amount'] as number) : offerData.our[sku];

            if (!prices || !prices[sku]) continue;

            const itemName = this.bot.schema.getName(SKU.fromString(sku), false);
            const sellPrice = prices[sku].sell.toValue(keyPrice);

            // Find matching bought record
            let buyPrice = 0;
            let profit = 0;

            if (this.boughtRecords[sku] && this.boughtRecords[sku].length > 0) {
                // Use FIFO (First In, First Out) method
                const boughtRecord = this.boughtRecords[sku].shift();
                if (boughtRecord) {
                    buyPrice = boughtRecord.buyPrice;
                    profit = sellPrice - buyPrice;

                    // Remove the sold item from bought.csv
                    this.removeFromCSV(this.boughtFilePath, boughtRecord);
                }
            }

            const record: TradeRecord = {
                timestamp,
                tradeId,
                partnerSteamId,
                partnerName,
                sku,
                itemName,
                quantity: itemCount,
                buyPrice,
                sellPrice,
                profit
            };

            // Add to traded records
            if (!this.tradedRecords[sku]) {
                this.tradedRecords[sku] = [];
            }
            this.tradedRecords[sku].push(record);
            this.appendToCSV(this.tradedFilePath, record);
        }
    }

    private removeFromCSV(filePath: string, record: TradeRecord): void {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            const header = lines[0];
            const dataLines = lines.slice(1);

            // Find and remove the matching record
            const updatedLines = dataLines.filter(line => {
                if (!line.trim()) return true;
                const [timestamp, tradeId] = line.split(',');
                return !(timestamp === record.timestamp.toString() && tradeId === record.tradeId);
            });

            // Write back to file
            fs.writeFileSync(filePath, header + '\n' + updatedLines.join('\n'));
        } catch (err) {
            log.error('Failed to remove record from CSV:', err);
        }
    }
}
