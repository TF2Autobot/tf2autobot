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
            $ref: 'banking-ak'
        },
        scrapAdjustment: {
            $ref: 'scrap-adjustment-ak'
        },
        accept: {
            $ref: 'accept-ak'
        }
    },
    additionalProperties: false,
    required: []
};
