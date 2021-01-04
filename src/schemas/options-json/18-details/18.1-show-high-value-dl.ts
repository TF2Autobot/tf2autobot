import jsonschema from 'jsonschema';

export const highValueDetailsSchema: jsonschema.Schema = {
    id: 'show-high-value-dl',
    type: 'object',
    properties: {
        showSpells: {
            type: 'boolean'
        },
        showStrangeParts: {
            type: 'boolean'
        },
        showKillstreaker: {
            type: 'boolean'
        },
        showSheen: {
            type: 'boolean'
        },
        showPainted: {
            type: 'boolean'
        }
    },
    additionalProperties: false,
    required: []
};
