import jsonschema from 'jsonschema';

export const autoDeclineIVSchema: jsonschema.Schema = {
    id: 'auto-decline-invalid-value',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        note: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
