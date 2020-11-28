import jsonschema from 'jsonschema';

export const sendAlertSchema: jsonschema.Schema = {
    id: 'send-alert',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        url: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
