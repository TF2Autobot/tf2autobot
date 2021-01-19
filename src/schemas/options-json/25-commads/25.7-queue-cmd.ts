import jsonschema from 'jsonschema';

export const queueCmdSchema: jsonschema.Schema = {
    id: 'queue-cmd',
    type: 'object',
    properties: {
        customReply: {
            $ref: 'custom-reply-queue-cmd'
        }
    },
    additionalProperties: false,
    required: []
};
