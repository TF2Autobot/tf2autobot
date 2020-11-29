import jsonschema from 'jsonschema';

export const messagesSchema: jsonschema.Schema = {
    id: 'messages',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        url: {
            type: 'string'
        },
        showQuickLinks: {
            type: 'boolean'
        }
    },
    additionalProperties: false,
    required: []
};
