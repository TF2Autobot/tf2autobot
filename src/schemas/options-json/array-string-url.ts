import jsonschema from 'jsonschema';

export const stringArrayURLSchema: jsonschema.Schema = {
    id: 'array-string-url',
    type: 'array',
    items: {
        type: 'string',
        pattern: '^$|https://discord(app)?.com/api/webhooks/[0-9]+/(.)+'
    },
    required: false,
    additionalProperties: false
};
