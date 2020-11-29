import jsonschema from 'jsonschema';

export const customMessageSchema: jsonschema.Schema = {
    id: 'custom-message',
    type: 'object',
    properties: {
        welcome: {
            type: 'string'
        },
        iDontKnowWhatYouMean: {
            type: 'string'
        },
        how2trade: {
            type: 'string'
        },
        success: {
            type: 'string'
        },
        decline: {
            type: 'string'
        },
        tradedAway: {
            type: 'string'
        },
        clearFriends: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
