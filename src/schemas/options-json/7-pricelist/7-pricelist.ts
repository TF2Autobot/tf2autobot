import jsonschema from 'jsonschema';

export const pricelistSchema: jsonschema.Schema = {
    id: 'pricelist',
    type: 'object',
    properties: {
        autoRemoveIntentSell: {
            $ref: 'only-enable'
        },
        autoAddInvalidItems: {
            $ref: 'only-enable'
        },
        priceAge: {
            $ref: 'price-age'
        }
    },
    additionalProperties: false,
    required: []
};
