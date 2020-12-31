import jsonschema from 'jsonschema';

export const offerReceivedSchema: jsonschema.Schema = {
    id: 'offer-received',
    type: 'object',
    properties: {
        invalidValue: {
            $ref: 'invalid-value-or'
        },
        invalidItems: {
            $ref: 'invalid-items-or'
        },
        overstocked: {
            $ref: 'overstocked-understocked-or'
        },
        understocked: {
            $ref: 'overstocked-understocked-or'
        },
        duped: {
            $ref: 'duped-or'
        },
        escrowCheckFailed: {
            $ref: 'escrow-banned-check-failed-or'
        },
        bannedCheckFailed: {
            $ref: 'escrow-banned-check-failed-or'
        }
    },
    additionalProperties: false,
    required: []
};
