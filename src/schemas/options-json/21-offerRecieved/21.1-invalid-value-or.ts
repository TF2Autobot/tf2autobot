import jsonschema from 'jsonschema';

export const invalidValueOrSchema: jsonschema.Schema = {
    id: 'invalid-value-or',
    type: 'object',
    properties: {
        autoDecline: {
            $ref: 'auto-decline-or'
        },
        exceptionValue: {
            $ref: 'exception-value-iv-or'
        }
    },
    additionalProperties: false,
    required: []
};
