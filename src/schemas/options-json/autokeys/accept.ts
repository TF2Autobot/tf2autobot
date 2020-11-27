import jsonschema from 'jsonschema';

export const acceptSchema: jsonschema.Schema = {
    id: 'accept-autokeys',
    type: 'object',
    properties: {
        understock: {
            type: 'boolean'
        }
    },
    additionalProperties: false,
    required: []
};
