import jsonschema from 'jsonschema';

export const killstreakersDxSchema: jsonschema.Schema = {
    id: 'killstreakers-dx',
    type: 'object',
    properties: {
        'Cerebral Discharge': {
            type: 'string'
        },
        'Fire Horns': {
            type: 'string'
        },
        Flames: {
            type: 'string'
        },
        'Hypno-Beam': {
            type: 'string'
        },
        Incinerator: {
            type: 'string'
        },
        Singularity: {
            type: 'string'
        },
        Tornado: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
