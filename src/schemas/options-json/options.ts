import jsonschema from 'jsonschema';

export const optionsSchema: jsonschema.Schema = {
    id: 'options',
    type: 'object',
    properties: {
        showOnlyMetal: {
            $ref: 'only-enable'
        },
        sortInventory: {
            $ref: 'sort-inventory'
        },
        createListings: {
            $ref: 'only-enable'
        },
        sendAlert: {
            $ref: 'send-alert'
        },
        addFriends: {
            $ref: 'only-enable'
        },
        sendGroupInvite: {
            $ref: 'only-enable'
        },
        pricelist: {
            $ref: 'pricelist'
        },
        bypass: {
            $ref: 'bypass'
        },
        autobump: {
            $ref: 'only-enable'
        },
        skipItemsInTrade: {
            $ref: 'only-enable'
        },
        weaponsAsCurrency: {
            $ref: 'weapons-as-currency'
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
        statistics: {
            $ref: 'statistics'
        },
        autokeys: {
            $ref: 'autokeys'
        },
        crafting: {
            $ref: 'crafting'
        },
        offerReceived: {
            $ref: 'offer-received'
        },
        manualReview: {
            $ref: 'manual-review'
        },
        discordWebhook: {
            $ref: 'discord-webhook'
        },
        customMessage: {
            $ref: 'custom-message'
        },
        commands: {
            $ref: 'commands'
        },
        detailsExtra: {
            $ref: 'details-extra'
        }
    },
    additionalProperties: false,
    required: []
};
