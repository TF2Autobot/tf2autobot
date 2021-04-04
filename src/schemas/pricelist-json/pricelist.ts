import jsonschema from 'jsonschema';

export const pricelistSchema: jsonschema.Schema = {
    id: 'pricelist',
    type: 'object',
    properties: {
        sku: {
            type: 'string'
        },
        enabled: {
            type: 'boolean'
        },
        autoprice: {
            type: 'boolean'
        },
        min: {
            type: 'number'
        },
        max: {
            type: 'number'
        },
        intent: {
            type: 'number',
            enum: [0, 1, 2]
        },
        buy: {
            $ref: 'tf2-currencies'
        },
        sell: {
            $ref: 'tf2-currencies'
        },
        promoted: {
            type: 'number',
            enum: [0, 1]
        },
        group: {
            type: ['string', 'null']
        },
        note: {
            $ref: 'listing-note'
        },
        isPartialPriced: {
            // partialPrice feature: https://github.com/TF2Autobot/tf2autobot/pull/520
            type: 'boolean'
        },
        time: {
            type: ['number', 'null']
        },
        name: {
            type: 'string'
        }
    }
};
