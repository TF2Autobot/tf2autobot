import jsonschema from 'jsonschema';

export const cartCmdSchema: jsonschema.Schema = {
    id: 'cart-cmd',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        customReply: {
            $ref: 'custom-reply-cart-cmd'
        }
    },
    additionalProperties: false,
    required: []
};
