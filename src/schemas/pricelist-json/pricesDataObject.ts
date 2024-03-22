import jsonschema from 'jsonschema';

export const pricesDataObject: jsonschema.Schema = {
    id: 'prices-data-object',
    type: 'object',
    patternProperties: {
        // eslint-disable-next-line prettier/prettier, no-useless-escape
        '^(d+);([0-9]|[1][0-5])(;((uncraftable)|(untradable)|(australium)|(festive)|(strange)|((u|pk|td-|c|od-|oq-|p)d+)|(w[1-5])|(kt-[1-3])|(n((100)|[1-9]d?))))*?$|^d+$':
            {
                type: 'object',
                properties: {
                    sku: {
                        type: 'string'
                    },
                    id: {
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
                    limit: {
                        $ref: 'pricelist-limit'
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
                    }
                },
                required: ['sku', 'enabled', 'autoprice', 'max', 'min', 'intent'],
                additionalProperties: false
            }
    }
};
