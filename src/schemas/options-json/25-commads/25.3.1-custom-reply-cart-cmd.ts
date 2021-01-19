import jsonschema from 'jsonschema';

export const customReplyCartCmdSchema: jsonschema.Schema = {
    id: 'custom-reply-cart-cmd',
    type: 'object',
    properties: {
        title: {
            type: 'string'
        },
        disabled: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
