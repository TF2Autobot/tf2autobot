import jsonschema from 'jsonschema';

export const gameSchema: jsonschema.Schema = {
    id: 'game',
    type: 'object',
    properties: {
        playOnlyTF2: {
            type: 'boolean'
        },
        customName: {
            type: 'string',
            maxLength: 60
        }
    },
    additionalProperties: false,
    required: []
};
