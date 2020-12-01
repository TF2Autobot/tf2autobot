import jsonschema from 'jsonschema';

export const weaponsAsCurrencySchema: jsonschema.Schema = {
    id: 'weapons-as-currency',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        withUncraft: {
            type: 'boolean'
        }
    },
    additionalProperties: false,
    required: []
};
