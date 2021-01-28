import jsonschema from 'jsonschema';

export const currenciesSchema: jsonschema.Schema = {
    id: 'tf2-currencies',
    type: 'object',
    properties: {
        keys: {
            type: 'integer',
            minimum: 0
        },
        metal: {
            type: 'number',
            minimum: 0
        }
    },
    additionalProperties: false,
    required: ['keys', 'metal']
};
