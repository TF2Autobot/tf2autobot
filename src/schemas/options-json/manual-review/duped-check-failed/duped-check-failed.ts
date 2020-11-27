import jsonschema from 'jsonschema';

export const dupedCheckFailedSchema: jsonschema.Schema = {
    id: 'duped-check-failed',
    type: 'object',
    properties: {
        note: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
