import jsonschema from 'jsonschema';

export const checkoutCmdSchema: jsonschema.Schema = {
    id: 'checkout-cmd',
    type: 'object',
    properties: {
        customReply: {
            $ref: 'custom-reply-checkout-cmd'
        }
    },
    additionalProperties: false,
    required: []
};
