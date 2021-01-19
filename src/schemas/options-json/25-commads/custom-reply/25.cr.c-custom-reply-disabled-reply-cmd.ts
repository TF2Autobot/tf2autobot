import jsonschema from 'jsonschema';

export const customReplyDisabledReplyCmdSchema: jsonschema.Schema = {
    id: 'custom-reply-disabled-reply-cmd',
    type: 'object',
    properties: {
        disabled: {
            type: 'string'
        },
        reply: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
