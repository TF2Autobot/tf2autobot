import jsonschema from 'jsonschema';

export const highValueSchema: jsonschema.Schema = {
    id: 'high-value',
    type: 'object',
    properties: {
        enableHold: {
            type: 'boolean'
        },
        sheens: {
            $ref: 'array-string',
            maxItems: 7
        },
        killstreakers: {
            $ref: 'array-string',
            maxItems: 7
        },
        strangeParts: {
            $ref: 'array-string'
        }
    },
    additionalProperties: false,
    required: []
};
