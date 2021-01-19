import jsonschema from 'jsonschema';

export const escrowBannedCheckFailedOrSchema: jsonschema.Schema = {
    id: 'escrow-banned-check-failed-or',
    type: 'object',
    properties: {
        ignoreFailed: {
            type: 'boolean'
        }
    },
    additionalProperties: false,
    required: []
};
