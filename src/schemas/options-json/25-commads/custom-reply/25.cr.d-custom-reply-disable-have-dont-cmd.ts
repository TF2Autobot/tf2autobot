import jsonschema from 'jsonschema';

export const customReplyDisabledHaveDontCmdSchema: jsonschema.Schema = {
    id: 'custom-reply-disabled-have-dont-cmd',
    type: 'object',
    properties: {
        disabled: {
            type: 'string'
        },
        dontHave: {
            type: 'string'
        },
        have: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: []
};
