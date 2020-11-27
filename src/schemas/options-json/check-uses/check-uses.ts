import jsonschema from 'jsonschema';

export const checkUsesSchema: jsonschema.Schema = {
    id: 'check-uses',
    type: 'object',
    properties: {
        duel: {
            type: 'boolean'
        },
        noiseMaker: {
            type: 'boolean'
        }
    },
    additionalProperties: false,
    required: []
};
