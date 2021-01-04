import jsonschema from 'jsonschema';

export const sendAlertStatsDWSchema: jsonschema.Schema = {
    id: 'send-alert-stats-dw',
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
