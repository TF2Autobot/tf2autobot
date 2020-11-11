import jsonschema from 'jsonschema';

export const listingSchema: jsonschema.Schema = {
    id: 'listing-note',
    type: 'object',
    properties: {
        buy: {
            anyOf: [
                {
                    type: 'string'
                },
                {
                    type: 'null'
                }
            ]
        },
        sell: {
            anyOf: [
                {
                    type: 'string'
                },
                {
                    type: 'null'
                }
            ]
        }
    },
    additionalProperties: false,
    required: []
};
