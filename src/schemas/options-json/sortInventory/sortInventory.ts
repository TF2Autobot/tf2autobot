import jsonschema from 'jsonschema';

export const sortInventorySchema: jsonschema.Schema = {
    id: 'sort-inventory',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        type: {
            type: 'number',
            minimum: 1,
            maximum: 5
        }
    },
    additionalProperties: false,
    required: []
};
