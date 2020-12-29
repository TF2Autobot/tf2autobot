import jsonschema from 'jsonschema';

export const sheensDxSchema: jsonschema.Schema = {
    id: 'sheens-dx',
    type: 'object',
    properties: {
        'Team Shine': {
            type: 'string'
        },
        'Hot Rod': {
            type: 'string'
        },
        Manndarin: {
            type: 'string'
        },
        'Deadly Daffodil': {
            type: 'string'
        },
        'Mean Green': {
            type: 'string'
        },
        'Agonizing Emerald': {
            type: 'string'
        },
        'Villainous Violet': {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
