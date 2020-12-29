import jsonschema from 'jsonschema';

export const customReplyCheckoutCmdSchema: jsonschema.Schema = {
    id: 'custom-reply-checkout-cmd',
    type: 'object',
    properties: {
        empty: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
