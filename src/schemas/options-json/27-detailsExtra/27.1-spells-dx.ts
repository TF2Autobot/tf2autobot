import jsonschema from 'jsonschema';

export const spellsDxSchema: jsonschema.Schema = {
    id: 'spells-dx',
    type: 'object',
    properties: {
        'Putrescent Pigmentation': {
            type: 'string'
        },
        'Die Job': {
            type: 'string'
        },
        'Chromatic Corruption': {
            type: 'string'
        },
        'Spectral Spectrum': {
            type: 'string'
        },
        'Sinister Staining': {
            type: 'string'
        },
        'Voices From Below': {
            type: 'string'
        },
        'Team Spirit Footprints': {
            type: 'string'
        },
        'Gangreen Footprints': {
            type: 'string'
        },
        'Corpse Gray Footprints': {
            type: 'string'
        },
        'Violent Violet Footprints': {
            type: 'string'
        },
        'Rotten Orange Footprints': {
            type: 'string'
        },
        'Bruised Purple Footprints': {
            type: 'string'
        },
        'Headless Horseshoes': {
            type: 'string'
        },
        Exorcism: {
            type: 'string'
        },
        'Pumpkin Bomb': {
            type: 'string'
        },
        'Halloween Fire': {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
