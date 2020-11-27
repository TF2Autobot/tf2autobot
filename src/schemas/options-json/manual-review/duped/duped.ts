import jsonschema from 'jsonschema';

export const dupedSchema: jsonschema.Schema = {
    id: 'duped',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        declineDuped: {
            type: 'boolean'
        },
        minKeys: {
            type: 'number'
        },
        note: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
