import { snakeCase } from 'change-case';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import jsonlint from 'jsonlint';
import * as path from 'path';
import { deepMerge } from '../lib/tools/deep-merge';

import validator from '../lib/validator';

export const DEFAULTS = {
    showOnlyMetal: {
        enable: true // ✅ (src/classes/ - MyHandler/MyHandler.ts, Cart/UserCart.ts)
    },

    sortInventory: {
        enable: true, // ✅ (src/classes/MyHandler/MyHandler.ts)
        type: 3 // ✅ 1 - by name, 2 - by defindex, 3 - by rarity, 4 - by type, 5 - by date
    },

    createListings: {
        enable: true // ✅ (src/classes/Pricelist.ts)
    },

    sendAlert: {
        enable: true, // ✅
        autokeys: {
            lowPure: true // ✅ (src/classes/Autokeys/Autokeys.ts)
        },
        backpackFull: true, // ✅ (src/classes/Carts/Cart.ts)
        highValue: {
            gotDisabled: true, // ✅ (src/classes/MyHandler/offer/accepted/updateListings.ts)
            receivedNotInPricelist: true, // ✅ (src/classes/MyHandler/offer/accepted/updateListings.ts)
            tryingToTake: true // ✅ (src/classes/MyHandler/MyHandler.ts)
        }
    },

    addFriends: {
        enable: true // ✅ (src/classes/MyHandler/MyHandler.ts)
    },

    sendGroupInvite: {
        enable: true // ✅ (src/classes/MyHandler/MyHandler.ts)
    },

    autoRemoveIntentSell: {
        enable: true // ✅ (src/classes/MyHandler/offer/accepted/updateListings.ts)
    },

    bypass: {
        escrow: {
            allow: false // ✅ (src/classes/Bot.ts)
        },
        overpay: {
            allow: true // ✅ (src/classes/MyHandler/MyHandler.ts)
        },
        giftWithoutMessage: {
            allow: false // ✅ (src/classes/MyHandler/MyHandler.ts)
        },
        bannedPeople: {
            allow: false // ✅ (src/classes/Bot.ts)
        }
    },

    priceAge: {
        maxInSeconds: 28000 // ✅ (src/classes/Pricelist.ts)
    },

    autobump: {
        enable: false // ✅ (src/classes/ - Listings.ts, MyHandler/MyHandler.ts, Commands/functions/options.ts)
    },

    skipItemsInTrade: {
        enable: true // ✅ (src/classes/Carts - AdminCart.ts, DonateCart.ts, PremiumCart.ts, UserCart.ts)
    },

    weaponsAsCurrency: {
        // src/classes/ - Carts/CartQueue.ts, Carts/UserCart.ts, Commands/Commands.ts, Commands/functions/options.ts
        //                Commands/functions/PricelistManager.ts, MyHandler/MyHandler.ts, MyHandler/offer/accepted/updateListings.ts
        // src/lib/tools/profit.ts
        enable: true, // ✅
        withUncraft: true // ✅
    },

    tradeSummary: {
        showStockChanges: false, // ✅
        // src/classes/ - MyHandler/MyHandler.ts, MyHandler/offer/accepted/processAccepted.ts, MyHandler/offer/notify/declined.ts
        //                MyHandler/offer/review/send-review.ts
        // src/lib/DiscordWebhook - sendOfferReview.ts, sendTradeSummary.ts
        showTimeTakenInMS: true, // ✅
        // src/classes/ - MyHandler/offer/accepted/processAccepted.ts
        showItemPrices: false // ✅
        // src/classes/ - MyHandler/offer/accepted/processAccepted.ts
        // src/lib/DiscordWebhook/sendTradeSummary.ts
    },

    highValue: {
        enableHold: true, // ✅ // (src/classes/MyHandler/offer/accepted/updateListings.ts)
        // ↓ src/classes/ - MyHandler/offer/accepted/updateListings.ts, Listings/Listings.ts
        sheens: [], // ✅
        killstreakers: [], // ✅
        strangeParts: [], // ✅
        painted: [] // ✅
    },

    checkUses: {
        // src/classes/ - MyHandler/MyHandler.ts, Carts/UserCart.ts, Commands/functions/review.ts, Listings/Listings.ts
        duel: true, // ✅
        noiseMaker: true // ✅
    },

    game: {
        // src/classes/ - MyHandler/MyHandler.ts, Commands/functions/options.ts
        playOnlyTF2: false, // ✅
        customName: '' // ✅
    },

    normalize: {
        // src/classes/ - Inventory.ts, MyHandler/MyHandler.ts, Commands/functions/review.ts
        // src/lib/tools/check.ts
        festivized: false, // ✅
        strangeUnusual: false // ✅
    },

    details: {
        buy: 'I am buying your %name% for %price%, I have %current_stock% / %max_stock%.', // ✅
        sell: 'I am selling my %name% for %price%, I am selling %amount_trade%.', // ✅
        // ^ src/classes/ - Autokeys/(all), Listings/Listings.ts
        // ↓ src/classes/Listings/Listings.ts
        highValue: {
            showSpells: true, // ✅
            showStrangeParts: false, // ✅
            showKillstreaker: true, // ✅
            showSheen: true, // ✅
            showPainted: true // ✅
        }
    },

    statistics: {
        starter: 0, // ✅ (src/lib/DiscordWebhook/sendTradeSummary.ts)
        lastTotalTrades: 0, // ✅ (src/classes/Commands/functions/status.ts)
        startingTimeInUnix: 0, // ✅ (src/lib/tools/stats.ts)
        lastTotalProfitMadeInRef: 0, // ✅ (src/lib/tools/profit.ts)
        lastTotalProfitOverpayInRef: 0 // ✅ (src/lib/tools/profit.ts)
    },

    autokeys: {
        // src/classes/Autokeys/(all)
        enable: false, // ✅
        minKeys: 3, // ✅
        maxKeys: 15, // ✅
        minRefined: 30, // ✅
        maxRefined: 150, // ✅
        banking: {
            enable: false // ✅
        },
        scrapAdjustment: {
            enable: false, // ✅
            value: 1 // ✅
        },
        accept: {
            understock: false // ✅
        }
    },

    crafting: {
        weapons: {
            enable: true // ✅ (src/classes/MyHandler/utils/ - craftClassWeapons.ts, craftDuplicateWeapons.ts)
        },
        metals: {
            enable: true, // ✅ (src/classes/MyHandler/utils/keepMetalSupply.ts)
            minScrap: 9, // ✅ (src/classes/MyHandler/MyHandler.ts)
            minRec: 9, // ✅ (src/classes/MyHandler/MyHandler.ts)
            threshold: 9 // ✅ (src/classes/MyHandler/MyHandler.ts)
        }
    },

    offerReceived: {
        // 🟥_INVALID_VALUE (ONLY_INVALID_VALUE)
        invalidValue: {
            autoDecline: {
                enable: true, // ✅
                note: '' // ✅
                /*
                 * ^Default:
                 * "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
                 *  you've sent a trade with an invalid value (your side and my side do not hold equal value)."
                 * //
                 * followed by `[You're missing: ${value}]` (unchangeable)
                 */
            },
            exceptionValue: {
                skus: [], // ✅
                valueInRef: 0 // ✅
            }
        },
        // 🟨_INVALID_ITEMS (ONLY_INVALID_ITEMS)
        invalidItems: {
            givePrice: false, // ✅
            autoAcceptOverpay: true, // ✅
            autoDecline: {
                enable: false, // ✅
                note: '' // ✅
                /*
                 * ^Default:
                 * "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
                 *  you've sent a trade with an invalid items (not exist in my pricelist)."
                 * //
                 * followed by `[You're missing: ${value}]` (if applicable)
                 */
            }
        },
        // 🟦_OVERSTOCKED (ONLY_OVERSTOCKED)
        overstocked: {
            autoAcceptOverpay: false, // ✅
            autoDecline: {
                enable: false, // ✅
                note: '' // ✅
                /*
                 * ^Default:
                 * "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
                 *  you're attempting to sell item(s) that I can't buy more of."
                 * //
                 * followed by `[You're missing: ${value}]` (if applicable)
                 */
            }
        },
        // 🟩_UNDERSTOCKED (ONLY_UNDERSTOCKED)
        understocked: {
            autoAcceptOverpay: false, // ✅
            autoDecline: {
                enable: false, // ✅
                note: '' // ✅
                /*
                 * ^Default:
                 * "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
                 *  you're attempting to purchase item(s) that I can't sell more of."
                 * //
                 * followed by `[You're missing: ${value}]` (if applicable)
                 */
            }
        },
        // 🟫_DUPED_ITEMS
        duped: {
            enableCheck: true, // ✅
            minKeys: 10, // ✅
            autoDecline: {
                enable: true, // ✅
                note: '' // ✅
                /*
                 * ^Default:
                 * "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
                 *  I don't accept duped items."
                 */
            }
        }
    },

    manualReview: {
        enable: true, // ✅
        showOfferSummary: true, // ✅
        showReviewOfferNote: true, // ✅
        showOwnerCurrentTime: true, // ✅
        showItemPrices: true, // ✅
        // All these custom note only apply to trade partner's side
        // 🟥_INVALID_VALUE
        invalidValue: {
            note: '' // ✅
            // Default note: "You're taking too much in value."
            // followed by `[You're missing: ${value}]` (unchangeable)
        },
        // 🟨_INVALID_ITEMS
        invalidItems: {
            note: '' // ✅ parameters: %itemsName%, %isOrAre%
            // Default note: `%itemsName% %isOrAre% not in my pricelist.`
            // %itemsName% output: join of `${name}` array.
        },
        // 🟦_OVERSTOCKED
        overstocked: {
            note: '' // ✅ parameters: %itemsName%, %isOrAre%
            // Default note: `I can only buy %itemsName% right now.`
            // %itemsName% output: join of `${amountCanTrade} - ${name}` array
        },
        // 🟩_UNDERSTOCKED
        understocked: {
            note: '' // ✅ parameters: %itemsName%, %isOrAre%
            // Default note: `I can only sell %itemsName% right now.`
            // %itemsName% output: join of `${amountCanTrade} - ${name}` array
        },
        // 🟫_DUPED_ITEMS
        duped: {
            note: '' // ✅ parameters: %itemsName%, %isOrAre%
            // Default note: `%itemsName% %isOrAre% appeared to be duped.`
            // %itemsName% output: join of `${name}, history page: https://backpack.tf/item/${el.assetid}` array
        },
        // 🟪_DUPE_CHECK_FAILED
        dupedCheckFailed: {
            note: '' // ✅ parameters: %itemsName%, %isOrAre%
            // Default note: `I failed to check for duped on %itemsName%.`
            // %itemsName% output: a string OR a join of `${name}, history page: https://backpack.tf/item/${el.assetid}` array
        },
        // ⬜_ESCROW_CHECK_FAILED
        escrowCheckFailed: {
            note: '' // ✅
            // Default note: "Backpack.tf or steamrep.com is down and I failed to check your backpack.tf/steamrep
            //                 status, please wait for my owner to manually accept/decline your offer."
        },
        // ⬜_BANNED_CHECK_FAILED
        bannedCheckFailed: {
            note: '' // ✅
            // Default note: "Steam is down and I failed to check your Escrow (Trade holds)
            //                 status, please wait for my owner to manually accept/decline your offer."
        },
        additionalNotes: '' // ✅
    },

    discordWebhook: {
        ownerID: '', // ✅
        displayName: '', // ✅
        avatarURL: '', // ✅
        embedColor: '9171753', // ✅
        tradeSummary: {
            enable: true, // ✅
            url: [], // ✅
            misc: {
                showQuickLinks: true, // ✅
                showKeyRate: true, // ✅
                showPureStock: true, // ✅
                showInventory: true, // ✅
                note: '' // ✅
            },
            mentionOwner: {
                enable: true, // ✅
                itemSkus: [] // ✅
            }
        },
        offerReview: {
            enable: true, // ✅
            url: '', // ✅
            mentionInvalidValue: false, // ✅
            misc: {
                showQuickLinks: true, // ✅
                showKeyRate: true, // ✅
                showPureStock: true, // ✅
                showInventory: true // ✅
            }
        },
        messages: {
            enable: true, // ✅
            url: '', // ✅
            showQuickLinks: true
        },
        priceUpdate: {
            enable: true, // ✅
            url: '', // ✅
            note: '' // ✅
        },
        sendAlert: {
            enable: true, // ✅
            url: '' // ✅
        }
    },

    customMessage: {
        sendOffer: '', // ✅
        // ^Default: Powered by TF2Autobot (not removed)
        welcome: '', // ✅
        // ^Default: `Hi %name%! If you don't know how things work, please type "!%admin%" - TF2Autobot v${version}`
        // parameters output: %name% - partner's name (if obtained), %admin% - if admin, "help", else "how2trade"
        iDontKnowWhatYouMean: '',
        success: '', // ✅
        // ^Default: "/pre ✅ Success! The offer went through successfully."
        successEscrow: '', // ✅
        // ^Default:
        /*
         * "✅ Success! The offer has gone through successfully, but you will receive your items after several days.
         *  To prevent this from happening in the future, please enable Steam Guard Mobile Authenticator.
         *  \nRead:\n• Steam Guard Mobile Authenticator - https://support.steampowered.com/kb_article.php?ref=8625-WRAH-9030
         *  \n• How to set up the Steam Guard Mobile Authenticator - https://support.steampowered.com/kb_article.php?ref=4440-RTUI-9218"
         */
        decline: {
            giftNoNote: '', // ✅
            /*
             * ^Default:
             * "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
             *   the offer you've sent is an empty offer on my side without any offer message. If you wish to give
             *   it as a gift, please include "gift" in the offer message. Thank you.""
             */
            crimeAttempt: '', // ✅
            /*
             * ^Default:
             * "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
             *  you're taking free items. No."
             */
            onlyMetal: '', // ✅
            /*
             * ^Default:
             * "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
             *  you might forgot to add items into the trade."
             */
            duelingNot5Uses: '', // ✅
            /*
             * ^Default:
             * "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
             *  your offer contains Dueling Mini-Game(s) that does not have 5 uses."
             */
            noiseMakerNot5Uses: '', // ✅
            /*
             * ^Default:
             * "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
             *  your offer contains Noise Maker(s) that does not have 25 uses"
             */
            highValueItemsNotSelling: '', // ✅
            /*
             * ^Default:
             * "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
             *  you're attempting to purchase %highValueName%, but I am not selling it right now."
             * //
             * ^Parameter: %highValueName% (output a join of an array of highValue items name)
             */
            notTradingKeys: '', // ✅
            /*
             * ^Default:
             * "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
             *  I am no longer trading keys. You can confirm this by typing "!price Mann Co. Supply Crate Key" or "!autokeys"."
             */
            notSellingKeys: '', // ✅
            /*
             * ^Default:
             * "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
             *  I am no longer selling keys. You can confirm this by typing "!price Mann Co. Supply Crate Key" or "!autokeys"."
             */
            notBuyingKeys: '', // ✅
            /*
             * ^Default:
             * "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
             *  I am no longer buying keys. You can confirm this by typing "!price Mann Co. Supply Crate Key" or "!autokeys"."
             */
            banned: '', // ✅
            /*
             * ^Default:
             * "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
             *  you're currently banned on backpack.tf or labeled as a scammer on steamrep.com or another community."
             */
            escrow: '' // ✅
            /*
             * ^Default:
             * "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
             *  I do not accept escrow (trade holds). To prevent this from happening in the future, please enable Steam Guard Mobile Authenticator."
             *  \nRead:\n• Steam Guard Mobile Authenticator - https://support.steampowered.com/kb_article.php?ref=8625-WRAH-9030
             *  \n• How to set up Steam Guard Mobile Authenticator - https://support.steampowered.com/kb_article.php?ref=4440-RTUI-9218
             */
        },
        tradedAway: '', // ✅
        /*
         * ^Default: "/pre ❌ Ohh nooooes! Your offer is no longer available. Reason: Items not available (traded away in a different trade)."
         */
        failedMobileConfirmation: '', // ✅
        /*
         * ^Default: "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: Failed to accept mobile confirmation"
         */
        cancelledActiveForAwhile: '', // ✅
        /*
         * ^Default: "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been active for a while.
         *            If the offer was just created, this is likely an issue on Steam's end. Please try again"
         */
        clearFriends: '' // ✅
        /*
         * ^Default: "/quote I am cleaning up my friend list and you have randomly been selected to be removed. Please feel free to add me again if you want to trade at a later time!"
         * ^Parameter: %name% (output: partner's name)
         */
    },

    commands: {
        enable: true, // if false, only admin can use commands // ✅
        customDisableReply: '', // ✅
        /*
         * ^Default: "❌ Command function is disabled by the owner."
         */
        how2trade: {
            customReply: {
                reply: '' // ✅
                /*
                 * ^Default:
                 * `/quote You can either send me an offer yourself, or use one of my commands to request a trade.
                 *   Say you want to buy a Team Captain, just type "!buy Team Captain", if want to buy more,
                 *   just add the [amount] - "!buy 2 Team Captain". Type "!help" for all the commands.
                 *   \nYou can also buy or sell multiple items by using the "!buycart [amount] <item name>" or
                 *   "!sellcart [amount] <item name>" commands.`
                 */
            }
        },
        price: {
            enable: true, // ✅
            customReply: {
                disabled: '' // ✅
                /*
                 * ^Default: "❌ This command is disabled by the owner."
                 */
            }
        },
        buy: {
            enable: true, // ⚠️
            disableForSKU: [], // ⚠️
            customReply: {
                disabled: '' // ⚠️
            }
        },
        sell: {
            enable: true, // ⚠️
            disableForSKU: [], // ⚠️
            customReply: {
                disabled: '' // ⚠️
            }
        },
        buycart: {
            enable: true, // ⚠️
            disableForSKU: [], // ⚠️
            customReply: {
                disabled: '' // ⚠️
            }
        },
        sellcart: {
            enable: true, // ⚠️
            disableForSKU: [], // ⚠️
            customReply: {
                disabled: '' // ⚠️
            }
        },
        cart: {
            enable: true, // ✅
            customReply: {
                title: '', // ✅ (Cart.ts)
                /*
                 * ^Default: "🛒== YOUR CART ==🛒"
                 */
                disabled: '' // ✅
                /*
                 * ^Default: "❌ This command is disabled by the owner."
                 */
            }
        },
        clearcart: {
            // always enable
            customReply: {
                reply: '' // ✅
                /*
                 * ^Default: "🛒 Your cart has been cleared."
                 */
            }
        },
        checkout: {
            // always enable
            customReply: {
                empty: '' // ✅
                /*
                 * ^Default: "🛒 Your cart is empty."
                 */
            }
        },
        addToQueue: {
            alreadyHaveActiveOffer: '', // ✅
            /* ^Default:
             *  "❌ You already have an active offer! Please finish it before requesting a new one:
             *    %tradeurl%"
             * .
             * ^Parameter: %tradeurl% (output `https://steamcommunity.com/tradeoffer/${activeOfferID}`)
             */
            alreadyInQueueProcessingOffer: '', // ✅
            /*
             * ^Default: "⚠️ You are already in the queue! Please wait while I process your offer."
             */
            alreadyInQueueWaitingTurn: '', // ✅
            /*
             * ^Default: "⚠️ You are already in the queue! Please wait your turn, there %isOrAre% %currentPosition% infront of you."
             * ^Parameters: %isOrAre% (more than 1 use "are", else "is"), %currentPosition% (yes, current queue position)
             */
            addedToQueueWaitingTurn: '', // ✅
            /*
             * ^Default: "✅ You have been added to the queue! Please wait your turn, there %isOrAre% %position% infront of you."
             * ^Parameters: %isOrAre% (more than 1 use "are", else "is"), %position% (total queue position)
             */
            alteredOffer: '', // ✅
            /*
             * ^Default: "⚠️ Your offer has been altered. Reason: %altered%."
             * ^Parameters: %altered% (altered message - unchangeable)
             */
            processingOffer: {
                donation: '', // ✅
                /*
                 * ^Default: "⌛ Please wait while I process your donation! %summarize%"
                 * ^Parameters: %summarize% (summarize message - unchangeable)
                 */
                isBuyingPremium: '', // ✅
                /*
                 * ^Default: "⌛ Please wait while I process your premium purchase! %summarize%"
                 * ^Parameters: %summarize% (summarize message - unchangeable)
                 */
                offer: '' // ✅
                /*
                 * ^Default: "⌛ Please wait while I process your offer! %summarize%"
                 * ^Parameters: %summarize% (summarize message - unchangeable)
                 */
            },
            hasBeenMadeAcceptingMobileConfirmation: {
                donation: '', // ✅
                /*
                 * ^Default: "⌛ Your donation has been made! Please wait while I accept the mobile confirmation."
                 */
                isBuyingPremium: '', // ✅
                /*
                 * ^Default: "⌛ Your donation has been made! Please wait while I accept the mobile confirmation."
                 */
                offer: '' // ✅
                /*
                 * ^Default: "⌛ Your offer has been made! Please wait while I accept the mobile confirmation."
                 */
            }
        },
        cancel: {
            // always enable
            customReply: {
                isBeingSent: '', // ✅
                /*
                 * ^Default: "⚠️ Your offer is already being sent! Please try again when the offer is active."
                 */
                isCancelling: '', // ✅
                /*
                 * ^Default: "⚠️ Your offer is already being canceled. Please wait a few seconds for it to be canceled."
                 */
                isRemovedFromQueue: '', // ✅
                /*
                 * ^Default: "✅ You have been removed from the queue."
                 */
                noActiveOffer: '', // ✅
                /*
                 * ^Default: "❌ You don't have an active offer."
                 */
                successCancel: '' // ✅
                /*
                 * ^Default: "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: Offer was canceled by user."
                 * src/MyHandler/offer/notify/cancelled.ts
                 */
            }
        },
        queue: {
            // always enable
            customReply: {
                notInQueue: '', // ✅
                /*
                 * ^Default: "❌ You are not in the queue."
                 */
                offerBeingMade: '', // ✅
                /*
                 * ^Default: "⌛ Your offer is being made."
                 */
                hasPosition: '' // ✅
                /*
                 * ^Default: "There are %position% users ahead of you."
                 * ^Parameter: %position%
                 */
            }
        },
        owner: {
            // ✅
            enable: true, // ✅
            customReply: {
                disabled: '', // ✅
                /*
                 * ^Default: "❌ This command is disabled by the owner."
                 */
                reply: '' // ✅
                /*
                 * ^Default: "• Steam: %steamurl%\n• Backpack.tf: %bptfurl%"
                 * ^Parameters:
                 *   - %steamurl% (`https://steamcommunity.com/profiles/${firstAdmin.toString()}`)
                 *   - %bptfurl% (`https://backpack.tf/profiles/${firstAdmin.toString()}`)
                 *   - %steamid% (SteamID64 of the first ADMINS element)
                 */
            }
        },
        discord: {
            enable: true, // ✅
            inviteURL: '', // ✅
            /*
             * ^Default: "https://discord.gg/ZrVT7mc"
             */
            customReply: {
                disabled: '', // ✅
                /*
                 * ^Default: "❌ This command is disabled by the owner."
                 */
                reply: '' // ✅
                /*
                 * ^Default:
                 *   - If discord.inviteURL is not empty:
                 *       - `TF2Autobot Discord Server: https://discord.gg/ZrVT7mc\nOwner's Discord Server: ${inviteURL}`
                 *   - If empty:
                 *       - "TF2Autobot Discord Server: https://discord.gg/ZrVT7mc"
                 */
            }
        },
        more: {
            enable: true, // ✅ if false, only admin can use
            customReply: {
                disabled: '' // ✅
                /*
                 * ^Default: "❌ This command is disabled by the owner."
                 */
            }
        },
        autokeys: {
            enable: true, // ✅ if false, only admin can use
            customReply: {
                disabled: '' // ✅
                /*
                 * ^Default: "❌ This command is disabled by the owner."
                 */
            }
        },
        message: {
            enable: true, // ✅
            customReply: {
                disabled: '', // ✅
                /*
                 * ^Default: "❌ This command is disabled by the owner."
                 */
                wrongSyntax: '', // ✅
                /*
                 * ^Default: `❌ Please include a message. Here\'s an example: "!message Hi"`
                 */
                fromOwner: '', // ✅
                /*
                 * ^Default: `/quote 💬 Message from the owner: %reply%\n\n❔ Hint: You can
                 *             use the !message command to respond to the owner of this bot.
                 *             \nExample: !message Hi Thanks!`
                 * ^Parameter: %reply% (Your reply)
                 */
                success: '' // ✅
                /*
                 * ^Default: "✅ Your message has been sent."
                 */
            }
        },
        time: {
            enable: true, // ✅ if false, only admin can use
            customReply: {
                disabled: '', // ✅
                /*
                 * ^Default: "❌ This command is disabled by the owner."
                 */
                reply: '' // ✅
                /*
                 * ^Default: "It is currently the following time in my owner's timezone: %emoji% %time%\n\n%note%"
                 * .
                 * ^Parameters: %emoji% (clock emoji), %time% (full time format), %note% (additional notes)
                 */
            }
        },
        uptime: {
            enable: true, // ✅ if false, only admin can use
            customReply: {
                disabled: '', // ✅
                /*
                 * ^Default: "❌ This command is disabled by the owner."
                 */
                reply: '' // ✅
                /*
                 * ^Default: "%uptime%" (show bot total uptime)
                 */
            }
        },
        pure: {
            enable: true, // ✅ if false, only admin can use
            customReply: {
                disabled: '', // ✅
                /*
                 * ^Default: "❌ This command is disabled by the owner."
                 */
                reply: '' // ✅
                /*
                 * ^Default: "💰 I have %pure% in my inventory.""
                 * ^Parameter: %pure% (a join('and') of pureStock array)
                 */
            }
        },
        rate: {
            enable: true, // ✅ if false, only admin can use
            customReply: {
                disabled: '', // ✅
                /*
                 * ^Default: "❌ This command is disabled by the owner."
                 */
                reply: '' // ✅
                /*
                 * ^Default: "I value 🔑 Mann Co. Supply Crate Keys at %keyprice%. This means that one key is
                 *             the same as %keyprice% and %keyprice% is the same as one key.
                 *              \n\nKey rate source: %source%"
                 * .
                 * ^Parameter:
                 *      - %keyprice% (current sell price),
                 *      - %keyrate% (current buy/sell price)
                 *      - %source% (show pricestf url if autopriced, "manual" if manually priced)
                 */
            }
        },
        stock: {
            enable: true, // ✅ if false, only admin can use
            maximumItems: 20, // ✅
            customReply: {
                disabled: '', // ✅
                /*
                 * ^Default: "❌ This command is disabled by the owner."
                 */
                reply: '' // ✅
                /*
                 * ^Default: "/pre 📜 Here's a list of all the items that I have in my inventory:\n%stocklist%"
                 * ^Parameter: %stocklist% (a join(', \n') arrau of the items your bot have (up to stock.maximumItems))
                 */
            }
        },
        craftweapon: {
            enable: true, // ✅ if false, only admin can use
            customReply: {
                disabled: '', // ✅
                /*
                 * ^Default: "❌ This command is disabled by the owner."
                 */
                dontHave: '', // ✅
                /*
                 * ^Default: "❌ I don't have any craftable weapons in my inventory."
                 */
                have: '' // ✅
                /*
                 * ^Default: "📃 Here's a list of all craft weapons stock in my inventory:\n\n%list%"
                 * ^Parameter: %list% (a join(', \n') array or craftable weapons that your bot have)
                 */
            }
        },
        uncraftweapon: {
            enable: true, // ✅
            customReply: {
                disabled: '', // ✅
                /*
                 * ^Default: "❌ This command is disabled by the owner."
                 */
                dontHave: '', // ✅
                /*
                 * ^Default: "❌ I don't have any uncraftable weapons in my inventory."
                 */
                have: '' // ✅
                /*
                 * ^Default: "📃 Here's a list of all uncraft weapons stock in my inventory:\n\n%list%"
                 * ^Parameter: %list% (a join(', \n') array or uncraftable weapons that your bot have)
                 */
            }
        }
    },
    detailsExtra: {
        spells: {
            'Putrescent Pigmentation': 'PP 🍃',
            'Die Job': 'DJ 🍐',
            'Chromatic Corruption': 'CC 🪀',
            'Spectral Spectrum': 'Spec 🔵🔴',
            'Sinister Staining': 'Sin 🍈',
            'Voices From Below': 'VFB 🗣️',
            'Team Spirit Footprints': 'TS-FP 🔵🔴',
            'Gangreen Footprints': 'GG-FP 🟡',
            'Corpse Gray Footprints': 'CG-FP 👽',
            'Violent Violet Footprints': 'VV-FP ♨️',
            'Rotten Orange Footprints': 'RO-FP 🍊',
            'Bruised Purple Footprints': 'BP-FP 🍷',
            'Headless Horseshoes': 'HH 🍇',
            Exorcism: '👻',
            'Pumpkin Bomb': '🎃💣',
            'Halloween Fire': '🔥🟢'
        },
        sheens: {
            'Team Shine': '🔵🔴',
            'Hot Rod': '🎗️',
            Manndarin: '🟠',
            'Deadly Daffodil': '🟡',
            'Mean Green': '🟢',
            'Agonizing Emerald': '🟩',
            'Villainous Violet': '🟣'
        },
        killstreakers: {
            'Cerebral Discharge': '⚡',
            'Fire Horns': '🔥🐮',
            Flames: '🔥',
            'Hypno-Beam': '😵💫',
            Incinerator: '🚬',
            Singularity: '🔆',
            Tornado: '🌪️'
        },
        painted: {
            'A Color Similar to Slate': '🧪',
            'A Deep Commitment to Purple': '🪀',
            'A Distinctive Lack of Hue': '🎩',
            "A Mann's Mint": '👽',
            'After Eight': '🏴',
            'Aged Moustache Grey': '👤',
            'An Extraordinary Abundance of Tinge': '🏐',
            'Australium Gold': '🏆',
            'Color No. 216-190-216': '🧠',
            'Dark Salmon Injustice': '🐚',
            'Drably Olive': '🥝',
            'Indubitably Green': '🥦',
            'Mann Co. Orange': '🏀',
            Muskelmannbraun: '👜',
            "Noble Hatter's Violet": '🍇',
            'Peculiarly Drab Tincture': '🪑',
            'Pink as Hell': '🎀',
            'Radigan Conagher Brown': '🚪',
            'The Bitter Taste of Defeat and Lime': '💚',
            "The Color of a Gentlemann's Business Pants": '🧽',
            'Ye Olde Rustic Colour': '🥔',
            "Zepheniah's Greed": '🌳',
            'An Air of Debonair': '👜🔷',
            'Balaclavas Are Forever': '👜🔷',
            "Operator's Overalls": '👜🔷',
            'Cream Spirit': '🍘🥮',
            'Team Spirit': '🔵🔴',
            'The Value of Teamwork': '👨🏽‍🤝‍👨🏻',
            'Waterlogged Lab Coat': '👨🏽‍🤝‍👨🏽'
        },
        strangeParts: {
            'Robots Destroyed': '',
            Kills: '',
            'Airborne Enemy Kills': '',
            'Damage Dealt': '',
            Dominations: '',
            'Snipers Killed': '',
            'Buildings Destroyed': '',
            'Projectiles Reflected': '',
            'Headshot Kills': '',
            'Medics Killed': '',
            'Fires Survived': '',
            'Teammates Extinguished': '',
            'Freezecam Taunt Appearances': '',
            'Spies Killed': '',
            'Allied Healing Done': '',
            'Sappers Removed': '',
            'Players Hit': '',
            'Gib Kills': '',
            'Scouts Killed': '',
            'Taunt Kills': '',
            'Point Blank Kills': '',
            'Soldiers Killed': '',
            'Long-Distance Kills': '',
            'Giant Robots Destroyed': '',
            'Critical Kills': '',
            'Demomen Killed': '',
            'Unusual-Wearing Player Kills': '',
            Assists: '',
            'Medics Killed That Have Full ÜberCharge': '',
            'Cloaked Spies Killed': '',
            'Engineers Killed': '',
            'Kills While Explosive-Jumping': '',
            'Kills While Low Health': '',
            'Burning Player Kills': '',
            'Kills While Invuln ÜberCharged': '',
            'Posthumous Kills': '',
            'Not Crit nor MiniCrit Kills': '',
            'Full Health Kills': '',
            'Killstreaks Ended': '',
            'Defenders Killed': '',
            Revenges: '',
            'Robot Scouts Destroyed': '',
            'Heavies Killed': '',
            'Tanks Destroyed': '',
            'Kills During Halloween': '',
            'Pyros Killed': '',
            'Submerged Enemy Kills': '',
            'Kills During Victory Time': '',
            'Taunting Player Kills': '',
            'Robot Spies Destroyed': '',
            'Kills Under A Full Moon': '',
            'Robots Killed During Halloween': ''
        }
    }
};

