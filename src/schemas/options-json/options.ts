import jsonschema from 'jsonschema';

export const optionsSchema: jsonschema.Schema = {
    id: 'options',
    type: 'object',
    properties: {
        showOnlyMetal: {
            type: 'boolean'
        },
        sortInventory: {
            type: 'boolean'
        },
        createListings: {
            type: 'boolean'
        },
        enableMessages: {
            type: 'boolean'
        },
        sendAlert: {
            type: 'boolean'
        },
        enableAddFriends: {
            type: 'boolean'
        },
        enableGroupInvites: {
            type: 'boolean'
        },
        enableOwnerCommand: {
            type: 'boolean'
        },
        autoRemoveIntentSell: {
            type: 'boolean'
        },
        enableCraftweaponAsCurrency: {
            type: 'boolean'
        },
        allowEscrow: {
            type: 'boolean'
        },
        allowOverpay: {
            type: 'boolean'
        },
        allowGiftNoMessage: {
            type: 'boolean'
        },
        allowBanned: {
            type: 'boolean'
        },
        sendOfferMessage: {
            type: 'string'
        },
        autobump: {
            type: 'boolean'
        },
        tradeSummary: {
            $ref: 'trade-summary'
        },
        highValue: {
            $ref: 'high-value'
        },
        checkUses: {
            $ref: 'check-uses'
        },
        game: {
            $ref: 'game'
        },
        normalize: {
            $ref: 'normalize'
        },
        details: {
            $ref: 'details'
        },
        customMessage: {
            $ref: 'custom-message'
        },
        statistics: {
            $ref: 'statistics'
        },
        autokeys: {
            $ref: 'autokeys'
        },
        crafting: {
            $ref: 'crafting'
        },
        manualReview: {
            $ref: 'manual-review'
        },
        discordInviteLink: {
            type: 'string'
        },
        discordWebhook: {
            $ref: 'discord-webhook'
        },
        maxPriceAge: {
            type: 'number'
        }
    },
    additionalProperties: false,
    required: []
};
