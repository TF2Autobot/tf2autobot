import Currencies from '@tf2autobot/tf2-currencies';
import SchemaManager from '@tf2autobot/tf2-schema';
import SteamID from 'steamid';
import log from '../../lib/logger';
import Bot from '../Bot';
import Pricelist, { Entry, PurchaseRecord } from '../Pricelist';
import IPricer, { GetItemPriceResponse, Item } from '../IPricer';
import { DEFAULTS } from '../Options';
import PricelistManagerCommands from '../Commands/sub-classes/PricelistManager';

const NOW = 1_800_000_000;
const THRESHOLD = 604800;
const SKU = '300;6';
const schema = { getName: () => 'Review item' } as unknown as SchemaManager.Schema;
const currency = (metal: number): Currencies => new Currencies({ keys: 0, metal });

function purchase(cost: number, age: number, quantity = 1): PurchaseRecord {
    return { quantity, pricePaid: { keys: 0, metal: cost }, timestamp: NOW - age };
}

async function fixture(
    history: PurchaseRecord[],
    mode: 'live' | 'bulk' = 'live',
    { buy = 5, sell = 10.11, marketBuy = 4, marketSell = 4.11, partial = true } = {}
) {
    const options = { ...structuredClone(DEFAULTS), enableSocket: true };
    Object.assign(options.pricelist.partialPriceUpdate, {
        enable: true,
        thresholdInSeconds: THRESHOLD,
        removeMaxRestriction: true
    });
    options.sendAlert.enable = false;
    options.discordWebhook.priceUpdate.enable = false;
    const quote: Item = {
        sku: SKU,
        source: 'fixture',
        time: NOW,
        buy: currency(marketBuy),
        sell: currency(marketSell)
    };
    let onPrice: (data: GetItemPriceResponse) => void;
    const source: IPricer = {
        getOptions: () => ({}),
        requestCheck: sku => Promise.resolve({ sku }),
        getPrice: sku => {
            if (sku === '5021;6') return Promise.resolve({ sku, time: NOW, buy: currency(60), sell: currency(60) });
            if (sku === SKU) return Promise.resolve(quote);
            return Promise.reject(new Error(`Unexpected price request: ${sku}`));
        },
        getPricelist: () => Promise.resolve({ items: [quote] }),
        isPricerConnecting: false,
        connect: () => undefined,
        shutdown: () => undefined,
        init: () => undefined,
        bindHandlePriceEvent: listener => {
            onPrice = listener;
        }
    };
    const bot = {
        options,
        inventoryManager: { getInventory: { getAmount: () => history.reduce((sum, lot) => sum + lot.quantity, 0) } },
        handler: { getBotInfo: {}, onPricelist: () => Promise.resolve() },
        sendMessage: () => undefined
    } as unknown as Bot;
    const pricelist = new Pricelist(source, schema, options, bot);
    bot.pricelist = pricelist;
    await pricelist.setupPricelist();
    const entry = Entry.fromData(
        {
            sku: SKU,
            enabled: true,
            autoprice: true,
            min: 0,
            max: 10,
            intent: 2,
            buy: currency(buy),
            sell: currency(sell),
            time: mode === 'bulk' ? NOW - 100000 : NOW - 200,
            isPartialPriced: partial,
            purchaseHistory: structuredClone(history),
            partialPriceTime: partial ? NOW - 100 : null,
            lastInStockTime: NOW - 100
        },
        schema
    );
    pricelist.setNewPricelist({ [SKU]: entry });
    pricelist.init();
    const reprice = async () => {
        if (mode === 'bulk') await pricelist.setupPricelist();
        else onPrice(quote);
    };
    return { entry, pricelist, source, bot, reprice };
}

const previousLogSilent = log.silent;
beforeAll(() => {
    log.silent = true;
});
afterAll(() => {
    log.silent = previousLogSilent;
});
beforeEach(() => jest.useFakeTimers({ now: NOW * 1000 }));
afterEach(() => jest.useRealTimers());

