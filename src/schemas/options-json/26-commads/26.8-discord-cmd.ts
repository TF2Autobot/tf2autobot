import jsonschema from 'jsonschema';

export const discordCmdSchema: jsonschema.Schema = {
    id: 'discord-cmd',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        inviteURL: {
            type: 'string'
        },
        customReply: {
            $ref: 'custom-reply-disabled-reply-cmd' // 26.cr.c
        }
    },
    additionalProperties: false,
    required: []
};
