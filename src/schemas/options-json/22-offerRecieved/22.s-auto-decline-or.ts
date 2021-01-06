import jsonschema from 'jsonschema';

export const autoDeclineOrSchema: jsonschema.Schema = {
    id: 'auto-decline-or',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        declineReply: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
