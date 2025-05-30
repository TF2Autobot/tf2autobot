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
                enabled: true,
                buy: new Currencies({ keys: 2, metal: 10 }), // Buying price: 2 keys + 10 ref
                sell: new Currencies({ keys: 3, metal: 5 }) // Selling price: 3 keys + 5 ref
            };
        }
    };
}

// Mock TradeOffer class for manual trades
class MockManualTradeOffer {
    id: string;
    partner: { getSteamID64: () => string };
    itemsToGive: any[];
    itemsToReceive: any[];

    constructor(id: string, partnerSteamId: string, ourItems: any[], theirItems: any[]) {
        this.id = id;
        this.partner = {
            getSteamID64: () => partnerSteamId
        };
        this.itemsToGive = ourItems;
        this.itemsToReceive = theirItems;
    }
}

// Test function
async function testManualTrade() {
    console.log('Starting Manual Trade Test...');

    // Create mock bot instance
    const mockBot = new MockBot() as unknown as Bot;

    // Create CSVExporter instance
    const csvExporter = new CSVExport(mockBot);

    // Test data - Create mock items with real-like properties
    const mockItems = {
        // Strange Specialized Killstreak Rocket Launcher
        rocketLauncher: {
            defindex: 205,
            quality: 11,
            craftable: true,
            tradable: true,
            killstreak: 3,
            australium: false,
            effect: null,
            festive: false,
            paintkit: null,
            wear: null,
            quality2: null,
            target: null,
            craftnumber: null,
            crateseries: null,
            output: null,
            outputQuality: null,
            paint: null
        },
        // Strange Specialized Killstreak Scattergun
        scattergun: {
            defindex: 200,
            quality: 11,
            craftable: true,
            tradable: true,
            killstreak: 3,
            australium: false,
            effect: null,
            festive: false,
            paintkit: null,
            wear: null,
            quality2: null,
            target: null,
            craftnumber: null,
            crateseries: null,
            output: null,
            outputQuality: null,
            paint: null
        }
    };

    // Test trades
    const testTrades = [
        // Trade 1: Buy a Strange Specialized Killstreak Rocket Launcher
        new MockManualTradeOffer(
            'manual_trade1',
            '76561198123456789',
            [], // our items
            [mockItems.rocketLauncher] // their items
        ),
        // Trade 2: Buy a Strange Specialized Killstreak Scattergun
        new MockManualTradeOffer(
            'manual_trade2',
            '76561198987654321',
            [], // our items
            [mockItems.scattergun] // their items
        ),
        // Trade 3: Sell the Rocket Launcher
        new MockManualTradeOffer(
            'manual_trade3',
            '76561198765432198',
            [mockItems.rocketLauncher], // our items
            [] // their items
        )
    ];

    // Process each trade
    for (const trade of testTrades) {
        console.log(`\nProcessing manual trade ${trade.id}...`);
        await csvExporter.onTradeAccepted(trade as unknown as TradeOffer);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\nManual Trade Test completed!');
    console.log('Check the files/bought.csv and files/traded.csv files for results.');
}

// Run the test
testManualTrade().catch(console.error);
