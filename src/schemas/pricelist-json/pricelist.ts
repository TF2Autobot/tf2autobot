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
        max: {
            type: 'number'
        },
        min: {
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
        time: {
            type: ['number', 'null']
        },
        name: {
            type: 'string'
        }
    }
};
