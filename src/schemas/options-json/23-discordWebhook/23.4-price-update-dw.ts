import jsonschema from 'jsonschema';

export const priceUpdateDWSchema: jsonschema.Schema = {
    id: 'price-update-dw',
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
