import jsonschema from 'jsonschema';

export const statisticsSchema: jsonschema.Schema = {
    id: 'statistics',
    type: 'object',
    properties: {
        starter: {
            type: 'integer'
        },
        lastTotalTrades: {
            type: 'integer'
        },
        startingTimeInUnix: {
            type: 'integer'
        }
    },
    additionalProperties: false,
    required: []
};
