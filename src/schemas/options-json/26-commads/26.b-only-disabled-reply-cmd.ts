import jsonschema from 'jsonschema';

export const onlyDisabledReplyCmdSchema: jsonschema.Schema = {
    id: 'only-disabled-reply-cmd',
    type: 'object',
    properties: {
        customReply: {
            $ref: 'custom-reply-disabled-reply-cmd' // 26.cr.b
        }
    },
    additionalProperties: false,
    required: []
};
