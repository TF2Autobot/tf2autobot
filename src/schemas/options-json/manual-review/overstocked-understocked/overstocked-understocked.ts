import jsonschema from 'jsonschema';

export const overUnderstockedSchema: jsonschema.Schema = {
    id: 'overstocked-understocked',
    type: 'object',
    properties: {
        note: {
            type: 'string'
        },
        autoAcceptOverpay: {
            type: 'boolean'
        },
        autoDecline: {
            type: 'boolean'
        }
    },
    additionalProperties: false,
    required: []
};
