const responses = {
    schema: {
        success: true,
        version: '1.3.0',
        time: 1608569503080,
        raw: {
            schema: {
                items: [
                    {
                        name: 'Decoder Ring',
                        defindex: 5021,
                        item_class: 'tool',
                        item_type_name: 'Tool',
                        item_name: 'Mann Co. Supply Crate Key',
                        item_description: 'Used to open locked supply crates.',
                        proper_name: false,
                        model_player: null,
                        item_quality: 6,
                        image_inventory: 'backpack/player/items/crafting/key',
                        min_ilevel: 5,
                        max_ilevel: 5,
                        image_url:
                            'http://media.steampowered.com/apps/440/icons/key.be0a5e2cda3a039132c35b67319829d785e50352.png',
                        image_url_large:
                            'http://media.steampowered.com/apps/440/icons/key_large.354829243e53d73a5a75323c88fc5689ecb19359.png',
                        craft_class: 'tool',
                        craft_material_type: 'tool',
                        capabilities: {
                            can_gift_wrap: true,
                            can_craft_mark: true,
                            can_be_restored: true,
                            strange_parts: true,
                            can_card_upgrade: true,
                            can_strangify: true,
                            can_killstreakify: true,
                            can_consume: true
                        },
                        tool: {
                            type: 'decoder_ring',
                            usage_capabilities: {
                                decodable: true
                            }
                        },
                        used_by_classes: [],
                        attributes: [
                            {
                                name: 'always tradable',
                                class: 'always_tradable',
                                value: 1
                            }
                        ]
                    }
                ]
            }
        }
    },
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

export const getSchema = jest.fn(() => Promise.resolve(responses.schema));
export const getPrice = jest.fn(() => Promise.resolve(responses.itemPrice));

const mock = jest.fn().mockImplementation(() => {
    return {
        getSchema: getSchema,
        getPrice: getPrice
    };
});

export default mock;
