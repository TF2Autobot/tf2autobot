import jsonschema from 'jsonschema';

export const overUnderstockedOrSchema: jsonschema.Schema = {
    id: 'overstocked-understocked-or',
    type: 'object',
    properties: {
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
