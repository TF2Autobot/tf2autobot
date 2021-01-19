import jsonschema from 'jsonschema';

export const weaponsSchema: jsonschema.Schema = {
    id: 'weapons-cf',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        }
    },
    additionalProperties: false,
    required: []
};
