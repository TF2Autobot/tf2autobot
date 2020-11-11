import jsonschema from 'jsonschema';

export const addSchema: jsonschema.Schema = {
    id: 'pricelist-add',
    type: 'object',
    properties: {
        sku: {
            // sku of the item
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
        max: {
            // maximum stock
            type: 'integer',
            // -1 is infinite
            minimum: -1
        },
        min: {
            // minimum stock
            type: 'integer',
            minimum: 0
        },
        buy: {
            // buy price
            $ref: 'tf2-currencies'
        },
        sell: {
            // sell price
            $ref: 'tf2-currencies'
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
        buynote: {
            // custom buy order listing note
            anyOf: [
                {
                    type: 'string'
                },
                {
                    type: 'null'
                }
            ]
        },
        sellnote: {
            // custom sell order listing note
            anyOf: [
                {
                    type: 'string'
                },
                {
                    type: 'null'
                }
            ]
        }
    },
    additionalProperties: false,
    required: ['sku', 'enabled', 'intent', 'autoprice', 'max', 'min']
};