export interface OnlyEnable {
    enable?: boolean;
}

// ------------ SortType ------------

export interface SortInventory extends OnlyEnable {
    type?: number;
}

// ------------ SendAlert ------------

export interface SendAlert extends OnlyEnable {
    autokeys?: AutokeysAlert;
    backpackFull?: boolean;
    highValue?: HighValueAlert;
}

export interface AutokeysAlert {
    lowPure?: boolean;
}

export interface HighValueAlert {
    gotDisabled?: boolean;
    receivedNotInPricelist?: boolean;
    tryingToTake?: boolean;
}

// ------------ Bypass ------------

export interface Bypass {
    escrow?: OnlyAllow;
    overpay?: OnlyAllow;
    giftWithoutMessage?: OnlyAllow;
    bannedPeople?: OnlyAllow;
}

export interface OnlyAllow {
    allow?: boolean;
}

// ------------ PriceAge ------------

export interface PriceAge {
    maxInSeconds?: number;
}

// ------------ WeaponsAsCurrency ------------

export interface WeaponsAsCurrency extends OnlyEnable {
    withUncraft?: boolean;
}

// ------------ TradeSummary ------------

export interface TradeSummary {
    showStockChanges?: boolean;
    showTimeTakenInMS?: boolean;
    showItemPrices?: boolean;
}

