import jsonschema from 'jsonschema';

export const miscTradeSummarySchema: jsonschema.Schema = {
    id: 'misc-trade-summary',
    type: 'object',
    properties: {
        showQuickLinks: {
            type: 'boolean'
        },
        showKeyRate: {
            type: 'boolean'
        },
        showPureStock: {
            type: 'boolean'
        },
        showInventory: {
            type: 'boolean'
        },
        note: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
