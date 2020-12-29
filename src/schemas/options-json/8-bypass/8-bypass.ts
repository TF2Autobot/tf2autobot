import jsonschema from 'jsonschema';

export const bypassSchema: jsonschema.Schema = {
    id: 'bypass',
    type: 'object',
    properties: {
        escrow: {
            $ref: 'only-allow'
        },
        overpay: {
            $ref: 'only-allow'
        },
        giftWithoutMessage: {
            $ref: 'only-allow'
        },
        bannedPeople: {
            $ref: 'only-allow'
        }
    },
    additionalProperties: false,
    required: []
};