// ------------ HighValue ------------

export interface HighValue {
    enableHold?: boolean;
    sheens?: string[];
    killstreakers?: string[];
    strangeParts?: string[];
    painted?: string[];
}

// ------------ CheckUses ------------

export interface CheckUses {
    duel?: boolean;
    noiseMaker?: boolean;
}

// ------------ Game ------------

export interface Game {
    playOnlyTF2?: boolean;
    customName?: string;
}

// ------------ Normalize ------------

export interface Normalize {
    festivized?: boolean;
    strangeUnusual?: boolean;
}

// ------------ Details ------------

export interface Details {
    buy?: string;
    sell?: string;
    highValue?: ShowHighValue;
}

export interface ShowHighValue {
    showSpells: boolean;
    showStrangeParts: boolean;
    showKillstreaker: boolean;
    showSheen: boolean;
    showPainted: boolean;
}

// ------------ Statistics ------------

export interface Statistics {
    starter?: number;
    lastTotalTrades?: number;
    startingTimeInUnix?: number;
    lastTotalProfitMadeInRef?: number;
    lastTotalProfitOverpayInRef?: number;
}

// ------------ Autokeys ------------

export interface Autokeys {
    enable?: boolean;
    minKeys?: number;
    maxKeys?: number;
    minRefined?: number;
    maxRefined?: number;
    banking?: Banking;
    scrapAdjustment?: ScrapAdjustment;
    accept?: Accept;
}

