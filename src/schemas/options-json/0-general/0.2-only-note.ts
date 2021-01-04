import jsonschema from 'jsonschema';

export const onlyNoteSchema: jsonschema.Schema = {
    id: 'only-note',
    type: 'object',
    properties: {
        note: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
