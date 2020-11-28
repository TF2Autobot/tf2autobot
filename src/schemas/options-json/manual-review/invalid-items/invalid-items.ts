import jsonschema from 'jsonschema';

export const invalidItemsSchema: jsonschema.Schema = {
    id: 'invalid-items',
    type: 'object',
    properties: {
        note: {
            type: 'string'
        },
        givePrice: {
            type: 'boolean'
        },
        autoAcceptOverpay: {
            type: 'boolean'
        }
    },
    additionalProperties: false,
    required: []
};
