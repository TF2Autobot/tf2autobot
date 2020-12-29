import jsonschema from 'jsonschema';

export const onlyEnableSchema: jsonschema.Schema = {
    id: 'only-enable',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        }
    },
    additionalProperties: false,
    required: []
};
