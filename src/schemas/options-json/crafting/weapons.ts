import jsonschema from 'jsonschema';

export const weaponsSchema: jsonschema.Schema = {
    id: 'crafting-weapons',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        }
    },
    additionalProperties: false,
    required: []
};
