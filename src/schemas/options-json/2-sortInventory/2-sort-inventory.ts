import jsonschema from 'jsonschema';

export const sortInventorySchema: jsonschema.Schema = {
    id: 'sort-inventory',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        type: {
            anyOf: [
                {
                    // 1 - by name, 2 - by defindex, 3 - by rarity, 4 - by type, 5 - by date
                    minimum: 1,
                    maximum: 5
                },
                {
                    const: 101 // by class
                },
                {
                    const: 102 // by slot
                }
            ]
        }
    },
    additionalProperties: false,
    required: []
};
