import jsonschema from 'jsonschema';

export const declineCMSchema: jsonschema.Schema = {
    id: 'decline-cm',
    type: 'object',
    properties: {
        giftNoNote: {
            type: 'string'
        },
        crimeAttempt: {
            type: 'string'
        },
        onlyMetal: {
            type: 'string'
        },
        duelingNot5Uses: {
            type: 'string'
        },
        noiseMakerNot5Uses: {
            type: 'string'
        },
        highValueItemsNotSelling: {
            type: 'string'
        },
        notTradingKeys: {
            type: 'string'
        },
        notSellingKeys: {
            type: 'string'
        },
        notBuyingKeys: {
            type: 'string'
        },
        banned: {
            type: 'string'
        },
        escrow: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
