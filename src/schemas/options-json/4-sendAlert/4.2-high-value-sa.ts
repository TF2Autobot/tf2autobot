import jsonschema from 'jsonschema';

export const highValueSaSchema: jsonschema.Schema = {
    id: 'high-value-sa',
    type: 'object',
    properties: {
        gotDisabled: {
            type: 'boolean'
        },
        receivedNotInPricelist: {
            type: 'boolean'
        },
        tryingToTake: {
            type: 'boolean'
        }
    },
    additionalProperties: false,
    required: []
};
