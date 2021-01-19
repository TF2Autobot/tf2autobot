import jsonschema from 'jsonschema';

export const priceAgeSchema: jsonschema.Schema = {
    id: 'price-age',
    type: 'object',
    properties: {
        maxInSeconds: {
            type: 'integer'
        }
    },
    additionalProperties: false,
    required: []
};
