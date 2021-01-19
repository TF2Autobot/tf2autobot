import jsonschema from 'jsonschema';

export const messagesDWSchema: jsonschema.Schema = {
    id: 'messages-dw',
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
