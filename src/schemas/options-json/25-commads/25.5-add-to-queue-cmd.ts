import jsonschema from 'jsonschema';

export const addToQueueCmdSchema: jsonschema.Schema = {
    id: 'add-to-queue-cmd',
    type: 'object',
    properties: {
        alreadyHaveActiveOffer: {
            type: 'string'
        },
        alreadyInQueueProcessingOffer: {
            type: 'string'
        },
        alreadyInQueueWaitingTurn: {
            type: 'string'
        },
        addedToQueueWaitingTurn: {
            type: 'string'
        },
        alteredOffer: {
            type: 'string'
        },
        processingOffer: {
            $ref: 'donate-buyingp-offer-atq-cmd' // 26.e
        },
        hasBeenMadeAcceptingMobileConfirmation: {
            $ref: 'donate-buyingp-offer-atq-cmd' // 26.e
        }
    },
    additionalProperties: false,
    required: []
};