export interface Banking {
    enable?: boolean;
}

export interface ScrapAdjustment {
    enable?: boolean;
    value?: number;
}

export interface Accept {
    understock?: boolean;
}

// ------------ Crafting ------------

export interface Crafting {
    weapons?: OnlyEnable;
    metals?: Metals;
}

export interface Metals extends OnlyEnable {
    minScrap?: number;
    minRec?: number;
    threshold?: number;
}

// ------------ Offer Received ------------

export interface OfferReceived {
    invalidValue?: InvalidValue;
    invalidItems?: InvalidItems;
    overstocked?: AutoAcceptOverpayAndAutoDecline;
    understocked?: AutoAcceptOverpayAndAutoDecline;
    duped?: Duped;
}

export interface InvalidValue {
    autoDecline: OnlyEnable & OnlyNote;
    exceptionValue: ExceptionValue;
}

export interface ExceptionValue {
    skus: string[];
    valueInRef: number;
}

export type AutoDecline = OnlyEnable & OnlyNote;

export interface AutoAcceptOverpayAndAutoDecline {
    autoAcceptOverpay?: boolean;
    autoDecline?: AutoDecline;
}

export interface InvalidItems extends AutoAcceptOverpayAndAutoDecline {
    givePrice?: boolean;
}

export interface Duped {
    enableCheck?: boolean;
    minKeys?: number;
    autoDecline?: AutoDecline;
}

