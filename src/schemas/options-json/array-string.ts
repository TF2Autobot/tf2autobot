import jsonschema from 'jsonschema';

export const stringArrayURLSchema: jsonschema.Schema = {
    id: 'array-string-url',
    type: 'array',
    items: {
        type: 'string',
        pattern: '^$|https://discord.com/api/webhooks/[0-9]+/[a-zA-Z0-9]+'
    },
    required: false
};
