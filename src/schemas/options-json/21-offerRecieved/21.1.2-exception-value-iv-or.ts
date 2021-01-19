import jsonschema from 'jsonschema';

export const exceptionValueIvOrSchema: jsonschema.Schema = {
    id: 'exception-value-iv-or',
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
