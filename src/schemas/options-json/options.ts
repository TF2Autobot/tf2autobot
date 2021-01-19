import jsonschema from 'jsonschema';

export const optionsSchema: jsonschema.Schema = {
    $schema: 'http://json-schema.org/draft-04/schema#',
    type: 'object',
    properties: {
        showOnlyMetal: {
            type: 'object',
            properties: {
                enable: {
                    type: 'boolean'
                }
            },
            required: ['enable']
        },
        sortInventory: {
            type: 'object',
            properties: {
                enable: {
                    type: 'boolean'
                },
                type: {
                    type: 'integer'
                }
            },
            required: ['enable', 'type']
        },
        createListings: {
            type: 'object',
            properties: {
                enable: {
                    type: 'boolean'
                }
            },
            required: ['enable']
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
                }
            },
            required: ['enable', 'autokeys', 'backpackFull', 'highValue', 'autoRemoveIntentSellFailed']
        },
        addFriends: {
            type: 'object',
            properties: {
                enable: {
                    type: 'boolean'
                }
            },
            required: ['enable']
        },
        sendGroupInvite: {
            type: 'object',
            properties: {
                enable: {
                    type: 'boolean'
                }
            },
            required: ['enable']
        },
        pricelist: {
            type: 'object',
            properties: {
                autoRemoveIntentSell: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        }
                    },
                    required: ['enable']
                },
                autoAddInvalidItems: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        }
                    },
                    required: ['enable']
                },
                priceAge: {
                    type: 'object',
                    properties: {
                        maxInSeconds: {
                            type: 'integer'
                        }
                    },
                    required: ['maxInSeconds']
                }
            },
            required: ['autoRemoveIntentSell', 'autoAddInvalidItems', 'priceAge']
        },
        bypass: {
            type: 'object',
            properties: {
                escrow: {
                    type: 'object',
                    properties: {
                        allow: {
                            type: 'boolean'
                        }
                    },
                    required: ['allow']
                },
                overpay: {
                    type: 'object',
                    properties: {
                        allow: {
                            type: 'boolean'
                        }
                    },
                    required: ['allow']
                },
                giftWithoutMessage: {
                    type: 'object',
                    properties: {
                        allow: {
                            type: 'boolean'
                        }
                    },
                    required: ['allow']
                },
                bannedPeople: {
                    type: 'object',
                    properties: {
                        allow: {
                            type: 'boolean'
                        }
                    },
                    required: ['allow']
                }
            },
            required: ['escrow', 'overpay', 'giftWithoutMessage', 'bannedPeople']
        },
        autobump: {
            type: 'object',
            properties: {
                enable: {
                    type: 'boolean'
                }
            },
            required: ['enable']
        },
        skipItemsInTrade: {
            type: 'object',
            properties: {
                enable: {
                    type: 'boolean'
                }
            },
            required: ['enable']
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
            required: ['enable', 'withUncraft']
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
            required: ['showStockChanges', 'showTimeTakenInMS', 'showItemPrices']
        },
        highValue: {
            type: 'object',
            properties: {
                enableHold: {
                    type: 'boolean'
                },
                sheens: {
                    $ref: 'array-string'
                },
                killstreakers: {
                    $ref: 'array-string'
                },
                strangeParts: {
                    $ref: 'array-string'
                },
                painted: {
                    $ref: 'array-string'
                }
            },
            required: ['enableHold', 'sheens', 'killstreakers', 'strangeParts', 'painted']
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
            required: ['duel', 'noiseMaker']
        },
        game: {
            type: 'object',
            properties: {
                playOnlyTF2: {
                    type: 'boolean'
                },
                customName: {
                    type: 'string'
                }
            },
            required: ['playOnlyTF2', 'customName']
        },
        normalize: {
            type: 'object',
            properties: {
                festivized: {
                    type: 'boolean'
                },
                strangeUnusual: {
                    type: 'boolean'
                },
                painted: {
                    type: 'boolean'
                }
            },
            required: ['festivized', 'strangeUnusual', 'painted']
        },
        details: {
            type: 'object',
            properties: {
                buy: {
                    type: 'string'
                },
                sell: {
                    type: 'string'
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
                    required: ['showSpells', 'showStrangeParts', 'showKillstreaker', 'showSheen', 'showPainted']
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
                    required: ['duel', 'noiseMaker']
                }
            },
            required: ['buy', 'sell', 'highValue', 'uses']
        },
        statistics: {
            type: 'object',
            properties: {
                starter: {
                    type: 'integer'
                },
                lastTotalTrades: {
                    type: 'integer'
                },
                startingTimeInUnix: {
                    type: 'integer'
                },
                lastTotalProfitMadeInRef: {
                    type: 'number'
                },
                lastTotalProfitOverpayInRef: {
                    type: 'number'
                },
                profitDataSinceInUnix: {
                    type: 'integer'
                },
                sendStats: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        time: {
                            $ref: 'array-string'
                        }
                    },
                    required: ['enable', 'time']
                }
            },
            required: [
                'starter',
                'lastTotalTrades',
                'startingTimeInUnix',
                'lastTotalProfitMadeInRef',
                'lastTotalProfitOverpayInRef',
                'profitDataSinceInUnix',
                'sendStats'
            ]
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
                    type: 'integer'
                },
                minRefined: {
                    type: 'number'
                },
                maxRefined: {
                    type: 'number'
                },
                banking: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        }
                    },
                    required: ['enable']
                },
                scrapAdjustment: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        value: {
                            type: 'integer'
                        }
                    },
                    required: ['enable', 'value']
                },
                accept: {
                    type: 'object',
                    properties: {
                        understock: {
                            type: 'boolean'
                        }
                    },
                    required: ['understock']
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
            ]
        },
        crafting: {
            type: 'object',
            properties: {
                weapons: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        }
                    },
                    required: ['enable']
                },
                metals: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        minScrap: {
                            type: 'integer'
                        },
                        minRec: {
                            type: 'integer'
                        },
                        threshold: {
                            type: 'integer'
                        }
                    },
                    required: ['enable', 'minScrap', 'minRec', 'threshold']
                }
            },
            required: ['weapons', 'metals']
        },
        offerReceived: {
            type: 'object',
            properties: {
                invalidValue: {
                    type: 'object',
                    properties: {
                        autoDecline: {
                            type: 'object',
                            properties: {
                                enable: {
                                    type: 'boolean'
                                },
                                declineReply: {
                                    type: 'string'
                                }
                            },
                            required: ['enable', 'declineReply']
                        },
                        exceptionValue: {
                            type: 'object',
                            properties: {
                                skus: {
                                    $ref: 'array-string'
                                },
                                valueInRef: {
                                    type: 'number'
                                }
                            },
                            required: ['skus', 'valueInRef']
                        }
                    },
                    required: ['autoDecline', 'exceptionValue']
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
                            type: 'object',
                            properties: {
                                enable: {
                                    type: 'boolean'
                                },
                                declineReply: {
                                    type: 'string'
                                }
                            },
                            required: ['enable', 'declineReply']
                        }
                    },
                    required: ['givePrice', 'autoAcceptOverpay', 'autoDecline']
                },
                disabledItems: {
                    type: 'object',
                    properties: {
                        autoAcceptOverpay: {
                            type: 'boolean'
                        },
                        autoDecline: {
                            type: 'object',
                            properties: {
                                enable: {
                                    type: 'boolean'
                                },
                                declineReply: {
                                    type: 'string'
                                }
                            },
                            required: ['enable', 'declineReply']
                        }
                    },
                    required: ['autoAcceptOverpay', 'autoDecline']
                },
                overstocked: {
                    type: 'object',
                    properties: {
                        autoAcceptOverpay: {
                            type: 'boolean'
                        },
                        autoDecline: {
                            type: 'object',
                            properties: {
                                enable: {
                                    type: 'boolean'
                                },
                                declineReply: {
                                    type: 'string'
                                }
                            },
                            required: ['enable', 'declineReply']
                        }
                    },
                    required: ['autoAcceptOverpay', 'autoDecline']
                },
                understocked: {
                    type: 'object',
                    properties: {
                        autoAcceptOverpay: {
                            type: 'boolean'
                        },
                        autoDecline: {
                            type: 'object',
                            properties: {
                                enable: {
                                    type: 'boolean'
                                },
                                declineReply: {
                                    type: 'string'
                                }
                            },
                            required: ['enable', 'declineReply']
                        }
                    },
                    required: ['autoAcceptOverpay', 'autoDecline']
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
                            type: 'object',
                            properties: {
                                enable: {
                                    type: 'boolean'
                                },
                                declineReply: {
                                    type: 'string'
                                }
                            },
                            required: ['enable', 'declineReply']
                        }
                    },
                    required: ['enableCheck', 'minKeys', 'autoDecline']
                },
                escrowCheckFailed: {
                    type: 'object',
                    properties: {
                        ignoreFailed: {
                            type: 'boolean'
                        }
                    },
                    required: ['ignoreFailed']
                },
                bannedCheckFailed: {
                    type: 'object',
                    properties: {
                        ignoreFailed: {
                            type: 'boolean'
                        }
                    },
                    required: ['ignoreFailed']
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
            ]
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
                    type: 'object',
                    properties: {
                        note: {
                            type: 'string'
                        }
                    },
                    required: ['note']
                },
                invalidItems: {
                    type: 'object',
                    properties: {
                        note: {
                            type: 'string'
                        }
                    },
                    required: ['note']
                },
                disabledItems: {
                    type: 'object',
                    properties: {
                        note: {
                            type: 'string'
                        }
                    },
                    required: ['note']
                },
                overstocked: {
                    type: 'object',
                    properties: {
                        note: {
                            type: 'string'
                        }
                    },
                    required: ['note']
                },
                understocked: {
                    type: 'object',
                    properties: {
                        note: {
                            type: 'string'
                        }
                    },
                    required: ['note']
                },
                duped: {
                    type: 'object',
                    properties: {
                        note: {
                            type: 'string'
                        }
                    },
                    required: ['note']
                },
                dupedCheckFailed: {
                    type: 'object',
                    properties: {
                        note: {
                            type: 'string'
                        }
                    },
                    required: ['note']
                },
                escrowCheckFailed: {
                    type: 'object',
                    properties: {
                        note: {
                            type: 'string'
                        }
                    },
                    required: ['note']
                },
                bannedCheckFailed: {
                    type: 'object',
                    properties: {
                        note: {
                            type: 'string'
                        }
                    },
                    required: ['note']
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
            ]
        },
        discordWebhook: {
            type: 'object',
            properties: {
                ownerID: {
                    type: 'string'
                },
                displayName: {
                    type: 'string'
                },
                avatarURL: {
                    type: 'string'
                },
                embedColor: {
                    type: 'string'
                },
                tradeSummary: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        url: {
                            $ref: 'array-string'
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
                            required: ['showQuickLinks', 'showKeyRate', 'showPureStock', 'showInventory', 'note']
                        },
                        mentionOwner: {
                            type: 'object',
                            properties: {
                                enable: {
                                    type: 'boolean'
                                },
                                itemSkus: {
                                    $ref: 'array-string'
                                }
                            },
                            required: ['enable', 'itemSkus']
                        }
                    },
                    required: ['enable', 'url', 'misc', 'mentionOwner']
                },
                offerReview: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        url: {
                            type: 'string'
                        },
                        mentionInvalidValue: {
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
                            required: ['showQuickLinks', 'showKeyRate', 'showPureStock', 'showInventory']
                        }
                    },
                    required: ['enable', 'url', 'mentionInvalidValue', 'misc']
                },
                messages: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        url: {
                            type: 'string'
                        },
                        showQuickLinks: {
                            type: 'boolean'
                        }
                    },
                    required: ['enable', 'url', 'showQuickLinks']
                },
                priceUpdate: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        url: {
                            type: 'string'
                        },
                        note: {
                            type: 'string'
                        }
                    },
                    required: ['enable', 'url', 'note']
                },
                sendAlert: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        url: {
                            type: 'string'
                        }
                    },
                    required: ['enable', 'url']
                },
                sendStats: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        url: {
                            type: 'string'
                        }
                    },
                    required: ['enable', 'url']
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
            ]
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
                    ]
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
            ]
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
                    type: 'object',
                    properties: {
                        customReply: {
                            type: 'object',
                            properties: {
                                reply: {
                                    type: 'string'
                                }
                            },
                            required: ['reply']
                        }
                    },
                    required: ['customReply']
                },
                price: {
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
                                }
                            },
                            required: ['disabled']
                        }
                    },
                    required: ['enable', 'customReply']
                },
                buy: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        disableForSKU: {
                            $ref: 'array-string'
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
                            required: ['disabled', 'disabledForSKU']
                        }
                    },
                    required: ['enable', 'disableForSKU', 'customReply']
                },
                sell: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        disableForSKU: {
                            $ref: 'array-string'
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
                            required: ['disabled', 'disabledForSKU']
                        }
                    },
                    required: ['enable', 'disableForSKU', 'customReply']
                },
                buycart: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        disableForSKU: {
                            $ref: 'array-string'
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
                            required: ['disabled', 'disabledForSKU']
                        }
                    },
                    required: ['enable', 'disableForSKU', 'customReply']
                },
                sellcart: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        disableForSKU: {
                            $ref: 'array-string'
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
                            required: ['disabled', 'disabledForSKU']
                        }
                    },
                    required: ['enable', 'disableForSKU', 'customReply']
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
                            required: ['title', 'disabled']
                        }
                    },
                    required: ['enable', 'customReply']
                },
                clearcart: {
                    type: 'object',
                    properties: {
                        customReply: {
                            type: 'object',
                            properties: {
                                reply: {
                                    type: 'string'
                                }
                            },
                            required: ['reply']
                        }
                    },
                    required: ['customReply']
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
                            required: ['empty']
                        }
                    },
                    required: ['customReply']
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
                            required: ['donation', 'isBuyingPremium', 'offer']
                        },
                        hasBeenMadeAcceptingMobileConfirmation: {
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
                            required: ['donation', 'isBuyingPremium', 'offer']
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
                    ]
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
                            ]
                        }
                    },
                    required: ['customReply']
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
                            required: ['notInQueue', 'offerBeingMade', 'hasPosition']
                        }
                    },
                    required: ['customReply']
                },
                owner: {
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
                            required: ['disabled', 'reply']
                        }
                    },
                    required: ['enable', 'customReply']
                },
                discord: {
                    type: 'object',
                    properties: {
                        enable: {
                            type: 'boolean'
                        },
                        inviteURL: {
                            type: 'string'
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
                            required: ['disabled', 'reply']
                        }
                    },
                    required: ['enable', 'inviteURL', 'customReply']
                },
                more: {
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
                                }
                            },
                            required: ['disabled']
                        }
                    },
                    required: ['enable', 'customReply']
                },
                autokeys: {
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
                                }
                            },
                            required: ['disabled']
                        }
                    },
                    required: ['enable', 'customReply']
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
                            required: ['disabled', 'wrongSyntax', 'fromOwner', 'success']
                        }
                    },
                    required: ['enable', 'customReply']
                },
                time: {
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
                            required: ['disabled', 'reply']
                        }
                    },
                    required: ['enable', 'customReply']
                },
                uptime: {
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
                            required: ['disabled', 'reply']
                        }
                    },
                    required: ['enable', 'customReply']
                },
                pure: {
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
                            required: ['disabled', 'reply']
                        }
                    },
                    required: ['enable', 'customReply']
                },
                rate: {
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
                            required: ['disabled', 'reply']
                        }
                    },
                    required: ['enable', 'customReply']
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
                            required: ['disabled', 'reply']
                        }
                    },
                    required: ['enable', 'maximumItems', 'customReply']
                },
                craftweapon: {
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
                    required: ['enable', 'customReply']
                },
                uncraftweapon: {
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
                    required: ['enable', 'customReply']
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
            ]
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
                        'Pumpkin Bomb': {
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
                        'Pumpkin Bomb',
                        'Halloween Fire'
                    ]
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
                    ]
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
                    ]
                },
                painted: {
                    type: 'object',
                    properties: {
                        'A Color Similar to Slate': {
                            type: 'string'
                        },
                        'A Deep Commitment to Purple': {
                            type: 'string'
                        },
                        'A Distinctive Lack of Hue': {
                            type: 'string'
                        },
                        "A Mann's Mint": {
                            type: 'string'
                        },
                        'After Eight': {
                            type: 'string'
                        },
                        'Aged Moustache Grey': {
                            type: 'string'
                        },
                        'An Extraordinary Abundance of Tinge': {
                            type: 'string'
                        },
                        'Australium Gold': {
                            type: 'string'
                        },
                        'Color No. 216-190-216': {
                            type: 'string'
                        },
                        'Dark Salmon Injustice': {
                            type: 'string'
                        },
                        'Drably Olive': {
                            type: 'string'
                        },
                        'Indubitably Green': {
                            type: 'string'
                        },
                        'Mann Co. Orange': {
                            type: 'string'
                        },
                        Muskelmannbraun: {
                            type: 'string'
                        },
                        "Noble Hatter's Violet": {
                            type: 'string'
                        },
                        'Peculiarly Drab Tincture': {
                            type: 'string'
                        },
                        'Pink as Hell': {
                            type: 'string'
                        },
                        'Radigan Conagher Brown': {
                            type: 'string'
                        },
                        'The Bitter Taste of Defeat and Lime': {
                            type: 'string'
                        },
                        "The Color of a Gentlemann's Business Pants": {
                            type: 'string'
                        },
                        'Ye Olde Rustic Colour': {
                            type: 'string'
                        },
                        "Zepheniah's Greed": {
                            type: 'string'
                        },
                        'An Air of Debonair': {
                            type: 'string'
                        },
                        'Balaclavas Are Forever': {
                            type: 'string'
                        },
                        "Operator's Overalls": {
                            type: 'string'
                        },
                        'Cream Spirit': {
                            type: 'string'
                        },
                        'Team Spirit': {
                            type: 'string'
                        },
                        'The Value of Teamwork': {
                            type: 'string'
                        },
                        'Waterlogged Lab Coat': {
                            type: 'string'
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
                    ]
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
                    ]
                }
            },
            required: ['spells', 'sheens', 'killstreakers', 'painted', 'strangeParts']
        }
    },
    required: [
        'showOnlyMetal',
        'sortInventory',
        'createListings',
        'sendAlert',
        'addFriends',
        'sendGroupInvite',
        'pricelist',
        'bypass',
        'autobump',
        'skipItemsInTrade',
        'weaponsAsCurrency',
        'tradeSummary',
        'highValue',
        'checkUses',
        'game',
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
    ]
};
