import jsonschema from 'jsonschema';

export const discordWebhookSchema: jsonschema.Schema = {
    id: 'discord-webhook',
    type: 'object',
    properties: {
        ownerID: {
            type: 'string',
            pattern: '^$|^[0-9]+$'
        },
        displayName: {
            type: 'string'
        },
        avatarURL: {
            type: 'string'
        },
        embedColor: {
            type: 'string',
            pattern: '^[0-9]+$'
        },
        tradeSummary: {
            $ref: 'trade-summary'
        },
        offerReview: {
            $ref: 'offer-review'
        },
        messages: {
            $ref: 'messages'
        },
        priceUpdate: {
            $ref: 'price-update'
        },
        sendAlert: {
            $ref: 'send-alert'
        }
    },
    additionalProperties: false,
    required: []
};
