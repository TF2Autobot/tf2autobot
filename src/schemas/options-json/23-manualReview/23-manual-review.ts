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
            $ref: 'only-note'
        },
        invalidItems: {
            $ref: 'only-note'
        },
        disabledItems: {
            $ref: 'only-note'
        },
        overstocked: {
            $ref: 'only-note'
        },
        understocked: {
            $ref: 'only-note'
        },
        duped: {
            $ref: 'only-note'
        },
        dupedCheckFailed: {
            $ref: 'only-note'
        },
        escrowCheckFailed: {
            $ref: 'only-note'
        },
        bannedCheckFailed: {
            $ref: 'only-note'
        },
        additionalNotes: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
