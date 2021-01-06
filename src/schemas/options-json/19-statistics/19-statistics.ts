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
        },
        lastTotalProfitMadeInRef: {
            type: 'number'
        },
        lastTotalProfitOverpayInRef: {
            type: 'number'
        },
        profitDataSinceInUnix: {
            type: 'number'
        },
        sendStats: {
            $ref: 'send-stats-st'
        }
    },
    additionalProperties: false,
    required: []
};
