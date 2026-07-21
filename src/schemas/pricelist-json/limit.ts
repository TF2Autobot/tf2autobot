import jsonschema from 'jsonschema';

export const limitSchema: jsonschema.Schema = {
    id: 'pricelist-limit',
    type: 'object',
    properties: {
        buy: {
            anyOf: [{ $ref: 'tf2-currencies' }, { type: null }]
        },
        sell: {
            anyOf: [{ $ref: 'tf2-currencies' }, { type: null }]
        }
    },
    additionalProperties: false,
    required: ['buy', 'sell']
};
