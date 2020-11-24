import jsonschema from 'jsonschema';

export const tradeSummarySchema: jsonschema.Schema = {
    id: 'trade-summary',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        url: {
            $ref: 'array-string'
        },
        misc: {
            $ref: 'misc-trade-summary'
        },
        mentionOwner: {
            $ref: 'mention-owner'
        }
    },
    additionalProperties: false,
    required: []
};
