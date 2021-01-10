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
            $ref: 'custom-reply-only-disabled-disabledForSKU-cmd' // 26.cr.e
        }
    },
    additionalProperties: false,
    required: []
};
