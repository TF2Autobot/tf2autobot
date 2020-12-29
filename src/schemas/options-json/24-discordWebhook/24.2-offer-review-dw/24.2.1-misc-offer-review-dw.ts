import jsonschema from 'jsonschema';

export const miscOfferReviewDWSchema: jsonschema.Schema = {
    id: 'misc-offer-review-dw',
    type: 'object',
    properties: {
        showQuickLinks: {
            type: 'boolean'
        },
        showKeyRate: {
            type: 'boolean'
        },
        showPureStock: {
            type: 'boolean'
        },
        showInventory: {
            type: 'boolean'
        }
    },
    additionalProperties: false,
    required: []
};
