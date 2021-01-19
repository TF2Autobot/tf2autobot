import jsonschema from 'jsonschema';

export const stringArrayURLSchema: jsonschema.Schema = {
    id: 'array-string-url',
    type: 'array',
    items: {
        type: 'string',
        pattern: '^$|https://discord.com/api/webhooks/'
    },
    required: false
};
