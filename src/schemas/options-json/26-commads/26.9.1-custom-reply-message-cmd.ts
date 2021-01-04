import jsonschema from 'jsonschema';

export const customReplyMessageCmdSchema: jsonschema.Schema = {
    id: 'custom-reply-message-cmd',
    type: 'object',
    properties: {
        disabled: {
            type: 'string'
        },
        wrongSyntax: {
            type: 'string'
        },
        fromOwner: {
            type: 'string'
        },
        success: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
