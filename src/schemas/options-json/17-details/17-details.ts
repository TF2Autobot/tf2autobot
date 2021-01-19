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
        },
        highValue: {
            $ref: 'show-high-value-dl'
        },
        uses: {
            $ref: 'uses-dl'
        }
    },
    additionalProperties: false,
    required: []
};
