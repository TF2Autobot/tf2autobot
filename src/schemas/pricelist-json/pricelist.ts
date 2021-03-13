import jsonschema from 'jsonschema';

export const pricelistSchema: jsonschema.Schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $ref: '#/definitions/PricesObject',
    definitions: {
        PricesObject: {
            type: 'object',
            additionalProperties: {
                $ref: '#/definitions/Entry'
            }
        },
        Entry: {
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
                        },
                        {
                            type: 'null'
                        }
                    ]
                },
                sell: {
                    anyOf: [
                        {
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
                },
                name: {
                    type: 'string'
                }
            },
            required: [
                'autoprice',
                'buy',
                'enabled',
                'group',
                'intent',
                'max',
                'min',
                'name',
                'note',
                'promoted',
                'sell',
                'sku',
                'time'
            ],
            additionalProperties: false
        }
    }
};
