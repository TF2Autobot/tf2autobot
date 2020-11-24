import jsonschema from 'jsonschema';

export const invalidValueSchema: jsonschema.Schema = {
    id: 'invalid-value',
    type: 'object',
    properties: {
        note: {
            type: 'string'
        },
        autoDecline: {
            $ref: 'auto-decline-invalid-value'
        },
        exceptionValue: {
            $ref: 'exception-value-invalid-value'
        }
    },
    additionalProperties: false,
    required: []
};
