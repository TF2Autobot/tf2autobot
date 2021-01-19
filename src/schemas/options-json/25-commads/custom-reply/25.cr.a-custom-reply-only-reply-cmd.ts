import jsonschema from 'jsonschema';

export const customReplyOnlyReplyCmdSchema: jsonschema.Schema = {
    id: 'custom-reply-only-reply-cmd',
    type: 'object',
    properties: {
        reply: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
