import jsonschema from 'jsonschema';

export const customReplyOnlyDisabledDisabledForSKUCmdSchema: jsonschema.Schema = {
    id: 'custom-reply-only-disabled-disabledForSKU-cmd',
    type: 'object',
    properties: {
        disabled: {
            type: 'string'
        },
        disabledForSKU: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
