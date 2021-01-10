import jsonschema from 'jsonschema';

export const offerReviewDWSchema: jsonschema.Schema = {
    id: 'offer-review-dw',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        url: {
            type: 'string'
        },
        mentionInvalidValue: {
            type: 'boolean'
        },
        misc: {
            $ref: 'misc-offer-review-dw'
        }
    },
    additionalProperties: false,
    required: []
};
