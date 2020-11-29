import jsonschema from 'jsonschema';

export const bankingSchema: jsonschema.Schema = {
    id: 'banking-autokeys',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        }
    },
    additionalProperties: false,
    required: []
};
