import Bot from '../classes/Bot';
import CSVExport from '../classes/CSVExport/CSVExporter';
import { TradeOffer } from '@tf2autobot/tradeoffer-manager';
import Currencies from '@tf2autobot/tf2-currencies';
import SKU from '@tf2autobot/tf2-sku';

// Mock Bot class
class MockBot {
    schema = {
        getName: (sku: any, properName: boolean) => {
            return 'Test Item';
        }
    };
    friends = {
        getFriend: (steamId: string) => {
            return { player_name: 'Test User' };
        }
    };
    pricelist = {
        getKeyPrice: {
            metal: 90 // 90 ref for a key
        },
        getPriceBySkuOrAsset: ({ priceKey }: { priceKey: string }) => {
            return {
                custom_name: `Custom ${priceKey}`,
                enabled: true
            };
        }
    };
}

// Mock TradeOffer class
class MockTradeOffer {
    id: string;
    partner: { getSteamID64: () => string };
    data: (key: string, value?: any) => any;

    constructor(id: string, partnerSteamId: string, ourItems: any, theirItems: any) {
        this.id = id;
        this.partner = {
            getSteamID64: () => partnerSteamId
        };
        this.data = (key: string, value?: any) => {
            if (key === 'dict') {
                return {
                    our: ourItems,
                    their: theirItems
                };
            } else if (key === 'prices') {
                return this.generatePrices(ourItems, theirItems);
            }
            return null;
        };
    }

    private generatePrices(ourItems: any, theirItems: any) {
        const prices: any = {};

        // Generate prices for our items (selling)
        for (const sku in ourItems) {
            prices[sku] = {
                buy: new Currencies({ keys: 2, metal: 10 }), // Buying price: 2 keys + 10 ref
                sell: new Currencies({ keys: 3, metal: 5 }) // Selling price: 3 keys + 5 ref
            };
        }

        // Generate prices for their items (buying)
        for (const sku in theirItems) {
            prices[sku] = {
                buy: new Currencies({ keys: 2, metal: 10 }), // Buying price: 2 keys + 10 ref
                sell: new Currencies({ keys: 3, metal: 5 }) // Selling price: 3 keys + 5 ref
            };
        }

        return prices;
    }
}

// Test function
async function testCSVExporter() {
    console.log('Starting CSVExporter test...');

    // Create mock bot instance
    const mockBot = new MockBot() as unknown as Bot;

    // Create CSVExporter instance
    const csvExporter = new CSVExport(mockBot);

    // Test data
    const testTrades = [
        // Trade 1: Buy a Strange Specialized Killstreak Rocket Launcher for 2 keys + 10 ref
        new MockTradeOffer(
            'trade1',
            '76561198123456789',
            {}, // our items
            {
                '205;11;kt-3;strange': 1 // Strange Specialized Killstreak Rocket Launcher
            }
        ),
        // Trade 2: Sell the same item for 3 keys + 5 ref
        new MockTradeOffer(
            'trade2',
            '76561198987654321',
            {
                '205;11;kt-3;strange': 1 // Strange Specialized Killstreak Rocket Launcher
            },
            {} // their items
        )
    ];

    // Process each trade
    for (const trade of testTrades) {
        console.log(`\nProcessing trade ${trade.id}...`);
        await csvExporter.onTradeAccepted(trade as unknown as TradeOffer);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\nTest completed!');
    console.log('Check the files/bought.csv and files/traded.csv files for results.');
}

// Run the test
testCSVExporter().catch(console.error);
