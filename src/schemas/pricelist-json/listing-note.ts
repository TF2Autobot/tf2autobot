import jsonschema from 'jsonschema';

export const listingSchema: jsonschema.Schema = {
    id: 'listing-note',
    type: 'object',
    properties: {
        buy: {
            anyOf: [
                {
                    type: 'string',
                    maxLength: 180
                },
                {
                    type: 'null'
                }
            ]
        },
        sell: {
            anyOf: [
                {
                    type: 'string',
                    maxLength: 180
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
