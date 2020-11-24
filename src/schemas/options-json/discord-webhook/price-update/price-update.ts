import jsonschema from 'jsonschema';

export const priceUpdateSchema: jsonschema.Schema = {
    id: 'price-update',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        url: {
            type: 'string'
        },
        note: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
