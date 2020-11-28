import jsonschema from 'jsonschema';

export const stringArraySchema: jsonschema.Schema = {
    id: 'array-string',
    type: 'array',
    items: {
        type: 'string'
    },
    required: false
};
