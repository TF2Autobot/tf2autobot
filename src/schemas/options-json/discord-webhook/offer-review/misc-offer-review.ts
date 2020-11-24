import jsonschema from 'jsonschema';

export const miscOfferReviewSchema: jsonschema.Schema = {
    id: 'misc-offer-review',
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
        }
    },
    additionalProperties: false,
    required: []
};
