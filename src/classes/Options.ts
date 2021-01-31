import { snakeCase } from 'change-case';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import jsonlint from 'jsonlint';
import * as path from 'path';
import { deepMerge } from '../lib/tools/deep-merge';
import validator from '../lib/validator';
import { Currency } from '../types/TeamFortress2';

export const DEFAULTS = {
    miscSettings: {
        showOnlyMetal: {
            /**
             * If this is set to false, the bot will show all prices in the format of [x keys, y ref]. Example: (5 keys, 10 ref).
             * If this is set to true the bot will instead show all prices in the format of [x ref]. Example: (260 ref).
             */
            enable: true
        },

        sortInventory: {
            /**
             * If set to false your bot will not automatically sort its own inventory.
             */
            enable: true,
            /**
             * 1 - by name, 2 - by defindex, 3 - by rarity, 4 - by type, 5 - by date
             * 101 - by class, 102 - by slot
             */
            type: 3
        },

        createListings: {
            /**
             * If set to false, your bot will not list items for trade while it is running (if changed
             * while your bot is running, this wont work unless restarted).
             */
            enable: true
        },

        addFriends: {
            /**
             * If set to false, the bot will not be able to accept add friend request (except from admins).
             */
            enable: true
        },

        sendGroupInvite: {
            /**
             * If set to false, the bot will not send group invite after each successful trade
             * to the trade partner.
             */
            enable: true
        },

        autobump: {
            /**
             * If set to true, your bot will re-list all listings every 30 minutes.
             * NOTE: DEPRECATED - Please consider donating to Backpack.tf or purchase Backpack.tf Premium
             * to enable automatic listing bumping. More information here: https://backpack.tf/premium/subscribe
             */
            enable: false
        },

        skipItemsInTrade: {
            /**
             * By default, when your bot is constructing an offer (trade partner buy/sell through command),
             * your bot will skip any items that are currently in another active trades.
             * Set this to false if you want to disable this feature.
             */
            enable: true
        },

        weaponsAsCurrency: {
            /**
             * If set to false, your bot will not value craft/uncraft weapons as currency (0.05 refined).
             */
            enable: true,
            /**
             * If set to false, your bot will exclude uncraft weapons as currency (0.05 refined).
             */
            withUncraft: true
        },

        checkUses: {
            /**
             * If set to false, your bot will buy Dueling Mini-Games regardless of how many uses are left. Otherwise,
             * it will only accept full Dueling Mini-Games (5 uses left).
             */
            duel: true,
            /**
             * If set to false, your bot will buy Noise Makers regardless of how many uses are left. Otherwise, it will
             * only accept full Noise Makers (25 uses left).
             */
            noiseMaker: true
        },

        game: {
            /**
             * Set to true if you want your bot to only play Team Fortress 2. Setting this to true will ignore the below Option.
             */
            playOnlyTF2: false,
            /**
             * Name of the custom game you'd like your bot to play. Limited to only 60 characters.
             */
            customName: ''
        }
    },

    sendAlert: {
        /**
         * Set to false to never send any alerts.
         */
        enable: true,
        autokeys: {
            /**
             * (Discord Webhook not mentioned) Send an alert when the bot is low in keys and ref (less than minimum for both).
             */
            lowPure: true,
            /**
             * (Discord Webhook mentioned) Send an alert when the bot failed to add key (when Autokeys is enabled).
             */
            failedToAdd: true,
            /**
             * (Discord Webhook mentioned) Send an alert when the bot failed to update key (when Autokeys is enabled).
             */
            failedToUpdate: true,
            /**
             * (Discord Webhook mentioned) Send an alert when the bot failed to disable key (when Autokeys is enabled).
             */
            failedToDisable: true
        },
        /**
         * (Discord Webhook not mentioned) Send an alert when the bot failed to send an offer due to
         * full backpack problem.
         */
        backpackFull: true,
        highValue: {
            /**
             * (Discord Webhook mentioned) Send an alert when the bot successfully bought an item with high-value attachment(s)
             * and it got disabled (only if highValue.enableHold is true).
             */
            gotDisabled: true,
            /**
             * (Discord Webhook mentioned) Send an alert when the bot successfully bought an item (INVALID_ITEMS)
             * with high-value attachment(s) - this will not automatically added to the pricelist.
             */
            receivedNotInPricelist: true,
            /**
             * (Discord Webhook mentioned) Send an alert when the trade partner is trying to take an item with high-value attachment(s)
             * that is still not in the bot pricelist.
             */
            tryingToTake: true
        },
        /**
         * (Discord Webhook mentioned) Send an alert when an item is sold with intent sell, and autoRemoveIntentSell.enable
         * is true but the bot failed to remove it.
         */
        autoRemoveIntentSellFailed: true,
        /**
         * (Discord Webhook mentioned if failed) Send an alert when painted items has been successfully added to sell
         */
        autoAddPaintedItems: true
    },

    pricelist: {
        autoRemoveIntentSell: {
            /**
             * If set to true, any item with intent sell in the pricelist will be automatically removed
             * when the bot no longer have that item.
             */
            enable: false
        },
        autoAddInvalidItems: {
            /**
             * If set to false, any accepted INVALID_ITEMS will not be automatically added to the pricelist
             */
            enable: true
        },
        autoAddPaintedItems: {
            /**
             * If set to false, any accepted items with painted will not be automatically added to the pricelist (to sell only).
             * You should also set your preferred price for each paint in detailExtra.painted[paintName].price
             */
            enable: true
        },
        priceAge: {
            /**
             * (8 hrs) If an item in the pricelist's last price update exceeds this value,
             * the bot will automatically request a price check for the item from prices.tf
             * (only apply on boot).
             */
            maxInSeconds: 28800
        }
    },

    bypass: {
        escrow: {
            /**
             * If set to true, your bot will allow trades to be held for up to 15 days
             * as a result of the trade partner not having Mobile Authentication enabled.
             */
            allow: false
        },
        overpay: {
            /**
             * If set to true, your bot will allow trade partners to overpay with items or keys/metal.
             * Otherwise, your bot will decline any trades in which it would receive overpay.
             */
            allow: true
        },
        giftWithoutMessage: {
            /**
             * If set to true, your bot will accept any gift without the need for the trade partner to
             * include a gift message in the offer message. SETTING THIS TO TRUE IS NOT RECOMMENDED!
             */
            allow: false
        },
        bannedPeople: {
            /**
             * If set to true, your bot will trade with users that are banned on backpack.tf or marked as
             * a scammer on steamrep.com. SETTING THIS TO TRUE IS NOT RECOMMENDED!
             */
            allow: false
        }
    },

    tradeSummary: {
        /**
         * By default is false, set to true if you want to show stock changes, example: B.M.O.C (0 → 1/1).
         */
        showStockChanges: false,
        /**
         * By default is false, set to true if you want to include time taken to complete the trade in milliseconds.
         */
        showTimeTakenInMS: false,
        /**
         * By default is false, set to true if you want to include item prices (buying/selling prices).
         */
        showItemPrices: false
    },

    highValue: {
        /**
         * By default, whenever your bot accepts items with high valued attachments, it will temporarily be disabled
         * so you can decide whether to manually price it. Set this to false if you want to disable this feature.
         */
        enableHold: true,
        /**
         * An array of sheens. Must be the sheen full name in each element. If leave empty ([]) or
         * set to [""], will mention/disable on all sheens.
         */
        sheens: [],
        /**
         * An array of killstreakers. Must be the killstreakers full name in each element. If leave empty ([]) or
         * set to [""], will mention/disable on all killstreakers.
         */
        killstreakers: [],
        /**
         * An array of strangeParts. Must be the strangeParts full name in each element. If leave empty ([]) or
         * set to [""], will mention/disable on all strangeParts.
         */
        strangeParts: [],
        /**
         * An array of painted. Must be the painted full name in each element. If leave empty ([]) or
         * set to [""], will mention/disable on all painted.
         */
        painted: []
    },

    normalize: {
        /**
         * If set to true, your bot will recognize Festivized items as their Non-Festivized variant. For example, if your bot
         * is selling a Strange Australium Black Box and someone sends an offer to your bot containing a Festivized Strange Australium Black Box,
         * the bot will recognize the Festivized Strange Australium Black Box as Strange Australium Black Box.
         * Otherwise, the bot will determine each item's price by its specific name, quality, and unique identifiers.
         */
        festivized: {
            our: false,
            their: false
        },
        /**
         * If set to true, Strange Unusuals (items whose SKU ends with ;strange) will be recognized as the normal variant of said Unusuals
         * (items whose SKU doesn't end with ;strange). Otherwise, the bot will determine each item's price by its specific name, quality,
         * and unique identifiers.
         */
        strangeAsSecondQuality: {
            our: false,
            their: false
        },
        /**
         * If set to false, all painted items must be individually and manually priced by your own
         */
        painted: {
            our: true,
            their: true
        }
    },

    details: {
        /**
         * This is the note that will be included with each buy order placed on backpack.tf.
         */
        buy: 'I am buying your %name% for %price%, I have %current_stock% / %max_stock%.',
        /**
         * This is the note that will be included with each sell order placed on backpack.tf.
         */
        sell: 'I am selling my %name% for %price%, I am selling %amount_trade%.',
        highValue: {
            /**
             * Show spell(s) in the listings note.
             */
            showSpells: true,
            /**
             * Show Strange parts (only the one you specified in highValue.strangeParts).
             */
            showStrangeParts: false,
            /**
             * Show killstreaker in the listings note.
             */
            showKillstreaker: true,
            /**
             * Show Sheen in the listings note.
             */
            showSheen: true,
            /**
             * Show painted color in the listings note
             * (only the one you specified in highValue.painted).
             */
            showPainted: true
        },
        uses: {
            /**
             * only show if checkUses.duel is true and the bot is buying Dueling Mini-Game and include %uses% parameter
             * in the details.buy string.
             * Default: (𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟱x 𝗨𝗦𝗘𝗦)
             */
            duel: '(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟱x 𝗨𝗦𝗘𝗦)',
            /**
             * only show if checkUses.noiseMaker is true and the bot is buying any Noise Maker and include %uses% parameter
             * in the details.buy string.
             * Default: (𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟐𝟱x 𝗨𝗦𝗘𝗦)
             */
            noiseMaker: '(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟐𝟱x 𝗨𝗦𝗘𝗦)'
        }
    },

    statistics: {
        /**
         * If you clear out your polldata.json file, it will reset your total trades count back to zero.
         * This Option can be used as an offset to ensure you never lose track of how many trades your bot
         * has completed in total. An example would be if you bot has completed 1000 trades and you want to clear out your
         * polldata.json file. If you set .lastTotalTrades to 1000, your bot will remember that it has completed 1000 trades in the past.
         */
        lastTotalTrades: 0,
        /**
         * Similar to .lastTotalTrades, this Option sets the latest instance a trade was made (in Unix Timestamp).
         */
        startingTimeInUnix: 0,
        /**
         * Similar to .lastTotalTrades, but this is for last profit made (value must in refined metal, i.e. 35.44).
         */
        lastTotalProfitMadeInRef: 0,
        /**
         * Similar to .lastTotalProfitMadeInRef, but this is for last profit from overpay(value must in refined metal, i.e. 1000.44).
         */
        lastTotalProfitOverpayInRef: 0,
        /**
         * Similar to .startingTimeInUnix, this Option sets the latest instance a profit was made (in Unix Timestamp).
         */
        profitDataSinceInUnix: 0,
        sendStats: {
            /**
             * Send the content of !stats command every specified hours below
             */
            enable: false,
            /**
             * Time (local/timezone - 24 hours) in hour:minute format, example: ["T23:59", "T05:59", "T11:59", "T17:59"] will send at
             * 23:59 AM, 05:59 AM, 11:59 PM and 17:59 PM.
             * Please include that "T" in front of each time, otherwise this wont work.
             * If this is empty but enable is true, then it will use default ["T23:59", "T05:59", "T11:59", "T17:59"].
             */
            time: []
        }
    },

    autokeys: {
        /**
         * If set to true, your bot will automatically buy/sell keys based on the availability of the refined metals and keys in
         * your bot inventory. This is done in an effort to ensure that your bot has enough pure metal to perform trades.
         */
        enable: false,
        /**
         * When the bot's current stock of keys is greater than minimum keys, and the bot's current stock of refined metal is less
         * than minimum ref, the bot will start selling keys in order to convert keys into metal. Otherwise, the bot will not sell keys.
         */
        minKeys: 3,
        /**
         * When the bot's current stock of keys is less than maximum keys, and the bot's current stock of refined metal is greater than
         * maximum ref, the bot will start buying keys in order to convert metal into keys. Otherwise, the bot will not buy keys.
         */
        maxKeys: 15,
        /**
         * The minimum number of refined the bot can have before it begins selling keys (to turn keys into metal). See .minKeys for more information.
         */
        minRefined: 30,
        /**
         * The maximum number of refined the bot can have before it begins buying keys (to turn metal into keys). See .maxKeys for more information.
         */
        maxRefined: 150,
        banking: {
            /**
             * If set to true, your bot will bank (buy and sell) keys. If your bot's current refined supply is between min and max and keys \> min,
             * it will bank keys. autokeys.enable must be set to true to enable this option.
             */
            enable: false
        },
        scrapAdjustment: {
            /**
             * If set to true, the bot will make adjustments to the price of keys when selling or buying. For example, if the current key price is
             * "10 refined", the bot will take "10 refined" and add .value when buying, and subtract .value when selling. This is done in an effort
             * to quickly buy and sell keys using Autokeys when in a pinch by paying more for keys and selling keys for less. This is not possible
             * to do when key banking (autokeys.banking.enable set to true).
             */
            enable: false,
            /**
             * This is the amount of scrap (.11 refined) the bot will increase the buy listing or decrease the sell listing when buying/selling keys
             * using Autokeys (if .enable is set to true).
             */
            value: 1
        },
        accept: {
            /**
             * If set to true, your bot will accept trades that will lead to keys become under-stocked.
             */
            understock: false
        }
    },

    crafting: {
        weapons: {
            /**
             * Setting this to false will disable metal crafting entirely. This may cause your bot and the trade partner to not be able to trade because
             * of missing scrap/reclaimed. SETTING THIS TO FALSE IS NOT RECOMMENDED!
             */
            enable: true
        },
        metals: {
            /**
             * Setting this to false will disable metal crafting entirely. This may cause your bot and the trade partner to not be able to trade because
             * of missing scrap/reclaimed. SETTING THIS TO FALSE IS NOT RECOMMENDED!
             */
            enable: true,
            /**
             * If your bot has less scrap metal than this amount, it will smelt down reclaimed metal to maintain ample scrap metal supply.
             */
            minScrap: 9,
            /**
             * If your bot has less reclaimed metal than this amount, it will smelt down refined metal to maintain ample reclaimed metal supply.
             */
            minRec: 9,
            /**
             * If the bot's scrap/reclaimed metal count has reached the minimum amount, and scrap/metal count has reached this threshold (max),
             * it will combine the metal into the next highest denomination.
             */
            threshold: 9
        }
    },

    offerReceived: {
        // 🟥_INVALID_VALUE (ONLY_INVALID_VALUE)
        invalidValue: {
            autoDecline: {
                /**
                 * Set this to false if you do not want your bot to automatically decline trades with 🟥_INVALID_VALUE as the ONLY manual review
                 * reason where items do not match exceptionValue.skus and exceptionValue.valueInRef
                 */
                enable: true,
                /**
                 * Default: "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
                 *  you've sent a trade with an invalid value (your side and my side do not hold equal value)."
                 * followed by `[You're missing: ${value}]` (unchangeable)
                 */
                declineReply: ''
            },
            exceptionValue: {
                /**
                 * An array of SKUs that will bypass the INVALID_VALUE manual review reason if the difference between the bot's value and
                 * their value is not more than .valueInRef. Let's say your bot is selling an Unusual and someone sent an offer with 0.11 ref
                 * less, and you want your bot to accept it anyway. By default, it will check only for Unusuals and Australiums: [";5;u", ";11;australium"]
                 *  You can also leave it empty ([""]) so that all items with INVALID_VALUE create notifications.
                 */
                skus: [],
                /**
                 * 	Exception value for the SKUs that you set above. The default is 0 (no exception).
                 */
                valueInRef: 0
            }
        },
        // 🟨_INVALID_ITEMS (ONLY_INVALID_ITEMS)
        invalidItems: {
            /**
             * If set to false, your bot will not price INVALID_ITEMS (items that are not in your price list) using prices from prices.tf.
             */
            givePrice: false,
            /**
             * If set to false, your bot will not accept trades with INVALID_ITEMS where the value of their side is greater than or equal
             * to the value of your bot's side.
             */
            autoAcceptOverpay: true,
            autoDecline: {
                /**
                 * Set this to false if you do not want your bot to automatically decline trades with 🟨_INVALID_ITEMS as the ONLY manual review
                 * reason.
                 */
                enable: false,
                /**
                 * Default: "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
                 *  you've sent a trade with an invalid items (not exist in my pricelist)."
                 * followed by `[You're missing: ${value}]` (if applicable).
                 */
                declineReply: ''
            }
        },
        // 🟧_DISABLED_ITEMS (ONLY_DISABLED_ITEMS)
        disabledItems: {
            /**
             * If set to false, your bot will not accept trades with 🟧_DISABLED_ITEMS where the value of their side is greater than or equal
             * to the value of your bot's side.
             */
            autoAcceptOverpay: false,
            autoDecline: {
                /**
                 * Set this to false if you do not want your bot to automatically decline trades with 🟧_DISABLED_ITEMS as the ONLY manual review
                 * reason.
                 */
                enable: false,
                /**
                 * Default: "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
                 *  the item(s) you're trying to take/give is currently disabled." followed by `[You're missing: ${value}]` (if applicable).
                 */
                declineReply: ''
            }
        },
        // 🟦_OVERSTOCKED (ONLY_OVERSTOCKED)
        overstocked: {
            /**
             * If set to false, your bot will not accept trades with 🟦_OVERSTOCKED where the value of their side is greater than or equal
             * to the value of your bot's side.
             */
            autoAcceptOverpay: false,
            autoDecline: {
                /**
                 * Set this to false if you do not want your bot to automatically decline trades with 🟦_OVERSTOCKED as the ONLY manual review
                 * reason.
                 */
                enable: false,
                /**
                 * Default: "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
                 *  you're attempting to sell item(s) that I can't buy more of." followed by `[You're missing: ${value}]` (if applicable).
                 */
                declineReply: ''
            }
        },
        // 🟩_UNDERSTOCKED (ONLY_UNDERSTOCKED)
        understocked: {
            /**
             * If set to false, your bot will not accept trades with 🟩_UNDERSTOCKED where the value of their side is greater than or equal
             * to the value of your bot's side.
             */
            autoAcceptOverpay: false,
            autoDecline: {
                /**
                 * Set this to false if you do not want your bot to automatically decline trades with 🟩_UNDERSTOCKED as the ONLY manual review
                 * reason.
                 */
                enable: false,
                /**
                 * Default: "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
                 * you're attempting to purchase item(s) that I can't sell more of." followed by `[You're missing: ${value}]` (if applicable).
                 */
                declineReply: ''
            }
        },
        // 🟫_DUPED_ITEMS
        duped: {
            /**
             * If set to true, the bot will perform checks on items to determine whether or not they are duplicated.
             */
            enableCheck: true,
            /**
             * The minimum number of keys an item must be worth before the bot performs a check for whether or not it is duplicated.
             */
            minKeys: 10,
            autoDecline: {
                /**
                 * If set to true, the bot will decline any unusual items that it determines as having been duplicated.
                 */
                enable: false,
                /**
                 * Default: "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
                 *  I don't accept duped items."
                 */
                declineReply: ''
            }
        },
        // ⬜_ESCROW_CHECK_FAILED
        escrowCheckFailed: {
            /**
             * By default, your bot will skip the trade and put to review if escrow check failed.
             * Set this to false if you want your bot to ignore trade with failed escrow check.
             */
            ignoreFailed: false
        },
        // ⬜_BANNED_CHECK_FAILED
        bannedCheckFailed: {
            /**
             * By default, your bot will skip the trade and put to review if banned check failed.
             * Set this to false if you want your bot to ignore trade with failed banned check.
             */
            ignoreFailed: false
        }
    },

    manualReview: {
        /**
         * By default, offers with INVALID_VALUE/ INVALID_ITEMS/ OVERSTOCKED/ UNDERSTOCKED/ DUPED_ITEMS/ DUPE_CHECK_FAILED will
         * require manual review by you.
         */
        enable: true,
        /**
         * If set to true, your bot will show the trade offer summary to the trade partner. Otherwise, it will only notify the
         * trade partner that their offer is being held for review.
         */
        showOfferSummary: true,
        /**
         * By default, your bot will show notes on for each manual review reason.
         */
        showReviewOfferNote: true,
        /**
         * By default, your bot will show the owner's time when sending your trade partner any manual offer review notifications.
         */
        showOwnerCurrentTime: true,
        /**
         * By default is false, set to true if you want to include item prices (buying/selling prices) - only for owner.
         */
        showItemPrices: true, //
        // All these custom note only apply to trade partner's side
        // 🟥_INVALID_VALUE
        invalidValue: {
            /**
             * Default: "You're taking too much in value." followed by `[You're missing: ${value}]` (unchangeable)
             */
            note: ''
        },
        // 🟨_INVALID_ITEMS
        invalidItems: {
            /**
             * Default: "%itemsName% %isOrAre% not in my pricelist."
             *
             * Parameter: join(', ') of `${name}` array
             */
            note: ''
        },
        // 🟧_DISABLED_ITEMS
        disabledItems: {
            /**
             * Default: "%itemsName% %isOrAre% currently disabled."
             *
             * Parameter: join(', ') of `${name}` array
             */
            note: ''
        },
        // 🟦_OVERSTOCKED
        overstocked: {
            /**
             * Default: "I can only buy %itemsName% right now."
             *
             * Parameter: %itemsName% - a join of \``${name}, history page: https://backpack.tf/item/${el.assetid}`\` array
             */
            note: ''
        },
        // 🟩_UNDERSTOCKED
        understocked: {
            /**
             * Default: "I can only sell %itemsName% right now."
             *
             * Parameter: %itemsName% - a join of \``${name}, history page: https://backpack.tf/item/${el.assetid}`\` array
             */
            note: ''
        },
        // 🟫_DUPED_ITEMS
        duped: {
            /**
             * Default: "%itemsName% %isOrAre% appeared to be duped."
             *
             * Parameter: %itemsName% - a join of \``${name}, history page: https://backpack.tf/item/${el.assetid}`\` array
             */
            note: ''
        },
        // 🟪_DUPE_CHECK_FAILED
        dupedCheckFailed: {
            /**
             * Default: "I failed to check for duped on %itemsName%."
             *
             * Parameter: %itemsName% - a string OR a join of \``${name}, history page: https://backpack.tf/item/${el.assetid}`\` array
             */
            note: ''
        },
        // ⬜_ESCROW_CHECK_FAILED
        escrowCheckFailed: {
            /**
             * Default: "Backpack.tf or steamrep.com is down and I failed to check your backpack.tf/steamrep
             * status, please wait for my owner to manually accept/decline your offer."
             */
            note: ''
        },
        // ⬜_BANNED_CHECK_FAILED
        bannedCheckFailed: {
            /**
             * Default: "Steam is down and I failed to check your Escrow (Trade holds)
             * status, please wait for my owner to manually accept/decline your offer."
             */
            note: ''
        },
        /**
         * Default: ""
         *
         * Description: Custom additional notes for offer that need to be reviewed.
         */
        additionalNotes: ''
    },

    discordWebhook: {
        /**
         * Your Discord ID. To obtain this, right-click on yourself on Discord and click Copy ID. Be sure to
         * enable Developer Mode on Discord by navigating to Settings \> Appearance \> Advanced. It must be
         * a number in string like 527868979600031765 not IdiNium#8965.
         */
        ownerID: '',
        /**
         * The name you'd like to give your bot when it sends a message on Discord.
         */
        displayName: '',
        /**
         * A URL to the image you'd like your bot to have when it sends a discord message. This must be in URL form.
         * An example of how to obtain your bot's avatar from Steam:
         * https://gyazo.com/421792b5ea817c36054c7991fb18cdbc
         */
        avatarURL: '',
        /**
         * The color you'd like associated with your bot's discord messages. You can view the different colors at spycolor.com.
         * Copy the Decimal value. An example of this would be 16769280 for the color #ffe100
         */
        embedColor: '9171753',
        tradeSummary: {
            /**
             * Display each successful trade summary on your trade summary/live-trades channel via Discord Webhook. If set to
             * false, it will send to your Steam Chat.
             */
            enable: true,
            /**
             * An array of Discord Webhook URLs for TRADE_SUMMARY. You will need to format it like so: ["yourDiscordWebhookLink"],
             * or if you want to add more than one, you format them like so: ["link1", "link2"] (separate each link with a comma,
             * make sure link1 is your own Discord Webhook URL - Mention owner and show stock changes will only be shown in link1).
             */
            url: [],
            misc: {
                /**
                 * Show the trade partner's quick links to their Steam profile, backpack.tf, and SteamREP pages.
                 */
                showQuickLinks: true,
                /**
                 * Show your bot's key rate
                 */
                showKeyRate: true,
                /**
                 * Show your bot's pure stock
                 */
                showPureStock: true,
                /**
                 * Show the total amount of items in your bot's inventory.
                 */
                showInventory: true,
                /**
                 * Any additional notes you'd like included with trade summaries. Notes must be in the following format: [YourText](Link)
                 */
                note: ''
            },
            mentionOwner: {
                /**
                 * If set to false, your bot will never mention you on each successful trade (except for accepted 🟨_INVALID_ITEMS or
                 * 🔶_HIGH_VALUE_ITEMS)
                 */
                enable: false,
                /**
                 * Your bot will mention you whenever a trade contains an SKU in this list. Supports multiple item SKUs. For example,
                 * let say you just want to be mentioned on every Unusual and Australium trade. You would input [";5;u", ";11;australium"].
                 * If you want to be mentioned on specific items, just fill in the full item SKU, like so: ["725;6;uncraftable"]. To add more,
                 * just separate new items with a comma between each SKU string.
                 */
                itemSkus: [],
                /**
                 * Zero means disable. If this is set to other than 0, then any trade that's
                 * greater or equal to set value will be mentioned.
                 */
                tradeValueInRef: 0
            }
        },
        offerReview: {
            /**
             * If set to false, your bot will never mention you on each successful trade (except for accepted 🟨_INVALID_ITEMS or
             * 🔶_HIGH_VALUE_ITEMS)
             */
            enable: true,
            /**
             * Discord Webhook URL for REVIEW_OFFER (only support one URL).
             */
            url: '',
            /**
             * If set to false, your bot NOT mention you for ONLY 🟥_INVALID_VALUE offers.
             */
            mentionInvalidValue: true,
            /**
             * If set to false, you will never be mentioned on any offer to be reviewed.
             */
            isMention: true,
            misc: {
                /**
                 * Show the trade partner's quick links to their Steam profile, backpack.tf, and SteamREP pages.
                 */
                showQuickLinks: true,
                /**
                 * Show your bot's key rate
                 */
                showKeyRate: true,
                /**
                 * Show your bot's pure stock
                 */
                showPureStock: true,
                /**
                 * Show the total amount of items in your bot's inventory.
                 */
                showInventory: true
            }
        },
        messages: {
            /**
             * Used to alert you on any messages sent from the trade partner via Discord Webhook (mentioned). If set to false,
             * it will send to your Steam Chat.
             */
            enable: true,
            /**
             * If set to false, you will never be mentioned.
             */
            isMention: true,
            /**
             * Discord Webhook URL.
             */
            url: '',
            /**
             * Show the trade partner's quick links to their Steam profile, backpack.tf, and SteamREP pages.
             */
            showQuickLinks: true
        },
        priceUpdate: {
            /**
             * Set to false to disable this feature.
             */
            enable: true,
            /**
             * The Discord Webhook URL you'd like price update webhook to be sent to.
             */
            url: '',
            /**
             * Any additional notes you'd like included with price update webhook.
             */
            note: ''
        },
        sendAlert: {
            /**
             * If set to false, the bot will notify you through Steam chat if there is something wrong. Otherwise, the bot will
             * notify you through Discord (sendAlert.enable must be true).
             */
            enable: true,
            /**
             * If set to false, you will never be mentioned on any important alerts.
             */
            isMention: true,
            /**
             * The Discord Webhook URL you'd for the alert to be sent to.
             */
            url: ''
        },
        sendStats: {
            /**
             * If set to false, the bot will send stats through Steam chat. Otherwise, the bot will
             * send stats you through Discord (statistics.autoSendStats.enable must be true and
             * statistics.autoSendStats.time is not empty).
             */
            enable: false,
            /**
             * The Discord Webhook URL you'd for the stats to be sent to.
             */
            url: ''
        }
    },

    customMessage: {
        /**
         * Default: "Powered by TF2Autobot" (not removed)
         */
        sendOffer: '',
        /**
         * Default: `Hi %name%! If you don't know how things work, please type "!%admin%" - TF2Autobot v${version}`
         * parameters output: %name% - partner's name (if obtained), %admin% - if admin, "help", else "how2trade"
         */
        welcome: '',
        /**
         * Default: "❌ I don\'t know what you mean, please type "!help" for all of my commands!"
         */
        iDontKnowWhatYouMean: '',
        /**
         * Default: "/pre Success! The offer went through successfully."
         */
        success: '',
        /**
         * Default:
         * "✅ Success! The offer has gone through successfully, but you will receive your items after several days.
         *  To prevent this from happening in the future, please enable Steam Guard Mobile Authenticator.
         *  \\nRead:\\n• Steam Guard Mobile Authenticator - https://support.steampowered.com/kb_article.php?ref=8625-WRAH-9030
         *  \\n• How to set up the Steam Guard Mobile Authenticator - https://support.steampowered.com/kb_article.php?ref=4440-RTUI-9218"
         */
        successEscrow: '',
        decline: {
            /**
             * Default: "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined"
             */
            general: '',
            /**
             * Default:
             * "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
             *   the offer you've sent is an empty offer on my side without any offer message. If you wish to give
             *   it as a gift, please include "gift" in the offer message. Thank you."
             */
            giftNoNote: '',
            /**
             * Default: "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
             *  you're taking free items. No."
             */
            crimeAttempt: '',
            /**
             * Default: "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
             *  you might forgot to add items into the trade."
             */
            onlyMetal: '',
            /**
             * Default: "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
             *  your offer contains Dueling Mini-Game(s) that does not have 5 uses."
             */
            duelingNot5Uses: '',
            /**
             * Default:
             * "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
             *  your offer contains Noise Maker(s) that does not have 25 uses"
             */
            noiseMakerNot25Uses: '',
            /**
             * Default: "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
             *  you're attempting to purchase %highValueName%, but I am not selling it right now."
             *
             * Parameter: %highValueName% (output a join of an array of highValue items name)
             */
            highValueItemsNotSelling: '',
            /**
             * Default: "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
             *  I am no longer trading keys. You can confirm this by typing "!price Mann Co. Supply Crate Key" or "!autokeys"."
             */
            notTradingKeys: '',
            /**
             * Default: "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
             *  I am no longer selling keys. You can confirm this by typing "!price Mann Co. Supply Crate Key" or "!autokeys"."
             */
            notSellingKeys: '',
            /**
             * Default: "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
             *  I am no longer buying keys. You can confirm this by typing "!price Mann Co. Supply Crate Key" or "!autokeys"."
             */
            notBuyingKeys: '',
            /**
             * Default: "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
             *  you're currently banned on backpack.tf or labeled as a scammer on steamrep.com or another community."
             */
            banned: '',
            /**
             * Default: "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined because
             *  I do not accept escrow (trade holds). To prevent this from happening in the future, please enable Steam Guard Mobile Authenticator.
             *  \\nRead:\\n• Steam Guard Mobile Authenticator - https://support.steampowered.com/kb_article.php?ref=8625-WRAH-9030
             *  \\n• How to set up Steam Guard Mobile Authenticator - https://support.steampowered.com/kb_article.php?ref=4440-RTUI-9218"
             */
            escrow: '',
            /**
             * Default: "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined by the owner."
             */
            manual: ''
        },
        /**
         * Default: "/pre ❌ Ohh nooooes! Your offer is no longer available. Reason: Items not available (traded away in a different trade)."
         */
        tradedAway: '',
        /**
         * Default: "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: Failed to accept mobile confirmation"
         */
        failedMobileConfirmation: '',
        /**
         * Default: "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been active for a while.
         * If the offer was just created, this is likely an issue on Steam's end. Please try again"
         */
        cancelledActiveForAwhile: '',
        /**
         * Default: "/quote I am cleaning up my friend list and you have randomly been selected to be removed. Please feel free to
         * add me again if you want to trade at a later time!"
         *
         * Parameter: %name% (output: partner's name)
         */
        clearFriends: ''
    },

    commands: {
        /**
         * if false, only admin can use commands.
         */
        enable: true,
        /**
         * Default: "❌ Command function is disabled by the owner."
         */
        customDisableReply: '',
        how2trade: {
            customReply: {
                /**
                 * Default: \`/quote You can either send me an offer yourself, or use one of my commands to request a trade.
                 *  Say you want to buy a Team Captain, just type "!buy Team Captain", if want to buy more,
                 *  just add the [amount] - "!buy 2 Team Captain". Type "!help" for all the commands.
                 *  \\nYou can also buy or sell multiple items by using the "!buycart [amount] \<item name\>" or
                 *  "!sellcart [amount] \<item name\>" commands.\`
                 */
                reply: ''
            }
        },
        price: {
            /**
             * Set to false if want to disable !price command.
             */
            enable: true,
            customReply: {
                /**
                 * Default: "❌ This command is disabled by the owner."
                 */
                disabled: ''
            }
        },
        buy: {
            /**
             * Set to false if want to disable !buy command.
             */
            enable: true,
            /**
             * Set specific sku(s) to disable !buy command.
             */
            disableForSKU: [],
            customReply: {
                /**
                 * Default: "❌ This command is disabled by the owner."
                 */
                disabled: '',
                /**
                 * Default: "❌ buy command is disabled for %itemName%"
                 *
                 * Parameter: %itemName% (output: the name of an item of specified SKU)
                 */
                disabledForSKU: ''
            }
        },
        sell: {
            /**
             * Set to false if want to disable !sell command.
             */
            enable: true,
            /**
             * Set specific sku(s) to disable !sell command.
             */
            disableForSKU: [],
            customReply: {
                /**
                 * Default: "❌ This command is disabled by the owner."
                 */
                disabled: '',
                /**
                 * Default: "❌ sell command is disabled for %itemName%"
                 *
                 * Parameter: %itemName% (output: the name of an item of specified SKU)
                 */
                disabledForSKU: ''
            }
        },
        buycart: {
            /**
             * Set to false if want to disable !buycart command.
             */
            enable: true,
            /**
             * Set specific sku(s) to disable !buycart command.
             */
            disableForSKU: [],
            customReply: {
                /**
                 * Default: "❌ This command is disabled by the owner."
                 */
                disabled: '',
                /**
                 * Default: "❌ buycart command is disabled for %itemName%"
                 *
                 * Parameter: %itemName% (output: the name of an item of specified SKU)
                 */
                disabledForSKU: ''
            }
        },
        sellcart: {
            /**
             * Set to false if want to disable !sellcart command.
             */
            enable: true,
            /**
             * Set specific sku(s) to disable !sellcart command.
             */
            disableForSKU: [],
            customReply: {
                /**
                 * Default: "❌ This command is disabled by the owner."
                 */
                disabled: '',
                /**
                 * Default: "❌ sellcart command is disabled for %itemName%"
                 *
                 * Parameter: %itemName% (output: the name of an item of specified SKU)
                 */
                disabledForSKU: ''
            }
        },
        cart: {
            /**
             * Set to false if want to disable !cart command.
             */
            enable: true,
            customReply: {
                /**
                 * Default: "🛒== YOUR CART ==🛒"
                 */
                title: '',
                /**
                 * Default: "❌ This command is disabled by the owner."
                 */
                disabled: ''
            }
        },
        clearcart: {
            // always enable
            customReply: {
                /**
                 * Default: "🛒 Your cart has been cleared."
                 */
                reply: ''
            }
        },
        checkout: {
            // always enable
            customReply: {
                /**
                 * Default: "🛒 Your cart is empty."
                 */
                empty: ''
            }
        },
        addToQueue: {
            /**
             * Default: "❌ You already have an active offer! Please finish it before requesting a new one: %tradeurl%"
             *
             * Parameter: %tradeurl% (output `https://steamcommunity.com/tradeoffer/${activeOfferID}`)
             */
            alreadyHaveActiveOffer: '',
            /**
             * Default: "⚠️ You are already in the queue! Please wait while I process your offer."
             */
            alreadyInQueueProcessingOffer: '',
            /**
             * Default: "⚠️ You are already in the queue! Please wait your turn, there %isOrAre% %currentPosition% in front of you."
             *
             * Parameters: %isOrAre% (more than 1 use "are", else "is"), %currentPosition% (yes, current queue position)
             */
            alreadyInQueueWaitingTurn: '',
            /**
             * Default: "✅ You have been added to the queue! Please wait your turn, there %isOrAre% %position% in front of you."
             *
             * Parameters: %isOrAre% (more than 1 use "are", else "is"), %position% (total queue position)
             */
            addedToQueueWaitingTurn: '',
            /**
             * Default: "⚠️ Your offer has been altered. Reason: %altered%."
             *
             * Parameters: %altered% (altered message - unchangeable)
             */
            alteredOffer: '',
            processingOffer: {
                /**
                 * Default: "⌛ Please wait while I process your donation! %summarize%"
                 *
                 * Parameters: %summarize% (summarize message - unchangeable)
                 */
                donation: '',
                /**
                 * Default: "⌛ Please wait while I process your premium purchase! %summarize%"
                 *
                 * Parameters: %summarize% (summarize message - unchangeable)
                 */
                isBuyingPremium: '',
                /**
                 * Default: "⌛ Please wait while I process your offer! %summarize%"
                 *
                 * Parameters: %summarize% (summarize message - unchangeable)
                 */
                offer: ''
            },
            hasBeenMadeAcceptingMobileConfirmation: {
                /**
                 * Default: "⌛ Please wait while I process your donation! %summarize%"
                 *
                 * Parameters: %summarize% (summarize message - unchangeable)
                 */
                donation: '',
                /**
                 * Default: "⌛ Please wait while I process your premium purchase! %summarize%"
                 *
                 * Parameters: %summarize% (summarize message - unchangeable)
                 */
                isBuyingPremium: '',
                /**
                 * Default: "⌛ Please wait while I process your offer! %summarize%"
                 *
                 * Parameters: %summarize% (summarize message - unchangeable)
                 */
                offer: ''
            }
        },
        cancel: {
            // always enable
            customReply: {
                /**
                 * Default: "⚠️ Your offer is already being sent! Please try again when the offer is active."
                 */
                isBeingSent: '',
                /**
                 * Default: "⚠️ Your offer is already being canceled. Please wait a few seconds for it to be canceled."
                 */
                isCancelling: '',
                /**
                 * Default: "✅ You have been removed from the queue."
                 */
                isRemovedFromQueue: '',
                /**
                 * Default: "❌ You don't have an active offer."
                 */
                noActiveOffer: '',
                /**
                 * Default: "/pre ❌ Ohh nooooes! The offer is no longer available. Reason: Offer was canceled by user."
                 */
                successCancel: ''
            }
        },
        queue: {
            // always enable
            customReply: {
                /**
                 * Default: "❌ You are not in the queue."
                 */
                notInQueue: '',
                /**
                 * Default: "⌛ Your offer is being made."
                 */
                offerBeingMade: '',
                /**
                 * Default: "There are %position% users ahead of you."
                 *
                 * Parameter: %position%
                 */
                hasPosition: ''
            }
        },
        owner: {
            /**
             * Set to false if want to disable !owner command (except admins).
             */
            enable: true,
            customReply: {
                /**
                 * Default: "❌ This command is disabled by the owner."
                 */
                disabled: '',
                /**
                 * Default: "• Steam: %steamurl%\\n• Backpack.tf: %bptfurl%"
                 *
                 * Parameters:
                 *   - %steamurl% (`https://steamcommunity.com/profiles/${firstAdmin.toString()}`)
                 *   - %bptfurl% (`https://backpack.tf/profiles/${firstAdmin.toString()}`)
                 *   - %steamid% (SteamID64 of the first ADMINS element)
                 */
                reply: ''
            }
        },
        discord: {
            /**
             * Set to false if want to disable !discord command.
             */
            enable: true,
            /**
             * Default: "https://discord.gg/D2GNnp7tv8"
             */
            inviteURL: '',
            customReply: {
                /**
                 * Default: "❌ This command is disabled by the owner. (except admins)"
                 */
                disabled: '',
                /**
                 * Default:
                 *   - If discord.inviteURL is not empty:
                 *       - `TF2Autobot Discord Server: https://discord.gg/D2GNnp7tv8\nOwner's Discord Server: ${inviteURL}`
                 *   - If empty:
                 *       - "TF2Autobot Discord Server: https://discord.gg/D2GNnp7tv8"
                 *
                 * Parameter: %discordurl% (your commands.discord.inviteURL value)
                 */
                reply: ''
            }
        },
        more: {
            /**
             * Set to false if want to disable !more command (except admins).
             */
            enable: true,
            customReply: {
                /**
                 * Default: "❌ This command is disabled by the owner."
                 */
                disabled: ''
            }
        },
        autokeys: {
            /**
             * Set to false if want to disable !autokeys command (except admins).
             */
            enable: true,
            customReply: {
                /**
                 * Default: "❌ This command is disabled by the owner."
                 */
                disabled: ''
            }
        },
        message: {
            /**
             * Set to false if want to disable !message command (except admins).
             */
            enable: true,
            customReply: {
                /**
                 * Default: "❌ This command is disabled by the owner."
                 */
                disabled: '',
                /**
                 * Default: `❌ Please include a message. Here\'s an example: "!message Hi"`
                 */
                wrongSyntax: '',
                /**
                 * Default: \`/quote 💬 Message from the owner: %reply%\\n\\n❔ Hint: You can
                 * use the !message command to respond to the owner of this bot.
                 * \\nExample: !message Hi Thanks!\`
                 *
                 * Parameter: %reply% (Your reply)
                 */
                fromOwner: '',
                /**
                 * Default: "✅ Your message has been sent."
                 */
                success: ''
            }
        },
        time: {
            /**
             * Set to false if want to disable !time command (except admins).
             */
            enable: true,
            customReply: {
                /**
                 * Default: "❌ This command is disabled by the owner."
                 */
                disabled: '',
                /**
                 * Default: "It is currently the following time in my owner's timezone: %emoji% %time%\\n\\n%note%"
                 * .
                 * Parameters: %emoji% (clock emoji), %time% (full time format), %note% (additional notes)
                 */
                reply: ''
            }
        },
        uptime: {
            /**
             * Set to false if want to disable !uptime command (except admins).
             */
            enable: true,
            customReply: {
                /**
                 * Default: "❌ This command is disabled by the owner."
                 */
                disabled: '',
                /**
                 * Default: "%uptime%" (show bot total uptime)
                 */
                reply: ''
            }
        },
        pure: {
            /**
             * Set to false if want to disable !pure command (except admins).
             */
            enable: true,
            customReply: {
                /**
                 * Default: "❌ This command is disabled by the owner."
                 */
                disabled: '',
                /**
                 * Default: "💰 I have %pure% in my inventory.""
                 *
                 * Parameter: %pure% (a join('and') of pureStock array)
                 */
                reply: ''
            }
        },
        rate: {
            /**
             * Set to false if want to disable !rate command (except admins).
             */
            enable: true,
            customReply: {
                /**
                 * Default: "❌ This command is disabled by the owner."
                 */
                disabled: '',
                /**
                 * Default: "I value 🔑 Mann Co. Supply Crate Keys at %keyprice%. This means that one key is
                 * the same as %keyprice% and %keyprice% is the same as one key.
                 * \\n\\nKey rate source: %source%"
                 *
                 * Parameters:
                 * - %keyprice% (current sell price),
                 * - %keyrate% (current buy/sell price)
                 * - %source% (show pricestf url if autopriced, "manual" if manually priced)
                 */
                reply: ''
            }
        },
        stock: {
            /**
             * Set to false if want to disable !stock command (except admins).
             */
            enable: true,
            /**
             * Maximum number of items to be shown. Default is 20.
             */
            maximumItems: 20,
            customReply: {
                /**
                 * Default: "❌ This command is disabled by the owner."
                 */
                disabled: '',
                /**
                 * Default: "/pre 📜 Here's a list of all the items that I have in my inventory:\\n%stocklist%"
                 *
                 * Parameter: %stocklist% (a join(', \\n') array of the items your bot have (up to stock.maximumItems))
                 */
                reply: ''
            }
        },
        craftweapon: {
            /**
             * Set to false if want to disable !craftweapon command (except admins).
             */
            enable: true,
            customReply: {
                /**
                 * Default: "❌ This command is disabled by the owner."
                 */
                disabled: '',
                /**
                 * Default: "❌ I don't have any craftable weapons in my inventory."
                 */
                dontHave: '',
                /**
                 * Default: "📃 Here's a list of all craft weapons stock in my inventory:\\n\\n%list%"
                 *
                 * Parameter: %list% (a join(', \\n') array or craftable weapons that your bot have)
                 */
                have: ''
            }
        },
        uncraftweapon: {
            /**
             * Set to false if want to disable !uncraftweapon command (except admins).
             */
            enable: true, //
            customReply: {
                /**
                 * Default: "❌ This command is disabled by the owner."
                 */
                disabled: '',
                /**
                 * Default: "❌ I don't have any craftable weapons in my inventory."
                 */
                dontHave: '',
                /**
                 * Default: "📃 Here's a list of all craft weapons stock in my inventory:\\n\\n%list%"
                 *
                 * Parameter: %list% (a join(', \\n') array or craftable weapons that your bot have)
                 */
                have: ''
            }
        }
    },
    detailsExtra: {
        /**
         * Custom string to be shown in listing note if details.highValue.showSpells set to true
         */
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
            'Pumpkin Bombs': '🎃💣',
            'Halloween Fire': '🔥🟢'
        },
        /**
         * Custom string to be shown in listing note if details.highValue.showSheen set to true
         */
        sheens: {
            'Team Shine': '🔵🔴',
            'Hot Rod': '🎗️',
            Manndarin: '🟠',
            'Deadly Daffodil': '🟡',
            'Mean Green': '🟢',
            'Agonizing Emerald': '🟩',
            'Villainous Violet': '🟣'
        },
        /**
         * Custom string to be shown in listing note if details.highValue.showKillstreaker set to true
         */
        killstreakers: {
            'Cerebral Discharge': '⚡',
            'Fire Horns': '🔥🐮',
            Flames: '🔥',
            'Hypno-Beam': '😵💫',
            Incinerator: '🚬',
            Singularity: '🔆',
            Tornado: '🌪️'
        },
        /**
         * painted.stringNote: Custom string to be shown in listing note if details.highValue.showPainted set to true
         * painted.price: Paint price to be added with the item base price to automatically create sell order for painted items.
         */
        painted: {
            'A Color Similar to Slate': {
                stringNote: '🧪',
                price: {
                    keys: 0,
                    metal: 11
                }
            },
            'A Deep Commitment to Purple': {
                stringNote: '🪀',
                price: {
                    keys: 0,
                    metal: 15
                }
            },
            'A Distinctive Lack of Hue': {
                stringNote: '🎩',
                price: {
                    keys: 1,
                    metal: 5
                }
            },
            "A Mann's Mint": {
                stringNote: '👽',
                price: {
                    keys: 0,
                    metal: 30
                }
            },
            'After Eight': {
                stringNote: '🏴',
                price: {
                    keys: 1,
                    metal: 5
                }
            },
            'Aged Moustache Grey': {
                stringNote: '👤',
                price: {
                    keys: 0,
                    metal: 5
                }
            },
            'An Extraordinary Abundance of Tinge': {
                stringNote: '🏐',
                price: {
                    keys: 1,
                    metal: 5
                }
            },
            'Australium Gold': {
                stringNote: '🏆',
                price: {
                    keys: 0,
                    metal: 15
                }
            },
            'Color No. 216-190-216': {
                stringNote: '🧠',
                price: {
                    keys: 0,
                    metal: 7
                }
            },
            'Dark Salmon Injustice': {
                stringNote: '🐚',
                price: {
                    keys: 0,
                    metal: 15
                }
            },
            'Drably Olive': {
                stringNote: '🥝',
                price: {
                    keys: 0,
                    metal: 5
                }
            },
            'Indubitably Green': {
                stringNote: '🥦',
                price: {
                    keys: 0,
                    metal: 5
                }
            },
            'Mann Co. Orange': {
                stringNote: '🏀',
                price: {
                    keys: 0,
                    metal: 6
                }
            },
            Muskelmannbraun: {
                stringNote: '👜',
                price: {
                    keys: 0,
                    metal: 2
                }
            },
            "Noble Hatter's Violet": {
                stringNote: '🍇',
                price: {
                    keys: 0,
                    metal: 7
                }
            },
            'Peculiarly Drab Tincture': {
                stringNote: '🪑',
                price: {
                    keys: 0,
                    metal: 3
                }
            },
            'Pink as Hell': {
                stringNote: '🎀',
                price: {
                    keys: 1,
                    metal: 10
                }
            },
            'Radigan Conagher Brown': {
                stringNote: '🚪',
                price: {
                    keys: 0,
                    metal: 2
                }
            },
            'The Bitter Taste of Defeat and Lime': {
                stringNote: '💚',
                price: {
                    keys: 1,
                    metal: 10
                }
            },
            "The Color of a Gentlemann's Business Pants": {
                stringNote: '🧽',
                price: {
                    keys: 0,
                    metal: 5
                }
            },
            'Ye Olde Rustic Colour': {
                stringNote: '🥔',
                price: {
                    keys: 0,
                    metal: 2
                }
            },
            "Zepheniah's Greed": {
                stringNote: '🌳',
                price: {
                    keys: 0,
                    metal: 4
                }
            },
            'An Air of Debonair': {
                stringNote: '👜🔷',
                price: {
                    keys: 0,
                    metal: 30
                }
            },
            'Balaclavas Are Forever': {
                stringNote: '👜🔷',
                price: {
                    keys: 0,
                    metal: 30
                }
            },
            "Operator's Overalls": {
                stringNote: '👜🔷',
                price: {
                    keys: 0,
                    metal: 30
                }
            },
            'Cream Spirit': {
                stringNote: '🍘🥮',
                price: {
                    keys: 0,
                    metal: 30
                }
            },
            'Team Spirit': {
                stringNote: '🔵🔴',
                price: {
                    keys: 0,
                    metal: 30
                }
            },
            'The Value of Teamwork': {
                stringNote: '👨🏽‍🤝‍👨🏻',
                price: {
                    keys: 0,
                    metal: 30
                }
            },
            'Waterlogged Lab Coat': {
                stringNote: '👨🏽‍🤝‍👨🏽',
                price: {
                    keys: 0,
                    metal: 30
                }
            }
        },
        /**
         * Custom string to be shown in listing note if details.highValue.showStrangeParts set to true
         */
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

interface OnlyEnable {
    enable?: boolean;
}

// ------------ SortType ------------

interface SortInventory extends OnlyEnable {
    type?: number;
}

// ------------ WeaponsAsCurrency ------------

interface WeaponsAsCurrency extends OnlyEnable {
    withUncraft?: boolean;
}

// ------------ CheckUses ------------

interface CheckUses {
    duel?: boolean;
    noiseMaker?: boolean;
}

// ------------ Game ------------

interface Game {
    playOnlyTF2?: boolean;
    customName?: string;
}

// --------- Misc Settings ----------

interface MiscSettings {
    showOnlyMetal?: OnlyEnable;
    sortInventory?: SortInventory;
    createListings?: OnlyEnable;
    addFriends?: OnlyEnable;
    sendGroupInvite?: OnlyEnable;
    autobump?: OnlyEnable;
    skipItemsInTrade?: OnlyEnable;
    weaponsAsCurrency?: WeaponsAsCurrency;
    checkUses?: CheckUses;
    game?: Game;
}

// ------------ SendAlert ------------

interface SendAlert extends OnlyEnable {
    autokeys?: AutokeysAlert;
    backpackFull?: boolean;
    highValue?: HighValueAlert;
    autoRemoveIntentSellFailed?: boolean;
    autoAddPaintedItems?: boolean;
}

interface AutokeysAlert {
    lowPure?: boolean;
    failedToAdd?: boolean;
    failedToUpdate?: boolean;
    failedToDisable?: boolean;
}

interface HighValueAlert {
    gotDisabled?: boolean;
    receivedNotInPricelist?: boolean;
    tryingToTake?: boolean;
}

// ------------ Pricelist ------------

interface Pricelist {
    autoRemoveIntentSell?: OnlyEnable;
    autoAddInvalidItems?: OnlyEnable;
    autoAddPaintedItems?: OnlyEnable;
    priceAge?: PriceAge;
}

interface PriceAge {
    maxInSeconds?: number;
}

// ------------ Bypass ------------

interface Bypass {
    escrow?: OnlyAllow;
    overpay?: OnlyAllow;
    giftWithoutMessage?: OnlyAllow;
    bannedPeople?: OnlyAllow;
}

interface OnlyAllow {
    allow?: boolean;
}

// ------------ TradeSummary ------------

interface TradeSummary {
    showStockChanges?: boolean;
    showTimeTakenInMS?: boolean;
    showItemPrices?: boolean;
}

// ------------ HighValue ------------

interface HighValue {
    enableHold?: boolean;
    sheens?: string[];
    killstreakers?: string[];
    strangeParts?: string[];
    painted?: string[];
}

// ------------ Normalize ------------

interface Normalize {
    festivized?: NormalizeOurOrTheir;
    strangeAsSecondQuality?: NormalizeOurOrTheir;
    painted?: NormalizeOurOrTheir;
}

interface NormalizeOurOrTheir {
    our?: boolean;
    their?: boolean;
}

// ------------ Details ------------

interface Details {
    buy?: string;
    sell?: string;
    highValue?: ShowHighValue;
    uses?: UsesDetails;
}

interface ShowHighValue {
    showSpells: boolean;
    showStrangeParts: boolean;
    showKillstreaker: boolean;
    showSheen: boolean;
    showPainted: boolean;
}

interface UsesDetails {
    duel?: string;
    noiseMaker?: string;
}

// ------------ Statistics ------------

interface Statistics {
    lastTotalTrades?: number;
    startingTimeInUnix?: number;
    lastTotalProfitMadeInRef?: number;
    lastTotalProfitOverpayInRef?: number;
    profitDataSinceInUnix?: number;
    sendStats?: SendStats;
}

interface SendStats extends OnlyEnable {
    time?: string[];
}

// ------------ Autokeys ------------

interface Autokeys {
    enable?: boolean;
    minKeys?: number;
    maxKeys?: number;
    minRefined?: number;
    maxRefined?: number;
    banking?: Banking;
    scrapAdjustment?: ScrapAdjustment;
    accept?: Accept;
}

interface Banking {
    enable?: boolean;
}

interface ScrapAdjustment {
    enable?: boolean;
    value?: number;
}

interface Accept {
    understock?: boolean;
}

// ------------ Crafting ------------

interface Crafting {
    weapons?: OnlyEnable;
    metals?: Metals;
}

interface Metals extends OnlyEnable {
    minScrap?: number;
    minRec?: number;
    threshold?: number;
}

// ------------ Offer Received ------------

interface OfferReceived {
    invalidValue?: InvalidValue;
    invalidItems?: InvalidItems;
    disabledItems?: AutoAcceptOverpayAndAutoDecline;
    overstocked?: AutoAcceptOverpayAndAutoDecline;
    understocked?: AutoAcceptOverpayAndAutoDecline;
    duped?: Duped;
    escrowCheckFailed?: EscrowBannedCheckFailed;
    bannedCheckFailed?: EscrowBannedCheckFailed;
}

interface DeclineReply extends OnlyEnable {
    declineReply?: string;
}

interface InvalidValue {
    autoDecline: DeclineReply;
    exceptionValue: ExceptionValue;
}

interface ExceptionValue {
    skus: string[];
    valueInRef: number;
}

interface AutoAcceptOverpayAndAutoDecline {
    autoAcceptOverpay?: boolean;
    autoDecline?: DeclineReply;
}

interface InvalidItems extends AutoAcceptOverpayAndAutoDecline {
    givePrice?: boolean;
}

interface Duped {
    enableCheck?: boolean;
    minKeys?: number;
    autoDecline?: DeclineReply;
}

interface EscrowBannedCheckFailed {
    ignoreFailed?: boolean;
}

// ------------ Manual Review ------------

interface ManualReview extends OnlyEnable {
    showOfferSummary?: boolean;
    showReviewOfferNote?: boolean;
    showOwnerCurrentTime?: boolean;
    showItemPrices?: boolean;
    invalidValue?: OnlyNote;
    invalidItems?: OnlyNote;
    disabledItems?: OnlyNote;
    overstocked?: OnlyNote;
    understocked?: OnlyNote;
    duped?: OnlyNote;
    dupedCheckFailed?: OnlyNote;
    escrowCheckFailed?: OnlyNote;
    bannedCheckFailed?: OnlyNote;
    additionalNotes?: string;
}

// ------------ Discord Webhook ------------

interface DiscordWebhook {
    ownerID?: string;
    displayName?: string;
    avatarURL?: string;
    embedColor?: string;
    tradeSummary?: TradeSummaryDW;
    offerReview?: OfferReviewDW;
    messages?: MessagesDW;
    priceUpdate?: PriceUpdateDW;
    sendAlert?: SendAlertStatsDW;
    sendStats?: SendStatsDW;
}

interface TradeSummaryDW extends OnlyEnable {
    url?: string[];
    misc?: MiscTradeSummary;
    mentionOwner?: MentionOwner;
}

interface OnlyNote {
    note?: string;
}

interface MiscTradeSummary extends OnlyNote {
    showQuickLinks?: boolean;
    showKeyRate?: boolean;
    showPureStock?: boolean;
    showInventory?: boolean;
}

interface MentionOwner extends OnlyEnable {
    itemSkus?: string[];
    tradeValueInRef?: number;
}

interface OfferReviewDW extends OnlyEnable {
    url?: string;
    mentionInvalidValue?: boolean;
    isMention?: boolean;
    misc?: MiscOfferReview;
}

interface MiscOfferReview {
    showQuickLinks?: boolean;
    showKeyRate?: boolean;
    showPureStock?: boolean;
    showInventory?: boolean;
}

interface MessagesDW extends OnlyEnable {
    url?: string;
    isMention?: boolean;
    showQuickLinks?: boolean;
}

interface PriceUpdateDW extends OnlyEnable, OnlyNote {
    url?: string;
}

interface SendAlertStatsDW extends OnlyEnable {
    isMention?: boolean;
    url?: string;
}

interface SendStatsDW extends OnlyEnable {
    url?: string;
}

// ------------ Custom Message ------------

interface CustomMessage {
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

interface DeclineNote {
    general?: string;
    giftNoNote?: string;
    crimeAttempt?: string;
    onlyMetal?: string;
    duelingNot5Uses?: string;
    noiseMakerNot25Uses?: string;
    highValueItemsNotSelling?: string;
    notTradingKeys?: string;
    notSellingKeys?: string;
    notBuyingKeys?: string;
    banned?: string;
    escrow?: string;
    manual?: string;
}

// ------------ Commands ------------

interface OnlyCustomReplyWithDisabled {
    disabled?: string;
    reply?: string;
}

interface Commands extends OnlyEnable {
    customDisableReply?: string;
    how2trade?: How2Trade;
    price?: Price;
    buy?: SpecificOperation;
    sell?: SpecificOperation;
    buycart?: SpecificOperation;
    sellcart?: SpecificOperation;
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

interface SpecificOperation extends OnlyEnable {
    disableForSKU?: string[];
    customReply?: CustomReplyForSpecificOperation;
}

interface CustomReplyForSpecificOperation {
    disabled?: string;
    disabledForSKU?: string;
}

interface How2Trade {
    customReply?: Omit<OnlyCustomReplyWithDisabled, 'disabled'>;
}

interface Price extends OnlyEnable {
    customReply?: Omit<OnlyCustomReplyWithDisabled, 'reply'>;
}

interface Cart extends OnlyEnable {
    customReply?: CartCustom;
}

interface CartCustom extends Omit<OnlyCustomReplyWithDisabled, 'reply'> {
    title?: string;
}

interface ClearCart {
    customReply?: Omit<OnlyCustomReplyWithDisabled, 'disabled'>;
}

interface Checkout {
    customReply?: CheckoutReply;
}

interface CheckoutReply {
    empty?: string;
}

interface AddToQueue {
    alreadyHaveActiveOffer?: string;
    alreadyInQueueProcessingOffer?: string;
    alreadyInQueueWaitingTurn?: string;
    addedToQueueWaitingTurn?: string;
    alteredOffer?: string;
    processingOffer?: CartQueueProcessing;
    hasBeenMadeAcceptingMobileConfirmation?: CartQueueProcessing;
}

interface CartQueueProcessing {
    donation?: string;
    isBuyingPremium?: string;
    offer?: string;
}

interface Cancel {
    customReply?: CancelCustom;
}

interface CancelCustom {
    isBeingSent?: string;
    isCancelling?: string;
    isRemovedFromQueue?: string;
    noActiveOffer?: string;
    successCancel?: string;
}

interface Queue {
    customReply?: QueueCustom;
}

interface QueueCustom {
    notInQueue?: string;
    offerBeingMade?: string;
    hasPosition?: string;
}

interface Owner extends OnlyEnable {
    customReply?: OnlyCustomReplyWithDisabled;
}

export interface Discord extends OnlyEnable {
    customReply?: OnlyCustomReplyWithDisabled;
    inviteURL?: string;
}

interface More extends OnlyEnable {
    customReply?: Omit<OnlyCustomReplyWithDisabled, 'reply'>;
}

interface AutokeysCommand extends OnlyEnable {
    customReply?: Omit<OnlyCustomReplyWithDisabled, 'reply'>;
}

interface Message extends OnlyEnable {
    customReply?: MessageCustom;
}

interface MessageCustom {
    disabled?: string;
    wrongSyntax?: string;
    fromOwner?: string;
    success?: string;
}

interface Time extends OnlyEnable {
    customReply?: OnlyCustomReplyWithDisabled;
}

interface Uptime extends OnlyEnable {
    customReply?: OnlyCustomReplyWithDisabled;
}

interface Pure extends OnlyEnable {
    customReply?: OnlyCustomReplyWithDisabled;
}

interface Rate extends OnlyEnable {
    customReply?: OnlyCustomReplyWithDisabled;
}

export interface Stock extends OnlyEnable {
    customReply?: OnlyCustomReplyWithDisabled;
    maximumItems?: number;
}

interface Weapons extends OnlyEnable {
    customReply?: HaveOrNo;
}

interface HaveOrNo {
    disabled?: string;
    dontHave?: string;
    have?: string;
}

// ------------ Extra Details -----------

interface DetailsExtra {
    spells?: Spells;
    sheens?: Sheens;
    killstreakers?: Killstreakers;
    painted?: Painted;
    strangeParts?: StrangeParts;
}

interface Spells {
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
    'Pumpkin Bombs'?: string;
    'Halloween Fire'?: string;
}

interface Sheens {
    'Team Shine'?: string;
    'Hot Rod'?: string;
    Manndarin?: string;
    'Deadly Daffodil'?: string;
    'Mean Green'?: string;
    'Agonizing Emerald'?: string;
    'Villainous Violet'?: string;
}

interface Killstreakers {
    'Cerebral Discharge'?: string;
    'Fire Horns'?: string;
    Flames?: string;
    'Hypno-Beam'?: string;
    Incinerator?: string;
    Singularity?: string;
    Tornado?: string;
}

interface PaintedProperties {
    stringNote?: string;
    price?: Currency;
}

interface Painted {
    'A Color Similar to Slate'?: PaintedProperties;
    'A Deep Commitment to Purple'?: PaintedProperties;
    'A Distinctive Lack of Hue'?: PaintedProperties;
    "A Mann's Mint"?: PaintedProperties;
    'After Eight'?: PaintedProperties;
    'Aged Moustache Grey'?: PaintedProperties;
    'An Extraordinary Abundance of Tinge'?: PaintedProperties;
    'Australium Gold'?: PaintedProperties;
    'Color No. 216-190-216'?: PaintedProperties;
    'Dark Salmon Injustice'?: PaintedProperties;
    'Drably Olive'?: PaintedProperties;
    'Indubitably Green'?: PaintedProperties;
    'Mann Co. Orange'?: PaintedProperties;
    Muskelmannbraun?: PaintedProperties;
    "Noble Hatter's Violet"?: PaintedProperties;
    'Peculiarly Drab Tincture'?: PaintedProperties;
    'Pink as Hell'?: PaintedProperties;
    'Radigan Conagher Brown'?: PaintedProperties;
    'The Bitter Taste of Defeat and Lime'?: PaintedProperties;
    "The Color of a Gentlemann's Business Pants"?: PaintedProperties;
    'Ye Olde Rustic Colour'?: PaintedProperties;
    "Zepheniah's Greed"?: PaintedProperties;
    'An Air of Debonair'?: PaintedProperties;
    'Balaclavas Are Forever'?: PaintedProperties;
    "Operator's Overalls"?: PaintedProperties;
    'Cream Spirit'?: PaintedProperties;
    'Team Spirit'?: PaintedProperties;
    'The Value of Teamwork'?: PaintedProperties;
    'Waterlogged Lab Coat'?: PaintedProperties;
}

export type PaintedNames =
    | 'A Color Similar to Slate'
    | 'A Deep Commitment to Purple'
    | 'A Distinctive Lack of Hue'
    | "A Mann's Mint"
    | 'After Eight'
    | 'Aged Moustache Grey'
    | 'An Extraordinary Abundance of Tinge'
    | 'Australium Gold'
    | 'Color No. 216-190-216'
    | 'Dark Salmon Injustice'
    | 'Drably Olive'
    | 'Indubitably Green'
    | 'Mann Co. Orange'
    | 'Muskelmannbraun'
    | "Noble Hatter's Violet"
    | 'Peculiarly Drab Tincture'
    | 'Pink as Hell'
    | 'Radigan Conagher Brown'
    | 'The Bitter Taste of Defeat and Lime'
    | "The Color of a Gentlemann's Business Pants"
    | 'Ye Olde Rustic Colour'
    | "Zepheniah's Greed"
    | 'An Air of Debonair'
    | 'Balaclavas Are Forever'
    | "Operator's Overalls"
    | 'Cream Spirit'
    | 'Team Spirit'
    | 'The Value of Teamwork'
    | 'Waterlogged Lab Coat';

interface StrangeParts {
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
    miscSettings?: MiscSettings;
    sendAlert?: SendAlert;
    pricelist?: Pricelist;
    bypass?: Bypass;
    tradeSummary?: TradeSummary;
    highValue?: HighValue;
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

    admins?: string[];
    keep?: string[];
    groups?: string[];
    alerts?: string[];

    pricestfAPIToken?: string;

    skipBPTFTradeofferURL?: boolean;
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
        if (options && options[option]) {
            return options[option] as T;
        }
        const envVar = snakeCase(option).toUpperCase();
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
