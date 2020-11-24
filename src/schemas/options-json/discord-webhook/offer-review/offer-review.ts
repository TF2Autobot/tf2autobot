import jsonschema from 'jsonschema';

export const offerReviewSchema: jsonschema.Schema = {
    id: 'offer-review',
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
            $ref: 'misc-offer-review'
        }
    },
    additionalProperties: false,
    required: []
};
