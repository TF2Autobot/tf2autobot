import jsonschema from 'jsonschema';

export const onlyEnableDisabledReplyCmdSchema: jsonschema.Schema = {
    id: 'only-enable-disabled-reply-cmd',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        customReply: {
            $ref: 'custom-reply-disabled-reply-cmd' // 26.cr.c
        }
    },
    additionalProperties: false,
    required: []
};
