import jsonschema from 'jsonschema';

export const optionsSchema: jsonschema.Schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    definitions: {
        'string-array': {
            type: 'array',
            items: {
                type: 'string'
            },
            required: false,
            additionalProperties: false
        },
        'only-enable': {
            type: 'object',
            properties: {
                enable: {
                    type: 'boolean'
                }
            },
            required: ['enable'],
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
            type: 'object',
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
            required: ['autoAcceptOverpay', 'autoDecline'],
            additionalProperties: false
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
            required: ['note'],
            additionalProperties: false
        },
        'discord-chat': {
            type: 'object',
            properties: {
                type: {
                    type: ['string', 'number'],
                    enum: ['PLAYING', 0, 'STREAMING', 1, 'LISTENING', 2, 'WATCHING', 3, 'COMPETING', 5]
                },
                name: {
                    type: 'string'
                },
                status: {
                    type: 'string',
                    enum: ['online', 'idle', 'dnd', 'invisible']
                }
            },
            required: ['type', 'name', 'status'],
            additionalProperties: false
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
            required: ['showQuickLinks', 'showKeyRate', 'showPureStock', 'showInventory'],
            additionalProperties: false
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
            required: ['enable', 'url'],
            additionalProperties: false
        },
        'discord-webhook-enable-url-custom': {
            type: 'object',
            properties: {
                enable: {
                    type: 'boolean'
                },
                url: {
                    type: 'string',
                    pattern: '^$|https://discord(app)?.com/api/webhooks/[0-9]+/(.)+'
                },
                custom: {
                    type: 'object',
                    properties: {
                        content: {
                            type: 'string'
                        }
                    },
                    required: ['content'],
                    additionalProperties: false
                }
            },
            required: ['enable', 'url', 'custom'],
            additionalProperties: false
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
            required: ['disabled'],
            additionalProperties: false
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
                    $ref: '#/definitions/string-array'
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
                    type: 'object',
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
                showOnlyExist: {
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
                    required: ['disabled', 'dontHave', 'have'],
                    additionalProperties: false
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
            },
            required: ['largeOffer', 'smallOffer'],
            additionalProperties: false
        },
        'steamChat-or-discordWebhook': {
            type: 'object',
            properties: {
                steamChat: {
                    type: 'string'
                },
                discordWebhook: {
                    type: 'string'
                }
            },
            required: ['steamChat', 'discordWebhook'],
            additionalProperties: false
        },
        'valid-initializer': {
            type: 'string',
            anyOf: [
                {
                    const: '/me'
                },
                {
                    const: '/pre'
                },
                {
                    const: '/quote'
                },
                {
                    const: '/code'
                },
                {
                    const: ''
                }
            ]
        },
        'high-value-content': {
            type: 'object',
            properties: {
                names: {
                    type: '#/definitions/string-array'
                },
                exceptionSkus: {
                    type: '#/definitions/string-array'
                }
            },
            required: ['names', 'exceptionSkus'],
            additionalProperties: false
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
                    type: 'object',
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
                startHalted: {
                    $ref: '#/definitions/only-enable'
                },
                addFriends: {
                    $ref: '#/definitions/only-enable'
                },
                sendGroupInvite: {
                    $ref: '#/definitions/only-enable'
                },
                counterOffer: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        skipIncludeMessage: {
                            type: 'boolean'
                        },
                        autoDeclineLazyOffer: {
                            type: 'boolean'
                        }
                    },
                    required: ['enable', 'skipIncludeMessage', 'autoDeclineLazyOffer'],
                    additionalProperties: false
                },
                skipItemsInTrade: {
                    $ref: '#/definitions/only-enable'
                },
                weaponsAsCurrency: {
                    type: 'object',
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
                itemsOnBothSides: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        }
                    },
                    required: ['enable'],
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
                },
                alwaysRemoveItemAttributes: {
                    type: 'object',
                    properties: {
                        customTexture: {
                            $ref: '#/definitions/only-enable'
                        }
                        // giftedByTag: {
                        //     $ref: '#/definitions/only-enable'
                        // }
                    },
                    required: ['customTexture'], // 'giftedByTag'
                    additionalProperties: false
                },
                deleteUntradableJunk: {
                    $ref: '#/definitions/only-enable'
                },
                reputationCheck: {
                    type: 'object',
                    properties: {
                        checkMptfBanned: {
                            type: 'boolean'
                        }
                    },
                    required: ['checkMptfBanned'],
                    additionalProperties: false
                },
                pricecheckAfterTrade: {
                    $ref: '#/definitions/only-enable'
                },
                prefixes: {
                    type: 'object',
                    properties: {
                        steam: {
                            type: 'string'
                        },
                        discord: {
                            type: 'string'
                        }
                    },
                    additionalProperties: false
                }
            },
            required: [
                'showOnlyMetal',
                'sortInventory',
                'createListings',
                'addFriends',
                'sendGroupInvite',
                'counterOffer',
                'skipItemsInTrade',
                'weaponsAsCurrency',
                'checkUses',
                'game',
                'alwaysRemoveItemAttributes',
                'deleteUntradableJunk',
                'reputationCheck',
                'pricecheckAfterTrade'
            ],
            additionalProperties: false
        },
        sendAlert: {
            type: 'object',
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
                    required: ['lowPure', 'failedToAdd', 'failedToUpdate', 'failedToDisable'],
                    additionalProperties: false
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
                    required: ['gotDisabled', 'receivedNotInPricelist', 'tryingToTake'],
                    additionalProperties: false
                },
                autoRemoveIntentSellFailed: {
                    type: 'boolean'
                },
                autoRemoveAssetidFailed: {
                    type: 'boolean'
                },
                autoRemoveAssetidSuccess: {
                    type: 'boolean'
                },
                autoUpdateAssetid: {
                    type: 'boolean'
                },
                autoResetToAutopriceOnceSold: {
                    type: 'boolean'
                },
                autoAddPaintedItems: {
                    type: 'boolean'
                },
                failedAccept: {
                    type: 'boolean'
                },
                unableToProcessOffer: {
                    type: 'boolean'
                },
                partialPrice: {
                    type: 'object',
                    properties: {
                        onUpdate: {
                            type: 'boolean'
                        },
                        onSuccessUpdatePartialPriced: {
                            type: 'boolean'
                        },
                        onFailedUpdatePartialPriced: {
                            type: 'boolean'
                        },
                        onBulkUpdatePartialPriced: {
                            type: 'boolean'
                        },
                        onResetAfterThreshold: {
                            type: 'boolean'
                        }
                    },
                    required: [
                        'onUpdate',
                        'onSuccessUpdatePartialPriced',
                        'onFailedUpdatePartialPriced',
                        'onBulkUpdatePartialPriced',
                        'onResetAfterThreshold'
                    ],
                    additionalProperties: false
                },
                receivedUnusualNotInPricelist: {
                    type: 'boolean'
                },
                failedToUpdateOldPrices: {
                    type: 'boolean'
                }
            },
            required: [
                'enable',
                'autokeys',
                'backpackFull',
                'highValue',
                'autoRemoveIntentSellFailed',
                'autoRemoveAssetidFailed',
                'autoRemoveAssetidSuccess',
                'autoUpdateAssetid',
                'autoResetToAutopriceOnceSold',
                'autoAddPaintedItems',
                'failedAccept',
                'unableToProcessOffer',
                'partialPrice',
                'receivedUnusualNotInPricelist',
                'failedToUpdateOldPrices'
            ],
            additionalProperties: false
        },
        pricelist: {
            type: 'object',
            properties: {
                partialPriceUpdate: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        thresholdInSeconds: {
                            type: 'integer',
                            minimum: 86400 // 1 day
                        },
                        excludeSKU: {
                            type: '#/definitions/string-array'
                        }
                    },
                    required: ['enable', 'thresholdInSeconds', 'excludeSKU'],
                    additionalProperties: false
                },
                filterCantAfford: {
                    $ref: '#/definitions/only-enable'
                },
                autoResetToAutopriceOnceSold: {
                    $ref: '#/definitions/only-enable'
                },
                autoRemoveIntentSell: {
                    $ref: '#/definitions/only-enable'
                },
                autoAddInvalidItems: {
                    $ref: '#/definitions/only-enable'
                },
                autoAddInvalidUnusual: {
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
                },
                rewriteFile: {
                    type: 'object',
                    properties: {
                        count: {
                            type: 'integer',
                            minimum: 1
                        }
                    },
                    required: ['count'],
                    additionalProperties: false
                }
            },
            required: [
                'partialPriceUpdate',
                'filterCantAfford',
                'autoResetToAutopriceOnceSold',
                'autoRemoveIntentSell',
                'autoAddInvalidItems',
                'autoAddInvalidUnusual',
                'autoAddPaintedItems',
                'priceAge',
                'rewriteFile'
            ],
            additionalProperties: false
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
                }
            },
            required: ['escrow', 'overpay', 'giftWithoutMessage'],
            additionalProperties: false
        },
        tradeSummary: {
            type: 'object',
            properties: {
                declinedTrade: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        }
                    },
                    required: ['enable']
                },
                showStockChanges: {
                    type: 'boolean'
                },
                showTimeTakenInMS: {
                    type: 'boolean'
                },
                showDetailedTimeTaken: {
                    type: 'boolean'
                },
                showItemPrices: {
                    type: 'boolean'
                },
                showPureInEmoji: {
                    type: 'boolean'
                },
                showProperName: {
                    type: 'boolean'
                },
                showOfferMessage: {
                    type: 'boolean'
                },
                customText: {
                    type: 'object',
                    properties: {
                        summary: {
                            $ref: '#/definitions/steamChat-or-discordWebhook'
                        },
                        asked: {
                            $ref: '#/definitions/steamChat-or-discordWebhook'
                        },
                        offered: {
                            $ref: '#/definitions/steamChat-or-discordWebhook'
                        },
                        offerMessage: {
                            $ref: '#/definitions/steamChat-or-discordWebhook'
                        },
                        profitFromOverpay: {
                            $ref: '#/definitions/steamChat-or-discordWebhook'
                        },
                        lossFromUnderpay: {
                            $ref: '#/definitions/steamChat-or-discordWebhook'
                        },
                        timeTaken: {
                            $ref: '#/definitions/steamChat-or-discordWebhook'
                        },
                        keyRate: {
                            $ref: '#/definitions/steamChat-or-discordWebhook'
                        },
                        pureStock: {
                            $ref: '#/definitions/steamChat-or-discordWebhook'
                        },
                        totalItems: {
                            $ref: '#/definitions/steamChat-or-discordWebhook'
                        },
                        spells: {
                            type: 'string'
                        },
                        strangeParts: {
                            type: 'string'
                        },
                        killstreaker: {
                            type: 'string'
                        },
                        sheen: {
                            type: 'string'
                        },
                        painted: {
                            type: 'string'
                        }
                    },
                    required: [
                        'summary',
                        'asked',
                        'offered',
                        'offerMessage',
                        'profitFromOverpay',
                        'lossFromUnderpay',
                        'timeTaken',
                        'keyRate',
                        'pureStock',
                        'totalItems',
                        'spells',
                        'strangeParts',
                        'killstreaker',
                        'sheen',
                        'painted'
                    ],
                    additionalProperties: false
                }
            },
            required: [
                'declinedTrade',
                'showStockChanges',
                'showTimeTakenInMS',
                'showDetailedTimeTaken',
                'showItemPrices',
                'showPureInEmoji',
                'showProperName',
                'showOfferMessage',
                'customText'
            ],
            additionalProperties: false
        },

        steamChat: {
            type: 'object',
            properties: {
                customInitializer: {
                    type: 'object',
                    properties: {
                        acceptedTradeSummary: {
                            $ref: '#/definitions/valid-initializer'
                        },
                        declinedTradeSummary: {
                            $ref: '#/definitions/valid-initializer'
                        },
                        review: {
                            $ref: '#/definitions/valid-initializer'
                        },
                        message: {
                            type: 'object',
                            properties: {
                                onReceive: {
                                    $ref: '#/definitions/valid-initializer'
                                },
                                toOtherAdmins: {
                                    $ref: '#/definitions/valid-initializer'
                                }
                            },
                            required: ['onReceive', 'toOtherAdmins'],
                            additionalProperties: false
                        }
                    },
                    required: ['acceptedTradeSummary', 'declinedTradeSummary', 'review', 'message'],
                    additionalProperties: false
                },
                notifyTradePartner: {
                    type: 'object',
                    properties: {
                        onSuccessAccepted: {
                            type: 'boolean'
                        },
                        onSuccessAcceptedEscrow: {
                            type: 'boolean'
                        },
                        onDeclined: {
                            type: 'boolean'
                        },
                        onCancelled: {
                            type: 'boolean'
                        },
                        onTradedAway: {
                            type: 'boolean'
                        },
                        onOfferForReview: {
                            type: 'boolean'
                        }
                    },
                    required: [
                        'onSuccessAccepted',
                        'onSuccessAcceptedEscrow',
                        'onDeclined',
                        'onCancelled',
                        'onTradedAway',
                        'onOfferForReview'
                    ],
                    additionalProperties: false
                }
            },
            required: ['customInitializer', 'notifyTradePartner'],
            additionalProperties: false
        },

        highValue: {
            type: 'object',
            properties: {
                enableHold: {
                    type: 'boolean'
                },
                retainOldGroup: {
                    type: 'boolean'
                },
                customGroup: {
                    type: 'string'
                },
                spells: {
                    type: 'object',
                    properties: {
                        names: {
                            type: '#/definitions/string-array',
                            maxItems: 16
                        },
                        exceptionSkus: {
                            type: '#/definitions/string-array'
                        }
                    },
                    required: ['names', 'exceptionSkus'],
                    additionalProperties: false
                },
                sheens: {
                    type: 'object',
                    properties: {
                        names: {
                            $ref: '#/definitions/string-array',
                            maxItems: 7
                        },
                        exceptionSkus: {
                            $ref: '#/definitions/string-array'
                        }
                    },
                    required: ['names', 'exceptionSkus'],
                    additionalProperties: false
                },
                killstreakers: {
                    type: 'object',
                    properties: {
                        names: {
                            $ref: '#/definitions/string-array',
                            maxItems: 7
                        },
                        exceptionSkus: {
                            $ref: '#/definitions/string-array'
                        }
                    },
                    required: ['names', 'exceptionSkus'],
                    additionalProperties: false
                },
                strangeParts: {
                    $ref: '#/definitions/high-value-content'
                },
                painted: {
                    $ref: '#/definitions/high-value-content'
                }
            },
            required: [
                'enableHold',
                'retainOldGroup',
                'customGroup',
                'spells',
                'sheens',
                'killstreakers',
                'strangeParts',
                'painted'
            ],
            additionalProperties: false
        },
        normalize: {
            type: 'object',
            properties: {
                festivized: {
                    type: 'object',
                    properties: {
                        our: {
                            type: 'boolean'
                        },
                        their: {
                            type: 'boolean'
                        },
                        amountIncludeNonFestivized: {
                            type: 'boolean'
                        }
                    },
                    required: ['our', 'their', 'amountIncludeNonFestivized'],
                    additionalProperties: false
                },
                strangeAsSecondQuality: {
                    type: 'object',
                    properties: {
                        our: {
                            type: 'boolean'
                        },
                        their: {
                            type: 'boolean'
                        },
                        amountIncludeNonStrange: {
                            type: 'boolean'
                        }
                    },
                    required: ['our', 'their', 'amountIncludeNonStrange'],
                    additionalProperties: false
                },
                painted: {
                    type: 'object',
                    properties: {
                        our: {
                            type: 'boolean'
                        },
                        their: {
                            type: 'boolean'
                        },
                        amountIncludeNonPainted: {
                            type: 'boolean'
                        }
                    },
                    required: ['our', 'their', 'amountIncludeNonPainted'],
                    additionalProperties: false
                },
                craftNumber: {
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
                }
            },
            required: ['festivized', 'strangeAsSecondQuality', 'painted', 'craftNumber'],
            additionalProperties: false
        },
        details: {
            type: 'object',
            properties: {
                buy: {
                    type: 'string',
                    maxLength: 180
                },
                sell: {
                    type: 'string',
                    maxLength: 180
                },
                showAutokeys: {
                    type: 'boolean'
                },
                showBoldText: {
                    type: 'object',
                    properties: {
                        onPrice: {
                            type: 'boolean'
                        },
                        onAmount: {
                            type: 'boolean'
                        },
                        onCurrentStock: {
                            type: 'boolean'
                        },
                        onMaxStock: {
                            type: 'boolean'
                        },
                        style: {
                            type: 'number',
                            minimum: 1,
                            maximum: 4
                        }
                    },
                    required: ['onPrice', 'onAmount', 'onCurrentStock', 'onMaxStock', 'style'],
                    additionalProperties: false
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
                        },
                        customText: {
                            type: 'object',
                            properties: {
                                spells: {
                                    type: 'string'
                                },
                                strangeParts: {
                                    type: 'string'
                                },
                                killstreaker: {
                                    type: 'string'
                                },
                                sheen: {
                                    type: 'string'
                                },
                                painted: {
                                    type: 'string'
                                },
                                separator: {
                                    type: 'string'
                                },
                                ender: {
                                    type: 'string'
                                }
                            },
                            required: [
                                'spells',
                                'strangeParts',
                                'killstreaker',
                                'sheen',
                                'painted',
                                'separator',
                                'ender'
                            ],
                            additionalProperties: false
                        }
                    },
                    required: [
                        'showSpells',
                        'showStrangeParts',
                        'showKillstreaker',
                        'showSheen',
                        'showPainted',
                        'customText'
                    ],
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
            required: ['buy', 'sell', 'showAutokeys', 'showBoldText', 'highValue', 'uses'],
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
                            $ref: '#/definitions/string-array'
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
            type: 'object',
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
                    type: 'object',
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
                manual: {
                    type: 'boolean'
                },
                weapons: {
                    $ref: '#/definitions/only-enable'
                },
                metals: {
                    type: 'object',
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
                sendPreAcceptMessage: {
                    $ref: '#/definitions/only-enable'
                },
                alwaysDeclineNonTF2Items: {
                    type: 'boolean'
                },
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
                                    $ref: '#/definitions/string-array'
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
                    type: 'object',
                    properties: {
                        givePrice: {
                            type: 'boolean'
                        },
                        autoAcceptOverpay: {
                            type: 'boolean'
                        },
                        autoDecline: {
                            $ref: '#/definitions/only-enable-declineReply'
                        }
                    },
                    required: ['givePrice', 'autoAcceptOverpay', 'autoDecline'],
                    additionalProperties: false
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
                failedToCheckDuped: {
                    type: 'object',
                    properties: {
                        autoDecline: {
                            $ref: '#/definitions/only-enable-declineReply'
                        }
                    },
                    required: ['autoDecline'],
                    additionalProperties: false
                },
                escrowCheckFailed: {
                    $ref: '#/definitions/only-ignore-failed'
                },
                bannedCheckFailed: {
                    $ref: '#/definitions/only-ignore-failed'
                },
                halted: {
                    type: 'object',
                    properties: {
                        ignoreHalted: {
                            type: 'boolean'
                        }
                    },
                    required: ['ignoreHalted'],
                    additionalProperties: false
                },
                reviewForced: {
                    $ref: '#/definitions/only-enable'
                }
            },
            required: [
                'sendPreAcceptMessage',
                'alwaysDeclineNonTF2Items',
                'invalidValue',
                'invalidItems',
                'disabledItems',
                'overstocked',
                'understocked',
                'duped',
                'escrowCheckFailed',
                'bannedCheckFailed',
                'halted',
                'reviewForced'
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
                halted: {
                    $ref: '#/definitions/only-note'
                },
                reviewForced: {
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
                'halted',
                'reviewForced',
                'additionalNotes'
            ],
            additionalProperties: false
        },
        inventoryApis: {
            type: 'object',
            properties: {
                steamSupply: {
                    $ref: '#/definitions/only-enable'
                },
                steamApis: {
                    $ref: '#/definitions/only-enable'
                }
            },
            required: ['steamSupply', 'steamApis'],
            additionalProperties: false
        },
        discordChat: {
            type: 'object',
            properties: {
                online: {
                    $ref: '#/definitions/discord-chat'
                },
                halt: {
                    $ref: '#/definitions/discord-chat'
                }
            }
        },
        discordWebhook: {
            type: 'object',
            properties: {
                ownerID: {
                    $ref: '#/definitions/string-array',
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
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        url: {
                            $ref: 'array-string-url'
                        },
                        misc: {
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
                                },
                                note: {
                                    type: 'string'
                                }
                            },
                            required: ['showQuickLinks', 'showKeyRate', 'showPureStock', 'showInventory', 'note'],
                            additionalProperties: false
                        },
                        mentionOwner: {
                            type: 'object',
                            properties: {
                                enable: {
                                    type: 'boolean'
                                },
                                itemSkus: {
                                    $ref: '#/definitions/string-array'
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
                declinedTrade: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        url: {
                            $ref: 'array-string-url'
                        },
                        misc: {
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
                                },
                                note: {
                                    type: 'string'
                                }
                            },
                            required: ['showQuickLinks', 'showKeyRate', 'showPureStock', 'showInventory', 'note'],
                            additionalProperties: false
                        }
                    },
                    required: ['enable', 'url', 'misc'],
                    additionalProperties: false
                },
                offerReview: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        url: {
                            type: 'string',
                            pattern: '^$|https://discord(app)?.com/api/webhooks/[0-9]+/(.)+'
                        },
                        mentions: {
                            type: 'object',
                            properties: {
                                enable: {
                                    type: 'boolean'
                                },
                                invalidValue: {
                                    type: 'boolean'
                                },
                                invalidItems: {
                                    type: 'boolean'
                                },
                                overstocked: {
                                    type: 'boolean'
                                },
                                understocked: {
                                    type: 'boolean'
                                },
                                duped: {
                                    type: 'boolean'
                                },
                                dupedCheckFailed: {
                                    type: 'boolean'
                                },
                                escrowCheckFailed: {
                                    type: 'boolean'
                                },
                                bannedCheckFailed: {
                                    type: 'boolean'
                                },
                                halted: {
                                    type: 'boolean'
                                },
                                reviewForced: {
                                    type: 'boolean'
                                }
                            },
                            required: [
                                'enable',
                                'invalidValue',
                                'invalidItems',
                                'overstocked',
                                'understocked',
                                'duped',
                                'dupedCheckFailed',
                                'escrowCheckFailed',
                                'bannedCheckFailed',
                                'halted',
                                'reviewForced'
                            ],
                            additionalProperties: false
                        },
                        misc: {
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
                            required: ['showQuickLinks', 'showKeyRate', 'showPureStock', 'showInventory'],
                            additionalProperties: false
                        }
                    },
                    required: ['enable', 'url', 'mentions', 'misc'],
                    additionalProperties: false
                },
                messages: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        url: {
                            type: 'string',
                            pattern: '^$|https://discord(app)?.com/api/webhooks/[0-9]+/(.)+'
                        },
                        isMention: {
                            type: 'boolean'
                        },
                        showQuickLinks: {
                            type: 'boolean'
                        }
                    },
                    required: ['enable', 'url', 'isMention', 'showQuickLinks'],
                    additionalProperties: false
                },
                priceUpdate: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        showOnlyInStock: {
                            type: 'boolean'
                        },
                        showFailedToUpdate: {
                            type: 'boolean'
                        },
                        url: {
                            type: 'string',
                            pattern: '^$|https://discord(app)?.com/api/webhooks/[0-9]+/(.)+'
                        },
                        note: {
                            type: 'string'
                        }
                    },
                    required: ['enable', 'showOnlyInStock', 'showFailedToUpdate', 'url', 'note'],
                    additionalProperties: false
                },
                sendAlert: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        url: {
                            type: 'object',
                            properties: {
                                main: {
                                    type: 'string',
                                    pattern: '^$|https://discord(app)?.com/api/webhooks/[0-9]+/(.)+'
                                },
                                partialPriceUpdate: {
                                    type: 'string',
                                    pattern: '^$|https://discord(app)?.com/api/webhooks/[0-9]+/(.)+'
                                }
                            },
                            required: ['main', 'partialPriceUpdate'],
                            additionalProperties: false
                        },
                        isMention: {
                            type: 'boolean'
                        }
                    },
                    required: ['enable', 'url', 'isMention'],
                    additionalProperties: false
                },
                sendStats: {
                    $ref: '#/definitions/discord-webhook-enable-url'
                },
                sendTf2Events: {
                    type: 'object',
                    properties: {
                        systemMessage: {
                            $ref: '#/definitions/discord-webhook-enable-url-custom'
                        },
                        displayNotification: {
                            $ref: '#/definitions/discord-webhook-enable-url-custom'
                        },
                        itemBroadcast: {
                            $ref: '#/definitions/discord-webhook-enable-url-custom'
                        }
                    },
                    required: ['systemMessage', 'displayNotification', 'itemBroadcast'],
                    additionalProperties: false
                }
            },
            required: [
                'ownerID',
                'displayName',
                'avatarURL',
                'embedColor',
                'tradeSummary',
                'declinedTrade',
                'offerReview',
                'messages',
                'priceUpdate',
                'sendAlert',
                'sendStats',
                'sendTf2Events'
            ],
            additionalProperties: false
        },
        customMessage: {
            type: 'object',
            properties: {
                sendOffer: {
                    type: 'string'
                },
                counterOffer: {
                    type: 'string',
                    maxLength: 128
                },
                welcome: {
                    type: 'string'
                },
                commandNotFound: {
                    type: 'string'
                },
                success: {
                    type: 'string'
                },
                successEscrow: {
                    type: 'string'
                },
                halted: {
                    type: 'string'
                },
                decline: {
                    type: 'object',
                    properties: {
                        general: {
                            type: 'string'
                        },
                        hasNonTF2Items: {
                            type: 'string'
                        },
                        giftNoNote: {
                            type: 'string'
                        },
                        giftFailedCheckBanned: {
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
                        halted: {
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
                        },
                        failedToCounter: {
                            type: 'string'
                        },
                        takingItemsWithIntentBuy: {
                            type: 'string'
                        },
                        givingItemsWithIntentSell: {
                            type: 'string'
                        },
                        containsKeysOnBothSides: {
                            type: 'string'
                        },
                        containsItemsOnBothSides: {
                            type: 'string'
                        }
                    },
                    required: [
                        'general',
                        'giftNoNote',
                        'giftFailedCheckBanned',
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
                        'manual',
                        'failedToCounter',
                        'takingItemsWithIntentBuy',
                        'givingItemsWithIntentSell',
                        'containsKeysOnBothSides',
                        'containsItemsOnBothSides'
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
                'counterOffer',
                'welcome',
                'commandNotFound',
                'success',
                'successEscrow',
                'decline',
                'accepted',
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
                    $ref: '#/definitions/only-enabled-disabled-reply'
                },
                discord: {
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
                                reply: {
                                    type: 'string'
                                }
                            },
                            required: ['disabled', 'reply'],
                            additionalProperties: false
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
                        showOwnerName: {
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
                    required: ['enable', 'showOwnerName', 'customReply'],
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
                        'Voices from Below': {
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
                        'Voices from Below',
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
                            $ref: '#/definitions/painted-properties'
                        },
                        'A Distinctive Lack of Hue': {
                            $ref: '#/definitions/painted-properties'
                        },
                        "A Mann's Mint": {
                            $ref: '#/definitions/painted-properties'
                        },
                        'After Eight': {
                            $ref: '#/definitions/painted-properties'
                        },
                        'Aged Moustache Grey': {
                            $ref: '#/definitions/painted-properties'
                        },
                        'An Extraordinary Abundance of Tinge': {
                            $ref: '#/definitions/painted-properties'
                        },
                        'Australium Gold': {
                            $ref: '#/definitions/painted-properties'
                        },
                        'Color No. 216-190-216': {
                            $ref: '#/definitions/painted-properties'
                        },
                        'Dark Salmon Injustice': {
                            $ref: '#/definitions/painted-properties'
                        },
                        'Drably Olive': {
                            $ref: '#/definitions/painted-properties'
                        },
                        'Indubitably Green': {
                            $ref: '#/definitions/painted-properties'
                        },
                        'Mann Co. Orange': {
                            $ref: '#/definitions/painted-properties'
                        },
                        Muskelmannbraun: {
                            $ref: '#/definitions/painted-properties'
                        },
                        "Noble Hatter's Violet": {
                            $ref: '#/definitions/painted-properties'
                        },
                        'Peculiarly Drab Tincture': {
                            $ref: '#/definitions/painted-properties'
                        },
                        'Pink as Hell': {
                            $ref: '#/definitions/painted-properties'
                        },
                        'Radigan Conagher Brown': {
                            $ref: '#/definitions/painted-properties'
                        },
                        'The Bitter Taste of Defeat and Lime': {
                            $ref: '#/definitions/painted-properties'
                        },
                        "The Color of a Gentlemann's Business Pants": {
                            $ref: '#/definitions/painted-properties'
                        },
                        'Ye Olde Rustic Colour': {
                            $ref: '#/definitions/painted-properties'
                        },
                        "Zepheniah's Greed": {
                            $ref: '#/definitions/painted-properties'
                        },
                        'An Air of Debonair': {
                            $ref: '#/definitions/painted-properties'
                        },
                        'Balaclavas Are Forever': {
                            $ref: '#/definitions/painted-properties'
                        },
                        "Operator's Overalls": {
                            $ref: '#/definitions/painted-properties'
                        },
                        'Cream Spirit': {
                            $ref: '#/definitions/painted-properties'
                        },
                        'Team Spirit': {
                            $ref: '#/definitions/painted-properties'
                        },
                        'The Value of Teamwork': {
                            $ref: '#/definitions/painted-properties'
                        },
                        'Waterlogged Lab Coat': {
                            $ref: '#/definitions/painted-properties'
                        },
                        'Legacy Paint': {
                            $ref: '#/definitions/painted-properties'
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
                        'Waterlogged Lab Coat',
                        'Legacy Paint'
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
        'miscSettings',
        'sendAlert',
        'pricelist',
        'bypass',
        'tradeSummary',
        'steamChat',
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
