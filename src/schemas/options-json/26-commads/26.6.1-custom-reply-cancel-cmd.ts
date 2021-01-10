import jsonschema from 'jsonschema';

export const customReplyCancelCmdSchema: jsonschema.Schema = {
    id: 'custom-reply-cancel-cmd',
    type: 'object',
    properties: {
        isBeingSent: {
            type: 'string'
        },
        isCancelling: {
            type: 'string'
        },
        isRemovedFromQueue: {
            type: 'string'
        },
        noActiveOffer: {
            type: 'string'
        },
        successCancel: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
