import jsonschema from 'jsonschema';

export const scrapAdjustmentSchema: jsonschema.Schema = {
    id: 'scrap-adjustment-ak',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        value: {
            type: 'integer'
        }
    },
    additionalProperties: false,
    required: []
};
