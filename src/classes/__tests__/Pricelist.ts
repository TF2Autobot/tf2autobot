import Pricelist from '../Pricelist';
import SchemaManager = require('tf2-schema-2');
import SocketManager from '../MyHandler/SocketManager';
import { DEFAULTS } from '../Options';
import Currencies from 'tf2-currencies-2';
import genPaths from '../../resources/paths';
import { init } from '../../lib/logger';
import { getPricer } from '../../lib/pricer/pricer';
import Pricer, { GetSchemaResponse } from '../Pricer';

jest.mock('../../lib/pricer-api');
jest.mock('../MyHandler/SocketManager');

export async function setupPricelist(): Promise<[Pricer, GetSchemaResponse, SchemaManager, Pricelist]> {
    const paths = genPaths('test');
    init(paths, { debug: true, debugFile: false });
    const pricer = getPricer({});
    const schemaManager = new SchemaManager({});
    const schema = await pricer.getSchema();
    schemaManager.setSchema(schema);
    const socketManager = new SocketManager('');
    const priceList = new Pricelist(pricer, schemaManager.schema, socketManager, DEFAULTS);
    await priceList.setupPricelist();
    return [pricer, schema, schemaManager, priceList];
}

it('can pricecheck', async () => {
    const [, , , priceList] = await setupPricelist();
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
        name: 'Mann Co. Supply Crate Key',
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
