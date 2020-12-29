import jsonschema from 'jsonschema';

export const customMessageSchema: jsonschema.Schema = {
    id: 'custom-message',
    type: 'object',
    properties: {
        sendOffer: {
            type: 'string'
        },
        welcome: {
            type: 'string'
        },
        iDontKnowWhatYouMean: {
            type: 'string'
        },
        success: {
            type: 'string'
        },
        successEscrow: {
            type: 'string'
        },
        decline: {
            type: 'decline-cm'
        },
        tradedAway: {
            type: 'string'
        },
        failedMobileConfirmation: {
            type: 'string'
        },
        cancelledActiveForAwhile: {
            type: 'string'
        },
        clearFriends: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
