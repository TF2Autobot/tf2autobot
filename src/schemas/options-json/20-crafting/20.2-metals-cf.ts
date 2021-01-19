import jsonschema from 'jsonschema';

export const metalsSchema: jsonschema.Schema = {
    id: 'metals-cf',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        minScrap: {
            type: 'integer'
        },
        minRec: {
            type: 'integer'
        },
        threshold: {
            type: 'integer'
        }
    },
    additionalProperties: false,
    required: []
};
