import jsonschema from 'jsonschema';

export const exceptionValueIVSchema: jsonschema.Schema = {
    id: 'exception-value-invalid-value',
    type: 'object',
    properties: {
        skus: {
            $ref: 'array-string'
        },
        valueInRef: {
            type: 'number'
        }
    },
    additionalProperties: false,
    required: []
};
