import jsonschema from 'jsonschema';

export const weaponsCmdSchema: jsonschema.Schema = {
    id: 'weapons-cmd',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        customReply: {
            $ref: 'custom-reply-disable-have-dont-cmd' // 26.cr.d
        }
    },
    additionalProperties: false,
    required: []
};
