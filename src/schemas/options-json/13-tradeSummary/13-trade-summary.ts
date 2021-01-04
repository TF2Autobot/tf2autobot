import jsonschema from 'jsonschema';

export const tradeSummarySchema: jsonschema.Schema = {
    id: 'trade-summary',
    type: 'object',
    properties: {
        showStockChanges: {
            type: 'boolean'
        },
        showTimeTakenInMS: {
            type: 'boolean'
        },
        showItemPrices: {
            type: 'boolean'
        }
    },
    additionalProperties: false,
    required: []
};
