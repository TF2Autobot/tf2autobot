import Pricelist from '../Pricelist';
import SchemaManager from 'tf2-schema-2';
import SocketManager from '../MyHandler/SocketManager';
import { DEFAULTS } from '../Options';
import Currencies from 'tf2-currencies-2';
import genPaths from '../../resources/paths';
import { init } from '../../lib/logger';
import { getPricer } from '../../lib/pricer/pricer';

jest.mock('../../lib/pricer-api');

it('can pricecheck', async done => {
    const paths = genPaths('test');
    init(paths, { debug: true, debugFile: false });
    const prices = getPricer({});
    const schemaManager = new SchemaManager({});
    schemaManager.setSchema(await prices.getSchema());
    const socketManager = new SocketManager('');
    const priceList = new Pricelist(prices, schemaManager.schema, socketManager, DEFAULTS);
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
    expect(await priceList.getPricesTF('5021;6')).toEqual({
        sku: '5021;6',
        name: 'Mann Co. Supply Crate Key',
        currency: null,
        source: 'bptf',
        time: 1608739762,
        buy: new Currencies({ keys: 0, metal: 55.11 }),
        sell: new Currencies({ keys: 0, metal: 55.22 })
    });
    expect(priceList.getLength).toEqual(0);
    expect(priceList.getPrices).toEqual([]);
    expect(priceList.hasPrice('5021;6')).toEqual(false);
    expect(priceList.getPrice('5021;6')).toBeNull();
    expect(priceList.searchByName('Mann Co. Supply Crate Key')).toBeNull();
    done();
});
