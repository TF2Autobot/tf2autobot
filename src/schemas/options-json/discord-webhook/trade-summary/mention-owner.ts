import jsonschema from 'jsonschema';

export const mentionOwnerSchema: jsonschema.Schema = {
    id: 'mention-owner',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        itemSkus: {
            $ref: 'array-string'
        }
    },
    additionalProperties: false,
    required: []
};
