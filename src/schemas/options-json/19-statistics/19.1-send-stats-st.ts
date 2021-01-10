import jsonschema from 'jsonschema';

export const sendStatsStSchema: jsonschema.Schema = {
    id: 'send-stats-st',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        time: {
            type: 'array-string'
        }
    },
    additionalProperties: false,
    required: []
};
