import Currencies from '@tf2autobot/tf2-currencies';
import SchemaManager from '@tf2autobot/tf2-schema';
import { TradeOffer, ItemsDict } from '@tf2autobot/tradeoffer-manager';
import SteamID from 'steamid';
import Bot from '../Bot';
import Pricelist, { Entry, PurchaseRecord } from '../Pricelist';
import IPricer, { GetItemPriceResponse, Item } from '../IPricer';
import { DEFAULTS } from '../Options';
import updateListings from '../MyHandler/offer/accepted/updateListings';
import MyHandler from '../MyHandler/MyHandler';
import getDiff from '../../lib/extend/offer/getDiff';
import log from '../../lib/logger';

const NOW = 1_800_000_000;
const SKU = '300;6';
const schema = { getName: () => 'Review item', checkExistence: () => true } as unknown as SchemaManager.Schema;
const money = (metal: number): Currencies => new Currencies({ keys: 0, metal });
const lot = (metal: number, quantity = 1, age = 100): PurchaseRecord => ({
    quantity,
    pricePaid: { keys: 0, metal },
    timestamp: NOW - age
});

type QuotePath = 'live' | 'bulk' | 'lookup' | 'add' | 'none';

async function fixture(
    history: PurchaseRecord[],
    quotePath: QuotePath = 'live',
    { marketSell = 4.11, initialSell = 10.11, partial = true } = {}
) {
    const options = { ...structuredClone(DEFAULTS), enableSocket: true };
    Object.assign(options.pricelist.partialPriceUpdate, { enable: true, removeMaxRestriction: true });
    options.sendAlert.enable = false;
    options.discordWebhook.priceUpdate.enable = false;
    options.miscSettings.pricecheckAfterTrade.enable = false;
    options.pricelist.autoAddPaintedItems.enable = false;
    options.pricelist.autoRemoveIntentSell.enable = false;
    const quote: Item = { sku: SKU, source: 'fixture', time: NOW, buy: money(4), sell: money(marketSell) };
    let listener: (price: GetItemPriceResponse) => void;
    const source: IPricer = {
        getOptions: () => ({}),
        requestCheck: () => Promise.reject(new Error('Post-trade pricechecks must not be required')),
        getPrice: sku => {
            if (sku === '5021;6') return Promise.resolve({ sku, time: NOW, buy: money(60), sell: money(60) });
            if (sku === SKU) return Promise.resolve(quote);
            return Promise.reject(new Error(`Unexpected price request: ${sku}`));
        },
        getPricelist: () => Promise.resolve({ items: [quote] }),
        isPricerConnecting: false,
        connect: () => undefined,
        shutdown: () => undefined,
        init: () => undefined,
        bindHandlePriceEvent: onPrice => {
            listener = onPrice;
        }
    };
    let stock = history.reduce((sum, record) => sum + record.quantity, 0);
    const listingQuotes: { priceKey: string; metal: number }[] = [];
    const bot = {
        options,
        listings: {
            checkByPriceKey: ({ priceKey, data }: { priceKey: string; data: Entry }) => {
                listingQuotes.push({ priceKey, metal: data.sell.metal });
            }
        },
        schema,
        isAdmin: () => false,
        craftWeapons: [],
        uncraftWeapons: [],
        handler: { getBotInfo: {} },
        inventoryManager: { getInventory: { getAmount: () => stock } }
    } as unknown as Bot;
    const pricelist = new Pricelist(source, schema, options, bot);
    bot.pricelist = pricelist;
    await pricelist.setupPricelist();
    let entry = Entry.fromData(
        {
            sku: SKU,
            enabled: true,
            autoprice: true,
            min: 0,
            max: 10,
            intent: 2,
            buy: money(4),
            sell: money(initialSell),
            time: quotePath === 'bulk' ? NOW - 100000 : NOW - 200,
            isPartialPriced: partial,
            purchaseHistory: structuredClone(history),
            partialPriceTime: partial ? NOW - 100 : null,
            lastInStockTime: NOW - 100
        },
        schema
    );
    if (quotePath === 'add') {
        const entryData = { ...entry.getJSON(), isPartialPriced: false };
        delete entryData.time;
        entry = await pricelist.addPrice({ entryData, emitChange: false });
        entry.sell = money(initialSell);
        entry.isPartialPriced = partial;
        entry.partialPriceTime = partial ? NOW - 100 : null;
    } else {
        pricelist.setNewPricelist({ [SKU]: entry });
    }
    pricelist.init();
    if (quotePath === 'live') listener(quote);
    if (quotePath === 'bulk') await pricelist.setupPricelist();
    if (quotePath === 'lookup') await pricelist.getItemPrices(SKU);
    const changes: number[] = [];
    const snapshots: string[] = [];
    pricelist.on('price', (priceKey: string, changed: Entry) => {
        changes.push(changed.sell.metal);
        MyHandler.prototype.onPriceChange.call({ bot } as MyHandler, priceKey, changed);
    });
    pricelist.on('pricelist', prices => snapshots.push(JSON.stringify(prices)));
    const sell = (quantity = 1) => {
        stock -= quantity;
        const dict: ItemsDict = { our: { [SKU]: quantity }, their: {} };
        const offer = {
            partner: new SteamID('76561198000000000'),
            data: (key: string) => (key === 'dict' ? dict : undefined)
        } as unknown as TradeOffer;
        offer.getDiff = () => getDiff.call(offer);
        updateListings(offer, bot, { isDisableSKU: [], theirItems: [], items: {} });
    };
    return { entry, pricelist, source, bot, options, changes, listingQuotes, snapshots, sell, publishQuote: listener };
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

describe.each(['live', 'bulk', 'lookup', 'add'] as const)('%s market quote', quotePath => {
    it('raises the next lot floor synchronously after the oldest lot is sold', async () => {
        const { entry, changes, listingQuotes, sell } = await fixture([lot(10), lot(20)], quotePath);
        sell();

        expect(entry.purchaseHistory).toEqual([lot(20)]);
        expect(entry.sell.toJSON()).toEqual({ keys: 0, metal: 20.11 });
        expect(changes).toEqual([20.11]);
        expect(listingQuotes).toEqual([{ priceKey: SKU, metal: 20.11 }]);
    });

    it('lowers the stale floor when the next lot is cheaper', async () => {
        const { entry, sell } = await fixture([lot(20), lot(10)], quotePath, { initialSell: 20.11 });
        sell();

        expect(entry.sell.toJSON()).toEqual({ keys: 0, metal: 10.11 });
    });
});

it('keeps the latest market sell when it is above the next lot floor', async () => {
    const { entry, sell } = await fixture([lot(20), lot(10)], 'live', { marketSell: 15, initialSell: 20.11 });
    sell();

    expect(entry.sell.toJSON()).toEqual({ keys: 0, metal: 15 });
});

it('rechecks the remaining floor even if the cached market quote numerically matched the previous quote', async () => {
    const { entry, sell } = await fixture([lot(10), lot(20)], 'live', { marketSell: 10.11 });
    sell();

    expect(entry.sell.toJSON()).toEqual({ keys: 0, metal: 20.11 });
});

it('honours the configured profit floor after rollover', async () => {
    const { entry, options, sell } = await fixture([lot(10), lot(20)]);
    options.pricelist.partialPriceUpdate.minProfitScrap = 5;
    sell();

    expect(entry.sell.toJSON()).toEqual({ keys: 0, metal: 20.55 });
});

it('does not lower an existing sell to an invented market quote when no market snapshot is available', async () => {
    const { entry, sell } = await fixture([lot(20), lot(10)], 'none', { initialSell: 20.11 });
    sell();

    expect(entry.sell.toJSON()).toEqual({ keys: 0, metal: 20.11 });
});

it('still raises an unsafe next-lot floor without a market snapshot', async () => {
    const { entry, sell } = await fixture([lot(10), lot(20)], 'none');
    sell();

    expect(entry.sell.toJSON()).toEqual({ keys: 0, metal: 20.11 });
});

it('does not advance the floor while units of the oldest lot remain', async () => {
    const { entry, sell } = await fixture([lot(10, 2), lot(20)]);
    sell();

    expect(entry.purchaseHistory).toEqual([lot(10), lot(20)]);
    expect(entry.sell.toJSON()).toEqual({ keys: 0, metal: 10.11 });
});

it('saves the re-priced entry and remaining queue through the established price notification', async () => {
    const { entry, snapshots, sell } = await fixture([lot(10), lot(20)]);
    sell();
    expect(snapshots).toHaveLength(1);
    const restored = Entry.fromData(
        (JSON.parse(snapshots[0]) as { [sku: string]: Parameters<typeof Entry.fromData>[0] })[SKU],
        schema
    );

    expect(restored.sell.toJSON()).toEqual({ keys: 0, metal: 20.11 });
    expect(restored.purchaseHistory).toEqual([lot(20)]);
    expect(entry.buy.toJSON()).toEqual({ keys: 0, metal: 4 });
});

it.each(['excluded', 'over-cap', 'expired'] as const)(
    'does not apply a new PPU floor for an %s remaining lot',
    async reason => {
        const young = reason === 'expired' ? lot(20, 1, 604800) : lot(20, reason === 'over-cap' ? 2 : 1);
        const { entry, options, sell } = await fixture([lot(10), young], 'none');
        if (reason === 'excluded') options.pricelist.partialPriceUpdate.excludeSKU = [SKU];
        if (reason === 'over-cap') options.pricelist.partialPriceUpdate.maxProtectedUnits = 1;
        sell();

        expect(entry.sell.toJSON()).toEqual({ keys: 0, metal: 10.11 });
    }
);

it('updates the first remaining lot when one sale consumes several earlier lots', async () => {
    const { entry, sell } = await fixture([lot(10, 2), lot(20), lot(30)]);
    sell(3);

    expect(entry.purchaseHistory).toEqual([lot(30)]);
    expect(entry.sell.toJSON()).toEqual({ keys: 0, metal: 30.11 });
});

it('does not retain a removed pricelist snapshot as evidence to lower a reloaded protected price', async () => {
    const { entry, pricelist, sell } = await fixture([lot(20), lot(10)], 'live', { initialSell: 20.11 });
    pricelist.setNewPricelist({ [SKU]: entry });
    sell();

    expect(entry.sell.toJSON()).toEqual({ keys: 0, metal: 20.11 });
});

it('obtains a missing market quote itself and then lowers a cheaper next-lot floor', async () => {
    const { entry, source, sell } = await fixture([lot(20), lot(10)], 'none', { initialSell: 20.11 });
    let resolveQuote: (quote: GetItemPriceResponse) => void;
    const pendingQuote = new Promise<GetItemPriceResponse>(resolve => {
        resolveQuote = resolve;
    });
    source.getPrice = () => pendingQuote;
    sell();
    expect(entry.sell.toJSON()).toEqual({ keys: 0, metal: 20.11 });
    resolveQuote({ sku: SKU, time: NOW, buy: money(4), sell: money(4.11) });
    await jest.runAllTimersAsync();

    expect(entry.sell.toJSON()).toEqual({ keys: 0, metal: 10.11 });
});

it('a delayed quote applies to the current lot rather than restoring an already-sold cheaper lot', async () => {
    const { entry, source, listingQuotes, sell } = await fixture([lot(20), lot(10), lot(30)], 'none', {
        initialSell: 20.11
    });
    let resolveQuote: (quote: GetItemPriceResponse) => void;
    const pendingQuote = new Promise<GetItemPriceResponse>(resolve => {
        resolveQuote = resolve;
    });
    source.getPrice = () => pendingQuote;
    sell();
    sell();
    resolveQuote({ sku: SKU, time: NOW, buy: money(4), sell: money(4.11) });
    await jest.runAllTimersAsync();

    expect(entry.purchaseHistory).toEqual([lot(30)]);
    expect(entry.sell.toJSON()).toEqual({ keys: 0, metal: 30.11 });
    expect(listingQuotes).toEqual([{ priceKey: SKU, metal: 30.11 }]);
});

it('keeps the synchronously raised floor if a missing market lookup fails', async () => {
    const { entry, source, sell } = await fixture([lot(10), lot(20)], 'none');
    source.getPrice = () => Promise.reject(new Error('Market fixture unavailable'));
    sell();
    await jest.runAllTimersAsync();

    expect(entry.sell.toJSON()).toEqual({ keys: 0, metal: 20.11 });
    expect(entry.purchaseHistory).toEqual([lot(20)]);
});

it('does not overwrite a newer socket market quote with a delayed lookup response', async () => {
    const { entry, source, sell, publishQuote } = await fixture([lot(20), lot(10)], 'none', { initialSell: 20.11 });
    let resolveQuote: (quote: GetItemPriceResponse) => void;
    const pendingQuote = new Promise<GetItemPriceResponse>(resolve => {
        resolveQuote = resolve;
    });
    source.getPrice = () => pendingQuote;
    sell();
    publishQuote({ sku: SKU, time: NOW + 1, buy: money(4), sell: money(30) });
    resolveQuote({ sku: SKU, time: NOW, buy: money(4), sell: money(4.11) });
    await jest.runAllTimersAsync();

    expect(entry.sell.toJSON()).toEqual({ keys: 0, metal: 30 });
});
