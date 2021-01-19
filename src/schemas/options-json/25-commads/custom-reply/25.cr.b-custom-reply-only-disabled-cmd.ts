import jsonschema from 'jsonschema';

export const customReplyOnlyDisabledCmdSchema: jsonschema.Schema = {
    id: 'custom-reply-only-disabled-cmd',
    type: 'object',
    properties: {
        disabled: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
