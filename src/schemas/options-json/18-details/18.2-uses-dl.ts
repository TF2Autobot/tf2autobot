import jsonschema from 'jsonschema';

export const usesDetailsSchema: jsonschema.Schema = {
    id: 'uses-dl',
    type: 'object',
    properties: {
        duel: {
            type: 'string'
        },
        noiseMaker: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
