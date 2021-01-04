import jsonschema from 'jsonschema';

export const onlyAllowSchema: jsonschema.Schema = {
    id: 'only-allow',
    type: 'object',
    properties: {
        allow: {
            type: 'boolean'
        }
    },
    additionalProperties: false,
    required: []
};
