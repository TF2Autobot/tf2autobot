import jsonschema from 'jsonschema';

export const scrapAdjustmentSchema: jsonschema.Schema = {
    id: 'scrapAdjustment-autokeys',
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
