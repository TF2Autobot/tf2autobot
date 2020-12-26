import jsonschema from 'jsonschema';

export const manualReviewSchema: jsonschema.Schema = {
    id: 'manual-review',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        showOfferSummary: {
            type: 'boolean'
        },
        showReviewOfferNote: {
            type: 'boolean'
        },
        showOwnerCurrentTime: {
            type: 'boolean'
        },
        showItemPrices: {
            type: 'boolean'
        },
        invalidValue: {
            $ref: 'invalid-value'
        },
        invalidItems: {
            $ref: 'invalid-items'
        },
        overstocked: {
            $ref: 'overstocked-understocked'
        },
        understocked: {
            $ref: 'overstocked-understocked'
        },
        duped: {
            $ref: 'duped'
        },
        dupedCheckFailed: {
            $ref: 'duped-check-failed'
        },
        additionalNotes: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
