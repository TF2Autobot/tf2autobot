import jsonschema from 'jsonschema';

export const onlyEnableDisabledCmdSchema: jsonschema.Schema = {
    id: 'only-enable-disabled-cmd',
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
