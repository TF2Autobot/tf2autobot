import jsonschema from 'jsonschema';

export const dupedOrSchema: jsonschema.Schema = {
    id: 'duped-or',
    type: 'object',
    properties: {
        enableCheck: {
            type: 'boolean'
        },
        minKeys: {
            type: 'number'
        },
        autoDecline: {
            $ref: 'auto-decline-or'
        }
    },
    additionalProperties: false,
    required: []
};
