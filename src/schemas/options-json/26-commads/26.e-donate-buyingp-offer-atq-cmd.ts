import jsonschema from 'jsonschema';

export const donateBuyingOfferAtqCmdSchema: jsonschema.Schema = {
    id: 'donate-buyingp-offer-atq-cmd',
    type: 'object',
    properties: {
        donation: {
            type: 'string'
        },
        isBuyingPremium: {
            type: 'string'
        },
        offer: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
