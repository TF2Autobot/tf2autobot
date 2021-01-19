import jsonschema from 'jsonschema';

export const messageCmdSchema: jsonschema.Schema = {
    id: 'message-cmd',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        customReply: {
            $ref: 'custom-reply-message-cmd'
        }
    },
    additionalProperties: false,
    required: []
};
