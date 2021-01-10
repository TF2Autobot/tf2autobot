import jsonschema from 'jsonschema';

export const tradeSummaryDWSchema: jsonschema.Schema = {
    id: 'trade-summary-dw',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        url: {
            $ref: 'array-string'
        },
        misc: {
            $ref: 'misc-trade-summary-dw'
        },
        mentionOwner: {
            $ref: 'mention-owner-dw'
        }
    },
    additionalProperties: false,
    required: []
};
