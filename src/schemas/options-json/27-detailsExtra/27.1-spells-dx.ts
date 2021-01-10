import jsonschema from 'jsonschema';

export const spellsDxSchema: jsonschema.Schema = {
    id: 'spells-dx',
    type: 'object',
    properties: {
        PP: {
            type: 'string'
        },
        DJ: {
            type: 'string'
        },
        CC: {
            type: 'string'
        },
        Spec: {
            type: 'string'
        },
        Sin: {
            type: 'string'
        },
        VFB: {
            type: 'string'
        },
        'TS-FP': {
            type: 'string'
        },
        'GG-FP': {
            type: 'string'
        },
        'CG-FP': {
            type: 'string'
        },
        'VV-FP': {
            type: 'string'
        },
        'RO-FP': {
            type: 'string'
        },
        'BP-FP': {
            type: 'string'
        },
        HH: {
            type: 'string'
        },
        Ex: {
            type: 'string'
        },
        PB: {
            type: 'string'
        },
        HF: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
