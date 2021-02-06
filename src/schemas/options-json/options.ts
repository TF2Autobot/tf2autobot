import jsonschema from 'jsonschema';

export const optionsSchema: jsonschema.Schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    definitions: {
        'only-enable': {
            type: 'object',
            properties: {
                enable: {
                    type: 'boolean'
                }
            },
            required: ['enable']
        },
        'normalize-which': {
            type: 'object',
            properties: {
                our: {
                    type: 'boolean'
                },
                their: {
                    type: 'boolean'
                }
            },
            required: ['our', 'their'],
            additionalProperties: false
        },
        'only-allow': {
            type: 'object',
            properties: {
                allow: {
                    type: 'boolean'
                }
            },
            required: ['allow'],
            additionalProperties: false
        },
        'only-enable-declineReply': {
            properties: {
                enable: {
                    type: 'boolean'
                },
                declineReply: {
                    type: 'string'
                }
            },
            required: ['enable', 'declineReply'],
            additionalProperties: false
        },
        'only-autoAcceptOverpay-autoDecline': {
            type: 'object',
            properties: {
                autoAcceptOverpay: {
                    type: 'boolean'
                },
                autoDecline: {
                    $ref: '#/definitions/only-enable-declineReply'
                }
            },
            required: ['autoAcceptOverpay', 'autoDecline']
        },
        'only-ignore-failed': {
            type: 'object',
            properties: {
                ignoreFailed: {
                    type: 'boolean'
                }
            },
            required: ['ignoreFailed'],
            additionalProperties: false
        },
        'only-note': {
            type: 'object',
            properties: {
                note: {
                    type: 'string'
                }
            },
            required: ['note']
        },
        'discord-webhook-misc': {
            type: 'object',
            properties: {
                showQuickLinks: {
                    type: 'boolean'
                },
                showKeyRate: {
                    type: 'boolean'
                },
                showPureStock: {
                    type: 'boolean'
                },
                showInventory: {
                    type: 'boolean'
                }
            },
            required: ['showQuickLinks', 'showKeyRate', 'showPureStock', 'showInventory']
        },
        'discord-webhook-enable-url': {
            type: 'object',
            properties: {
                enable: {
                    type: 'boolean'
                },
                url: {
                    type: 'string',
                    pattern: '^$|https://discord(app)?.com/api/webhooks/[0-9]+/(.)+'
                }
            },
            required: ['enable', 'url']
        },
        'only-customReply-reply': {
            type: 'object',
            properties: {
                customReply: {
                    type: 'object',
                    properties: {
                        reply: {
                            type: 'string'
                        }
                    },
                    required: ['reply'],
                    additionalProperties: false
                }
            },
            required: ['customReply'],
            additionalProperties: false
        },
        'only-disabled': {
            type: 'object',
            properties: {
                disabled: {
                    type: 'string'
                }
            },
            required: ['disabled']
        },
        'only-enable-customReply-disabled': {
            type: 'object',
            properties: {
                enable: {
                    type: 'boolean'
                },
                customReply: {
                    $ref: '#/definitions/only-disabled'
                }
            },
            required: ['enable', 'customReply'],
            additionalProperties: false
        },
        'cmd-buy-sell': {
            type: 'object',
            properties: {
                enable: {
                    type: 'boolean'
                },
                disableForSKU: {
                    $schema: '#/definitions/stringArray'
                },
                customReply: {
                    type: 'object',
                    properties: {
                        disabled: {
                            type: 'string'
                        },
                        disabledForSKU: {
                            type: 'string'
                        }
                    },
                    required: ['disabled', 'disabledForSKU'],
                    additionalProperties: false
                }
            },
            required: ['enable', 'disableForSKU', 'customReply'],
            additionalProperties: false
        },
        'only-enabled-disabled-reply': {
            type: 'object',
            properties: {
                enable: {
                    type: 'boolean'
                },
                customReply: {
                    properties: {
                        reply: {
                            type: 'string'
                        },
                        disabled: {
                            type: 'string'
                        }
                    },
                    required: ['reply', 'disabled'],
                    additionalProperties: false
                }
            },
            required: ['enable', 'customReply'],
            additionalProperties: false
        },
        'cmd-weapons': {
            type: 'object',
            properties: {
                enable: {
                    type: 'boolean'
                },
                customReply: {
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
                    required: ['disabled', 'dontHave', 'have']
                }
            },
            required: ['enable', 'customReply'],
            additionalProperties: false
        },
        'processing-accepting': {
            type: 'object',
            properties: {
                donation: {
                    type: 'string'
                },
                isBuyingPremium: {
                    type: 'string'
                },
                offer: {
                    type: 'string'
                }
            },
            required: ['donation', 'isBuyingPremium', 'offer'],
            additionalProperties: false
        },
        'painted-properties': {
            type: 'object',
            properties: {
                stringNote: {
                    type: 'string'
                },
                price: {
                    $ref: 'tf2-currencies'
                }
            },
            required: ['stringNote', 'price'],
            additionalProperties: false
        },
        'large-or-small-offer': {
            type: 'object',
            properties: {
                largeOffer: {
                    type: 'string'
                },
                smallOffer: {
                    type: 'string'
                }
            }
        }
    },
    properties: {
        miscSettings: {
            type: 'object',
            properties: {
                showOnlyMetal: {
                    $ref: '#/definitions/only-enable'
                },
                sortInventory: {
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        type: {
                            anyOf: [
                                {
                                    // 1 - by name, 2 - by defindex, 3 - by rarity, 4 - by type, 5 - by date
                                    minimum: 1,
                                    maximum: 5
                                },
                                {
                                    const: 101 // by class
                                },
                                {
                                    const: 102 // by slot
                                }
                            ]
                        }
                    },
                    required: ['enable', 'type'],
                    additionalProperties: false
                },
                createListings: {
                    $ref: '#/definitions/only-enable'
                },
                addFriends: {
                    $ref: '#/definitions/only-enable'
                },
                sendGroupInvite: {
                    $ref: '#/definitions/only-enable'
                },
                autobump: {
                    $ref: '#/definitions/only-enable'
                },
                skipItemsInTrade: {
                    $ref: '#/definitions/only-enable'
                },
                weaponsAsCurrency: {
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        withUncraft: {
                            type: 'boolean'
                        }
                    },
                    required: ['enable', 'withUncraft'],
                    additionalProperties: false
                },
                checkUses: {
                    type: 'object',
                    properties: {
                        duel: {
                            type: 'boolean'
                        },
                        noiseMaker: {
                            type: 'boolean'
                        }
                    },
                    required: ['duel', 'noiseMaker'],
                    additionalProperties: false
                },
                game: {
                    type: 'object',
                    properties: {
                        playOnlyTF2: {
                            type: 'boolean'
                        },
                        customName: {
                            type: 'string',
                            maxLength: 60
                        }
                    },
                    required: ['playOnlyTF2', 'customName'],
                    additionalProperties: false
                }
            },
            required: [
                'showOnlyMetal',
                'sortInventory',
                'createListings',
                'addFriends',
                'sendGroupInvite',
                'autobump',
                'skipItemsInTrade',
                'weaponsAsCurrency',
                'checkUses',
                'game'
            ]
        },
        sendAlert: {
            properties: {
                enable: {
                    type: 'boolean'
                },
                autokeys: {
                    type: 'object',
                    properties: {
                        lowPure: {
                            type: 'boolean'
                        },
                        failedToAdd: {
                            type: 'boolean'
                        },
                        failedToUpdate: {
                            type: 'boolean'
                        },
                        failedToDisable: {
                            type: 'boolean'
                        }
                    },
                    required: ['lowPure', 'failedToAdd', 'failedToUpdate', 'failedToDisable']
                },
                backpackFull: {
                    type: 'boolean'
                },
                highValue: {
                    type: 'object',
                    properties: {
                        gotDisabled: {
                            type: 'boolean'
                        },
                        receivedNotInPricelist: {
                            type: 'boolean'
                        },
                        tryingToTake: {
                            type: 'boolean'
                        }
                    },
                    required: ['gotDisabled', 'receivedNotInPricelist', 'tryingToTake']
                },
                autoRemoveIntentSellFailed: {
                    type: 'boolean'
                },
                autoAddPaintedItems: {
                    type: 'boolean'
                },
                failedAccept: {
                    type: 'boolean'
                }
            },
            required: [
                'enable',
                'autokeys',
                'backpackFull',
                'highValue',
                'autoRemoveIntentSellFailed',
                'autoAddPaintedItems',
                'failedAccept'
            ],
            additionalProperties: false
        },
        pricelist: {
            type: 'object',
            properties: {
                autoRemoveIntentSell: {
                    $ref: '#/definitions/only-enable'
                },
                autoAddInvalidItems: {
                    $ref: '#/definitions/only-enable'
                },
                autoAddPaintedItems: {
                    $ref: '#/definitions/only-enable'
                },
                priceAge: {
                    type: 'object',
                    properties: {
                        maxInSeconds: {
                            type: 'integer',
                            minimum: 3600
                        }
                    },
                    required: ['maxInSeconds'],
                    additionalProperties: false
                }
            },
            required: ['autoRemoveIntentSell', 'autoAddInvalidItems', 'autoAddPaintedItems', 'priceAge']
        },
        bypass: {
            type: 'object',
            properties: {
                escrow: {
                    $ref: '#/definitions/only-allow'
                },
                overpay: {
                    $ref: '#/definitions/only-allow'
                },
                giftWithoutMessage: {
                    $ref: '#/definitions/only-allow'
                },
                bannedPeople: {
                    $ref: '#/definitions/only-allow'
                }
            },
            required: ['escrow', 'overpay', 'giftWithoutMessage', 'bannedPeople'],
            additionalProperties: false
        },
        tradeSummary: {
            type: 'object',
            properties: {
                showStockChanges: {
                    type: 'boolean'
                },
                showTimeTakenInMS: {
                    type: 'boolean'
                },
                showItemPrices: {
                    type: 'boolean'
                }
            },
            required: ['showStockChanges', 'showTimeTakenInMS', 'showItemPrices'],
            additionalProperties: false
        },
        highValue: {
            type: 'object',
            properties: {
                enableHold: {
                    type: 'boolean'
                },
                sheens: {
                    $schema: '#/definitions/stringArray',
                    maxItems: 7
                },
                killstreakers: {
                    $schema: '#/definitions/stringArray',
                    maxItems: 7
                },
                strangeParts: {
                    $schema: '#/definitions/stringArray'
                },
                painted: {
                    $schema: '#/definitions/stringArray'
                }
            },
            required: ['enableHold', 'sheens', 'killstreakers', 'strangeParts', 'painted'],
            additionalProperties: false
        },
        normalize: {
            type: 'object',
            properties: {
                festivized: {
                    $ref: '#/definitions/normalize-which'
                },
                strangeAsSecondQuality: {
                    $ref: '#/definitions/normalize-which'
                },
                painted: {
                    $ref: '#/definitions/normalize-which'
                }
            },
            required: ['festivized', 'strangeAsSecondQuality', 'painted'],
            additionalProperties: false
        },
        details: {
            type: 'object',
            properties: {
                buy: {
                    type: 'string',
                    maxLength: 200
                },
                sell: {
                    type: 'string',
                    maxLength: 200
                },
                highValue: {
                    type: 'object',
                    properties: {
                        showSpells: {
                            type: 'boolean'
                        },
                        showStrangeParts: {
                            type: 'boolean'
                        },
                        showKillstreaker: {
                            type: 'boolean'
                        },
                        showSheen: {
                            type: 'boolean'
                        },
                        showPainted: {
                            type: 'boolean'
                        }
                    },
                    required: ['showSpells', 'showStrangeParts', 'showKillstreaker', 'showSheen', 'showPainted'],
                    additionalProperties: false
                },
                uses: {
                    type: 'object',
                    properties: {
                        duel: {
                            type: 'string'
                        },
                        noiseMaker: {
                            type: 'string'
                        }
                    },
                    required: ['duel', 'noiseMaker'],
                    additionalProperties: false
                }
            },
            required: ['buy', 'sell', 'highValue', 'uses'],
            additionalProperties: false
        },
        statistics: {
            type: 'object',
            properties: {
                lastTotalTrades: {
                    $schema: '#/definitions/nonNegativeIntegerDefault0'
                },
                startingTimeInUnix: {
                    $schema: '#/definitions/nonNegativeIntegerDefault0'
                },
                lastTotalProfitMadeInRef: {
                    type: 'number'
                },
                lastTotalProfitOverpayInRef: {
                    type: 'number'
                },
                profitDataSinceInUnix: {
                    $schema: '#/definitions/nonNegativeIntegerDefault0'
                },
                sendStats: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        time: {
                            $schema: '#/definitions/stringArray'
                        }
                    },
                    required: ['enable', 'time'],
                    additionalProperties: false
                }
            },
            required: [
                'lastTotalTrades',
                'startingTimeInUnix',
                'lastTotalProfitMadeInRef',
                'lastTotalProfitOverpayInRef',
                'profitDataSinceInUnix',
                'sendStats'
            ],
            additionalProperties: false
        },
        autokeys: {
            properties: {
                enable: {
                    type: 'boolean'
                },
                minKeys: {
                    type: 'integer'
                },
                maxKeys: {
                    $schema: '#/definitions/nonNegativeInteger'
                },
                minRefined: {
                    type: 'number'
                },
                maxRefined: {
                    type: 'number'
                },
                banking: {
                    $ref: '#/definitions/only-enable'
                },
                scrapAdjustment: {
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        value: {
                            $schema: '#/definitions/nonNegativeIntegerDefault0'
                        }
                    },
                    required: ['enable', 'value'],
                    additionalProperties: false
                },
                accept: {
                    type: 'object',
                    properties: {
                        understock: {
                            type: 'boolean'
                        }
                    },
                    required: ['understock'],
                    additionalProperties: false
                }
            },
            required: [
                'enable',
                'minKeys',
                'maxKeys',
                'minRefined',
                'maxRefined',
                'banking',
                'scrapAdjustment',
                'accept'
            ],
            additionalProperties: false
        },
        crafting: {
            type: 'object',
            properties: {
                weapons: {
                    $ref: '#/definitions/only-enable'
                },
                metals: {
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        minScrap: {
                            $schema: '#/definitions/nonNegativeInteger'
                        },
                        minRec: {
                            $schema: '#/definitions/nonNegativeInteger'
                        },
                        threshold: {
                            $schema: '#/definitions/nonNegativeInteger'
                        }
                    },
                    required: ['enable', 'minScrap', 'minRec', 'threshold'],
                    additionalProperties: false
                }
            },
            required: ['weapons', 'metals'],
            additionalProperties: false
        },
        offerReceived: {
            type: 'object',
            properties: {
                invalidValue: {
                    type: 'object',
                    properties: {
                        autoDecline: {
                            $ref: '#/definitions/only-enable-declineReply'
                        },
                        exceptionValue: {
                            type: 'object',
                            properties: {
                                skus: {
                                    $schema: '#/definitions/stringArray'
                                },
                                valueInRef: {
                                    $schema: '#/definitions/nonNegativeInteger'
                                }
                            },
                            required: ['skus', 'valueInRef'],
                            additionalProperties: false
                        }
                    },
                    required: ['autoDecline', 'exceptionValue'],
                    additionalProperties: false
                },
                invalidItems: {
                    allOf: [
                        {
                            properties: {
                                givePrice: {
                                    type: 'boolean'
                                }
                            },
                            required: ['givePrice']
                        },
                        {
                            $ref: '#/definitions/only-autoAcceptOverpay-autoDecline'
                        }
                    ]
                },
                disabledItems: {
                    $ref: '#/definitions/only-autoAcceptOverpay-autoDecline'
                },
                overstocked: {
                    $ref: '#/definitions/only-autoAcceptOverpay-autoDecline'
                },
                understocked: {
                    $ref: '#/definitions/only-autoAcceptOverpay-autoDecline'
                },
                duped: {
                    type: 'object',
                    properties: {
                        enableCheck: {
                            type: 'boolean'
                        },
                        minKeys: {
                            type: 'number'
                        },
                        autoDecline: {
                            $ref: '#/definitions/only-enable-declineReply'
                        }
                    },
                    required: ['enableCheck', 'minKeys', 'autoDecline'],
                    additionalProperties: false
                },
                escrowCheckFailed: {
                    $ref: '#/definitions/only-ignore-failed'
                },
                bannedCheckFailed: {
                    $ref: '#/definitions/only-ignore-failed'
                }
            },
            required: [
                'invalidValue',
                'invalidItems',
                'disabledItems',
                'overstocked',
                'understocked',
                'duped',
                'escrowCheckFailed',
                'bannedCheckFailed'
            ],
            additionalProperties: false
        },
        manualReview: {
            type: 'object',
            properties: {
                enable: {
                    type: 'boolean'
                },
                showOfferSummary: {
                    type: 'boolean'
                },
                showReviewOfferNote: {
                    type: 'boolean'
                },
                showOwnerCurrentTime: {
                    type: 'boolean'
                },
                showItemPrices: {
                    type: 'boolean'
                },
                invalidValue: {
                    $ref: '#/definitions/only-note'
                },
                invalidItems: {
                    $ref: '#/definitions/only-note'
                },
                disabledItems: {
                    $ref: '#/definitions/only-note'
                },
                overstocked: {
                    $ref: '#/definitions/only-note'
                },
                understocked: {
                    $ref: '#/definitions/only-note'
                },
                duped: {
                    $ref: '#/definitions/only-note'
                },
                dupedCheckFailed: {
                    $ref: '#/definitions/only-note'
                },
                escrowCheckFailed: {
                    $ref: '#/definitions/only-note'
                },
                bannedCheckFailed: {
                    $ref: '#/definitions/only-note'
                },
                additionalNotes: {
                    type: 'string'
                }
            },
            required: [
                'enable',
                'showOfferSummary',
                'showReviewOfferNote',
                'showOwnerCurrentTime',
                'showItemPrices',
                'invalidValue',
                'invalidItems',
                'disabledItems',
                'overstocked',
                'understocked',
                'duped',
                'dupedCheckFailed',
                'escrowCheckFailed',
                'bannedCheckFailed',
                'additionalNotes'
            ],
            additionalProperties: false
        },
        discordWebhook: {
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
                    type: 'string',
                    pattern: '^$|(https?:|^)//'
                },
                embedColor: {
                    type: 'string',
                    pattern: '^[0-9]+$'
                },
                tradeSummary: {
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        url: {
                            $ref: 'array-string-url'
                        },
                        misc: {
                            allOf: [
                                {
                                    $ref: '#/definitions/discord-webhook-misc'
                                },
                                {
                                    $ref: '#/definitions/only-note'
                                }
                            ]
                        },
                        mentionOwner: {
                            properties: {
                                enable: {
                                    type: 'boolean'
                                },
                                itemSkus: {
                                    $schema: '#/definitions/stringArray'
                                },
                                tradeValueInRef: {
                                    type: 'number',
                                    minimum: 0
                                }
                            },
                            required: ['enable', 'itemSkus', 'tradeValueInRef'],
                            additionalProperties: false
                        }
                    },
                    required: ['enable', 'url', 'misc', 'mentionOwner'],
                    additionalProperties: false
                },
                offerReview: {
                    allOf: [
                        {
                            $ref: '#/definitions/discord-webhook-enable-url'
                        },
                        {
                            type: 'object',
                            properties: {
                                mentionInvalidValue: {
                                    type: 'boolean'
                                },
                                isMention: {
                                    type: 'boolean'
                                },
                                misc: {
                                    $ref: '#/definitions/discord-webhook-misc'
                                }
                            },
                            required: ['mentionInvalidValue', 'isMention', 'misc']
                        }
                    ]
                },
                messages: {
                    allOf: [
                        {
                            $ref: '#/definitions/discord-webhook-enable-url'
                        },
                        {
                            type: 'object',
                            properties: {
                                isMention: {
                                    type: 'boolean'
                                },
                                showQuickLinks: {
                                    type: 'boolean'
                                }
                            },
                            required: ['isMention', 'showQuickLinks']
                        }
                    ]
                },
                priceUpdate: {
                    allOf: [
                        {
                            $ref: '#/definitions/discord-webhook-enable-url'
                        },
                        {
                            $ref: '#/definitions/only-note'
                        }
                    ]
                },
                sendAlert: {
                    allOf: [
                        {
                            $ref: '#/definitions/discord-webhook-enable-url'
                        },
                        {
                            type: 'object',
                            properties: {
                                isMention: {
                                    type: 'boolean'
                                }
                            },
                            required: ['isMention']
                        }
                    ]
                },
                sendStats: {
                    $ref: '#/definitions/discord-webhook-enable-url'
                }
            },
            required: [
                'ownerID',
                'displayName',
                'avatarURL',
                'embedColor',
                'tradeSummary',
                'offerReview',
                'messages',
                'priceUpdate',
                'sendAlert',
                'sendStats'
            ],
            additionalProperties: false
        },
        customMessage: {
            type: 'object',
            properties: {
                sendOffer: {
                    type: 'string'
                },
                welcome: {
                    type: 'string'
                },
                iDontKnowWhatYouMean: {
                    type: 'string'
                },
                success: {
                    type: 'string'
                },
                successEscrow: {
                    type: 'string'
                },
                decline: {
                    type: 'object',
                    properties: {
                        general: {
                            type: 'string'
                        },
                        giftNoNote: {
                            type: 'string'
                        },
                        crimeAttempt: {
                            type: 'string'
                        },
                        onlyMetal: {
                            type: 'string'
                        },
                        duelingNot5Uses: {
                            type: 'string'
                        },
                        noiseMakerNot25Uses: {
                            type: 'string'
                        },
                        highValueItemsNotSelling: {
                            type: 'string'
                        },
                        notTradingKeys: {
                            type: 'string'
                        },
                        notSellingKeys: {
                            type: 'string'
                        },
                        notBuyingKeys: {
                            type: 'string'
                        },
                        banned: {
                            type: 'string'
                        },
                        escrow: {
                            type: 'string'
                        },
                        manual: {
                            type: 'string'
                        }
                    },
                    required: [
                        'general',
                        'giftNoNote',
                        'crimeAttempt',
                        'onlyMetal',
                        'duelingNot5Uses',
                        'noiseMakerNot25Uses',
                        'highValueItemsNotSelling',
                        'notTradingKeys',
                        'notSellingKeys',
                        'notBuyingKeys',
                        'banned',
                        'escrow',
                        'manual'
                    ],
                    additionalProperties: false
                },
                accepted: {
                    type: 'object',
                    properties: {
                        automatic: {
                            $ref: '#/definitions/large-or-small-offer'
                        },
                        manual: {
                            $ref: '#/definitions/large-or-small-offer'
                        }
                    },
                    required: ['automatic', 'manual'],
                    additionalProperties: false
                },
                tradedAway: {
                    type: 'string'
                },
                failedMobileConfirmation: {
                    type: 'string'
                },
                cancelledActiveForAwhile: {
                    type: 'string'
                },
                clearFriends: {
                    type: 'string'
                }
            },
            required: [
                'sendOffer',
                'welcome',
                'iDontKnowWhatYouMean',
                'success',
                'successEscrow',
                'decline',
                'tradedAway',
                'failedMobileConfirmation',
                'cancelledActiveForAwhile',
                'clearFriends'
            ],
            additionalProperties: false
        },
        commands: {
            type: 'object',
            properties: {
                enable: {
                    type: 'boolean'
                },
                customDisableReply: {
                    type: 'string'
                },
                how2trade: {
                    $ref: '#/definitions/only-customReply-reply'
                },
                price: {
                    $ref: '#/definitions/only-enable-customReply-disabled'
                },
                buy: {
                    $ref: '#/definitions/cmd-buy-sell'
                },
                sell: {
                    $ref: '#/definitions/cmd-buy-sell'
                },
                buycart: {
                    $ref: '#/definitions/cmd-buy-sell'
                },
                sellcart: {
                    $ref: '#/definitions/cmd-buy-sell'
                },
                cart: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        customReply: {
                            type: 'object',
                            properties: {
                                title: {
                                    type: 'string'
                                },
                                disabled: {
                                    type: 'string'
                                }
                            },
                            required: ['title', 'disabled'],
                            additionalProperties: false
                        }
                    },
                    required: ['enable', 'customReply'],
                    additionalProperties: false
                },
                clearcart: {
                    $ref: '#/definitions/only-customReply-reply'
                },
                checkout: {
                    type: 'object',
                    properties: {
                        customReply: {
                            type: 'object',
                            properties: {
                                empty: {
                                    type: 'string'
                                }
                            },
                            required: ['empty'],
                            additionalProperties: false
                        }
                    },
                    required: ['customReply'],
                    additionalProperties: false
                },
                addToQueue: {
                    type: 'object',
                    properties: {
                        alreadyHaveActiveOffer: {
                            type: 'string'
                        },
                        alreadyInQueueProcessingOffer: {
                            type: 'string'
                        },
                        alreadyInQueueWaitingTurn: {
                            type: 'string'
                        },
                        addedToQueueWaitingTurn: {
                            type: 'string'
                        },
                        alteredOffer: {
                            type: 'string'
                        },
                        processingOffer: {
                            $ref: '#/definitions/processing-accepting'
                        },
                        hasBeenMadeAcceptingMobileConfirmation: {
                            $ref: '#/definitions/processing-accepting'
                        }
                    },
                    required: [
                        'alreadyHaveActiveOffer',
                        'alreadyInQueueProcessingOffer',
                        'alreadyInQueueWaitingTurn',
                        'addedToQueueWaitingTurn',
                        'alteredOffer',
                        'processingOffer',
                        'hasBeenMadeAcceptingMobileConfirmation'
                    ],
                    additionalProperties: false
                },
                cancel: {
                    type: 'object',
                    properties: {
                        customReply: {
                            type: 'object',
                            properties: {
                                isBeingSent: {
                                    type: 'string'
                                },
                                isCancelling: {
                                    type: 'string'
                                },
                                isRemovedFromQueue: {
                                    type: 'string'
                                },
                                noActiveOffer: {
                                    type: 'string'
                                },
                                successCancel: {
                                    type: 'string'
                                }
                            },
                            required: [
                                'isBeingSent',
                                'isCancelling',
                                'isRemovedFromQueue',
                                'noActiveOffer',
                                'successCancel'
                            ],
                            additionalProperties: false
                        }
                    },
                    required: ['customReply'],
                    additionalProperties: false
                },
                queue: {
                    type: 'object',
                    properties: {
                        customReply: {
                            type: 'object',
                            properties: {
                                notInQueue: {
                                    type: 'string'
                                },
                                offerBeingMade: {
                                    type: 'string'
                                },
                                hasPosition: {
                                    type: 'string'
                                }
                            },
                            required: ['notInQueue', 'offerBeingMade', 'hasPosition'],
                            additionalProperties: false
                        }
                    },
                    required: ['customReply'],
                    additionalProperties: false
                },
                owner: {
                    $ref: '#/definitions/only-enable-customReply-disabled'
                },
                discord: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        customReply: {
                            $ref: '#/definitions/only-disabled'
                        },
                        inviteURL: {
                            type: 'string'
                        }
                    },
                    required: ['enable', 'customReply', 'inviteURL'],
                    additionalProperties: false
                },
                more: {
                    $ref: '#/definitions/only-enable-customReply-disabled'
                },
                autokeys: {
                    $ref: '#/definitions/only-enable-customReply-disabled'
                },
                message: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        customReply: {
                            type: 'object',
                            properties: {
                                disabled: {
                                    type: 'string'
                                },
                                wrongSyntax: {
                                    type: 'string'
                                },
                                fromOwner: {
                                    type: 'string'
                                },
                                success: {
                                    type: 'string'
                                }
                            },
                            required: ['disabled', 'wrongSyntax', 'fromOwner', 'success'],
                            additionalProperties: false
                        }
                    },
                    required: ['enable', 'customReply'],
                    additionalProperties: false
                },
                time: {
                    $ref: '#/definitions/only-enabled-disabled-reply'
                },
                uptime: {
                    $ref: '#/definitions/only-enabled-disabled-reply'
                },
                pure: {
                    $ref: '#/definitions/only-enabled-disabled-reply'
                },
                rate: {
                    $ref: '#/definitions/only-enabled-disabled-reply'
                },
                stock: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        maximumItems: {
                            type: 'integer'
                        },
                        customReply: {
                            type: 'object',
                            properties: {
                                disabled: {
                                    type: 'string'
                                },
                                reply: {
                                    type: 'string'
                                }
                            },
                            required: ['disabled', 'reply'],
                            additionalProperties: false
                        }
                    },
                    required: ['enable', 'maximumItems', 'customReply'],
                    additionalProperties: false
                },
                craftweapon: {
                    $ref: '#/definitions/cmd-weapons'
                },
                uncraftweapon: {
                    $ref: '#/definitions/cmd-weapons'
                }
            },
            required: [
                'enable',
                'customDisableReply',
                'how2trade',
                'price',
                'buy',
                'sell',
                'buycart',
                'sellcart',
                'cart',
                'clearcart',
                'checkout',
                'addToQueue',
                'cancel',
                'queue',
                'owner',
                'discord',
                'more',
                'autokeys',
                'message',
                'time',
                'uptime',
                'pure',
                'rate',
                'stock',
                'craftweapon',
                'uncraftweapon'
            ],
            additionalProperties: false
        },
        detailsExtra: {
            type: 'object',
            properties: {
                spells: {
                    type: 'object',
                    properties: {
                        'Putrescent Pigmentation': {
                            type: 'string'
                        },
                        'Die Job': {
                            type: 'string'
                        },
                        'Chromatic Corruption': {
                            type: 'string'
                        },
                        'Spectral Spectrum': {
                            type: 'string'
                        },
                        'Sinister Staining': {
                            type: 'string'
                        },
                        'Voices From Below': {
                            type: 'string'
                        },
                        'Team Spirit Footprints': {
                            type: 'string'
                        },
                        'Gangreen Footprints': {
                            type: 'string'
                        },
                        'Corpse Gray Footprints': {
                            type: 'string'
                        },
                        'Violent Violet Footprints': {
                            type: 'string'
                        },
                        'Rotten Orange Footprints': {
                            type: 'string'
                        },
                        'Bruised Purple Footprints': {
                            type: 'string'
                        },
                        'Headless Horseshoes': {
                            type: 'string'
                        },
                        Exorcism: {
                            type: 'string'
                        },
                        'Pumpkin Bombs': {
                            type: 'string'
                        },
                        'Halloween Fire': {
                            type: 'string'
                        }
                    },
                    required: [
                        'Putrescent Pigmentation',
                        'Die Job',
                        'Chromatic Corruption',
                        'Spectral Spectrum',
                        'Sinister Staining',
                        'Voices From Below',
                        'Team Spirit Footprints',
                        'Gangreen Footprints',
                        'Corpse Gray Footprints',
                        'Violent Violet Footprints',
                        'Rotten Orange Footprints',
                        'Bruised Purple Footprints',
                        'Headless Horseshoes',
                        'Exorcism',
                        'Pumpkin Bombs',
                        'Halloween Fire'
                    ],
                    additionalProperties: false
                },
                sheens: {
                    type: 'object',
                    properties: {
                        'Team Shine': {
                            type: 'string'
                        },
                        'Hot Rod': {
                            type: 'string'
                        },
                        Manndarin: {
                            type: 'string'
                        },
                        'Deadly Daffodil': {
                            type: 'string'
                        },
                        'Mean Green': {
                            type: 'string'
                        },
                        'Agonizing Emerald': {
                            type: 'string'
                        },
                        'Villainous Violet': {
                            type: 'string'
                        }
                    },
                    required: [
                        'Team Shine',
                        'Hot Rod',
                        'Manndarin',
                        'Deadly Daffodil',
                        'Mean Green',
                        'Agonizing Emerald',
                        'Villainous Violet'
                    ],
                    additionalProperties: false
                },
                killstreakers: {
                    type: 'object',
                    properties: {
                        'Cerebral Discharge': {
                            type: 'string'
                        },
                        'Fire Horns': {
                            type: 'string'
                        },
                        Flames: {
                            type: 'string'
                        },
                        'Hypno-Beam': {
                            type: 'string'
                        },
                        Incinerator: {
                            type: 'string'
                        },
                        Singularity: {
                            type: 'string'
                        },
                        Tornado: {
                            type: 'string'
                        }
                    },
                    required: [
                        'Cerebral Discharge',
                        'Fire Horns',
                        'Flames',
                        'Hypno-Beam',
                        'Incinerator',
                        'Singularity',
                        'Tornado'
                    ],
                    additionalProperties: false
                },
                painted: {
                    type: 'object',
                    properties: {
                        'A Color Similar to Slate': {
                            $ref: '#/definitions/painted-properties'
                        },
                        'A Deep Commitment to Purple': {
                            type: '#/definitions/painted-properties'
                        },
                        'A Distinctive Lack of Hue': {
                            type: '#/definitions/painted-properties'
                        },
                        "A Mann's Mint": {
                            type: '#/definitions/painted-properties'
                        },
                        'After Eight': {
                            type: '#/definitions/painted-properties'
                        },
                        'Aged Moustache Grey': {
                            type: '#/definitions/painted-properties'
                        },
                        'An Extraordinary Abundance of Tinge': {
                            type: '#/definitions/painted-properties'
                        },
                        'Australium Gold': {
                            type: '#/definitions/painted-properties'
                        },
                        'Color No. 216-190-216': {
                            type: '#/definitions/painted-properties'
                        },
                        'Dark Salmon Injustice': {
                            type: '#/definitions/painted-properties'
                        },
                        'Drably Olive': {
                            type: '#/definitions/painted-properties'
                        },
                        'Indubitably Green': {
                            type: '#/definitions/painted-properties'
                        },
                        'Mann Co. Orange': {
                            type: '#/definitions/painted-properties'
                        },
                        Muskelmannbraun: {
                            type: '#/definitions/painted-properties'
                        },
                        "Noble Hatter's Violet": {
                            type: '#/definitions/painted-properties'
                        },
                        'Peculiarly Drab Tincture': {
                            type: '#/definitions/painted-properties'
                        },
                        'Pink as Hell': {
                            type: '#/definitions/painted-properties'
                        },
                        'Radigan Conagher Brown': {
                            type: '#/definitions/painted-properties'
                        },
                        'The Bitter Taste of Defeat and Lime': {
                            type: '#/definitions/painted-properties'
                        },
                        "The Color of a Gentlemann's Business Pants": {
                            type: '#/definitions/painted-properties'
                        },
                        'Ye Olde Rustic Colour': {
                            type: '#/definitions/painted-properties'
                        },
                        "Zepheniah's Greed": {
                            type: '#/definitions/painted-properties'
                        },
                        'An Air of Debonair': {
                            type: '#/definitions/painted-properties'
                        },
                        'Balaclavas Are Forever': {
                            type: '#/definitions/painted-properties'
                        },
                        "Operator's Overalls": {
                            type: '#/definitions/painted-properties'
                        },
                        'Cream Spirit': {
                            type: '#/definitions/painted-properties'
                        },
                        'Team Spirit': {
                            type: '#/definitions/painted-properties'
                        },
                        'The Value of Teamwork': {
                            type: '#/definitions/painted-properties'
                        },
                        'Waterlogged Lab Coat': {
                            type: '#/definitions/painted-properties'
                        }
                    },
                    required: [
                        'A Color Similar to Slate',
                        'A Deep Commitment to Purple',
                        'A Distinctive Lack of Hue',
                        "A Mann's Mint",
                        'After Eight',
                        'Aged Moustache Grey',
                        'An Extraordinary Abundance of Tinge',
                        'Australium Gold',
                        'Color No. 216-190-216',
                        'Dark Salmon Injustice',
                        'Drably Olive',
                        'Indubitably Green',
                        'Mann Co. Orange',
                        'Muskelmannbraun',
                        "Noble Hatter's Violet",
                        'Peculiarly Drab Tincture',
                        'Pink as Hell',
                        'Radigan Conagher Brown',
                        'The Bitter Taste of Defeat and Lime',
                        "The Color of a Gentlemann's Business Pants",
                        'Ye Olde Rustic Colour',
                        "Zepheniah's Greed",
                        'An Air of Debonair',
                        'Balaclavas Are Forever',
                        "Operator's Overalls",
                        'Cream Spirit',
                        'Team Spirit',
                        'The Value of Teamwork',
                        'Waterlogged Lab Coat'
                    ],
                    additionalProperties: false
                },
                strangeParts: {
                    type: 'object',
                    properties: {
                        'Robots Destroyed': {
                            type: 'string'
                        },
                        Kills: {
                            type: 'string'
                        },
                        'Airborne Enemy Kills': {
                            type: 'string'
                        },
                        'Damage Dealt': {
                            type: 'string'
                        },
                        Dominations: {
                            type: 'string'
                        },
                        'Snipers Killed': {
                            type: 'string'
                        },
                        'Buildings Destroyed': {
                            type: 'string'
                        },
                        'Projectiles Reflected': {
                            type: 'string'
                        },
                        'Headshot Kills': {
                            type: 'string'
                        },
                        'Medics Killed': {
                            type: 'string'
                        },
                        'Fires Survived': {
                            type: 'string'
                        },
                        'Teammates Extinguished': {
                            type: 'string'
                        },
                        'Freezecam Taunt Appearances': {
                            type: 'string'
                        },
                        'Spies Killed': {
                            type: 'string'
                        },
                        'Allied Healing Done': {
                            type: 'string'
                        },
                        'Sappers Removed': {
                            type: 'string'
                        },
                        'Players Hit': {
                            type: 'string'
                        },
                        'Gib Kills': {
                            type: 'string'
                        },
                        'Scouts Killed': {
                            type: 'string'
                        },
                        'Taunt Kills': {
                            type: 'string'
                        },
                        'Point Blank Kills': {
                            type: 'string'
                        },
                        'Soldiers Killed': {
                            type: 'string'
                        },
                        'Long-Distance Kills': {
                            type: 'string'
                        },
                        'Giant Robots Destroyed': {
                            type: 'string'
                        },
                        'Critical Kills': {
                            type: 'string'
                        },
                        'Demomen Killed': {
                            type: 'string'
                        },
                        'Unusual-Wearing Player Kills': {
                            type: 'string'
                        },
                        Assists: {
                            type: 'string'
                        },
                        'Medics Killed That Have Full ÜberCharge': {
                            type: 'string'
                        },
                        'Cloaked Spies Killed': {
                            type: 'string'
                        },
                        'Engineers Killed': {
                            type: 'string'
                        },
                        'Kills While Explosive-Jumping': {
                            type: 'string'
                        },
                        'Kills While Low Health': {
                            type: 'string'
                        },
                        'Burning Player Kills': {
                            type: 'string'
                        },
                        'Kills While Invuln ÜberCharged': {
                            type: 'string'
                        },
                        'Posthumous Kills': {
                            type: 'string'
                        },
                        'Not Crit nor MiniCrit Kills': {
                            type: 'string'
                        },
                        'Full Health Kills': {
                            type: 'string'
                        },
                        'Killstreaks Ended': {
                            type: 'string'
                        },
                        'Defenders Killed': {
                            type: 'string'
                        },
                        Revenges: {
                            type: 'string'
                        },
                        'Robot Scouts Destroyed': {
                            type: 'string'
                        },
                        'Heavies Killed': {
                            type: 'string'
                        },
                        'Tanks Destroyed': {
                            type: 'string'
                        },
                        'Kills During Halloween': {
                            type: 'string'
                        },
                        'Pyros Killed': {
                            type: 'string'
                        },
                        'Submerged Enemy Kills': {
                            type: 'string'
                        },
                        'Kills During Victory Time': {
                            type: 'string'
                        },
                        'Taunting Player Kills': {
                            type: 'string'
                        },
                        'Robot Spies Destroyed': {
                            type: 'string'
                        },
                        'Kills Under A Full Moon': {
                            type: 'string'
                        },
                        'Robots Killed During Halloween': {
                            type: 'string'
                        }
                    },
                    required: [
                        'Robots Destroyed',
                        'Kills',
                        'Airborne Enemy Kills',
                        'Damage Dealt',
                        'Dominations',
                        'Snipers Killed',
                        'Buildings Destroyed',
                        'Projectiles Reflected',
                        'Headshot Kills',
                        'Medics Killed',
                        'Fires Survived',
                        'Teammates Extinguished',
                        'Freezecam Taunt Appearances',
                        'Spies Killed',
                        'Allied Healing Done',
                        'Sappers Removed',
                        'Players Hit',
                        'Gib Kills',
                        'Scouts Killed',
                        'Taunt Kills',
                        'Point Blank Kills',
                        'Soldiers Killed',
                        'Long-Distance Kills',
                        'Giant Robots Destroyed',
                        'Critical Kills',
                        'Demomen Killed',
                        'Unusual-Wearing Player Kills',
                        'Assists',
                        'Medics Killed That Have Full ÜberCharge',
                        'Cloaked Spies Killed',
                        'Engineers Killed',
                        'Kills While Explosive-Jumping',
                        'Kills While Low Health',
                        'Burning Player Kills',
                        'Kills While Invuln ÜberCharged',
                        'Posthumous Kills',
                        'Not Crit nor MiniCrit Kills',
                        'Full Health Kills',
                        'Killstreaks Ended',
                        'Defenders Killed',
                        'Revenges',
                        'Robot Scouts Destroyed',
                        'Heavies Killed',
                        'Tanks Destroyed',
                        'Kills During Halloween',
                        'Pyros Killed',
                        'Submerged Enemy Kills',
                        'Kills During Victory Time',
                        'Taunting Player Kills',
                        'Robot Spies Destroyed',
                        'Kills Under A Full Moon',
                        'Robots Killed During Halloween'
                    ],
                    additionalProperties: false
                }
            },
            required: ['spells', 'sheens', 'killstreakers', 'painted', 'strangeParts'],
            additionalProperties: false
        }
    },
    required: [
        'sendAlert',
        'pricelist',
        'bypass',
        'tradeSummary',
        'highValue',
        'normalize',
        'details',
        'statistics',
        'autokeys',
        'crafting',
        'offerReceived',
        'manualReview',
        'discordWebhook',
        'customMessage',
        'commands',
        'detailsExtra'
    ],
    additionalProperties: false
};
