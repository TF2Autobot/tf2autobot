import jsonschema from 'jsonschema';

export const craftingSchema: jsonschema.Schema = {
    id: 'crafting',
    type: 'object',
    properties: {
        weapons: {
            $ref: 'weapons-cf'
        },
        metals: {
            $ref: 'metals-cf'
        }
    },
    additionalProperties: false,
    required: []
};
