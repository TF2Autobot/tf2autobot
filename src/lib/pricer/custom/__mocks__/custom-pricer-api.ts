import fs from 'fs';
import { GetSchemaResponse } from '../../classes/Pricer';

const schema = JSON.parse(fs.readFileSync(`${__dirname}/raw-schema.json`, { encoding: 'utf8' })) as GetSchemaResponse;

const responses = {
    schema: schema,
    pricelist: {
        success: true,
        items: [
            {
                name: 'Mann Co. Supply Crate Key',
                sku: '5021;6'
            }
        ]
    },
    itemPrice: {
        success: true,
        sku: '5021;6',
        name: 'Mann Co. Supply Crate Key',
        currency: null,
        source: 'bptf',
        time: 1608739762,
        buy: { keys: 0, metal: 55.11 },
        sell: { keys: 0, metal: 55.22 }
    },
    history: {
        success: true,
        sku: '5021;6',
        name: 'Mann Co. Supply Crate Key',
        source: 'bptf',
        currency: null,
        history: [
            {
                time: 1600978618,
                buy: {
                    keys: 0,
                    metal: 43.55
                },
                sell: {
                    keys: 0,
                    metal: 43.66
                }
            },
            {
                time: 1608649219,
                buy: {
                    keys: 0,
                    metal: 55.33
                },
                sell: {
                    keys: 0,
                    metal: 56.33
                }
            }
        ]
    },
    sales: {
        success: true,
        sku: '378;6',
        name: 'The Team Captain',
        sales: [
            {
                id: '440_9601359962',
                steamid: '76561199021590702',
                automatic: true,
                attributes: {},
                intent: 1,
                currencies: {
                    keys: 0,
                    metal: 8.22
                },
                time: 1608329046
            },
            {
                id: '440_9591792630',
                steamid: '76561199103327964',
                automatic: true,
                attributes: {
                    craftnumber: 76301
                },
                intent: 1,
                currencies: {
                    keys: 0,
                    metal: 8.22
                },
                time: 1608659128
            }
        ]
    },
    requestCheck: {
        success: true,
        sku: '16309;5;u703;w2;pk309;strange',
        name: 'Strange Cool Piña Polished War Paint (Minimal Wear)'
    },
    requestCheckUnknown: {
        success: true,
        sku: '163099;0',
        name: null
    },
    requestCheckKey: {
        statusCode: 403,
        body: {
            success: false,
            message: 'You may not request price checks for Mann Co. Supply Crate Keys'
        },
        attempts: 1,
        message: 'Forbidden'
    },
    links: {
        success: true,
        sku: '5021;6',
        name: 'Mann Co. Supply Crate Key',
        links: {
            ptf: 'https://prices.tf/items/5021;6',
            mptf: 'https://marketplace.tf/items/tf2/5021;6',
            scm: 'https://steamcommunity.com/market/listings/440/Mann Co. Supply Crate Key',
            bptf: 'https://backpack.tf/stats/Unique/Mann Co. Supply Crate Key/Tradable/Craftable'
        }
    }
};

export const getSchema = jest.fn((): Promise<GetSchemaResponse> => Promise.resolve(responses.schema));
export const getPrice = jest.fn(() => Promise.resolve(responses.itemPrice));
export const getSnapshots = jest.fn(() => Promise.resolve(responses.sales));
export const requestCheck = jest.fn(() => Promise.resolve(responses.requestCheck));

const mock = jest.fn().mockImplementation((url?: string, apiToken?: string) => {
    return {
        getSchema: getSchema,
        getPrice: getPrice,
        getOptions: jest.fn(() =>
            Promise.resolve({
                pricerUrl: url ? url : 'https://api.prices.tf',
                pricerApiToken: apiToken ? apiToken : 'abc123'
            })
        ),
        getSnapshots: getSnapshots,
        requestCheck: requestCheck
    };
});

export default mock;
