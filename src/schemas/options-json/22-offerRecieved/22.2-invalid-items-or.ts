import jsonschema from 'jsonschema';

export const invalidItemsOrSchema: jsonschema.Schema = {
    id: 'invalid-items-or',
    type: 'object',
    properties: {
        givePrice: {
            type: 'boolean'
        },
        autoAcceptOverpay: {
            type: 'boolean'
        },
        autoDecline: {
            $ref: 'auto-decline-or'
        }
    },
    additionalProperties: false,
    required: []
};
