import jsonschema from 'jsonschema';

export const normalizeSchema: jsonschema.Schema = {
    id: 'normalize',
    type: 'object',
    properties: {
        festivized: {
            type: 'boolean'
        },
        strangeUnusual: {
            type: 'boolean'
        }
    },
    additionalProperties: false,
    required: []
};
