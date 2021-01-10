import jsonschema from 'jsonschema';

export const sendAlertSchema: jsonschema.Schema = {
    id: 'send-alert',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        autokeys: {
            $ref: 'autokeys-sa'
        },
        backpackFull: {
            type: 'boolean'
        },
        highValue: {
            $ref: 'high-value-sa'
        }
    },
    additionalProperties: false,
    required: []
};