describe.each(['live', 'bulk'] as const)('%s PPU expiry', mode => {
    it('retains expired unsold lots and releases their price floor', async () => {
        const history = [purchase(20, THRESHOLD + 1), purchase(10, 100)];
        const { entry, reprice } = await fixture(history, mode);
        await reprice();

        expect(entry.purchaseHistory).toEqual(history);
        expect(entry.buy.toJSON()).toEqual({ keys: 0, metal: 4 });
        expect(entry.sell.toJSON()).toEqual({ keys: 0, metal: 4.11 });
        expect(entry.isPartialPriced).toBe(false);
        expect(entry.partialPriceTime).toBeNull();
    });

    it('consumes the expired lot before the younger lot on the next sale', async () => {
        const youngLot = purchase(10, 100, 2);
        const { entry, reprice } = await fixture([purchase(20, THRESHOLD + 1, 2), youngLot], mode);
        await reprice();
        entry.removePurchaseRecord(1);
        expect(entry.purchaseHistory).toEqual([purchase(20, THRESHOLD + 1, 1), youngLot]);
        entry.removePurchaseRecord(1);
        expect(entry.purchaseHistory).toEqual([youngLot]);

        expect(entry.getFIFOPurchasePrice().toJSON()).toEqual({ keys: 0, metal: 10 });
        expect(entry.getOldestPurchaseTime()).toBe(NOW - 100);
    });

    it('keeps an expired queue intact across serialization and then consumes the right lot', async () => {
        const history = [purchase(20, THRESHOLD + 1), purchase(10, 100)];
        const { entry, reprice } = await fixture(history, mode);
        await reprice();
        const saved = JSON.parse(JSON.stringify(entry)) as Parameters<typeof Entry.fromData>[0];
        const restored = Entry.fromData(saved, schema);
        restored.removePurchaseRecord(1);

        expect(restored.purchaseHistory).toEqual([history[1]]);
    });

    it('expires protection exactly at the configured threshold without deleting ownership', async () => {
        const history = [purchase(10, THRESHOLD)];
        const { entry, reprice } = await fixture(history, mode);
        await reprice();

        expect(entry.purchaseHistory).toEqual(history);
        expect(entry.sell.toJSON()).toEqual({ keys: 0, metal: 4.11 });
        expect(entry.isPartialPriced).toBe(false);
    });

    it('does not renew a timestamp-zero purchase from the newer partial activation time', async () => {
        const history = [purchase(10, NOW)];
        const { entry, reprice } = await fixture(history, mode);
        await reprice();

        expect(entry.purchaseHistory).toEqual(history);
        expect(entry.sell.toJSON()).toEqual({ keys: 0, metal: 4.11 });
        expect(entry.isPartialPriced).toBe(false);
    });

    it('still protects a purchase immediately before the threshold', async () => {
        const history = [purchase(10, THRESHOLD - 1)];
        const { entry, reprice } = await fixture(history, mode);
        await reprice();

        expect(entry.purchaseHistory).toEqual(history);
        expect(entry.sell.toJSON()).toEqual({ keys: 0, metal: 10.11 });
        expect(entry.isPartialPriced).toBe(true);
    });
});

it('releases expired partial state even when a live quote has identical numeric prices', async () => {
    const history = [purchase(10, THRESHOLD)];
    const { entry, reprice } = await fixture(history, 'live', { buy: 4, sell: 4.11 });
    await reprice();

    expect(entry.purchaseHistory).toEqual(history);
    expect(entry.isPartialPriced).toBe(false);
    expect(entry.partialPriceTime).toBeNull();
});

it('does not let recalculation restore protection from an expired oldest lot', async () => {
    const history = [purchase(20, THRESHOLD), purchase(10, 100)];
    const { entry, bot, source } = await fixture(history, 'live', { partial: false, buy: 4, sell: 4.11 });
    const recalculation = new PricelistManagerCommands(bot, source).ppuRecalcCommand(new SteamID('76561198000000000'));
    await jest.runAllTimersAsync();
    await recalculation;

    expect(entry.purchaseHistory).toEqual(history);
    expect(entry.sell.toJSON()).toEqual({ keys: 0, metal: 4.11 });
    expect(entry.isPartialPriced).toBe(false);
});
