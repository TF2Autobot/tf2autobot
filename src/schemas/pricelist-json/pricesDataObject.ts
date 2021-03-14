import jsonschema from 'jsonschema';

export const pricelistSchema: jsonschema.Schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $ref: '#/definitions/PricesDataObject',
    definitions: {
        PricesDataObject: {
            type: 'object',
            additionalProperties: {
                $ref: '#/definitions/EntryData'
            }
        },
        EntryData: {
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
                    anyOf: [
                        {
                            $ref: '#/definitions/Currency'
                        },
                        {
                            type: 'null'
                        }
                    ]
                },
                sell: {
                    anyOf: [
                        {
                            $ref: '#/definitions/Currency'
                        },
                        {
                            type: 'null'
                        }
                    ]
                },
                promoted: {
                    type: 'number',
                    enum: [0, 1]
                },
                group: {
                    type: ['string', 'null']
                },
                note: {
                    type: 'object',
                    properties: {
                        buy: {
                            type: ['string', 'null']
                        },
                        sell: {
                            type: ['string', 'null']
                        }
                    },
                    required: ['buy', 'sell'],
                    additionalProperties: false
                },
                time: {
                    type: ['number', 'null']
                }
            },
            required: ['sku', 'enabled', 'autoprice', 'max', 'min', 'intent'],
            additionalProperties: false
        },
        Currency: {
            type: 'object',
            properties: {
                keys: {
                    type: 'number'
                },
                metal: {
                    type: 'number'
                }
            },
            required: ['keys', 'metal'],
            additionalProperties: false
        }
    }
};
