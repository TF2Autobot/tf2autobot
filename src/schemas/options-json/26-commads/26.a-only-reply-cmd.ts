import jsonschema from 'jsonschema';

export const onlyReplyCmdSchema: jsonschema.Schema = {
    id: 'only-reply-cmd',
    type: 'object',
    properties: {
        customReply: {
            $ref: 'custom-reply-only-reply-cmd' // 26.cr.a
        }
    },
    additionalProperties: false,
    required: []
};
