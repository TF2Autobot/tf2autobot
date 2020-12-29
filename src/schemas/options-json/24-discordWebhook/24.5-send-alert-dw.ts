import jsonschema from 'jsonschema';

export const sendAlertDWSchema: jsonschema.Schema = {
    id: 'send-alert-dw',
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
