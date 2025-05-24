import jsonschema from 'jsonschema';

export const addSchema: jsonschema.Schema = {
    id: 'pricelist-add',
    type: 'object',
    properties: {
        sku: {
            // sku of the item
            type: 'string'
        },
        id: {
            type: 'string'
        },
        enabled: {
            // if we are actually trading the item
            type: 'boolean'
        },
        intent: {
            // 0 = buy, 1 = sell, 2 = bank
            type: 'integer',
            minimum: 0,
            maximum: 2
        },
        autoprice: {
            // if the item is autopriced or not
            type: 'boolean'
        },
        min: {
            // minimum stock
            type: 'integer',
            minimum: 0
        },
        max: {
            // maximum stock
            type: 'integer',
            // -1 is infinite
            minimum: -1
        },
        buy: {
            // buy price
            $ref: 'tf2-currencies'
        },
        sell: {
            // sell price
            $ref: 'tf2-currencies'
        },
        limit: {
            $ref: 'pricelist-limit'
        },
        promoted: {
            // 0 = not promote, 1 = promote item (Sell only)
            type: 'integer',
            minimum: 0,
            maximum: 1
        },
        group: {
            anyOf: [
                {
                    type: 'string'
                },
                {
                    type: 'null'
                }
            ]
        },
        note: {
            $ref: 'listing-note'
        },
        isPartialPriced: {
            // partialPrice feature: https://github.com/TF2Autobot/tf2autobot/pull/520
            type: 'boolean'
        }
    },
    additionalProperties: false,
    required: ['sku', 'enabled', 'intent', 'autoprice', 'max', 'min']
};
