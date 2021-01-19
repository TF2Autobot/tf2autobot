import jsonschema from 'jsonschema';

export const stockCmdSchema: jsonschema.Schema = {
    id: 'stock-cmd',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        maximumItems: {
            type: 'integer',
            maximum: 400
        },
        customReply: {
            $ref: 'custom-reply-disabled-reply-cmd' // 26.cr.c
        }
    },
    additionalProperties: false,
    required: []
};
