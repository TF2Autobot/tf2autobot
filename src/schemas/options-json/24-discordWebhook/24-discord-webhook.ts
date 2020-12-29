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
            $ref: 'trade-summary-dw'
        },
        offerReview: {
            $ref: 'offer-review-dw'
        },
        messages: {
            $ref: 'messages-dw'
        },
        priceUpdate: {
            $ref: 'price-update-dw'
        },
        sendAlert: {
            $ref: 'send-alert-dw'
        }
    },
    additionalProperties: false,
    required: []
};
