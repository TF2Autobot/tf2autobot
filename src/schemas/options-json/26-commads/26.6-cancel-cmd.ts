import jsonschema from 'jsonschema';

export const cancelCmdSchema: jsonschema.Schema = {
    id: 'cancel-cmd',
    type: 'object',
    properties: {
        customReply: {
            $ref: 'custom-reply-cancel-cmd'
        }
    },
    additionalProperties: false,
    required: []
};