// ------------ Manual Review ------------

export interface ManualReview extends OnlyEnable {
    showOfferSummary?: boolean;
    showReviewOfferNote?: boolean;
    showOwnerCurrentTime?: boolean;
    showItemPrices?: boolean;
    invalidValue?: OnlyNote;
    invalidItems?: OnlyNote;
    overstocked?: OnlyNote;
    understocked?: OnlyNote;
    duped?: OnlyNote;
    dupedCheckFailed?: OnlyNote;
    escrowCheckFailed?: OnlyNote;
    bannedCheckFailed?: OnlyNote;
    additionalNotes?: string;
}

// ------------ Discord Webhook ------------

export interface DiscordWebhook {
    ownerID?: string;
    displayName?: string;
    avatarURL?: string;
    embedColor?: string;
    tradeSummary?: TradeSummaryDW;
    offerReview?: OfferReviewDW;
    messages?: MessagesDW;
    priceUpdate?: PriceUpdateDW;
    sendAlert?: SendAlertDW;
}

export interface TradeSummaryDW extends OnlyEnable {
    url?: string[];
    misc?: MiscTradeSummary;
    mentionOwner?: MentionOwner;
}

export interface OnlyNote {
    note?: string;
}

export interface MiscTradeSummary extends OnlyNote {
    showQuickLinks?: boolean;
    showKeyRate?: boolean;
    showPureStock?: boolean;
    showInventory?: boolean;
}

