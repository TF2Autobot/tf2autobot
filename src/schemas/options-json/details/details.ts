import jsonschema from 'jsonschema';

export const detailsSchema: jsonschema.Schema = {
    id: 'details',
    type: 'object',
    properties: {
        buy: {
            type: 'string',
            maxLength: 200
        },
        sell: {
            type: 'string',
            maxLength: 200
        }
    },
    additionalProperties: false,
    required: []
};
