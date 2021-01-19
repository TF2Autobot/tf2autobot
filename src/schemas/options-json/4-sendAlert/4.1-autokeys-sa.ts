import jsonschema from 'jsonschema';

export const autokeysSaSchema: jsonschema.Schema = {
    id: 'autokeys-sa',
    type: 'object',
    properties: {
        lowPure: {
            type: 'boolean'
        },
        failedToAdd: {
            type: 'boolean'
        },
        failedToUpdate: {
            type: 'boolean'
        },
        failedToDisable: {
            type: 'boolean'
        }
    },
    additionalProperties: false,
    required: []
};