export interface MentionOwner extends OnlyEnable {
    itemSkus?: string[];
}

export interface OfferReviewDW extends OnlyEnable {
    url?: string;
    mentionInvalidValue?: boolean;
    misc?: MiscOfferReview;
}

export interface MiscOfferReview {
    showQuickLinks?: boolean;
    showKeyRate?: boolean;
    showPureStock?: boolean;
    showInventory?: boolean;
}

export interface MessagesDW extends OnlyEnable {
    url?: string;
    showQuickLinks?: boolean;
}

export interface PriceUpdateDW extends OnlyEnable, OnlyNote {
    url?: string;
}

export interface SendAlertDW extends OnlyEnable {
    url?: string;
}

// ------------ Custom Message ------------

export interface CustomMessage {
    sendOffer?: string;
    welcome?: string;
    iDontKnowWhatYouMean?: string;
    success?: string;
    successEscrow?: string;
    decline?: DeclineNote;
    tradedAway?: string;
    failedMobileConfirmation?: string;
    cancelledActiveForAwhile?: string;
    clearFriends?: string;
}

export interface DeclineNote {
    giftNoNote: string;
    crimeAttempt: string;
    onlyMetal: string;
    duelingNot5Uses: string;
    noiseMakerNot5Uses: string;
    highValueItemsNotSelling: string;
    notTradingKeys: string;
    notSellingKeys: string;
    notBuyingKeys: string;
    banned: string;
    escrow: string;
}

// ------------ Commands ------------

export interface OnlyCustomReplyWithDisabled {
    disabled?: string;
    reply?: string;
}

export interface OnlyEnableAndDisableForSKU extends OnlyEnable {
    disableForSKU?: string[];
}

export interface Commands extends OnlyEnable {
    customDisableReply?: string;
    how2trade?: How2Trade;
    price?: Price;
    buy?: OnlyEnableAndDisableForSKU & Omit<OnlyCustomReplyWithDisabled, 'reply'>;
    sell?: OnlyEnableAndDisableForSKU & Omit<OnlyCustomReplyWithDisabled, 'reply'>;
    buycart?: OnlyEnableAndDisableForSKU & Omit<OnlyCustomReplyWithDisabled, 'reply'>;
    sellcart?: OnlyEnableAndDisableForSKU & Omit<OnlyCustomReplyWithDisabled, 'reply'>;
    cart?: Cart;
    clearcart?: ClearCart;
    checkout?: Checkout;
    addToQueue?: AddToQueue;
    cancel?: Cancel;
    queue?: Queue;
    owner?: Owner;
    discord?: Discord;
    more?: More;
    autokeys?: AutokeysCommand;
    message?: Message;
    time?: Time;
    uptime?: Uptime;
    pure?: Pure;
    rate?: Rate;
    stock?: Stock;
    craftweapon?: Weapons;
    uncraftweapon?: Weapons;
}

export interface How2Trade {
    customReply?: Omit<OnlyCustomReplyWithDisabled, 'disabled'>;
}

export interface Price extends OnlyEnable {
    customReply?: Omit<OnlyCustomReplyWithDisabled, 'reply'>;
}

export interface Cart extends OnlyEnable {
    customReply?: CartCustom;
}

export interface CartCustom extends Omit<OnlyCustomReplyWithDisabled, 'reply'> {
    title?: string;
}

export interface ClearCart {
    customReply?: Omit<OnlyCustomReplyWithDisabled, 'disabled'>;
}

export interface Checkout {
    customReply?: CheckoutReply;
}

export interface CheckoutReply {
    empty?: string;
}

export interface AddToQueue {
    alreadyHaveActiveOffer?: string;
    alreadyInQueueProcessingOffer?: string;
    alreadyInQueueWaitingTurn?: string;
    addedToQueueWaitingTurn?: string;
    alteredOffer?: string;
    processingOffer?: CartQueueProcessing;
    hasBeenMadeAcceptingMobileConfirmation?: CartQueueProcessing;
}

export interface CartQueueProcessing {
    donation?: string;
    isBuyingPremium?: string;
    offer?: string;
}

export interface Cancel {
    customReply?: CancelCustom;
}

