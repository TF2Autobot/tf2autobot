import Pricelist from '../Pricelist';
import SchemaManager from 'tf2-schema-2';
import { DEFAULTS } from '../Options';
import Currencies from 'tf2-currencies-2';
import genPaths from '../../resources/paths';
import { init } from '../../lib/logger';
import { getPricer } from '../../lib/pricer/pricer';
import IPricer from '../IPricer';

jest.mock('../../lib/pricer/custom/custom-pricer-api');

async function setupPricelist(): Promise<[IPricer, SchemaManager, Pricelist]> {
    const paths = genPaths('test');
    init(paths, { debug: true, debugFile: false });
    const prices = getPricer({ pricerUrl: 'http://test.com' });
    const schemaManager = new SchemaManager({});
    const priceList = new Pricelist(prices, schemaManager.schema, DEFAULTS);
    await priceList.setupPricelist();
    return [prices, schemaManager, priceList];
}

it('can pricecheck', async () => {
    const [, , priceList] = await setupPricelist();
    const isUseCustomPricer = priceList.isUseCustomPricer;
    expect(priceList.maxAge).toEqual(8 * 60 * 60);
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
    expect(priceList.hasPrice('5021;6')).toEqual(false);
    expect(priceList.getPrice('5021;6')).toBeNull();
    // expect(priceList.searchByName('Mann Co. Supply Crate Key')).toBeNull();
});
