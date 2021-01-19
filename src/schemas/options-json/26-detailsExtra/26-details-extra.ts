import jsonschema from 'jsonschema';

export const detailsExtraSchema: jsonschema.Schema = {
    id: 'details-extra',
    type: 'object',
    properties: {
        spells: {
            $ref: 'spells-dx'
        },
        sheens: {
            $ref: 'sheens-dx'
        },
        killstreakers: {
            $ref: 'killstreakers-dx'
        },
        painted: {
            $ref: 'painted-dx'
        },
        strangeParts: {
            $ref: 'strange-parts-dx'
        }
    },
    additionalProperties: false,
    required: []
};
