import jsonschema from 'jsonschema';

export const buySellCmdSchema: jsonschema.Schema = {
    id: 'buy-sell-cmd',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        disableForSKU: {
            $ref: 'array-string'
        },
        customReply: {
            $ref: 'custom-reply-only-disabled-cmd' // 26.cr.b
        }
    },
    additionalProperties: false,
    required: []
};
