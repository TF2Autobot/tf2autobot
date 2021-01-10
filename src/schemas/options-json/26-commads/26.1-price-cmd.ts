import jsonschema from 'jsonschema';

export const priceCmdSchema: jsonschema.Schema = {
    id: 'price-cmd',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        customReply: {
            $ref: 'custom-reply-only-disabled-cmd' // 26.cr.b
        }
    },
    additionalProperties: false,
    required: []
};