export interface CancelCustom {
    isBeingSent?: string;
    isCancelling?: string;
    isRemovedFromQueue?: string;
    noActiveOffer?: string;
    successCancel?: string;
}

export interface Queue {
    customReply?: QueueCustom;
}

export interface QueueCustom {
    notInQueue?: string;
    offerBeingMade?: string;
    hasPosition?: string;
}

export interface Owner extends OnlyEnable {
    customReply?: OnlyCustomReplyWithDisabled;
}

export interface Discord extends OnlyEnable {
    customReply?: OnlyCustomReplyWithDisabled;
    inviteURL?: string;
}

export interface More extends OnlyEnable {
    customReply?: Omit<OnlyCustomReplyWithDisabled, 'reply'>;
}

export interface AutokeysCommand extends OnlyEnable {
    customReply?: Omit<OnlyCustomReplyWithDisabled, 'reply'>;
}

export interface Message extends OnlyEnable {
    customReply?: MessageCustom;
}

export interface MessageCustom {
    disabled?: string;
    wrongSyntax?: string;
    fromOwner?: string;
    success?: string;
}

export interface Time extends OnlyEnable {
    customReply?: OnlyCustomReplyWithDisabled;
}

export interface Uptime extends OnlyEnable {
    customReply?: OnlyCustomReplyWithDisabled;
}

export interface Pure extends OnlyEnable {
    customReply?: OnlyCustomReplyWithDisabled;
}

export interface Rate extends OnlyEnable {
    customReply?: OnlyCustomReplyWithDisabled;
}

export interface Stock extends OnlyEnable {
    customReply?: OnlyCustomReplyWithDisabled;
    maximumItems?: number;
}

export interface Weapons extends OnlyEnable {
    customReply?: HaveOrNo;
}

export interface HaveOrNo {
    disabled?: string;
    dontHave?: string;
    have?: string;
}

// ------------ Extra Details -----------

export interface DetailsExtra {
    spells?: Spells;
    sheens?: Sheens;
    killstreakers?: Killstreakers;
    painted?: Painted;
    strangeParts?: StrangeParts;
}

export interface Spells {
    'Putrescent Pigmentation'?: string;
    'Die Job'?: string;
    'Chromatic Corruption'?: string;
    'Spectral Spectrum'?: string;
    'Sinister Staining'?: string;
    'Voices From Below'?: string;
    'Team Spirit Footprints'?: string;
    'Gangreen Footprints'?: string;
    'Corpse Gray Footprints'?: string;
    'Violent Violet Footprints'?: string;
    'Rotten Orange Footprints'?: string;
    'Bruised Purple Footprints'?: string;
    'Headless Horseshoes'?: string;
    Exorcism?: string;
    'Pumpkin Bomb'?: string;
    'Halloween Fire'?: string;
}

export interface Sheens {
    'Team Shine'?: string;
    'Hot Rod'?: string;
    Manndarin?: string;
    'Deadly Daffodil'?: string;
    'Mean Green'?: string;
    'Agonizing Emerald'?: string;
    'Villainous Violet'?: string;
}

export interface Killstreakers {
    'Cerebral Discharge'?: string;
    'Fire Horns'?: string;
    Flames?: string;
    'Hypno-Beam'?: string;
    Incinerator?: string;
    Singularity?: string;
    Tornado?: string;
}

export interface Painted {
    'A Color Similar to Slate'?: string;
    'A Deep Commitment to Purple'?: string;
    'A Distinctive Lack of Hue'?: string;
    "A Mann's Mint"?: string;
    'After Eight'?: string;
    'Aged Moustache Grey'?: string;
    'An Extraordinary Abundance of Tinge'?: string;
    'Australium Gold'?: string;
    'Color No. 216-190-216'?: string;
    'Dark Salmon Injustice'?: string;
    'Drably Olive'?: string;
    'Indubitably Green'?: string;
    'Mann Co. Orange'?: string;
    Muskelmannbraun?: string;
    "Noble Hatter's Violet"?: string;
    'Peculiarly Drab Tincture'?: string;
    'Pink as Hell'?: string;
    'Radigan Conagher Brown'?: string;
    'The Bitter Taste of Defeat and Lime'?: string;
    "The Color of a Gentlemann's Business Pants"?: string;
    'Ye Olde Rustic Colour'?: string;
    "Zepheniah's Greed"?: string;
    'An Air of Debonair'?: string;
    'Balaclavas Are Forever'?: string;
    "Operator's Overalls"?: string;
    'Cream Spirit'?: string;
    'Team Spirit'?: string;
    'The Value of Teamwork'?: string;
    'Waterlogged Lab Coat'?: string;
}

export interface StrangeParts {
    'Robots Destroyed'?: string;
    Kills?: string;
    'Airborne Enemy Kills'?: string;
    'Damage Dealt'?: string;
    Dominations?: string;
    'Snipers Killed'?: string;
    'Buildings Destroyed'?: string;
    'Projectiles Reflected'?: string;
    'Headshot Kills'?: string;
    'Medics Killed'?: string;
    'Fires Survived'?: string;
    'Teammates Extinguished'?: string;
    'Freezecam Taunt Appearances'?: string;
    'Spies Killed'?: string;
    'Allied Healing Done'?: string;
    'Sappers Removed'?: string;
    'Players Hit'?: string;
    'Gib Kills'?: string;
    'Scouts Killed'?: string;
    'Taunt Kills'?: string;
    'Point Blank Kills'?: string;
    'Soldiers Killed'?: string;
    'Long-Distance Kills'?: string;
    'Giant Robots Destroyed'?: string;
    'Critical Kills'?: string;
    'Demomen Killed'?: string;
    'Unusual-Wearing Player Kills'?: string;
    Assists?: string;
    'Medics Killed That Have Full ÜberCharge'?: string;
    'Cloaked Spies Killed'?: string;
    'Engineers Killed': string;
    'Kills While Explosive-Jumping': string;
    'Kills While Low Health': string;
    'Burning Player Kills': string;
    'Kills While Invuln ÜberCharged': string;
    'Posthumous Kills'?: string;
    'Not Crit nor MiniCrit Kills'?: string;
    'Full Health Kills'?: string;
    'Killstreaks Ended'?: string;
    'Defenders Killed'?: string;
    Revenges?: string;
    'Robot Scouts Destroyed'?: string;
    'Heavies Killed'?: string;
    'Tanks Destroyed'?: string;
    'Kills During Halloween'?: string;
    'Pyros Killed'?: string;
    'Submerged Enemy Kills'?: string;
    'Kills During Victory Time'?: string;
    'Taunting Player Kills'?: string;
    'Robot Spies Destroyed'?: string;
    'Kills Under A Full Moon'?: string;
    'Robots Killed During Halloween'?: string;
}

// ------------ JsonOptions ------------

