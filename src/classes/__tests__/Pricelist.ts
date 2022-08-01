import Pricelist from '../Pricelist';
import SchemaManager from '@tf2autobot/tf2-schema';
import { DEFAULTS } from '../Options';
import Currencies from '@tf2autobot/tf2-currencies';
import genPaths from '../../resources/paths';
import { init } from '../../lib/logger';
import { getPricer } from '../../lib/pricer/pricer';
import * as Options from '../Options';

jest.mock('../../lib/pricer/custom/custom-pricer-api');

it('can pricecheck', async () => {
    const paths = genPaths('test');
    init(paths, { debug: true, debugFile: false });
    const prices = getPricer({ pricerUrl: 'http://test.com' });
    const schemaManager = new SchemaManager({});
    const priceList = new Pricelist(prices, schemaManager.schema, DEFAULTS);
    const isUseCustomPricer = priceList.isUseCustomPricer;
    expect(priceList.maxAge).toEqual(8 * 60 * 60);
    await priceList.setupPricelist();
    expect(priceList.getKeyPrices).toEqual({
        src: isUseCustomPricer ? 'customPricer' : 'ptf',
        time: 1608739762,
        buy: new Currencies({ keys: 0, metal: 55.11 }),
        sell: new Currencies({ keys: 0, metal: 55.22 })
    });
    expect(priceList.getKeyPrice).toEqual({
        keys: 0,
        metal: 55.22
    });
    expect(await priceList.getItemPrices('5021;6')).toEqual({
        sku: '5021;6',
        currency: null,
        source: 'bptf',
        time: 1608739762,
        buy: new Currencies({ keys: 0, metal: 55.11 }),
        sell: new Currencies({ keys: 0, metal: 55.22 })
    });
    expect(priceList.getLength).toEqual(0);
    expect(priceList.getPrices).toEqual({});
    expect(priceList.hasPrice({ priceKey: '5021;6' })).toEqual(false);
    expect(priceList.getPrice({ priceKey: '5021;6' })).toBeNull();
    // expect(priceList.searchByName('Mann Co. Supply Crate Key')).toBeNull();
});

it('can pricecheck detect custom pricers', () => {
    const paths = genPaths('test');
    let options = Options.loadOptions({
        steamAccountName: 'abc123',
        debug: true,
        debugFile: false,
        customPricerUrl: 'http://test.com'
    });
    init(paths, options);
    let prices = getPricer({
        pricerUrl: options.customPricerUrl,
        pricerApiToken: options.customPricerApiToken
    });
    let schemaManager = new SchemaManager({});
    let priceList = new Pricelist(prices, schemaManager.schema, options);
    expect(priceList.isUseCustomPricer).toBeTruthy();

    options = Options.loadOptions({
        steamAccountName: 'abc123',
        debug: true,
        debugFile: false,
        customPricerUrl: 'https://api.prices.tf'
    });
    prices = getPricer({
        pricerUrl: options.customPricerUrl,
        pricerApiToken: options.customPricerApiToken
    });
    schemaManager = new SchemaManager({});
    priceList = new Pricelist(prices, schemaManager.schema, options);
    expect(priceList.isUseCustomPricer).toBeFalsy();

    options = Options.loadOptions({ steamAccountName: 'abc123', debug: true, debugFile: false, customPricerUrl: '' });
    prices = getPricer({
        pricerUrl: options.customPricerUrl,
        pricerApiToken: options.customPricerApiToken
    });
    schemaManager = new SchemaManager({});
    priceList = new Pricelist(prices, schemaManager.schema, options);
    expect(priceList.isUseCustomPricer).toBeFalsy();

    options = Options.loadOptions({
        steamAccountName: 'abc123',
        debug: true,
        debugFile: false,
        customPricerUrl: 'https://api2.prices.tf'
    });
    prices = getPricer({
        pricerUrl: options.customPricerUrl,
        pricerApiToken: options.customPricerApiToken
    });
    schemaManager = new SchemaManager({});
    priceList = new Pricelist(prices, schemaManager.schema, options);
    expect(priceList.isUseCustomPricer).toBeFalsy();

    options = Options.loadOptions({ steamAccountName: 'abc123', debug: true, debugFile: false, customPricerUrl: null });
    prices = getPricer({
        pricerUrl: options.customPricerUrl,
        pricerApiToken: options.customPricerApiToken
    });
    schemaManager = new SchemaManager({});
    priceList = new Pricelist(prices, schemaManager.schema, options);
    expect(priceList.isUseCustomPricer).toBeFalsy();
});
