import jsonschema from 'jsonschema';

export const craftingSchema: jsonschema.Schema = {
    id: 'crafting',
    type: 'object',
    properties: {
        weapons: {
            $ref: 'crafting-weapons'
        },
        metals: {
            $ref: 'crafting-metals'
        }
    },
    additionalProperties: false,
    required: []
};
