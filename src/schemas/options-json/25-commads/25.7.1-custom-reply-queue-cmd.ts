import jsonschema from 'jsonschema';

export const customReplyQueueCmdSchema: jsonschema.Schema = {
    id: 'custom-reply-queue-cmd',
    type: 'object',
    properties: {
        notInQueue: {
            type: 'string'
        },
        offerBeingMade: {
            type: 'string'
        },
        hasPosition: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