export interface JsonOptions {
    showOnlyMetal?: OnlyEnable;
    sortInventory?: SortInventory;
    createListings?: OnlyEnable;
    sendAlert?: SendAlert;
    addFriends?: OnlyEnable;
    sendGroupInvite?: OnlyEnable;
    autoRemoveIntentSell?: OnlyEnable;
    bypass?: Bypass;
    priceAge?: PriceAge;
    autobump?: OnlyEnable;
    skipItemsInTrade?: OnlyEnable;
    weaponsAsCurrency?: WeaponsAsCurrency;
    tradeSummary?: TradeSummary;
    highValue?: HighValue;
    checkUses?: CheckUses;
    game?: Game;
    normalize?: Normalize;
    details?: Details;
    statistics?: Statistics;
    autokeys?: Autokeys;
    crafting?: Crafting;
    offerReceived?: OfferReceived;
    manualReview?: ManualReview;
    discordWebhook?: DiscordWebhook;
    customMessage?: CustomMessage;
    commands?: Commands;
    detailsExtra?: DetailsExtra;
}

export default interface Options extends JsonOptions {
    steamAccountName?: string;
    steamPassword?: string;
    steamSharedSecret?: string;
    steamIdentitySecret?: string;

    bptfAccessToken?: string;
    bptfAPIKey?: string;

    admins?: Array<string>;
    keep?: Array<string>;
    groups?: Array<string>;
    alerts?: Array<string>;

    pricestfAPIToken?: string;

    skipBPTFTradeofferURL?: boolean;
    skipAccountLimitations?: boolean;
    skipUpdateProfileSettings?: boolean;

    timezone?: string;
    customTimeFormat?: string;
    timeAdditionalNotes?: string;

    debug?: boolean;
    debugFile?: boolean;

    folderName?: string;
    filePrefix?: string;
}

function getOption<T>(option: string, def: T, parseFn: (target: string) => T, options?: Options): T {
    try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        if (options && options[option]) return options[option];
        const envVar = snakeCase(option).toUpperCase();
        // log.debug('envVar: ', envVar);
        // log.debug('value: ', process.env[envVar] ? parseFn(process.env[envVar]) : def);
        return process.env[envVar] ? parseFn(process.env[envVar]) : def;
    } catch {
        return def;
    }
}

function throwLintError(filepath: string, e: Error): void {
    if (e instanceof Error && 'message' in e) {
        throw new Error(`${filepath}\n${e.message}`);
    }
    throw e;
}

function lintPath(filepath: string): void {
    const rawOptions = readFileSync(filepath, { encoding: 'utf8' });
    try {
        jsonlint.parse(rawOptions);
    } catch (e) {
        throwLintError(filepath, e);
    }
}

function lintAllTheThings(directory: string): void {
    if (existsSync(directory)) {
        readdirSync(directory, { withFileTypes: true })
            .filter(ent => path.extname(ent.name) === '.json')
            .forEach(ent => lintPath(path.join(directory, ent.name)));
    }
}

function loadJsonOptions(optionsPath: string, options?: Options): JsonOptions {
    let fileOptions;
    const workingDefault = deepMerge({}, DEFAULTS);
    const incomingOptions = options ? deepMerge({}, options) : deepMerge({}, DEFAULTS);

    try {
        const rawOptions = readFileSync(optionsPath, { encoding: 'utf8' });
        try {
            fileOptions = deepMerge({}, workingDefault, JSON.parse(rawOptions));
            return deepMerge(fileOptions, incomingOptions);
        } catch (e) {
            if (e instanceof SyntaxError) {
                // lint the rawOptions to give better feedback since it is SyntaxError
                try {
                    jsonlint.parse(rawOptions);
                } catch (e) {
                    throwLintError(optionsPath, e);
                }
            }
            throw e;
        }
    } catch (e) {
        // file or directory is missing or something else is wrong
        if (!existsSync(path.dirname(optionsPath))) {
            // check for dir
            mkdirSync(path.dirname(optionsPath), { recursive: true });
            writeFileSync(optionsPath, JSON.stringify(DEFAULTS, null, 4), { encoding: 'utf8' });
            return deepMerge({}, DEFAULTS);
        } else if (!existsSync(optionsPath)) {
            // directory is present, see if file was missing
            writeFileSync(optionsPath, JSON.stringify(DEFAULTS, null, 4), { encoding: 'utf8' });
            return deepMerge({}, DEFAULTS);
        } else {
            // something else is wrong, throw the error
            throw e;
        }
    }
}

export function removeCliOptions(incomingOptions: Options): void {
    const findNonEnv = validator(incomingOptions, 'options');
    if (findNonEnv) {
        findNonEnv
            .filter(e => e.includes('unknown property'))
            .map(e => e.slice(18, -1))
            .map(e => delete incomingOptions[e]);
    }
}

export function loadOptions(options?: Options): Options {
    const incomingOptions = options ? deepMerge({}, options) : {};
    const steamAccountName = getOption('steamAccountName', '', String, incomingOptions);
    lintAllTheThings(getFilesPath(steamAccountName)); // you shall not pass

    const jsonParseArray = (jsonString: string): string[] => (JSON.parse(jsonString) as unknown) as string[];
    const jsonParseBoolean = (jsonString: string): boolean => (JSON.parse(jsonString) as unknown) as boolean;

    const envOptions = {
        steamAccountName: steamAccountName,
        steamPassword: getOption('steamPassword', '', String, incomingOptions),
        steamSharedSecret: getOption('steamSharedSecret', '', String, incomingOptions),
        steamIdentitySecret: getOption('steamIdentitySecret', '', String, incomingOptions),

        bptfAccessToken: getOption('bptfAccessToken', '', String, incomingOptions),
        bptfAPIKey: getOption('bptfAPIKey', '', String, incomingOptions),

        admins: getOption('admins', [], jsonParseArray, incomingOptions),
        keep: getOption('keep', [], jsonParseArray, incomingOptions),
        groups: getOption('groups', ['103582791464047777', '103582791462300957'], jsonParseArray, incomingOptions),
        alerts: getOption('alerts', ['trade'], jsonParseArray, incomingOptions),

        pricestfAPIToken: getOption('pricestfAPIToken', '', String, incomingOptions),

        skipBPTFTradeofferURL: getOption('skipBPTFTradeofferURL', true, jsonParseBoolean, incomingOptions),
        skipAccountLimitations: getOption('skipAccountLimitations', true, jsonParseBoolean, incomingOptions),
        skipUpdateProfileSettings: getOption('skipUpdateProfileSettings', true, jsonParseBoolean, incomingOptions),

        timezone: getOption('timezone', '', String, incomingOptions),
        customTimeFormat: getOption('customTimeFormat', '', String, incomingOptions),
        timeAdditionalNotes: getOption('timeAdditionalNotes', '', String, incomingOptions),

        debug: getOption('debug', true, jsonParseBoolean, incomingOptions),
        debugFile: getOption('debugFile', true, jsonParseBoolean, incomingOptions)
    };

    if (!envOptions.steamAccountName) {
        throw new Error('STEAM_ACCOUNT_NAME must be set in the environment');
    }

    removeCliOptions(incomingOptions);
    const jsonOptions = loadJsonOptions(getOptionsPath(envOptions.steamAccountName), incomingOptions);

    const errors = validator(jsonOptions, 'options');
    if (errors !== null) {
        throw new Error(errors.join(', '));
    }
    return deepMerge(jsonOptions, envOptions, incomingOptions);
}

export function getFilesPath(accountName: string): string {
    return path.resolve(__dirname, '..', '..', 'files', accountName);
}

export function getOptionsPath(accountName: string): string {
    return path.resolve(getFilesPath(accountName), 'options.json');
}
