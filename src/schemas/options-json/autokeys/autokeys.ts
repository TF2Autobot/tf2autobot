import jsonschema from 'jsonschema';

export const autokeysSchema: jsonschema.Schema = {
    id: 'autokeys',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        minKeys: {
            type: 'integer'
        },
        maxKeys: {
            type: 'integer'
        },
        minRefined: {
            type: 'number'
        },
        maxRefined: {
            type: 'number'
        },
        banking: {
            $ref: 'banking-autokeys'
        },
        scrapAdjustment: {
            $ref: 'scrapAdjustment-autokeys'
        },
        accept: {
            $ref: 'accept-autokeys'
        }
    },
    additionalProperties: false,
    required: []
};
