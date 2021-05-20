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
        'string-price-properties': {
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
            ],
            additionalProperties: false
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
                'autoAddPaintedItems',
                'failedAccept',
                'unableToProcessOffer',
                'partialPrice',
                'receivedUnusualNotInPricelist'
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
                }
            },
            required: [
                'partialPriceUpdate',
                'filterCantAfford',
                'autoRemoveIntentSell',
                'autoAddInvalidItems',
                'autoAddInvalidUnusual',
                'autoAddPaintedItems',
                'priceAge'
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
                }
            },
            required: ['customInitializer'],
            additionalProperties: false
        },

        highValue: {
            type: 'object',
            properties: {
                enableHold: {
                    type: 'boolean'
                },
                spells: {
                    $ref: '#/definitions/string-array',
                    maxItems: 16
                },
                sheens: {
                    $ref: '#/definitions/string-array',
                    maxItems: 7
                },
                killstreakers: {
                    $ref: '#/definitions/string-array',
                    maxItems: 7
                },
                strangeParts: {
                    $ref: '#/definitions/string-array'
                },
                painted: {
                    $ref: '#/definitions/string-array'
                }
            },
            required: ['enableHold', 'spells', 'sheens', 'killstreakers', 'strangeParts', 'painted'],
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
                strangeParts: {
                    type: 'object',
                    properties: {
                        our: {
                            type: 'boolean'
                        },
                        their: {
                            type: 'boolean'
                        },
                        amountIncludeNoParts: {
                            type: 'boolean'
                        }
                    },
                    required: ['our', 'their', 'amountIncludeNoParts'],
                    additionalProperties: false
                }
            },
            required: ['festivized', 'strangeAsSecondQuality', 'painted', 'strangeParts'],
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
                escrowCheckFailed: {
                    $ref: '#/definitions/only-ignore-failed'
                },
                bannedCheckFailed: {
                    $ref: '#/definitions/only-ignore-failed'
                }
            },
            required: [
                'sendPreAcceptMessage',
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
                        mentionInvalidValue: {
                            type: 'boolean'
                        },
                        isMention: {
                            type: 'boolean'
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
                    required: ['enable', 'url', 'mentionInvalidValue', 'isMention', 'misc'],
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
                            type: 'string',
                            pattern: '^$|https://discord(app)?.com/api/webhooks/[0-9]+/(.)+'
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
                        hasNonTF2Items: {
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
                            $ref: '#/definitions/string-price-properties'
                        },
                        'A Deep Commitment to Purple': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'A Distinctive Lack of Hue': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        "A Mann's Mint": {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'After Eight': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Aged Moustache Grey': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'An Extraordinary Abundance of Tinge': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Australium Gold': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Color No. 216-190-216': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Dark Salmon Injustice': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Drably Olive': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Indubitably Green': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Mann Co. Orange': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        Muskelmannbraun: {
                            $ref: '#/definitions/string-price-properties'
                        },
                        "Noble Hatter's Violet": {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Peculiarly Drab Tincture': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Pink as Hell': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Radigan Conagher Brown': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'The Bitter Taste of Defeat and Lime': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        "The Color of a Gentlemann's Business Pants": {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Ye Olde Rustic Colour': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        "Zepheniah's Greed": {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'An Air of Debonair': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Balaclavas Are Forever': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        "Operator's Overalls": {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Cream Spirit': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Team Spirit': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'The Value of Teamwork': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Waterlogged Lab Coat': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Legacy Paint': {
                            $ref: '#/definitions/string-price-properties'
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
                            $ref: '#/definitions/string-price-properties'
                        },
                        Kills: {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Airborne Enemy Kills': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Damage Dealt': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        Dominations: {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Snipers Killed': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Buildings Destroyed': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Projectiles Reflected': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Headshot Kills': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Medics Killed': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Fires Survived': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Teammates Extinguished': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Freezecam Taunt Appearances': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Spies Killed': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Allied Healing Done': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Sappers Removed': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Players Hit': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Gib Kills': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Scouts Killed': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Taunt Kills': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Point Blank Kills': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Soldiers Killed': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Long-Distance Kills': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Giant Robots Destroyed': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Critical Kills': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Demomen Killed': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Unusual-Wearing Player Kills': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        Assists: {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Medics Killed That Have Full ÜberCharge': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Cloaked Spies Killed': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Engineers Killed': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Kills While Explosive-Jumping': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Kills While Low Health': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Burning Player Kills': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Kills While Invuln ÜberCharged': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Posthumous Kills': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Not Crit nor MiniCrit Kills': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Full Health Kills': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Killstreaks Ended': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Defenders Killed': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        Revenges: {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Robot Scouts Destroyed': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Heavies Killed': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Tanks Destroyed': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Kills During Halloween': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Pyros Killed': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Submerged Enemy Kills': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Kills During Victory Time': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Taunting Player Kills': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Robot Spies Destroyed': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Kills Under A Full Moon': {
                            $ref: '#/definitions/string-price-properties'
                        },
                        'Robots Killed During Halloween': {
                            $ref: '#/definitions/string-price-properties'
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
