import Handler from './Handler';
import Bot from './Bot';
import { Entry, EntryData } from './Pricelist';
import Commands from './Commands';
import CartQueue from './CartQueue';
import Inventory from './Inventory';
import { UnknownDictionary } from '../types/common';
import { Currency } from '../types/TeamFortress2';
import SKU from 'tf2-sku';
import request from '@nicklason/request-retry';
import sleepasync from 'sleep-async';

import SteamUser from 'steam-user';
import TradeOfferManager, { TradeOffer, PollData } from 'steam-tradeoffer-manager';
import pluralize from 'pluralize';
import SteamID from 'steamid';
import Currencies from 'tf2-currencies';
import async from 'async';
import { requestCheck } from '../lib/ptf-api';

import moment from 'moment-timezone';

import log from '../lib/logger';
import * as files from '../lib/files';
import paths from '../resources/paths';
import { parseJSON, exponentialBackoff } from '../lib/helpers';
import TF2Inventory from './TF2Inventory';
import DiscordWebhookClass from './DiscordWebhook';
import Autokeys from './Autokeys';

export = class MyHandler extends Handler {
    private readonly commands: Commands;

    private readonly discord: DiscordWebhookClass;

    private readonly autokeys: Autokeys;

    readonly cartQueue: CartQueue;

    private groups: string[] = [];

    private friendsToKeep: string[] = [];

    private minimumScrap = 9;

    private minimumReclaimed = 9;

    private combineThreshold = 9;

    private dupeCheckEnabled = false;

    private minimumKeysDupeCheck = 0;

    private invalidValueException: number;

    private invalidValueExceptionSKU: string[] = [];

    private hasInvalidValueException = false;

    private fromEnv: {
        autoAcceptOverpay: {
            invalidItem: boolean;
            overstocked: boolean;
            understocked: boolean;
        };
        autoDecline: {
            invalidValue: boolean;
            overstocked: boolean;
            understocked: boolean;
        };
        somethingWrong: {
            enabled: boolean;
            url: string;
        };
        tradeSummaryWebhook: {
            enabled: boolean;
            url: string;
        };
        autoRemoveIntentSell: boolean;
        givePrice: boolean;
        craftWeaponAsCurrency: boolean;
        showMetal: boolean;
        autokeysNotAcceptUnderstocked: boolean;
    };

    private isTradingKeys = false;

    private customGameName: string;

    private backpackSlots = 0;

    private retryRequest;

    private autokeysStatus: {
        isActive: boolean;
        isBuying: boolean;
        isBanking: boolean;
    };

    private classWeaponsTimeout;

    recentlySentMessage: UnknownDictionary<number> = {};

    constructor(bot: Bot) {
        super(bot);

        this.commands = new Commands(bot);
        this.cartQueue = new CartQueue(bot);
        this.discord = new DiscordWebhookClass(bot);
        this.autokeys = new Autokeys(bot);

        const minimumScrap = parseInt(process.env.MINIMUM_SCRAP);
        const minimumReclaimed = parseInt(process.env.MINIMUM_RECLAIMED);
        const combineThreshold = parseInt(process.env.METAL_THRESHOLD);

        this.fromEnv = {
            autoAcceptOverpay: {
                invalidItem: process.env.DISABLE_ACCEPT_INVALID_ITEMS_OVERPAY !== 'true',
                overstocked: process.env.DISABLE_ACCEPT_OVERSTOCKED_OVERPAY === 'false',
                understocked: process.env.DISABLE_ACCEPT_UNDERSTOCKED_OVERPAY === 'false'
            },
            autoDecline: {
                invalidValue: process.env.DISABLE_AUTO_DECLINE_INVALID_VALUE !== 'true',
                overstocked: process.env.DISABLE_AUTO_DECLINE_OVERSTOCKED === 'false',
                understocked: process.env.DISABLE_AUTO_DECLINE_UNDERSTOCKED === 'false'
            },
            somethingWrong: {
                enabled: process.env.DISABLE_DISCORD_WEBHOOK_SOMETHING_WRONG_ALERT === 'false',
                url: process.env.DISCORD_WEBHOOK_SOMETHING_WRONG_ALERT_URL
            },
            tradeSummaryWebhook: {
                enabled: process.env.DISABLE_DISCORD_WEBHOOK_TRADE_SUMMARY === 'false',
                url: process.env.DISCORD_WEBHOOK_TRADE_SUMMARY_URL
            },
            autoRemoveIntentSell: process.env.DISABLE_AUTO_REMOVE_INTENT_SELL !== 'true', // By default it will remove pricelist entry with intent=sell, unless this is set to true
            givePrice: process.env.DISABLE_GIVE_PRICE_TO_INVALID_ITEMS === 'false',
            craftWeaponAsCurrency: process.env.DISABLE_CRAFTWEAPON_AS_CURRENCY !== 'true',
            showMetal: process.env.ENABLE_SHOW_ONLY_METAL === 'true',
            autokeysNotAcceptUnderstocked: process.env.AUTOKEYS_ACCEPT_UNDERSTOCKED !== 'true'
        };

        const exceptionRef = parseInt(process.env.INVALID_VALUE_EXCEPTION_VALUE_IN_REF);

        let invalidValueExceptionSKU = parseJSON(process.env.INVALID_VALUE_EXCEPTION_SKUS);
        if (invalidValueExceptionSKU !== null && Array.isArray(invalidValueExceptionSKU)) {
            invalidValueExceptionSKU.forEach(function(sku: string) {
                if (sku === '' || !sku) {
                    invalidValueExceptionSKU = ['Not Set'];
                }
            });
            this.invalidValueExceptionSKU = invalidValueExceptionSKU;
        } else {
            log.warn(
                'You did not set invalid value excepted items SKU as an array, resetting to apply only for Unusual and Australium'
            );
            this.invalidValueExceptionSKU = [';5;u', ';11;australium'];
        }

        const customGameName = process.env.CUSTOM_PLAYING_GAME_NAME;

        if (!customGameName || customGameName === 'tf2autobot') {
            this.customGameName = customGameName;
        } else {
            if (customGameName.length <= 45) {
                this.customGameName = customGameName + ' - tf2autobot';
            } else {
                log.warn('Your custom game playing name is more than 45 characters, resetting to only "tf2autobot"...');
                this.customGameName = 'tf2autobot';
            }
        }

        const exceptionRefFromEnv = exceptionRef === 0 || isNaN(exceptionRef) ? 0 : exceptionRef;
        this.invalidValueException = Currencies.toScrap(exceptionRefFromEnv);

        if (!isNaN(minimumScrap)) {
            this.minimumScrap = minimumScrap;
        }

        if (!isNaN(minimumReclaimed)) {
            this.minimumReclaimed = minimumReclaimed;
        }

        if (!isNaN(combineThreshold)) {
            this.combineThreshold = combineThreshold;
        }

        if (process.env.ENABLE_DUPE_CHECK === 'true') {
            this.dupeCheckEnabled = true;
        }

        const minimumKeysDupeCheck = parseInt(process.env.MINIMUM_KEYS_DUPE_CHECK);
        if (!isNaN(minimumKeysDupeCheck)) {
            this.minimumKeysDupeCheck = minimumKeysDupeCheck;
        }

        const groups = parseJSON(process.env.GROUPS);
        if (groups !== null && Array.isArray(groups)) {
            groups.forEach(function(groupID64) {
                if (!new SteamID(groupID64).isValid()) {
                    throw new Error(`Invalid group SteamID64 "${groupID64}"`);
                }
            });

            this.groups = groups;
        }

        const friendsToKeep = parseJSON(process.env.KEEP).concat(this.bot.getAdmins());
        if (friendsToKeep !== null && Array.isArray(friendsToKeep)) {
            friendsToKeep.forEach(function(steamID64) {
                if (!new SteamID(steamID64).isValid()) {
                    throw new Error(`Invalid SteamID64 "${steamID64}"`);
                }
            });

            this.friendsToKeep = friendsToKeep;
        }

        setInterval(() => {
            this.recentlySentMessage = {};
        }, 1000);
    }

    getFriendToKeep(): number {
        return this.friendsToKeep.length;
    }

    hasDupeCheckEnabled(): boolean {
        return this.dupeCheckEnabled;
    }

    getMinimumKeysDupeCheck(): number {
        return this.minimumKeysDupeCheck;
    }

    getCustomGame(): string {
        return this.customGameName;
    }

    getBackpackSlots(): number {
        return this.backpackSlots;
    }

    getAutokeysStatus(): { isActive: boolean; isBuying: boolean; isBanking: boolean } {
        return this.autokeysStatus;
    }

    onRun(): Promise<{
        loginAttempts?: number[];
        pricelist?: EntryData[];
        loginKey?: string;
        pollData?: PollData;
    }> {
        return Promise.all([
            files.readFile(paths.files.loginKey, false),
            files.readFile(paths.files.pricelist, true),
            files.readFile(paths.files.loginAttempts, true),
            files.readFile(paths.files.pollData, true)
        ]).then(function([loginKey, pricelist, loginAttempts, pollData]) {
            return { loginKey, pricelist, loginAttempts, pollData };
        });
    }

    onReady(): void {
        log.info(
            'tf2autobot v' +
                process.env.BOT_VERSION +
                ' is ready! ' +
                pluralize('item', this.bot.pricelist.getLength(), true) +
                ' in pricelist, ' +
                pluralize('listing', this.bot.listingManager.listings.length, true) +
                ' on www.backpack.tf (cap: ' +
                this.bot.listingManager.cap +
                ')'
        );

        this.bot.client.gamesPlayed([this.customGameName, 440]);
        this.bot.client.setPersona(SteamUser.EPersonaState.Online);

        // GetBackpackSlots
        this.requestBackpackSlots();

        // Smelt / combine metal if needed
        this.keepMetalSupply();

        // Craft duplicate weapons
        this.craftDuplicateWeapons();

        // Craft class weapons
        this.classWeaponsTimeout = setTimeout(() => {
            // called after 2 minutes to craft metals and duplicated weapons first.
            this.craftClassWeapons();
        }, 2 * 60 * 1000);

        // Auto sell and buy keys if ref < minimum
        this.autokeys.check();

        this.autokeysStatus = {
            isActive: this.autokeys.isActive,
            isBuying: this.autokeys.status.isBuyingKeys,
            isBanking: this.autokeys.status.isBankingKeys
        };

        // Sort the inventory after crafting / combining metal
        this.sortInventory();

        // Check friend requests that we got while offline
        this.checkFriendRequests();

        // Check group invites that we got while offline
        this.checkGroupInvites();

        // Set up autorelist if enabled in environment variable
        this.bot.listings.setupAutorelist();
    }

    onShutdown(): Promise<void> {
        return new Promise(resolve => {
            if (this.bot.listingManager.ready !== true) {
                // We have not set up the listing manager, don't try and remove listings
                return resolve();
            }

            if (process.env.ENABLE_AUTOKEYS === 'true' && this.autokeys.isActive === true) {
                log.debug('Disabling Autokeys and removing key from pricelist...');
                this.autokeys.disable();
            }

            this.bot.listings.removeAll().asCallback(function(err) {
                if (err) {
                    log.warn('Failed to remove all listings: ', err);
                }

                resolve();
            });
        });
    }

    onLoggedOn(): void {
        if (this.bot.isReady()) {
            this.bot.client.setPersona(SteamUser.EPersonaState.Online);
            this.bot.client.gamesPlayed([this.customGameName, 440]);
        }
    }

    onMessage(steamID: SteamID, message: string): void {
        const steamID64 = steamID.toString();

        if (!this.bot.friends.isFriend(steamID64)) {
            return;
        }

        const friend = this.bot.friends.getFriend(steamID64);

        if (friend === null) {
            log.info(`Message from ${steamID64}: ${message}`);
        } else {
            log.info(`Message from ${friend.player_name} (${steamID64}): ${message}`);
        }

        if (this.recentlySentMessage[steamID64] !== undefined && this.recentlySentMessage[steamID64] >= 1) {
            return;
        }

        this.recentlySentMessage[steamID64] = this.recentlySentMessage[steamID64] + 1;

        this.commands.processMessage(steamID, message);
    }

    onLoginKey(loginKey: string): void {
        log.debug('New login key');

        files.writeFile(paths.files.loginKey, loginKey, false).catch(function(err) {
            log.warn('Failed to save login key: ', err);
        });
    }

    onLoginError(err: Error): void {
        // @ts-ignore
        if (err.eresult === SteamUser.EResult.InvalidPassword) {
            files.deleteFile(paths.files.loginKey).catch(err => {
                log.warn('Failed to delete login key: ', err);
            });
        }
    }

    onLoginAttempts(attempts: number[]): void {
        files.writeFile(paths.files.loginAttempts, attempts, true).catch(function(err) {
            log.warn('Failed to save login attempts: ', err);
        });
    }

    onFriendRelationship(steamID: SteamID, relationship: number): void {
        if (relationship === SteamUser.EFriendRelationship.Friend) {
            this.onNewFriend(steamID);
            this.checkFriendsCount(steamID);
        } else if (relationship === SteamUser.EFriendRelationship.RequestRecipient) {
            this.respondToFriendRequest(steamID);
        }
    }

    onGroupRelationship(groupID: SteamID, relationship: number): void {
        log.debug('Group relation changed', { steamID: groupID, relationship: relationship });
        if (relationship === SteamUser.EClanRelationship.Invited) {
            const join = this.groups.includes(groupID.getSteamID64());

            log.info(`Got invited to group ${groupID.getSteamID64()}, ${join ? 'accepting...' : 'declining...'}`);
            this.bot.client.respondToGroupInvite(groupID, this.groups.includes(groupID.getSteamID64()));
        } else if (relationship === SteamUser.EClanRelationship.Member) {
            log.info(`Joined group ${groupID.getSteamID64()}`);
        }
    }

    onBptfAuth(auth: { apiKey: string; accessToken: string }): void {
        const details = Object.assign({ private: true }, auth);

        log.warn('Please add the backpack.tf API key and access token to the environment variables!', details);
    }

    async onNewTradeOffer(
        offer: TradeOffer
    ): Promise<null | {
        action: 'accept' | 'decline' | 'skip';
        reason: string;
        meta?: UnknownDictionary<any>;
    }> {
        offer.log('info', 'is being processed...');

        // Allow sending notifications
        offer.data('notify', true);

        // If crafting class weapons still waiting, cancel it.
        clearTimeout(this.classWeaponsTimeout);

        const ourItems = Inventory.fromItems(
            this.bot.client.steamID,
            offer.itemsToGive,
            this.bot.manager,
            this.bot.schema
        );

        const theirItems = Inventory.fromItems(offer.partner, offer.itemsToReceive, this.bot.manager, this.bot.schema);

        const items = {
            our: ourItems.getItems(),
            their: theirItems.getItems()
        };

        const exchange = {
            contains: { items: false, metal: false, keys: false },
            our: { value: 0, keys: 0, scrap: 0, contains: { items: false, metal: false, keys: false } },
            their: { value: 0, keys: 0, scrap: 0, contains: { items: false, metal: false, keys: false } }
        };

        const itemsDict = { our: {}, their: {} };

        const states = [false, true];

        let hasInvalidItems = false;

        for (let i = 0; i < states.length; i++) {
            const buying = states[i];
            const which = buying ? 'their' : 'our';

            for (const sku in items[which]) {
                if (!Object.prototype.hasOwnProperty.call(items[which], sku)) {
                    continue;
                }

                if (sku === 'unknown') {
                    // Offer contains an item that is not from TF2
                    hasInvalidItems = true;
                }

                if (sku === '5000;6') {
                    exchange.contains.metal = true;
                    exchange[which].contains.metal = true;
                } else if (sku === '5001;6') {
                    exchange.contains.metal = true;
                    exchange[which].contains.metal = true;
                } else if (sku === '5002;6') {
                    exchange.contains.metal = true;
                    exchange[which].contains.metal = true;
                } else if (sku === '5021;6') {
                    exchange.contains.keys = true;
                    exchange[which].contains.keys = true;
                } else {
                    exchange.contains.items = true;
                    exchange[which].contains.items = true;
                }

                const amount = items[which][sku].length;

                itemsDict[which][sku] = amount;
            }
        }

        offer.data('dict', itemsDict);

        // Always check if trade partner is taking higher value items (such as spelled) that are not in our pricelist

        const webhook = this.fromEnv.tradeSummaryWebhook;

        let hasHighValueOur = false;
        const highValuedOur: {
            skus: string[];
            nameWithSpell: string[];
        } = {
            skus: [],
            nameWithSpell: []
        };

        offer.itemsToGive.forEach(item => {
            for (let i = 0; i < item.descriptions.length; i++) {
                const descriptionValue = item.descriptions[i].value;
                const descriptionColor = item.descriptions[i].color;

                if (
                    descriptionValue.startsWith('Halloween:') &&
                    descriptionValue.endsWith('(spell only active during event)') &&
                    descriptionColor === '7ea9d1'
                ) {
                    hasHighValueOur = true;
                    const spellName = descriptionValue.substring(10, descriptionValue.length - 32).trim();

                    highValuedOur.skus.push(item.getSKU(this.bot.schema));
                    highValuedOur.nameWithSpell.push(
                        `${item.name} with ${
                            webhook.enabled && webhook.url
                                ? `[${spellName}](https://wiki.teamfortress.com/wiki/${spellName
                                      .replace(/\s/g, '_')
                                      .replace(/'/g, '%27')}_(halloween_spell))`
                                : spellName
                        }`
                    );

                    log.debug('info', `${item.name} with ${spellName} (${item.assetid}) is a high value item.`);
                    break;
                }
            }
        });

        // Check if we are receiving high valued items, if does, then the bot will mention the owner on the Discord Webhook.

        let hasHighValueTheir = false;
        const highValuedTheir: {
            skus: string[];
            nameWithSpell: string[];
        } = {
            skus: [],
            nameWithSpell: []
        };

        offer.itemsToReceive.forEach(item => {
            for (let i = 0; i < item.descriptions.length; i++) {
                const descriptionValue = item.descriptions[i].value;
                const descriptionColor = item.descriptions[i].color;

                if (
                    descriptionValue.startsWith('Halloween:') &&
                    descriptionValue.endsWith('(spell only active during event)') &&
                    descriptionColor === '7ea9d1'
                ) {
                    hasHighValueTheir = true;
                    const spellName = descriptionValue.substring(10, descriptionValue.length - 32).trim();

                    highValuedTheir.skus.push(item.getSKU(this.bot.schema));
                    highValuedTheir.nameWithSpell.push(
                        `${item.name} with ${
                            webhook.enabled && webhook.url
                                ? `[${spellName}](https://wiki.teamfortress.com/wiki/${spellName
                                      .replace(' ', '_')
                                      .replace("'", '%27')}_(halloween_spell))`
                                : spellName
                        }`
                    );

                    log.debug('info', `${item.name} with ${spellName} (${item.assetid}) is a high value item.`);
                    break;
                }
            }
        });

        // Check if the offer is from an admin
        if (this.bot.isAdmin(offer.partner)) {
            offer.log('trade', `is from an admin, accepting. Summary:\n${offer.summarize(this.bot.schema)}`);
            return {
                action: 'accept',
                reason: 'ADMIN',
                meta: {
                    hasHighValueItems: {
                        our: hasHighValueOur,
                        their: hasHighValueTheir
                    },
                    highValueItems: {
                        our: highValuedOur,
                        their: highValuedTheir
                    }
                }
            };
        }

        if (hasInvalidItems) {
            // Using boolean because items dict always needs to be saved
            offer.log('info', 'contains items not from TF2, declining...');
            return { action: 'decline', reason: '🟨_INVALID_ITEMS_CONTAINS_NON_TF2' };
        }

        const itemsDiff = offer.getDiff();

        const offerMessage = offer.message.toLowerCase();

        const isGift = this.giftWords().some(word => {
            return offerMessage.includes(word);
        });

        if (offer.itemsToGive.length === 0 && isGift) {
            offer.log('trade', `is a gift offer, accepting. Summary:\n${offer.summarize(this.bot.schema)}`);
            return { action: 'accept', reason: 'GIFT' };
        } else if (offer.itemsToGive.length === 0 && offer.itemsToReceive.length > 0 && !isGift) {
            offer.log('info', 'is a gift offer without any offer message, declining...');
            return { action: 'decline', reason: 'GIFT_NO_NOTE' };
        } else if (offer.itemsToGive.length > 0 && offer.itemsToReceive.length === 0) {
            offer.log('info', 'is taking our items for free, declining...');
            return { action: 'decline', reason: 'CRIME_ATTEMPT' };
        }

        // Check for Dueling Mini-Game for 5x Uses only when enabled and exist in pricelist

        const checkExist = this.bot.pricelist;

        if (process.env.DISABLE_CHECK_USES_DUELING_MINI_GAME !== 'true') {
            let hasNot5Uses = false;
            offer.itemsToReceive.forEach(item => {
                if (item.name === 'Dueling Mini-Game') {
                    for (let i = 0; i < item.descriptions.length; i++) {
                        const descriptionValue = item.descriptions[i].value;
                        const descriptionColor = item.descriptions[i].color;

                        if (
                            !descriptionValue.includes('This is a limited use item. Uses: 5') &&
                            descriptionColor === '00a000'
                        ) {
                            hasNot5Uses = true;
                            log.debug('info', `Dueling Mini-Game (${item.assetid}) is not 5 uses.`);
                            break;
                        }
                    }
                }
            });

            if (hasNot5Uses && checkExist.getPrice('241;6', true) !== null) {
                // Only decline if exist in pricelist
                offer.log('info', 'contains Dueling Mini-Game that are not 5 uses.');
                return { action: 'decline', reason: 'DUELING_NOT_5_USES' };
            }
        }

        // Check for Noise Maker for 25x Uses only when enabled and exist in pricelist

        if (process.env.DISABLE_CHECK_USES_NOISE_MAKER !== 'true') {
            let hasNot25Uses = false;
            offer.itemsToReceive.forEach(item => {
                const isNoiseMaker = this.noiseMakerNames().some(name => {
                    return item.name.includes(name);
                });
                if (isNoiseMaker) {
                    for (let i = 0; i < item.descriptions.length; i++) {
                        const descriptionValue = item.descriptions[i].value;
                        const descriptionColor = item.descriptions[i].color;

                        if (
                            !descriptionValue.includes('This is a limited use item. Uses: 25') &&
                            descriptionColor === '00a000'
                        ) {
                            hasNot25Uses = true;
                            log.debug('info', `${item.name} (${item.assetid}) is not 25 uses.`);
                            break;
                        }
                    }
                }
            });

            const isNoiseMaker = this.noiseMakerSKUs().some(sku => {
                return checkExist.getPrice(sku, true) !== null;
            });
            if (hasNot25Uses && isNoiseMaker) {
                offer.log('info', 'contains Noice Maker that are not 25 uses.');
                return { action: 'decline', reason: 'NOISE_MAKER_NOT_25_USES' };
            }
        }

        const isInPricelist =
            highValuedOur.skus.length > 0 // Only check if this not empty
                ? highValuedOur.skus.some(sku => {
                      return checkExist.getPrice(sku, false) !== null; // Return true if exist in pricelist, enabled or not.
                  })
                : null;

        if (hasHighValueOur && isInPricelist === false) {
            // Decline trade that offer overpay on high valued (spelled) items that are not in our pricelist.
            offer.log('info', 'contains higher value item on our side that is not in our pricelist.');

            // Inform admin via Steam Chat or Discord Webhook Something Wrong Alert.
            if (this.fromEnv.somethingWrong.enabled && this.fromEnv.somethingWrong.url) {
                this.discord.sendAlert('highValue', null, null, null, highValuedOur.nameWithSpell);
            } else {
                this.bot.messageAdmins(
                    `Someone is about to take your ${highValuedOur.nameWithSpell.join(', ')} (not in pricelist)`,
                    []
                );
            }

            return {
                action: 'decline',
                reason: 'HIGH_VALUE_ITEMS_NOT_SELLING',
                meta: {
                    highValueName: highValuedOur.nameWithSpell
                }
            };
        }

        const manualReviewEnabled = process.env.ENABLE_MANUAL_REVIEW !== 'false';

        const itemPrices = {};

        const keyPrice = this.bot.pricelist.getKeyPrice();

        let hasOverstock = false;

        let hasUnderstock = false;

        // A list of things that is wrong about the offer and other information
        const wrongAboutOffer: (
            | {
                  reason: '🟦_OVERSTOCKED';
                  sku: string;
                  buying: boolean;
                  diff: number;
                  amountCanTrade: number;
              }
            | {
                  reason: '🟩_UNDERSTOCKED';
                  sku: string;
                  selling: boolean;
                  diff: number;
                  amountCanTrade: number;
              }
            | {
                  reason: '🟨_INVALID_ITEMS';
                  sku: string;
                  buying: boolean;
                  amount: number;
                  price: string;
              }
            | {
                  reason: '🟥_INVALID_VALUE';
                  our: number;
                  their: number;
              }
            | {
                  reason: '🟪_DUPE_CHECK_FAILED';
                  assetid?: string;
                  error?: string;
              }
            | {
                  reason: '🟫_DUPED_ITEMS';
                  assetid: string;
              }
            | {
                  reason: '⬜_ESCROW_CHECK_FAILED';
                  error?: string;
              }
            | {
                  reason: '⬜_BANNED_CHECK_FAILED';
                  error?: string;
              }
        )[] = [];

        let assetidsToCheck = [];
        let skuToCheck = [];

        for (let i = 0; i < states.length; i++) {
            const buying = states[i];
            const which = buying ? 'their' : 'our';
            const intentString = buying ? 'buy' : 'sell';
            const weapons = this.weapon();
            const craft = weapons.craft;
            const uncraft = weapons.uncraft;

            for (const sku in items[which]) {
                if (!Object.prototype.hasOwnProperty.call(items[which], sku)) {
                    continue;
                }

                const assetids = items[which][sku];
                const amount = assetids.length;

                if (sku === '5000;6') {
                    exchange[which].value += amount;
                    exchange[which].scrap += amount;
                } else if (sku === '5001;6') {
                    const value = 3 * amount;
                    exchange[which].value += value;
                    exchange[which].scrap += value;
                } else if (sku === '5002;6') {
                    const value = 9 * amount;
                    exchange[which].value += value;
                    exchange[which].scrap += value;
                } else if (
                    (craft.includes(sku) || uncraft.includes(sku)) &&
                    this.fromEnv.craftWeaponAsCurrency &&
                    this.bot.pricelist.getPrice(sku, true) === null
                ) {
                    const value = 0.5 * amount;
                    exchange[which].value += value;
                    exchange[which].scrap += value;
                } else {
                    const match = this.bot.pricelist.getPrice(sku, true);
                    const notIncludeCraftweapon = this.fromEnv.craftWeaponAsCurrency
                        ? !(craft.includes(sku) || uncraft.includes(sku))
                        : true;

                    // TODO: Go through all assetids and check if the item is being sold for a specific price

                    if (match !== null && (sku !== '5021;6' || !exchange.contains.items)) {
                        // If we found a matching price and the item is not a key, or the we are not trading items (meaning that we are trading keys) then add the price of the item

                        // Add value of items
                        exchange[which].value += match[intentString].toValue(keyPrice.metal) * amount;
                        exchange[which].keys += match[intentString].keys * amount;
                        exchange[which].scrap += Currencies.toScrap(match[intentString].metal) * amount;

                        itemPrices[match.sku] = {
                            buy: match.buy,
                            sell: match.sell
                        };

                        // Check stock limits (not for keys)
                        const diff = itemsDiff[sku];

                        const isBuying = diff > 0; // is buying if true.
                        const amountCanTrade = this.bot.inventoryManager.amountCanTrade(sku, isBuying); // return a number

                        if (diff !== 0 && sku !== '5021;6' && amountCanTrade < diff && notIncludeCraftweapon) {
                            // User is offering too many
                            hasOverstock = true;

                            wrongAboutOffer.push({
                                reason: '🟦_OVERSTOCKED',
                                sku: sku,
                                buying: isBuying,
                                diff: diff,
                                amountCanTrade: amountCanTrade
                            });
                        }

                        if (
                            diff !== 0 &&
                            !isBuying &&
                            sku !== '5021;6' &&
                            amountCanTrade < Math.abs(diff) &&
                            notIncludeCraftweapon
                        ) {
                            // User is taking too many
                            hasUnderstock = true;

                            wrongAboutOffer.push({
                                reason: '🟩_UNDERSTOCKED',
                                sku: sku,
                                selling: !isBuying,
                                diff: diff,
                                amountCanTrade: amountCanTrade
                            });
                        }

                        const buyPrice = match.buy.toValue(keyPrice.metal);
                        const sellPrice = match.sell.toValue(keyPrice.metal);
                        const minimumKeysDupeCheck = this.minimumKeysDupeCheck * keyPrice.toValue();

                        if (
                            buying && // check only items on their side
                            (buyPrice > minimumKeysDupeCheck || sellPrice > minimumKeysDupeCheck)
                            // if their side contains invalid_items, will use our side value
                        ) {
                            skuToCheck = skuToCheck.concat(sku);
                            assetidsToCheck = assetidsToCheck.concat(assetids);
                        }
                    } else if (sku === '5021;6' && exchange.contains.items) {
                        // Offer contains keys and we are not trading keys, add key value
                        exchange[which].value += keyPrice.toValue() * amount;
                        exchange[which].keys += amount;
                    } else if ((match === null && notIncludeCraftweapon) || match.intent === (buying ? 1 : 0)) {
                        // Offer contains an item that we are not trading
                        hasInvalidItems = true;

                        await sleepasync().Promise.sleep(1 * 1000);
                        const price = await this.bot.pricelist.getPricesTF(sku);

                        const item = SKU.fromString(sku);

                        let itemSuggestedValue;

                        if (price === null) {
                            itemSuggestedValue = 'No price';
                        } else {
                            price.buy = new Currencies(price.buy);
                            price.sell = new Currencies(price.sell);

                            if (this.fromEnv.givePrice && item.wear === null) {
                                // if DISABLE_GIVE_PRICE_TO_INVALID_ITEMS is set to false (enable) and items is not skins/war paint,
                                // then give that item price and include in exchange
                                exchange[which].value += price[intentString].toValue(keyPrice.metal) * amount;
                                exchange[which].keys += price[intentString].keys * amount;
                                exchange[which].scrap += Currencies.toScrap(price[intentString].metal) * amount;
                            }
                            const valueInRef = Currencies.toRefined(price[intentString].toValue(keyPrice.metal));
                            itemSuggestedValue =
                                valueInRef >= keyPrice.metal
                                    ? `${valueInRef.toString()} (${price[intentString].toString()})`
                                    : price[intentString].toString();
                        }

                        wrongAboutOffer.push({
                            reason: '🟨_INVALID_ITEMS',
                            sku: sku,
                            buying: buying,
                            amount: amount,
                            price: itemSuggestedValue
                        });
                    }
                }
            }
        }

        // Doing this so that the prices will always be displayed as only metal
        if (this.fromEnv.showMetal) {
            exchange.our.scrap += exchange.our.keys * keyPrice.toValue();
            exchange.our.keys = 0;
            exchange.their.scrap += exchange.their.keys * keyPrice.toValue();
            exchange.their.keys = 0;
        }

        offer.data('value', {
            our: {
                total: exchange.our.value,
                keys: exchange.our.keys,
                metal: Currencies.toRefined(exchange.our.scrap)
            },
            their: {
                total: exchange.their.value,
                keys: exchange.their.keys,
                metal: Currencies.toRefined(exchange.their.scrap)
            },
            rate: keyPrice.metal
        });

        offer.data('prices', itemPrices);

        if (exchange.contains.metal && !exchange.contains.keys && !exchange.contains.items) {
            // Offer only contains metal
            offer.log('info', 'only contains metal, declining...');
            return { action: 'decline', reason: 'ONLY_METAL' };
        } else if (exchange.contains.keys && !exchange.contains.items) {
            // Offer is for trading keys, check if we are trading them
            const priceEntry = this.bot.pricelist.getPrice('5021;6', true);
            if (priceEntry === null) {
                // We are not trading keys
                offer.log('info', 'we are not trading keys, declining...');
                this.bot.listings.checkBySKU('5021;6');
                return { action: 'decline', reason: 'NOT_TRADING_KEYS' };
            } else if (exchange.our.contains.keys && priceEntry.intent !== 1 && priceEntry.intent !== 2) {
                // We are not selling keys
                offer.log('info', 'we are not selling keys, declining...');
                this.bot.listings.checkBySKU('5021;6');
                return { action: 'decline', reason: 'NOT_SELLING_KEYS' };
            } else if (exchange.their.contains.keys && priceEntry.intent !== 0 && priceEntry.intent !== 2) {
                // We are not buying keys
                offer.log('info', 'we are not buying keys, declining...');
                this.bot.listings.checkBySKU('5021;6');
                return { action: 'decline', reason: 'NOT_BUYING_KEYS' };
            } else {
                // Check overstock / understock on keys
                const diff = itemsDiff['5021;6'];
                // If the diff is greater than 0 then we are buying, less than is selling
                this.isTradingKeys = true;

                const isBuying = diff > 0;
                const amountCanTrade = this.bot.inventoryManager.amountCanTrade('5021;6', isBuying);

                if (diff !== 0 && amountCanTrade < diff) {
                    // User is offering too many
                    hasOverstock = true;
                    wrongAboutOffer.push({
                        reason: '🟦_OVERSTOCKED',
                        sku: '5021;6',
                        buying: isBuying,
                        diff: diff,
                        amountCanTrade: amountCanTrade
                    });
                }

                const isNotAcceptUnderstocked = this.fromEnv.autokeysNotAcceptUnderstocked;

                if (diff !== 0 && !isBuying && amountCanTrade < Math.abs(diff) && isNotAcceptUnderstocked) {
                    // User is taking too many
                    hasUnderstock = true;

                    wrongAboutOffer.push({
                        reason: '🟩_UNDERSTOCKED',
                        sku: '5021;6',
                        selling: !isBuying,
                        diff: diff,
                        amountCanTrade: amountCanTrade
                    });
                }
            }
        }

        const exceptionSKU = this.invalidValueExceptionSKU;
        const itemsList = this.itemList(offer);
        const ourItemsSKU = itemsList.our;
        const theirItemsSKU = itemsList.their;

        const isOurItems = exceptionSKU.some((fromEnv: string) => {
            return ourItemsSKU.some((ourItemSKU: string) => {
                return ourItemSKU.includes(fromEnv);
            });
        });

        const isThierItems = exceptionSKU.some((fromEnv: string) => {
            return theirItemsSKU.some((theirItemSKU: string) => {
                return theirItemSKU.includes(fromEnv);
            });
        });

        const isExcept = isOurItems || isThierItems;
        const exceptionValue = this.invalidValueException;

        let hasInvalidValue = false;
        if (exchange.our.value > exchange.their.value) {
            if (!isExcept || (isExcept && exchange.our.value - exchange.their.value >= exceptionValue)) {
                // Check if the values are correct and is not include the exception sku
                // OR include the exception sku but the invalid value is more than or equal to exception value
                hasInvalidValue = true;
                this.hasInvalidValueException = false;
                wrongAboutOffer.push({
                    reason: '🟥_INVALID_VALUE',
                    our: exchange.our.value,
                    their: exchange.their.value
                });
            } else if (isExcept && exchange.our.value - exchange.their.value < exceptionValue) {
                log.info(
                    `Contains ${exceptionSKU.join(' or ')} and difference is ${Currencies.toRefined(
                        exchange.our.value - exchange.their.value
                    )} ref which is less than your exception value of ${Currencies.toRefined(
                        exceptionValue
                    )} ref. Accepting/checking for other reasons...`
                );
                this.hasInvalidValueException = true;
            }
        }

        if (!manualReviewEnabled) {
            if (hasOverstock) {
                offer.log('info', 'is offering too many, declining...');

                const reasons = wrongAboutOffer.map(wrong => wrong.reason);
                const uniqueReasons = reasons.filter(reason => reasons.includes(reason));

                return {
                    action: 'decline',
                    reason: '🟦_OVERSTOCKED',
                    meta: {
                        uniqueReasons: uniqueReasons,
                        reasons: wrongAboutOffer
                    }
                };
            }

            if (hasUnderstock) {
                offer.log('info', 'is taking too many, declining...');

                const reasons = wrongAboutOffer.map(wrong => wrong.reason);
                const uniqueReasons = reasons.filter(reason => reasons.includes(reason));

                return {
                    action: 'decline',
                    reason: '🟩_UNDERSTOCKED',
                    meta: {
                        uniqueReasons: uniqueReasons,
                        reasons: wrongAboutOffer
                    }
                };
            }

            if (hasInvalidValue) {
                // We are offering more than them, decline the offer
                offer.log('info', 'is not offering enough, declining...');

                const reasons = wrongAboutOffer.map(wrong => wrong.reason);
                const uniqueReasons = reasons.filter(reason => reasons.includes(reason));

                return {
                    action: 'decline',
                    reason: '🟥_INVALID_VALUE',
                    meta: {
                        uniqueReasons: uniqueReasons,
                        reasons: wrongAboutOffer
                    }
                };
            }
        }

        if (exchange.our.value < exchange.their.value && process.env.ALLOW_OVERPAY === 'false') {
            offer.log('info', 'is offering more than needed, declining...');
            return { action: 'decline', reason: 'OVERPAY' };
        }

        // TODO: If we are receiving items, mark them as pending and use it to check overstock / understock for new offers

        offer.log('info', 'checking escrow...');

        try {
            const hasEscrow = await this.bot.checkEscrow(offer);

            if (hasEscrow) {
                offer.log('info', 'would be held if accepted, declining...');
                return { action: 'decline', reason: 'ESCROW' };
            }
        } catch (err) {
            log.warn('Failed to check escrow: ', err);
            wrongAboutOffer.push({
                reason: '⬜_ESCROW_CHECK_FAILED'
            });
            const reasons = wrongAboutOffer.map(wrong => wrong.reason);
            const uniqueReasons = reasons.filter(reason => reasons.includes(reason));

            return {
                action: 'skip',
                reason: '⬜_ESCROW_CHECK_FAILED',
                meta: {
                    uniqueReasons: uniqueReasons,
                    reasons: wrongAboutOffer
                }
            };
        }

        offer.log('info', 'checking bans...');

        try {
            const isBanned = await this.bot.checkBanned(offer.partner.getSteamID64());

            if (isBanned) {
                offer.log('info', 'partner is banned in one or more communities, declining...');
                return { action: 'decline', reason: 'BANNED' };
            }
        } catch (err) {
            log.warn('Failed to check banned: ', err);
            wrongAboutOffer.push({
                reason: '⬜_BANNED_CHECK_FAILED'
            });
            const reasons = wrongAboutOffer.map(wrong => wrong.reason);
            const uniqueReasons = reasons.filter(reason => reasons.includes(reason));

            return {
                action: 'skip',
                reason: '⬜_BANNED_CHECK_FAILED',
                meta: {
                    uniqueReasons: uniqueReasons,
                    reasons: wrongAboutOffer
                }
            };
        }

        if (this.dupeCheckEnabled && assetidsToCheck.length > 0) {
            offer.log('info', 'checking ' + pluralize('item', assetidsToCheck.length, true) + ' for dupes...');
            const inventory = new TF2Inventory(offer.partner, this.bot.manager);

            const requests = assetidsToCheck.map(assetid => {
                return (callback: (err: Error | null, result: boolean | null) => void): void => {
                    log.debug('Dupe checking ' + assetid + '...');
                    Promise.resolve(inventory.isDuped(assetid)).asCallback(function(err, result) {
                        log.debug('Dupe check for ' + assetid + ' done');
                        callback(err, result);
                    });
                };
            });

            try {
                const result: (boolean | null)[] = await Promise.fromCallback(function(callback) {
                    async.series(requests, callback);
                });

                log.debug('Got result from dupe checks on ' + assetidsToCheck.join(', '), { result: result });

                // Decline by default
                const declineDupes = process.env.DECLINE_DUPES !== 'false';

                for (let i = 0; i < result.length; i++) {
                    if (result[i] === true) {
                        // Found duped item
                        if (declineDupes) {
                            // Offer contains duped items, decline it
                            return {
                                action: 'decline',
                                reason: '🟫_DUPED_ITEMS',
                                meta: { assetids: assetidsToCheck, result: result }
                            };
                        } else {
                            // Offer contains duped items but we don't decline duped items, instead add it to the wrong about offer list and continue
                            wrongAboutOffer.push({
                                reason: '🟫_DUPED_ITEMS',
                                assetid: assetidsToCheck[i]
                            });
                        }
                    } else if (result[i] === null) {
                        // Could not determine if the item was duped, make the offer be pending for review
                        wrongAboutOffer.push({
                            reason: '🟪_DUPE_CHECK_FAILED',
                            assetid: assetidsToCheck[i]
                        });
                    }
                }
            } catch (err) {
                log.warn('Failed dupe check on ' + assetidsToCheck.join(', ') + ': ' + err.message);
                wrongAboutOffer.push({
                    reason: '🟪_DUPE_CHECK_FAILED',
                    error: err.message
                });
            }
        }

        // TO DO: Counter offer?

        if (wrongAboutOffer.length !== 0) {
            const reasons = wrongAboutOffer.map(wrong => wrong.reason);
            const uniqueReasons = reasons.filter(reason => reasons.includes(reason));

            const env = this.fromEnv;

            const acceptingCondition =
                env.givePrice || env.autoAcceptOverpay.overstocked || env.autoAcceptOverpay.understocked
                    ? exchange.our.value < exchange.their.value
                    : !env.givePrice
                    ? exchange.our.value <= exchange.their.value
                    : false;

            const isInvalidValue = uniqueReasons.includes('🟥_INVALID_VALUE');
            const isInvalidItem = uniqueReasons.includes('🟨_INVALID_ITEMS');
            const isOverstocked = uniqueReasons.includes('🟦_OVERSTOCKED');
            const isUnderstocked = uniqueReasons.includes('🟩_UNDERSTOCKED');
            const isDupedItem = uniqueReasons.includes('🟫_DUPED_ITEMS');
            const isDupedCheckFailed = uniqueReasons.includes('🟪_DUPE_CHECK_FAILED');

            if (
                ((isInvalidItem && env.autoAcceptOverpay.invalidItem) ||
                    (isOverstocked && env.autoAcceptOverpay.overstocked) ||
                    (isUnderstocked && env.autoAcceptOverpay.understocked)) &&
                !(isInvalidValue || isDupedItem || isDupedCheckFailed) &&
                acceptingCondition &&
                exchange.our.value !== 0
            ) {
                offer.log(
                    'trade',
                    `contains invalid items/overstocked, but offer more or equal value, accepting. Summary:\n${offer.summarize(
                        this.bot.schema
                    )}`
                );

                const isManyItems = offer.itemsToGive.length + offer.itemsToReceive.length > 50;

                if (isManyItems) {
                    this.bot.sendMessage(
                        offer.partner,
                        'I have accepted your offer and the trade will take a while to complete since it is quite a big offer.' +
                            ' If the trade did not complete after 5-10 minutes had passed, please send your offer again or add me and use !sell/!sellcart or !buy/!buycart command.'
                    );
                } else {
                    this.bot.sendMessage(
                        offer.partner,
                        'I have accepted your offer and the trade will be completed in seconds.' +
                            ' If the trade did not complete after 1-2 minutes had passed, please send your offer again or add me and use !sell/!sellcart or !buy/!buycart command.'
                    );
                }

                return {
                    action: 'accept',
                    reason: 'VALID_WITH_OVERPAY',
                    meta: {
                        uniqueReasons: uniqueReasons,
                        reasons: wrongAboutOffer,
                        hasHighValueItems: {
                            our: hasHighValueOur,
                            their: hasHighValueTheir
                        },
                        highValueItems: {
                            our: highValuedOur,
                            their: highValuedTheir
                        }
                    }
                };
            } else if (
                env.autoDecline.invalidValue &&
                isInvalidValue &&
                !(isUnderstocked || isInvalidItem || isOverstocked || isDupedItem || isDupedCheckFailed) &&
                this.hasInvalidValueException === false
            ) {
                // If only INVALID_VALUE and did not matched exception value, will just decline the trade.
                return { action: 'decline', reason: 'ONLY_INVALID_VALUE' };
            } else if (
                env.autoDecline.overstocked &&
                isOverstocked &&
                !(isInvalidItem || isDupedItem || isDupedCheckFailed)
            ) {
                // If only OVERSTOCKED and Auto-decline OVERSTOCKED enabled, will just decline the trade.
                return { action: 'decline', reason: 'ONLY_OVERSTOCKED' };
            } else if (
                env.autoDecline.understocked &&
                isUnderstocked &&
                !(isInvalidItem || isDupedItem || isDupedCheckFailed)
            ) {
                // If only UNDERSTOCKED and Auto-decline UNDERSTOCKED enabled, will just decline the trade.
                return { action: 'decline', reason: 'ONLY_UNDERSTOCKED' };
            } else {
                offer.log('info', `offer needs review (${uniqueReasons.join(', ')}), skipping...`);
                const reviewMeta = {
                    uniqueReasons: uniqueReasons,
                    reasons: wrongAboutOffer,
                    hasHighValueItems: {
                        our: hasHighValueOur,
                        their: hasHighValueTheir
                    },
                    highValueItems: {
                        our: highValuedOur,
                        their: highValuedTheir
                    }
                };

                offer.data('reviewMeta', reviewMeta);

                return {
                    action: 'skip',
                    reason: 'REVIEW',
                    meta: reviewMeta
                };
            }
        }

        offer.log('trade', `accepting. Summary:\n${offer.summarize(this.bot.schema)}`);

        const isManyItems = offer.itemsToGive.length + offer.itemsToReceive.length > 50;

        if (isManyItems) {
            this.bot.sendMessage(
                offer.partner,
                'I have accepted your offer and the trade will take a while to complete since it is quite a big offer.' +
                    ' If the trade did not complete after 5-10 minutes had passed, please send your offer again or add me and use !sell/!sellcart or !buy/!buycart command.'
            );
        } else {
            this.bot.sendMessage(
                offer.partner,
                'I have accepted your offer and the trade will be completed in seconds.' +
                    ' If the trade did not complete after 1-2 minutes had passed, please send your offer again or add me and use !sell/!sellcart or !buy/!buycart command.'
            );
        }

        return {
            action: 'accept',
            reason: 'VALID',
            meta: {
                hasHighValueItems: {
                    our: hasHighValueOur,
                    their: hasHighValueTheir
                },
                highValueItems: {
                    our: highValuedOur,
                    their: highValuedTheir
                }
            }
        };
    }

    // TODO: checkBanned and checkEscrow are copied from UserCart, don't duplicate them

    onTradeOfferChanged(offer: TradeOffer, oldState: number): void {
        // Not sure if it can go from other states to active
        if (oldState === TradeOfferManager.ETradeOfferState.Accepted) {
            offer.data('switchedState', oldState);
        }

        let hasHighValue = false;

        const handledByUs = offer.data('handledByUs') === true;
        const notify = offer.data('notify') === true;

        if (handledByUs && offer.data('switchedState') !== offer.state) {
            if (notify) {
                if (offer.state === TradeOfferManager.ETradeOfferState.Accepted) {
                    this.bot.sendMessage(
                        offer.partner,
                        process.env.CUSTOM_SUCCESS_MESSAGE
                            ? process.env.CUSTOM_SUCCESS_MESSAGE
                            : '/pre ✅ Success! The offer went through successfully.'
                    );
                } else if (offer.state === TradeOfferManager.ETradeOfferState.InEscrow) {
                    this.bot.sendMessage(
                        offer.partner,
                        '✅ Success! The offer went through successfully, but you will receive your items after several days. ' +
                            'Please use Steam Guard Mobile Authenticator so you will no longer need to wait like this in the future.' +
                            '\nRead:\n' +
                            '• Steam Guard Mobile Authenticator - https://support.steampowered.com/kb_article.php?ref=8625-WRAH-9030' +
                            '\n• How to set up a Steam Guard Mobile Authenticator - https://support.steampowered.com/kb_article.php?ref=4440-RTUI-9218'
                    );
                } else if (offer.state === TradeOfferManager.ETradeOfferState.Declined) {
                    const offerReason: { reason: string; meta: UnknownDictionary<any> } = offer.data('action');
                    const keyPrices = this.bot.pricelist.getKeyPrices();
                    const value = this.valueDiff(offer, keyPrices);
                    const manualReviewDisabled = process.env.ENABLE_MANUAL_REVIEW === 'false';

                    let reasonForInvalidValue = false;
                    let reason: string;
                    if (!offerReason) {
                        reason = '';
                    } else if (offerReason.reason === 'GIFT_NO_NOTE') {
                        reason = `the offer you've sent is an empty offer on my side without any offer message. If you wish to give it as a gift, please include "gift" in the offer message. Thank you.`;
                    } else if (offerReason.reason === 'CRIME_ATTEMPT') {
                        reason = "you're taking free items. No.";
                    } else if (offerReason.reason === 'DUELING_NOT_5_USES') {
                        reason = 'your offer contains a Dueling Mini-Game that does not have 5 uses.';
                    } else if (offerReason.reason === 'NOISE_MAKER_NOT_25_USES') {
                        reason = 'your offer contains a Noise Maker that does not have 25 uses.';
                    } else if (offerReason.reason === 'HIGH_VALUE_ITEMS_NOT_SELLING') {
                        reason = `you're taking ${offerReason.meta.highValueName.join(
                            ', '
                        )}, and I am not selling it right now.`;
                    } else if (offerReason.reason === 'NOT_TRADING_KEYS') {
                        reason =
                            'I am no longer trading keys. You can confirm this by typing "!price Mann Co. Supply Crate Key" or "!autokeys".';
                    } else if (offerReason.reason === 'NOT_SELLING_KEYS') {
                        reason =
                            'I am no longer selling keys. You can confirm this by typing "!price Mann Co. Supply Crate Key" or "!autokeys".';
                    } else if (offerReason.reason === 'NOT_BUYING_KEYS') {
                        reason =
                            'I am no longer buying keys. You can confirm this by typing "!price Mann Co. Supply Crate Key" or "!autokeys".';
                    } else if (offerReason.reason === 'BANNED') {
                        reason =
                            "you're currently banned on backpack.tf or marked SCAMMER on steamrep.com or another community.";
                    } else if (offerReason.reason === 'ESCROW') {
                        reason =
                            'I do not accept escrow (trade hold). Please use Steam Guard Mobile Authenticator so you will be able to trade instantly in the future.' +
                            '\nRead:\n' +
                            '• Steam Guard Mobile Authenticator - https://support.steampowered.com/kb_article.php?ref=8625-WRAH-9030' +
                            '\n• How to set up Steam Guard Mobile Authenticator - https://support.steampowered.com/kb_article.php?ref=4440-RTUI-9218';
                    } else if (
                        offerReason.reason === 'ONLY_INVALID_VALUE' ||
                        (offerReason.reason === '🟥_INVALID_VALUE' && manualReviewDisabled)
                    ) {
                        reasonForInvalidValue = true;
                        reason =
                            "you've sent a trade with an invalid value (your side and my side do not hold equal value).";
                    } else if (
                        offerReason.reason === 'ONLY_OVERSTOCKED' ||
                        (offerReason.reason === '🟦_OVERSTOCKED' && manualReviewDisabled)
                    ) {
                        reasonForInvalidValue = value.diffRef !== 0 ? true : false;
                        reason = "you're offering some item(s) that I can't buy more than I could.";
                    } else if (
                        offerReason.reason === 'ONLY_UNDERSTOCKED' ||
                        (offerReason.reason === '🟩_UNDERSTOCKED' && manualReviewDisabled)
                    ) {
                        reasonForInvalidValue = value.diffRef !== 0 ? true : false;
                        reason = "you're taking some item(s) that I can't sell more than I could.";
                    } else if (offerReason.reason === '🟫_DUPED_ITEMS') {
                        reason = "I don't accept duped items.";
                    } else {
                        reason = '';
                    }

                    const invalidValueSummary =
                        '\n\nSummary:\n' +
                        offer
                            .summarize(this.bot.schema)
                            .replace('Asked', '  My side')
                            .replace('Offered', 'Your side') +
                        "\n[You're missing: " +
                        (value.diffRef > keyPrices.sell.toValue() ? `${value.diffKey}]` : `${value.diffRef} ref]`) +
                        `${
                            process.env.AUTO_DECLINE_INVALID_VALUE_NOTE
                                ? '\n\nNote from owner: ' + process.env.AUTO_DECLINE_INVALID_VALUE_NOTE
                                : ''
                        }`;

                    this.bot.sendMessage(
                        offer.partner,
                        process.env.CUSTOM_DECLINED_MESSAGE
                            ? process.env.CUSTOM_DECLINED_MESSAGE.replace(/%reason%/g, reason).replace(
                                  /%invalid_value_summary%/g,
                                  invalidValueSummary
                              )
                            : `/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined${
                                  reason ? ` because ${reason}` : '.'
                              }` + (reasonForInvalidValue ? invalidValueSummary : '')
                    );
                } else if (offer.state === TradeOfferManager.ETradeOfferState.Canceled) {
                    let reason: string;

                    if (offer.data('canceledByUser') === true) {
                        reason = 'Offer was canceled by user';
                    } else if (oldState === TradeOfferManager.ETradeOfferState.CreatedNeedsConfirmation) {
                        reason = 'Failed to accept mobile confirmation';
                    } else {
                        reason =
                            "The offer has been active for a while. If the offer was just created, this is likely an issue on Steam's end. Please try again later";
                    }

                    this.bot.sendMessage(
                        offer.partner,
                        '/pre ❌ Ohh nooooes! The offer is no longer available. Reason: ' + reason + '.'
                    );
                } else if (offer.state === TradeOfferManager.ETradeOfferState.InvalidItems) {
                    this.bot.sendMessage(
                        offer.partner,
                        process.env.CUSTOM_TRADED_AWAY_MESSAGE
                            ? process.env.CUSTOM_TRADED_AWAY_MESSAGE
                            : '/pre ❌ Ohh nooooes! Your offer is no longer available. Reason: Items not available (traded away in a different trade).'
                    );
                }
            }

            if (offer.state === TradeOfferManager.ETradeOfferState.Accepted) {
                // Only run this if the bot handled the offer

                offer.data('isAccepted', true);

                offer.log('trade', 'has been accepted.');

                // Auto sell and buy keys if ref < minimum

                this.autokeys.check();

                const autokeys = {
                    isEnabled: this.autokeys.isEnabled,
                    isActive: this.autokeys.isActive,
                    isBuying: this.autokeys.status.isBuyingKeys,
                    isBanking: this.autokeys.status.isBankingKeys
                };

                this.autokeysStatus = {
                    isActive: autokeys.isActive,
                    isBuying: autokeys.isBuying,
                    isBanking: autokeys.isBanking
                };

                const pureStock = this.pureStock();
                const timeWithEmojis = this.timeWithEmoji();
                const links = this.tradePartnerLinks(offer.partner.toString());
                const itemsList = this.itemList(offer);
                const currentItems = this.bot.inventoryManager.getInventory().getTotalItems();

                const accepted: {
                    invalidItems: string[];
                    overstocked: string[];
                    understocked: string[];
                    highValue: string[];
                } = {
                    invalidItems: [],
                    overstocked: [],
                    understocked: [],
                    highValue: []
                };

                const offerMeta: { reason: string; meta: UnknownDictionary<any> } = offer.data('action');
                const offerMade: { nameWithSpell: string[] } = offer.data('highValue');

                if (offerMeta) {
                    // doing this because if an offer is being made by bot (from command), then this is undefined
                    if (offerMeta.reason === 'VALID_WITH_OVERPAY' || offerMeta.reason === 'MANUAL') {
                        // only for accepted overpay with INVALID_ITEMS/OVERSTOCKED/UNDERSTOCKED offer
                        if (offerMeta.meta.uniqueReasons.includes('🟨_INVALID_ITEMS')) {
                            // doing this so it will only executed if includes 🟨_INVALID_ITEMS reason.

                            const invalid = offerMeta.meta.reasons.filter(el => el.reason.includes('🟨_INVALID_ITEMS'));
                            invalid.forEach(el => {
                                const name = this.bot.schema.getName(SKU.fromString(el.sku), false);
                                accepted.invalidItems.push(name + ' - ' + el.price);
                            });
                        }

                        if (offerMeta.meta.uniqueReasons.includes('🟦_OVERSTOCKED')) {
                            // doing this so it will only executed if includes 🟦_OVERSTOCKED reason.

                            const invalid = offerMeta.meta.reasons.filter(el => el.reason.includes('🟦_OVERSTOCKED'));
                            invalid.forEach(el => {
                                const name = this.bot.schema.getName(SKU.fromString(el.sku), false);
                                accepted.overstocked.push(name + ' (amount can buy was ' + el.amountCanTrade + ')');
                            });
                        }

                        if (offerMeta.meta.uniqueReasons.includes('🟩_UNDERSTOCKED')) {
                            // doing this so it will only executed if includes 🟩_UNDERSTOCKED reason.

                            const invalid = offerMeta.meta.reasons.filter(el => el.reason.includes('🟩_UNDERSTOCKED'));
                            invalid.forEach(el => {
                                const name = this.bot.schema.getName(SKU.fromString(el.sku), false);
                                accepted.understocked.push(name + ' (amount can sell was ' + el.amountCanTrade + ')');
                            });
                        }
                    }

                    if (offerMeta.meta && offerMeta.meta.hasHighValueItems) {
                        if (offerMeta.meta.hasHighValueItems.their) {
                            hasHighValue = true;
                            // doing this to check if their side have any high value items, if so, push each name into accepted.highValue const.
                            offerMeta.meta.highValueItems.their.nameWithSpell.forEach(name => {
                                accepted.highValue.push(name);
                            });
                        }

                        if (offerMeta.meta.hasHighValueItems.our) {
                            hasHighValue = true;
                            // doing this to check if our side have any high value items, if so, push each name into accepted.highValue const.
                            offerMeta.meta.highValueItems.our.nameWithSpell.forEach(name => {
                                accepted.highValue.push(name);
                            });
                        }
                    }
                } else if (offerMade) {
                    // This is for offer that bot created from commands
                    if (offerMade.nameWithSpell.length > 0) {
                        hasHighValue = true;
                        offerMade.nameWithSpell.forEach(name => {
                            accepted.highValue.push(name);
                        });
                    }
                }

                const keyPrices = this.bot.pricelist.getKeyPrices();
                const value = this.valueDiff(offer, keyPrices);

                if (
                    process.env.DISABLE_DISCORD_WEBHOOK_TRADE_SUMMARY === 'false' &&
                    this.discord.tradeSummaryLinks.length !== 0
                ) {
                    this.discord.sendTradeSummary(
                        offer,
                        autokeys,
                        currentItems,
                        this.backpackSlots,
                        accepted,
                        keyPrices,
                        value,
                        itemsList,
                        links,
                        timeWithEmojis.time
                    );
                } else {
                    this.bot.messageAdmins(
                        'trade',
                        `/me Trade #${offer.id} with ${offer.partner.getSteamID64()} is accepted. ✅` +
                            summarizeSteamChat(offer.summarize(this.bot.schema), value, keyPrices) +
                            (accepted.invalidItems.length !== 0
                                ? '\n\n🟨_INVALID_ITEMS:\n- ' + accepted.invalidItems.join(',\n- ')
                                : '') +
                            (accepted.overstocked.length !== 0
                                ? (accepted.invalidItems.length !== 0 ? '\n\n' : '') +
                                  '🟦_OVERSTOCKED:\n- ' +
                                  accepted.overstocked.join(',\n- ')
                                : '') +
                            (accepted.understocked.length !== 0
                                ? (accepted.overstocked.length !== 0 || accepted.invalidItems.length !== 0
                                      ? '\n\n'
                                      : '') +
                                  '🟩_UNDERSTOCKED:\n- ' +
                                  accepted.understocked.join(',\n- ')
                                : '') +
                            (accepted.highValue.length !== 0
                                ? (accepted.overstocked.length !== 0 ||
                                  accepted.invalidItems.length !== 0 ||
                                  accepted.understocked.length !== 0
                                      ? '\n\n'
                                      : '') +
                                  '🔶_HIGH_VALUE_ITEMS:\n- ' +
                                  accepted.highValue.join(',\n- ')
                                : '') +
                            `\n🔑 Key rate: ${keyPrices.buy.metal.toString()}/${keyPrices.sell.metal.toString()} ref` +
                            `${
                                autokeys.isEnabled
                                    ? ' | Autokeys: ' +
                                      (autokeys.isActive
                                          ? '✅' +
                                            (autokeys.isBanking
                                                ? ' (banking)'
                                                : autokeys.isBuying
                                                ? ' (buying)'
                                                : ' (selling)')
                                          : '🛑')
                                    : ''
                            }` +
                            `\n💰 Pure stock: ${pureStock.join(', ').toString()}` +
                            `\n🎒 Total items: ${currentItems}`,
                        []
                    );
                }
            }
        }

        if (offer.state === TradeOfferManager.ETradeOfferState.Accepted) {
            // Offer is accepted

            // Smelt / combine metal
            this.keepMetalSupply();

            // Craft duplicated weapons
            this.craftDuplicateWeapons();

            this.classWeaponsTimeout = setTimeout(() => {
                // called after 2 minutes to craft metals and duplicated weapons first.
                this.craftClassWeapons();
            }, 2 * 60 * 1000);

            // Sort inventory
            this.sortInventory();

            // Update listings
            const diff = offer.getDiff() || {};

            for (const sku in diff) {
                if (!Object.prototype.hasOwnProperty.call(diff, sku)) {
                    continue;
                }

                // Update listings
                this.bot.listings.checkBySKU(sku);

                const item = SKU.fromString(sku);
                const name = this.bot.schema.getName(item, false);

                // Request priceheck on each sku involved in the trade, except craft weapons,
                // and pure.
                if (
                    !(
                        this.weapon().craft.includes(sku) ||
                        this.weapon().uncraft.includes(sku) ||
                        ['5021;6', '5000;6', '5001;6', '5002;6'].includes(sku)
                    )
                ) {
                    requestCheck(sku, 'bptf').asCallback((err, body) => {
                        if (err) {
                            log.warn(
                                '❌ Failed to request pricecheck for ' +
                                    `${name} (${sku})` +
                                    ': ' +
                                    (err.body && err.body.message ? err.body.message : err.message)
                            );
                        } else {
                            log.debug(`✅ Requested pricecheck for ${body.name} (${sku}).`);
                        }
                    });
                }

                // Automatically add any INVALID_ITEMS to sell, excluding any item name
                // that have War Paint (could be skins)

                const currentStock = this.bot.inventoryManager.getInventory().getAmount(sku);
                const inPrice = this.bot.pricelist.getPrice(sku, false);

                if (
                    inPrice === null &&
                    !(
                        this.weapon().craft.includes(sku) ||
                        this.weapon().uncraft.includes(sku) ||
                        ['5021;6', '5000;6', '5001;6', '5002;6'].includes(sku)
                    ) &&
                    item.wear === null &&
                    !hasHighValue &&
                    !this.bot.isAdmin(offer.partner)
                ) {
                    // if the item sku is not in pricelist, not craftweapons or pure or skins or highValue items, and not
                    // from ADMINS, then add INVALID_ITEMS to the pricelist.
                    const entry = {
                        sku: sku,
                        enabled: true,
                        autoprice: true,
                        min: 0,
                        max: 1,
                        intent: 1
                    } as any;

                    this.bot.pricelist
                        .addPrice(entry as EntryData, false)
                        .then(data => {
                            log.debug(`✅ Automatically added ${name} (${sku}) to sell.`);
                            this.bot.listings.checkBySKU(data.sku, data);
                        })
                        .catch(err => {
                            log.warn(`❌ Failed to add ${name} (${sku}) sell automatically: ${err.message}`);
                        });
                } else if (
                    this.fromEnv.autoRemoveIntentSell &&
                    inPrice !== null &&
                    inPrice.intent === 1 &&
                    currentStock < 1
                ) {
                    // If automatic remove items with intent=sell enabled and it's in the pricelist and no more stock,
                    // then remove the item entry from pricelist.
                    this.bot.pricelist
                        .removePrice(sku, false)
                        .then(() => {
                            log.debug(`✅ Automatically removed ${name} (${sku}) from pricelist.`);
                        })
                        .catch(err => {
                            log.warn(`❌ Failed to remove ${name} (${sku}) from pricelist: ${err.message}`);
                        });
                }
            }

            this.inviteToGroups(offer.partner);
        }
    }

    onOfferAction(
        offer: TradeOffer,
        action: 'accept' | 'decline' | 'skip',
        reason: string,
        meta: UnknownDictionary<any>
    ): void {
        const notify = offer.data('notify') === true;
        if (!notify) {
            return;
        }

        const keyPrices = this.bot.pricelist.getKeyPrices();
        const pureStock = this.pureStock();
        const value = this.valueDiff(offer, keyPrices);
        const timeWithEmojis = this.timeWithEmoji();
        const links = this.tradePartnerLinks(offer.partner.toString());

        if (action === 'skip') {
            // Offer review note
            let note: string;
            const reviewReasons: string[] = [];

            // for INVALID_VALUE
            let missingPureNote: string;

            const reasons = meta.uniqueReasons;
            const wrong = meta.reasons;

            // for 🟨_INVALID_ITEMS
            const invalidForTheir: string[] = []; // Display for trade partner
            const invalidForOur: string[] = []; // Display for owner

            if (reasons.includes('🟨_INVALID_ITEMS')) {
                const invalid = wrong.filter(el => el.reason.includes('🟨_INVALID_ITEMS'));

                invalid.forEach(el => {
                    const name = this.bot.schema.getName(SKU.fromString(el.sku), false);
                    invalidForTheir.push(name); // only show to trade partner the item name
                    invalidForOur.push(name + ' - ' + el.price); // show both item name and prices.tf price
                });

                note = process.env.INVALID_ITEMS_NOTE
                    ? `🟨_INVALID_ITEMS - ${process.env.INVALID_ITEMS_NOTE}`
                          .replace(/%name%/g, invalidForTheir.join(', '))
                          .replace(/%isName%/, pluralize('is', invalidForTheir.length))
                    : `🟨_INVALID_ITEMS - ${invalidForTheir.join(', ')} ${pluralize(
                          'is',
                          invalidForTheir.length
                      )} not in my pricelist.`;
                // Default note: %name% is|are not in my pricelist.

                reviewReasons.push(note);
            }

            // for 🟦_OVERSTOCKED
            const overstockedForTheir: string[] = [];
            const overstockedForOur: string[] = [];

            if (reasons.includes('🟦_OVERSTOCKED')) {
                const overstock = wrong.filter(el => el.reason.includes('🟦_OVERSTOCKED'));

                overstock.forEach(el => {
                    const name = this.bot.schema.getName(SKU.fromString(el.sku), false);
                    overstockedForTheir.push(el.amountCanTrade + ' - ' + name);
                    overstockedForOur.push(name + ' (can only buy ' + el.amountCanTrade + ')');
                });

                note = process.env.OVERSTOCKED_NOTE
                    ? `🟦_OVERSTOCKED - ${process.env.OVERSTOCKED_NOTE}`
                          .replace(/%name%/g, overstockedForTheir.join(', ')) // %name% here will include amountCanTrade value
                          .replace(/%isName%/, pluralize('is', overstockedForTheir.length))
                    : `🟦_OVERSTOCKED - I can only buy ${overstockedForTheir.join(', ')} right now.`;
                // Default note: I can only buy %amountCanTrade% - %name% right now.

                reviewReasons.push(note);
            }

            // for 🟩_UNDERSTOCKED
            const understockedForTheir: string[] = [];
            const understockedForOur: string[] = [];

            if (reasons.includes('🟩_UNDERSTOCKED')) {
                const understocked = wrong.filter(el => el.reason.includes('🟩_UNDERSTOCKED'));

                understocked.forEach(el => {
                    const name = this.bot.schema.getName(SKU.fromString(el.sku), false);
                    understockedForTheir.push(el.amountCanTrade + ' - ' + name);
                    understockedForOur.push(name + ' (can only sell ' + el.amountCanTrade + ')');
                });

                note = process.env.UNDERSTOCKED_NOTE
                    ? `🟩_UNDERSTOCKED - ${process.env.UNDERSTOCKED_NOTE}`
                          .replace(/%name%/g, understockedForTheir.join(', ')) // %name% here will include amountCanTrade value
                          .replace(/%isName%/, pluralize('is', understockedForTheir.length))
                    : `🟩_UNDERSTOCKED - I can only sell ${understockedForTheir.join(', ')} right now.`;
                // Default note: I can only sell %amountCanTrade% - %name% right now.

                reviewReasons.push(note);
            }

            // for 🟫_DUPED_ITEMS
            const dupedItemsName: string[] = [];

            if (reasons.includes('🟫_DUPED_ITEMS')) {
                const duped = wrong.filter(el => el.reason.includes('🟫_DUPED_ITEMS'));

                duped.forEach(el => {
                    const name = this.bot.schema.getName(SKU.fromString(el.sku), false);
                    dupedItemsName.push(name);
                });

                note = process.env.DUPE_ITEMS_NOTE
                    ? `🟫_DUPED_ITEMS - ${process.env.DUPE_ITEMS_NOTE}`
                          .replace(/%name%/g, dupedItemsName.join(', '))
                          .replace(/%isName%/, pluralize('is', dupedItemsName.length))
                    : `🟫_DUPED_ITEMS - ${dupedItemsName.join(', ')} ${pluralize(
                          'is',
                          dupedItemsName.length
                      )} appeared to be duped.`;
                // Default note: %name% is|are appeared to be duped.

                reviewReasons.push(note);
            }

            // for 🟪_DUPE_CHECK_FAILED
            const dupedFailedItemsName: string[] = [];

            if (reasons.includes('🟪_DUPE_CHECK_FAILED')) {
                const dupedFailed = wrong.filter(el => el.reason.includes('🟫_DUPED_ITEMS'));

                dupedFailed.forEach(el => {
                    const name = this.bot.schema.getName(SKU.fromString(el.sku), false);
                    dupedFailedItemsName.push(name);
                });

                note = process.env.DUPE_CHECK_FAILED_NOTE
                    ? `🟪_DUPE_CHECK_FAILED - ${process.env.DUPE_CHECK_FAILED_NOTE}`
                          .replace(/%name%/g, dupedFailedItemsName.join(', '))
                          .replace(/%isName%/, pluralize('is', dupedFailedItemsName.length))
                    : `🟪_DUPE_CHECK_FAILED - I failed to check for duped on ${dupedFailedItemsName.join(', ')}.`;
                // Default note: I failed to check for duped on %name%.

                reviewReasons.push(note);
            }

            if (reasons.includes('🟥_INVALID_VALUE') && !reasons.includes('🟨_INVALID_ITEMS')) {
                note = process.env.INVALID_VALUE_NOTE
                    ? `🟥_INVALID_VALUE - ${process.env.INVALID_VALUE_NOTE}`
                    : "🟥_INVALID_VALUE - You're taking too much in value.";

                reviewReasons.push(note);
                missingPureNote =
                    "\n[You're missing: " +
                    (value.diffRef > keyPrices.sell.toValue() ? `${value.diffKey}]` : `${value.diffRef} ref]`);
            }

            const highValueItems: string[] = [];
            if (meta) {
                if (meta.hasHighValueItems) {
                    const hasHighValue = meta.hasHighValueItems.their;

                    if (hasHighValue) {
                        meta.highValueItems.their.nameWithSpell.forEach(name => {
                            highValueItems.push(name);
                        });
                    }
                }
            }

            const hasCustomNote =
                process.env.INVALID_ITEMS_NOTE ||
                process.env.OVERSTOCKED_NOTE ||
                process.env.UNDERSTOCKED_NOTE ||
                process.env.DUPE_ITEMS_NOTE ||
                process.env.DUPE_CHECK_FAILED_NOTE
                    ? true
                    : false;

            // Notify partner and admin that the offer is waiting for manual review
            if (reasons.includes('⬜_BANNED_CHECK_FAILED') || reasons.includes('⬜_ESCROW_CHECK_FAILED')) {
                this.bot.sendMessage(
                    offer.partner,
                    (reasons.includes('⬜_BANNED_CHECK_FAILED') ? 'Backpack.tf or steamrep.com' : 'Steam') +
                        ' is down and I failed to check your ' +
                        (reasons.includes('⬜_BANNED_CHECK_FAILED') ? 'backpack.tf/steamrep' : 'Escrow (Trade holds)') +
                        ' status, please wait for my owner to manually accept/decline your offer.'
                );
            } else {
                this.bot.sendMessage(
                    offer.partner,
                    `⚠️ Your offer is waiting for review.\nReasons: ${reasons.join(', ')}` +
                        (process.env.DISABLE_SHOW_REVIEW_OFFER_SUMMARY !== 'true'
                            ? '\n\nYour offer summary:\n' +
                              offer
                                  .summarize(this.bot.schema)
                                  .replace('Asked', '  My side')
                                  .replace('Offered', 'Your side') +
                              (reasons.includes('🟥_INVALID_VALUE') && !reasons.includes('🟨_INVALID_ITEMS')
                                  ? missingPureNote
                                  : '') +
                              (process.env.DISABLE_REVIEW_OFFER_NOTE !== 'true'
                                  ? `\n\nNote:\n${reviewReasons.join('\n') +
                                        (hasCustomNote ? '' : '\n\nPlease wait for a response from an owner.')}`
                                  : '')
                            : '') +
                        (process.env.ADDITIONAL_NOTE
                            ? '\n\n' +
                              process.env.ADDITIONAL_NOTE.replace(
                                  /%keyRate%/g,
                                  `${keyPrices.sell.metal.toString()} ref`
                              ).replace(/%pureStock%/g, pureStock.join(', ').toString())
                            : '') +
                        (process.env.DISABLE_SHOW_CURRENT_TIME !== 'true'
                            ? `\n\nMy owner time is currently at ${timeWithEmojis.emoji} ${timeWithEmojis.time +
                                  (timeWithEmojis.note !== '' ? `. ${timeWithEmojis.note}.` : '.')}`
                            : '')
                );
            }

            const items = {
                invalid: invalidForOur,
                overstock: overstockedForOur,
                understock: understockedForOur,
                duped: dupedItemsName,
                dupedFailed: dupedFailedItemsName,
                highValue: highValueItems
            };

            const list = listItems(items);

            if (
                process.env.DISABLE_DISCORD_WEBHOOK_OFFER_REVIEW === 'false' &&
                process.env.DISCORD_WEBHOOK_REVIEW_OFFER_URL
            ) {
                this.discord.sendOfferReview(
                    offer,
                    reasons.join(', '),
                    timeWithEmojis.time,
                    keyPrices,
                    value,
                    links,
                    items
                );
            } else {
                const offerMessage = offer.message;
                this.bot.messageAdmins(
                    `⚠️ Offer #${offer.id} from ${offer.partner} is waiting for review.` +
                        `\nReasons: ${meta.uniqueReasons.join(', ')}` +
                        (reasons.includes('⬜_BANNED_CHECK_FAILED')
                            ? '\n\nBackpack.tf or steamrep.com down, please manually check if this person is banned before accepting the offer.'
                            : reasons.includes('⬜_ESCROW_CHECK_FAILED')
                            ? '\n\nSteam down, please manually check if this person have escrow.'
                            : '') +
                        summarizeSteamChat(offer.summarize(this.bot.schema), value, keyPrices) +
                        (offerMessage.length !== 0 ? `\n\n💬 Offer message: "${offerMessage}"` : '') +
                        (list !== '-' ? `\n\nItem lists:\n${list}` : '') +
                        `\n\nSteam: ${links.steamProfile}\nBackpack.tf: ${links.backpackTF}\nSteamREP: ${links.steamREP}` +
                        `\n\n🔑 Key rate: ${keyPrices.buy.metal.toString()}/${keyPrices.sell.metal.toString()} ref` +
                        `\n💰 Pure stock: ${pureStock.join(', ').toString()}` +
                        `\n\n⚠️ Send "!accept ${offer.id}" to accept or "!decline ${offer.id}" to decline this offer.`,
                    []
                );
            }
        }
    }

    private keepMetalSupply(): void {
        if (process.env.DISABLE_CRAFTING_METAL === 'true') {
            return;
        }
        const pure = this.currPure();

        // let refined = pure.ref;
        let reclaimed = pure.rec * 3; // Because it was divided by 3
        let scrap = pure.scrap * 9; // Because it was divided by 9

        // const maxRefined = this.maximumRefined;
        const maxReclaimed = this.minimumReclaimed + this.combineThreshold;
        const maxScrap = this.minimumScrap + this.combineThreshold;
        // const minRefined = this.minimumRefined;
        const minReclaimed = this.minimumReclaimed;
        const minScrap = this.minimumScrap;

        let smeltReclaimed = 0;
        let smeltRefined = 0;
        let combineScrap = 0;
        let combineReclaimed = 0;

        if (reclaimed > maxReclaimed) {
            combineReclaimed = Math.ceil((reclaimed - maxReclaimed) / 3);
            // refined += combineReclaimed;
            reclaimed -= combineReclaimed * 3;
        } else if (minReclaimed > reclaimed) {
            smeltRefined = Math.ceil((minReclaimed - reclaimed) / 3);
            reclaimed += smeltRefined * 3;
            // refined -= smeltRefined;
        }

        if (scrap > maxScrap) {
            combineScrap = Math.ceil((scrap - maxScrap) / 3);
            reclaimed += combineScrap;
            scrap -= combineScrap * 3;
        } else if (minScrap > scrap) {
            smeltReclaimed = Math.ceil((minScrap - scrap) / 3);
            scrap += smeltReclaimed * 3;
            reclaimed -= smeltReclaimed;
        }

        // TODO: When smelting metal mark the item as being used, then we won't use it when sending offers

        for (let i = 0; i < combineScrap; i++) {
            this.bot.tf2gc.combineMetal(5000);
        }

        for (let i = 0; i < combineReclaimed; i++) {
            this.bot.tf2gc.combineMetal(5001);
        }

        for (let i = 0; i < smeltRefined; i++) {
            this.bot.tf2gc.smeltMetal(5002);
        }

        for (let i = 0; i < smeltReclaimed; i++) {
            this.bot.tf2gc.smeltMetal(5001);
        }
    }

    private craftDuplicateWeapons(): Promise<void> {
        if (process.env.DISABLE_CRAFTING_WEAPONS === 'true') {
            return;
        }
        const currencies = this.bot.inventoryManager.getInventory().getCurrencies();

        for (const sku of this.weapon().craft) {
            const weapon = currencies[sku].length;

            if (weapon >= 2 && this.bot.pricelist.getPrice(sku, true) === null) {
                // Only craft if duplicated and not exist in pricelist
                const combineWeapon = Math.trunc(weapon / 2);

                for (let i = 0; i < combineWeapon; i++) {
                    // give a little time between each craft job
                    this.bot.tf2gc.combineWeapon(sku);
                }
            }
        }
    }

    private craftClassWeapons(): Promise<void> {
        if (process.env.DISABLE_CRAFTING_WEAPONS === 'true') {
            return;
        }
        const currencies = this.bot.inventoryManager.getInventory().getCurrencies();

        // Scout weapons
        const scout = [
            '45;6', // Force-A-Nature               == Scout/Primary ==
            '220;6', // Shortstop
            '448;6', // Soda Popper
            '772;6', // Baby Face's Blaster
            '1103;6', // Back Scatter
            '46;6', // Bonk! Atomic Punch           == Scout/Secondary ==
            '163;6', // Crit-a-Cola
            '222;6', // Mad Milk
            '449;6', // Winger
            '773;6', // Pretty Boy's Pocket Pistol
            '812;6', // Flying Guillotine
            '44;6', // Sandman                      == Scout/Melee ==
            '221;6', // Holy Mackerel
            '317;6', // Candy Cane
            '325;6', // Boston Basher
            '349;6', // Sun-on-a-Stick
            '355;6', // Fan O'War
            '450;6', // Atomizer
            '648;6' // Wrap Assassin
        ];

        let matched = false;

        for (let i = 0; i < scout.length; i++) {
            // for loop for weapon1
            const sku1 = scout[i];
            const wep1 = currencies[sku1].length;
            // check if that weapon1 only have 1 in inventory AND it's not in pricelist
            const isWep1 = wep1 === 1 && this.bot.pricelist.getPrice(sku1, true) === null;

            for (let j = 1; j < scout.length; j++) {
                // for loop for weapon2 inside for loop weapon1
                const sku2 = scout[j];
                const wep2 = currencies[sku2].length;
                // check if that weapon2 only have 1 in inventory AND it's not in pricelist
                const isWep2 = wep2 === 1 && this.bot.pricelist.getPrice(sku2, true) === null;

                if (sku1 !== sku2 && isWep1 && isWep2) {
                    // if both are different weapons and both wep1 and wep2 conditions are true, call combine function
                    this.bot.tf2gc.combineClassWeapon([sku1, sku2]);
                    // set matched to true, so we break the loop and only craft one match at a time for each class.
                    matched = true;
                    break;
                }
            }
            if (matched) {
                break;
            }
        }

        matched = false;

        // Soldier weapons
        const soldier = [
            '127;6', // Direct Hit                  == Soldier/Primary ==
            '228;6', // Black Box
            '237;6', // Rocket Jumper
            '414;6', // Liberty Launcher
            '441;6', // Cow Mangler 5000
            '513;6', // Original
            '730;6', // Beggar's Bazooka
            '1104;6', // Air Strike
            '129;6', // Buff Banner                 == Soldier/Secondary ==
            '133;6', // Gunboats
            '226;6', // Battalion's Backup
            '354;6', // Concheror
            '415;6', // Reserve Shooter - Shared - Soldier/Pyro
            '442;6', // Righteous Bison
            '1101;6', // B.A.S.E Jumper - Shared - Soldier/Demoman
            '1153;6', // Panic Attack - Shared - Soldier/Pyro/Heavy/Engineer
            '444;6', // Mantreads
            '128;6', // Equalizer                   == Soldier/Melee ==
            '154;6', // Pain Train - Shared - Soldier/Demoman
            '357;6', // Half-Zatoichi - Shared - Soldier/Demoman
            '416;6', // Market Gardener
            '447;6', // Disciplinary Action
            '775;6' // Escape Plan
        ];

        for (let i = 0; i < soldier.length; i++) {
            const sku1 = soldier[i];
            const wep1 = currencies[sku1].length;
            const isWep1 = wep1 === 1 && this.bot.pricelist.getPrice(sku1, true) === null;

            for (let j = 1; j < soldier.length; j++) {
                const sku2 = soldier[j];
                const wep2 = currencies[sku2].length;
                const isWep2 = wep2 === 1 && this.bot.pricelist.getPrice(sku2, true) === null;

                if (sku1 !== sku2 && isWep1 && isWep2) {
                    this.bot.tf2gc.combineClassWeapon([sku1, sku2]);
                    matched = true;
                    break;
                }
            }
            if (matched) {
                break;
            }
        }

        matched = false;

        // Pyro weapons
        const pyro = [
            '40;6', // Backburner                   == Pyro/Primary ==
            '215;6', // Degreaser
            '594;6', // Phlogistinator
            '741;6', // Rainblower
            '1178;6', // Dragon's Fury
            '39;6', // Flare Gun                    == Pyro/Secondary ==
            '351;6', // Detonator
            '595;6', // Manmelter
            '740;6', // Scorch Shot
            '1179;6', // Thermal Thruster
            '1180;6', // Gas Passer
            '415;6', // Reserve Shooter - Shared - Soldier/Pyro
            '1153;6', // Panic Attack - Shared - Soldier/Pyro/Heavy/Engineer
            '38;6', // Axtinguisher                 == Pyro/Melee ==
            '153;6', // Homewrecker
            '214;6', // Powerjack
            '326;6', // Back Scratcher
            '348;6', // Sharpened Volcano Fragment
            '457;6', // Postal Pummeler
            '593;6', // Third Degree
            '739;6', // Lollichop
            '813;6', // Neon Annihilator
            '1181;6' // Hot Hand
        ];

        for (let i = 0; i < pyro.length; i++) {
            const sku1 = pyro[i];
            const wep1 = currencies[sku1].length;
            const isWep1 = wep1 === 1 && this.bot.pricelist.getPrice(sku1, true) === null;

            for (let j = 1; j < pyro.length; j++) {
                const sku2 = pyro[j];
                const wep2 = currencies[sku2].length;
                const isWep2 = wep2 === 1 && this.bot.pricelist.getPrice(sku2, true) === null;

                if (sku1 !== sku2 && isWep1 && isWep2) {
                    this.bot.tf2gc.combineClassWeapon([sku1, sku2]);
                    matched = true;
                    break;
                }
            }
            if (matched) {
                break;
            }
        }

        matched = false;

        // Demomman weapons
        const demoman = [
            '308;6', // Loch-n-Load                 == Demoman/Primary ==
            '405;6', // Ali Baba's Wee Booties
            '608;6', // Bootlegger
            '996;6', // Loose Cannon
            '1151;6', // Iron Bomber
            '130;6', // Scottish Resistance         == Demoman/Secondary ==
            '131;6', // Chargin' Targe
            '265;6', // Sticky Jumper
            '406;6', // Splendid Screen
            '1099;6', // Tide Turner
            '1150;6', // Quickiebomb Launcher
            '1101;6', // B.A.S.E Jumper - Shared - Soldier/Demoman
            '132;6', // Eyelander                   == Demoman/Melee ==
            '172;6', // Scotsman's Skullcutter
            '307;6', // Ullapool Caber
            '327;6', // Claidheamh Mòr
            '404;6', // Persian Persuader
            '482;6', // Nessie's Nine Iron
            '609;6', // Scottish Handshake
            '154;6', // Pain Train - Shared - Soldier/Demoman
            '357;6' // Half-Zatoichi - Shared - Soldier/Demoman
        ];

        for (let i = 0; i < demoman.length; i++) {
            const sku1 = demoman[i];
            const wep1 = currencies[sku1].length;
            const isWep1 = wep1 === 1 && this.bot.pricelist.getPrice(sku1, true) === null;

            for (let j = 1; j < demoman.length; j++) {
                const sku2 = demoman[j];
                const wep2 = currencies[sku2].length;
                const isWep2 = wep2 === 1 && this.bot.pricelist.getPrice(sku2, true) === null;

                if (sku1 !== sku2 && isWep1 && isWep2) {
                    this.bot.tf2gc.combineClassWeapon([sku1, sku2]);
                    matched = true;
                    break;
                }
            }
            if (matched) {
                break;
            }
        }

        matched = false;

        // Heavy weapons
        const heavy = [
            '41;6', // Natascha                     == Heavy/Primary ==
            '312;6', // Brass Beast
            '424;6', // Tomislav
            '811;6', // Huo-Long Heater
            '42;6', // Sandvich                     == Heavy/Secondary ==
            '159;6', // Dalokohs Bar
            '311;6', // Buffalo Steak Sandvich
            '425;6', // Family Business
            '1190;6', // Second Banana
            '1153;6', // Panic Attack - Shared - Soldier/Pyro/Heavy/Engineer
            '43;6', // Killing Gloves of Boxing     == Heavy/Melee ==
            '239;6', // Gloves of Running Urgently
            '310;6', // Warrior's Spirit
            '331;6', // Fists of Steel
            '426;6', // Eviction Notice
            '656;6' // Holiday Punch
        ];

        for (let i = 0; i < heavy.length; i++) {
            const sku1 = heavy[i];
            const wep1 = currencies[sku1].length;
            const isWep1 = wep1 === 1 && this.bot.pricelist.getPrice(sku1, true) === null;

            for (let j = 1; j < heavy.length; j++) {
                const sku2 = heavy[j];
                const wep2 = currencies[sku2].length;
                const isWep2 = wep2 === 1 && this.bot.pricelist.getPrice(sku2, true) === null;

                if (sku1 !== sku2 && isWep1 && isWep2) {
                    this.bot.tf2gc.combineClassWeapon([sku1, sku2]);
                    matched = true;
                    break;
                }
            }
            if (matched) {
                break;
            }
        }

        matched = false;

        // Engineer weapons
        const engineer = [
            '141;6', // Frontier Justice            == Engineer/Primary ==
            '527;6', // Widowmaker
            '588;6', // Pomson 6000
            '997;6', // Rescue Ranger
            '140;6', // Wrangler                    == Engineer/Secondary ==
            '528;6', // Short Circuit
            '1153;6', // Panic Attack - Shared - Soldier/Pyro/Heavy/Engineer
            '142;6', // Gunslinger                  == Engineer/Melee ==
            '155;6', // Southern Hospitality
            '329;6', // Jag
            '589;6' // Eureka Effect
        ];

        for (let i = 0; i < engineer.length; i++) {
            const sku1 = engineer[i];
            const wep1 = currencies[sku1].length;
            const isWep1 = wep1 === 1 && this.bot.pricelist.getPrice(sku1, true) === null;

            for (let j = 1; j < engineer.length; j++) {
                const sku2 = engineer[j];
                const wep2 = currencies[sku2].length;
                const isWep2 = wep2 === 1 && this.bot.pricelist.getPrice(sku2, true) === null;

                if (sku1 !== sku2 && isWep1 && isWep2) {
                    this.bot.tf2gc.combineClassWeapon([sku1, sku2]);
                    matched = true;
                    break;
                }
            }
            if (matched) {
                break;
            }
        }

        matched = false;

        // Medic weapons
        const medic = [
            '36;6', // Blutsauger                   == Medic/Primary ==
            '305;6', // Crusader's Crossbow
            '412;6', // Overdose
            '35;6', // Kritzkrieg                   == Medic/Secondary ==
            '411;6', // Quick-Fix
            '998;6', // Vaccinator
            '37;6', // Ubersaw                      == Medic/Melee ==
            '173;6', // Vita-Saw
            '304;6', // Amputator
            '413;6' // Solemn Vow
        ];

        for (let i = 0; i < medic.length; i++) {
            const sku1 = medic[i];
            const wep1 = currencies[sku1].length;
            const isWep1 = wep1 === 1 && this.bot.pricelist.getPrice(sku1, true) === null;

            for (let j = 1; j < medic.length; j++) {
                const sku2 = medic[j];
                const wep2 = currencies[sku2].length;
                const isWep2 = wep2 === 1 && this.bot.pricelist.getPrice(sku2, true) === null;

                if (sku1 !== sku2 && isWep1 && isWep2) {
                    this.bot.tf2gc.combineClassWeapon([sku1, sku2]);
                    matched = true;
                    break;
                }
            }
            if (matched) {
                break;
            }
        }

        matched = false;

        // Sniper weapons
        const sniper = [
            '56;6', // Huntsman                     == Sniper/Primary ==
            '230;6', // Sydney Sleeper
            '402;6', // Bazaar Bargain
            '526;6', // Machina
            '752;6', // Hitman's Heatmaker
            '1092;6', // Fortified Compound
            '1098;6', // Classic
            '57;6', // Razorback                    == Sniper/Secondary ==
            '58;6', // Jarate
            '231;6', // Darwin's Danger Shield
            '642;6', // Cozy Camper
            '751;6', // Cleaner's Carbine
            '171;6', // Tribalman's Shiv            == Sniper/Melee ==
            '232;6', // Bushwacka
            '401;6' // Shahanshah
        ];

        for (let i = 0; i < sniper.length; i++) {
            const sku1 = sniper[i];
            const wep1 = currencies[sku1].length;
            const isWep1 = wep1 === 1 && this.bot.pricelist.getPrice(sku1, true) === null;

            for (let j = 1; j < sniper.length; j++) {
                const sku2 = sniper[j];
                const wep2 = currencies[sku2].length;
                const isWep2 = wep2 === 1 && this.bot.pricelist.getPrice(sku2, true) === null;

                if (sku1 !== sku2 && isWep1 && isWep2) {
                    this.bot.tf2gc.combineClassWeapon([sku1, sku2]);
                    matched = true;
                    break;
                }
            }
            if (matched) {
                break;
            }
        }

        matched = false;

        // Spy weapons
        const spy = [
            '61;6', // Ambassador                   == Spy/Primary ==
            '224;6', // L'Etranger
            '460;6', // Enforcer
            '525;6', // Diamondback
            '225;6', // Your Eternal Reward         == Spy/Melee ==
            '356;6', // Conniver's Kunai
            '461;6', // Big Earner
            '649;6', // Spy-cicle
            '810;6', // Red-Tape Recorder           == Spy/PDA ==
            '60;6', // Cloak and Dagger             == Spy/PDA2 ==
            '59;6' // Dead Ringer
        ];

        for (let i = 0; i < spy.length; i++) {
            const sku1 = spy[i];
            const wep1 = currencies[sku1].length;
            const isWep1 = wep1 === 1 && this.bot.pricelist.getPrice(sku1, true) === null;

            for (let j = 1; j < spy.length; j++) {
                const sku2 = spy[j];
                const wep2 = currencies[sku2].length;
                const isWep2 = wep2 === 1 && this.bot.pricelist.getPrice(sku2, true) === null;

                if (sku1 !== sku2 && isWep1 && isWep2) {
                    this.bot.tf2gc.combineClassWeapon([sku1, sku2]);
                    matched = true;
                    break;
                }
            }
            if (matched) {
                break;
            }
        }
    }

    private sortInventory(): void {
        if (process.env.DISABLE_INVENTORY_SORT !== 'true') {
            this.bot.tf2gc.sortInventory(3);
        }
    }

    private inviteToGroups(steamID: SteamID | string): void {
        if (process.env.DISABLE_GROUPS_INVITE === 'true') {
            // You still need to include the group ID in your env.
            return;
        }
        this.bot.groups.inviteToGroups(steamID, this.groups);
    }

    private checkFriendRequests(): void {
        if (!this.bot.client.myFriends) {
            return;
        }

        this.checkFriendsCount();

        for (const steamID64 in this.bot.client.myFriends) {
            if (!Object.prototype.hasOwnProperty.call(this.bot.client.myFriends, steamID64)) {
                continue;
            }

            const relation = this.bot.client.myFriends[steamID64];
            if (relation === SteamUser.EFriendRelationship.RequestRecipient) {
                this.respondToFriendRequest(steamID64);
            }
        }

        this.bot.getAdmins().forEach(steamID => {
            if (!this.bot.friends.isFriend(steamID)) {
                log.info(`Not friends with admin ${steamID}, sending friend request...`);
                this.bot.client.addFriend(steamID, function(err) {
                    if (err) {
                        log.warn('Failed to send friend request: ', err);
                    }
                });
            }
        });
    }

    private respondToFriendRequest(steamID: SteamID | string): void {
        const steamID64 = typeof steamID === 'string' ? steamID : steamID.getSteamID64();

        log.debug(`Sending friend request to ${steamID64}...`);

        this.bot.client.addFriend(steamID, function(err) {
            if (err) {
                log.warn(`Failed to send friend request to ${steamID64}: `, err);
                return;
            }

            log.debug('Friend request has been sent / accepted');
        });
    }

    private onNewFriend(steamID: SteamID, tries = 0): void {
        if (tries === 0) {
            log.debug(`Now friends with ${steamID.getSteamID64()}`);
        }

        const isAdmin = this.bot.isAdmin(steamID);

        setImmediate(() => {
            if (!this.bot.friends.isFriend(steamID)) {
                return;
            }

            const friend = this.bot.friends.getFriend(steamID);

            if (friend === null || friend.player_name === undefined) {
                tries++;

                if (tries >= 5) {
                    log.info(`I am now friends with ${steamID.getSteamID64()}`);

                    this.bot.sendMessage(
                        steamID,
                        process.env.CUSTOM_WELCOME_MESSAGE
                            ? process.env.CUSTOM_WELCOME_MESSAGE.replace(/%name%/g, '').replace(
                                  /%admin%/g,
                                  isAdmin ? '!help' : '!how2trade'
                              )
                            : `Hi! If you don't know how things work, please type "!` +
                                  (isAdmin ? 'help' : 'how2trade') +
                                  '"'
                    );
                    return;
                }

                log.debug('Waiting for name');

                // Wait for friend info to be available
                setTimeout(() => {
                    this.onNewFriend(steamID, tries);
                }, exponentialBackoff(tries - 1, 200));
                return;
            }

            log.info(`I am now friends with ${friend.player_name} (${steamID.getSteamID64()})`);

            this.bot.sendMessage(
                steamID,
                process.env.CUSTOM_WELCOME_MESSAGE
                    ? process.env.CUSTOM_WELCOME_MESSAGE.replace(/%name%/g, friend.player_name).replace(
                          /%admin%/g,
                          isAdmin ? '!help' : '!how2trade'
                      )
                    : `Hi ${friend.player_name}! If you don't know how things work, please type "!` +
                          (isAdmin ? 'help' : 'how2trade') +
                          '"'
            );
        });
    }

    private checkFriendsCount(steamIDToIgnore?: SteamID | string): void {
        log.debug('Checking friends count');
        const friends = this.bot.friends.getFriends();

        const friendslistBuffer = 20;

        const friendsToRemoveCount = friends.length + friendslistBuffer - this.bot.friends.maxFriends;

        log.debug(`Friends to remove: ${friendsToRemoveCount}`);

        if (friendsToRemoveCount > 0) {
            // We have friends to remove, find people with fewest trades and remove them
            const friendsWithTrades = this.bot.trades.getTradesWithPeople(friends);

            // Ignore friends to keep
            this.friendsToKeep.forEach(function(steamID) {
                delete friendsWithTrades[steamID];
            });

            if (steamIDToIgnore) {
                delete friendsWithTrades[steamIDToIgnore.toString()];
            }

            // Convert object into an array so it can be sorted
            const tradesWithPeople: { steamID: string; trades: number }[] = [];

            for (const steamID in friendsWithTrades) {
                if (!Object.prototype.hasOwnProperty.call(friendsWithTrades, steamID)) {
                    continue;
                }

                tradesWithPeople.push({ steamID: steamID, trades: friendsWithTrades[steamID] });
            }

            // Sorts people by trades and picks people with lowest amounts of trades
            const friendsToRemove = tradesWithPeople
                .sort((a, b) => a.trades - b.trades)
                .splice(0, friendsToRemoveCount);

            log.info(`Cleaning up friendslist, removing ${friendsToRemove.length} people...`);

            friendsToRemove.forEach(element => {
                const friend = this.bot.friends.getFriend(element.steamID);
                this.bot.sendMessage(
                    element.steamID,
                    process.env.CUSTOM_CLEARING_FRIENDS_MESSAGE.replace(/%name%/g, friend.player_name)
                        ? process.env.CUSTOM_CLEARING_FRIENDS_MESSAGE
                        : '/quote I am cleaning up my friend list and you have been selected to be removed. Feel free to add me again if you want to trade at the other time!'
                );
                this.bot.client.removeFriend(element.steamID);
            });
        }
    }

    private requestBackpackSlots(): Promise<void> {
        return new Promise((resolve, reject) => {
            request(
                {
                    url: 'https://api.steampowered.com/IEconItems_440/GetPlayerItems/v0001/',
                    method: 'GET',
                    qs: {
                        key: this.bot.manager.apiKey,
                        steamid: this.bot.client.steamID.getSteamID64()
                    },
                    json: true,
                    gzip: true
                },
                (err, response, body) => {
                    if (err) {
                        // if failed, retry after 10 minutes.
                        log.warn('Failed to obtain backpack slots, retry in 10 minutes: ', err);
                        clearTimeout(this.retryRequest);
                        this.retryRequest = setTimeout(() => {
                            this.requestBackpackSlots();
                        }, 10 * 60 * 1000);
                        return reject();
                    }

                    if (body.result.status != 1) {
                        err = new Error(body.result.statusDetail);
                        err.status = body.result.status;
                        log.warn('Failed to obtain backpack slots, retry in 10 minutes: ', err);
                        // if failed, retry after 10 minutes.
                        clearTimeout(this.retryRequest);
                        this.retryRequest = setTimeout(() => {
                            this.requestBackpackSlots();
                        }, 10 * 60 * 1000);
                        return reject();
                    }

                    clearTimeout(this.retryRequest);
                    this.backpackSlots = body.result.num_backpack_slots;

                    return resolve();
                }
            );
        });
    }

    private itemList(offer: TradeOffer): { their: string[]; our: string[] } {
        const items: { our: {}; their: {} } = offer.data('dict');
        const their: string[] = [];
        for (const sku in items.their) {
            if (!Object.prototype.hasOwnProperty.call(items.their, sku)) {
                continue;
            }
            const theirItemsSku = sku;
            their.push(theirItemsSku);
        }

        const our: string[] = [];
        for (const sku in items.our) {
            if (!Object.prototype.hasOwnProperty.call(items.our, sku)) {
                continue;
            }
            const ourItemsSku = sku;
            our.push(ourItemsSku);
        }
        return { their, our };
    }

    private valueDiff(
        offer: TradeOffer,
        keyPrices: { buy: Currencies; sell: Currencies }
    ): { diff: number; diffRef: number; diffKey: string } {
        const value: { our: Currency; their: Currency } = offer.data('value');

        let diff: number;
        let diffRef: number;
        let diffKey: string;
        if (!value) {
            diff = 0;
            diffRef = 0;
            diffKey = '';
        } else {
            const newValue: { our: Currency; their: Currency } = {
                our: {
                    keys: value.our.keys,
                    metal: value.our.metal
                },
                their: {
                    keys: value.their.keys,
                    metal: value.their.metal
                }
            };

            if (!this.fromEnv.showMetal) {
                // if ENABLE_SHOW_ONLY_METAL is set to false, then this need to be converted first.
                if (this.isTradingKeys) {
                    // If trading keys, then their side need to use buying key price.
                    newValue.our.metal = Currencies.toRefined(
                        Currencies.toScrap(newValue.our.metal) + newValue.our.keys * keyPrices.sell.toValue()
                    );
                    newValue.our.keys = 0;
                    newValue.their.metal = Currencies.toRefined(
                        Currencies.toScrap(newValue.their.metal) + newValue.their.keys * keyPrices.buy.toValue()
                    );
                    newValue.their.keys = 0;

                    this.isTradingKeys = false; // Reset
                } else {
                    // Else both use selling key price.
                    newValue.our.metal = Currencies.toRefined(
                        Currencies.toScrap(newValue.our.metal) + newValue.our.keys * keyPrices.sell.toValue()
                    );
                    newValue.our.keys = 0;
                    newValue.their.metal = Currencies.toRefined(
                        Currencies.toScrap(newValue.their.metal) + newValue.their.keys * keyPrices.sell.toValue()
                    );
                    newValue.their.keys = 0;
                }
            }

            diff = Currencies.toScrap(newValue.their.metal) - Currencies.toScrap(newValue.our.metal);
            diffRef = Currencies.toRefined(Math.abs(diff));
            diffKey = Currencies.toCurrencies(
                Math.abs(diff),
                Math.abs(diff) >= keyPrices.sell.metal ? keyPrices.sell.metal : undefined
            ).toString();
        }
        return { diff, diffRef, diffKey };
    }

    tradePartnerLinks(steamID: string): { steamProfile: string; backpackTF: string; steamREP: string } {
        const links = {
            steamProfile: `https://steamcommunity.com/profiles/${steamID}`,
            backpackTF: `https://backpack.tf/profiles/${steamID}`,
            steamREP: `https://steamrep.com/profiles/${steamID}`
        };
        return links;
    }

    timeWithEmoji(): { time: string; emoji: string; note: string } {
        const time = moment()
            .tz(process.env.TIMEZONE ? process.env.TIMEZONE : 'UTC') //timezone format: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
            .format(process.env.CUSTOM_TIME_FORMAT ? process.env.CUSTOM_TIME_FORMAT : 'MMMM Do YYYY, HH:mm:ss ZZ'); // refer: https://www.tutorialspoint.com/momentjs/momentjs_format.htm

        const timeEmoji = moment()
            .tz(process.env.TIMEZONE ? process.env.TIMEZONE : 'UTC')
            .format();
        const emoji =
            timeEmoji.includes('T00:') || timeEmoji.includes('T12:')
                ? '🕛'
                : timeEmoji.includes('T01:') || timeEmoji.includes('T13:')
                ? '🕐'
                : timeEmoji.includes('T02:') || timeEmoji.includes('T14:')
                ? '🕑'
                : timeEmoji.includes('T03:') || timeEmoji.includes('T15:')
                ? '🕒'
                : timeEmoji.includes('T04:') || timeEmoji.includes('T16:')
                ? '🕓'
                : timeEmoji.includes('T05:') || timeEmoji.includes('T17:')
                ? '🕔'
                : timeEmoji.includes('T06:') || timeEmoji.includes('T18:')
                ? '🕕'
                : timeEmoji.includes('T07:') || timeEmoji.includes('T19:')
                ? '🕖'
                : timeEmoji.includes('T08:') || timeEmoji.includes('T20:')
                ? '🕗'
                : timeEmoji.includes('T09:') || timeEmoji.includes('T21:')
                ? '🕘'
                : timeEmoji.includes('T10:') || timeEmoji.includes('T22:')
                ? '🕙'
                : timeEmoji.includes('T11:') || timeEmoji.includes('T23:')
                ? '🕚'
                : '';

        const timeNote = process.env.TIME_ADDITIONAL_NOTES ? process.env.TIME_ADDITIONAL_NOTES : '';

        const timeWithEmoji = {
            time: time,
            emoji: emoji,
            note: timeNote
        };
        return timeWithEmoji;
    }

    pureStock(): string[] {
        const pureStock: string[] = [];
        const pure = this.currPure();
        const totalKeys = pure.key;
        const totalRefs = Currencies.toRefined(pure.refTotalInScrap);

        const pureCombine = [
            {
                name: pluralize('key', totalKeys),
                amount: totalKeys
            },
            {
                name: pluralize('ref', Math.trunc(totalRefs)),
                amount: totalRefs
            }
        ];
        for (let i = 0; i < pureCombine.length; i++) {
            pureStock.push(`${pureCombine[i].amount} ${pureCombine[i].name}`);
        }
        return pureStock;
    }

    currPure(): { key: number; scrap: number; rec: number; ref: number; refTotalInScrap: number } {
        const currencies = this.bot.inventoryManager.getInventory().getCurrencies();

        const currKeys = currencies['5021;6'].length;
        const currScrap = currencies['5000;6'].length * (1 / 9);
        const currRec = currencies['5001;6'].length * (1 / 3);
        const currRef = currencies['5002;6'].length;
        const currReftoScrap = Currencies.toScrap(currRef + currRec + currScrap);

        const pure = {
            key: currKeys,
            scrap: currScrap,
            rec: currRec,
            ref: currRef,
            refTotalInScrap: currReftoScrap
        };
        return pure;
    }

    polldata(): { totalDays: number; tradesTotal: number; trades24Hours: number; tradesToday: number } {
        const now = moment();
        const aDayAgo = moment().subtract(24, 'hour');
        const startOfDay = moment().startOf('day');

        let tradesToday = 0;
        let trades24Hours = 0;
        let tradesTotal = 0;

        const pollData = this.bot.manager.pollData;
        const oldestId = pollData.offerData === undefined ? undefined : Object.keys(pollData.offerData)[0];
        const timeSince =
            +process.env.TRADING_STARTING_TIME_UNIX === 0
                ? pollData.timestamps[oldestId]
                : +process.env.TRADING_STARTING_TIME_UNIX;
        const totalDays = !timeSince ? 0 : now.diff(moment.unix(timeSince), 'days');

        const offerData = this.bot.manager.pollData.offerData;
        for (const offerID in offerData) {
            if (!Object.prototype.hasOwnProperty.call(offerData, offerID)) {
                continue;
            }

            if (offerData[offerID].handledByUs === true && offerData[offerID].isAccepted === true) {
                // Sucessful trades handled by the bot
                tradesTotal++;

                if (offerData[offerID].finishTimestamp >= aDayAgo.valueOf()) {
                    // Within the last 24 hours
                    trades24Hours++;
                }

                if (offerData[offerID].finishTimestamp >= startOfDay.valueOf()) {
                    // All trades since 0:00 in the morning.
                    tradesToday++;
                }
            }
        }

        const polldata = {
            totalDays: totalDays,
            tradesTotal: tradesTotal,
            trades24Hours: trades24Hours,
            tradesToday: tradesToday
        };
        return polldata;
    }

    giftWords(): string[] {
        const words = [
            'gift',
            'donat', // So that 'donate' or 'donation' will also be accepted
            'tip', // All others are synonyms
            'tribute',
            'souvenir',
            'favor',
            'giveaway',
            'bonus',
            'grant',
            'bounty',
            'present',
            'contribution',
            'award',
            'nice', // Up until here actually
            'happy', // All below people might also use
            'thank',
            'goo', // For 'good', 'goodie' or anything else
            'awesome',
            'rep',
            'joy',
            'cute' // right?
        ];
        return words;
    }

    noiseMakerNames(): string[] {
        const names = [
            'Noise Maker - Black Cat',
            'Noise Maker - Gremlin',
            'Noise Maker - Werewolf',
            'Noise Maker - Witch',
            'Noise Maker - Banshee',
            'Noise Maker - Crazy Laugh',
            'Noise Maker - Stabby',
            'Noise Maker - Bell',
            'Noise Maker - Gong',
            'Noise Maker - Koto',
            'Noise Maker - Fireworks',
            'Noise Maker - Vuvuzela'
        ];
        return names;
    }

    noiseMakerSKUs(): string[] {
        const skus = [
            '280;6', // Noise Maker - Black Cat
            '280;6;uncraftable',
            '281;6', // Noise Maker - Gremlin
            '281;6;uncraftable',
            '282;6', // Noise Maker - Werewolf
            '282;6;uncraftable',
            '283;6', // Noise Maker - Witch
            '283;6;uncraftable',
            '284;6', // Noise Maker - Banshee
            '284;6;uncraftable',
            '286;6', // Noise Maker - Crazy Laugh
            '286;6;uncraftable',
            '288;6', // Noise Maker - Stabby
            '288;6;uncraftable',
            '362;6', // Noise Maker - Bell
            '362;6;uncraftable',
            '364;6', // Noise Maker - Gong
            '364;6;uncraftable',
            '365;6', // Noise Maker - Koto
            '365;6;uncraftable',
            '365;1', // Genuine Noise Maker - Koto
            '493;6', // Noise Maker - Fireworks
            '493;6;uncraftable',
            '542;6', // Noise Maker - Vuvuzela
            '542;6;uncraftable',
            '542;1' // Genuine Noise Maker - Vuvuzela
        ];
        return skus;
    }

    weapon(): { craft: string[]; uncraft: string[] } {
        const weapons = {
            craft: [
                '45;6', // Force-A-Nature               == Scout/Primary ==
                '220;6', // Shortstop
                '448;6', // Soda Popper
                '772;6', // Baby Face's Blaster
                '1103;6', // Back Scatter
                '46;6', // Bonk! Atomic Punch           == Scout/Secondary ==
                '163;6', // Crit-a-Cola
                '222;6', // Mad Milk
                '449;6', // Winger
                '773;6', // Pretty Boy's Pocket Pistol
                '812;6', // Flying Guillotine
                '44;6', // Sandman                      == Scout/Melee ==
                '221;6', // Holy Mackerel
                '317;6', // Candy Cane
                '325;6', // Boston Basher
                '349;6', // Sun-on-a-Stick
                '355;6', // Fan O'War
                '450;6', // Atomizer
                '648;6', // Wrap Assassin
                '127;6', // Direct Hit                  == Soldier/Primary ==
                '228;6', // Black Box
                '237;6', // Rocket Jumper
                '414;6', // Liberty Launcher
                '441;6', // Cow Mangler 5000
                '513;6', // Original
                '730;6', // Beggar's Bazooka
                '1104;6', // Air Strike
                '129;6', // Buff Banner                 == Soldier/Secondary ==
                '133;6', // Gunboats
                '226;6', // Battalion's Backup
                '354;6', // Concheror
                '415;6', // (Reserve Shooter - Shared - Soldier/Pyro)
                '442;6', // Righteous Bison
                '1101;6', // (B.A.S.E Jumper - Shared - Soldier/Demoman)
                '1153;6', // (Panic Attack - Shared - Soldier/Pyro/Heavy/Engineer)
                '444;6', // Mantreads
                '128;6', // Equalizer                   == Soldier/Melee ==
                '154;6', // (Pain Train - Shared - Soldier/Demoman)
                '357;6', // (Half-Zatoichi - Shared - Soldier/Demoman)
                '416;6', // Market Gardener
                '447;6', // Disciplinary Action
                '775;6', // Escape Plan
                '40;6', // Backburner                   == Pyro/Primary ==
                '215;6', // Degreaser
                '594;6', // Phlogistinator
                '741;6', // Rainblower
                '1178;6', // Dragon's Fury
                '39;6', // Flare Gun                    == Pyro/Secondary ==
                '351;6', // Detonator
                '595;6', // Manmelter
                '740;6', // Scorch Shot
                '1179;6', // Thermal Thruster
                '1180;6', // Gas Passer
                '38;6', // Axtinguisher                 == Pyro/Melee ==
                '153;6', // Homewrecker
                '214;6', // Powerjack
                '326;6', // Back Scratcher
                '348;6', // Sharpened Volcano Fragment
                '457;6', // Postal Pummeler
                '593;6', // Third Degree
                '739;6', // Lollichop
                '813;6', // Neon Annihilator
                '1181;6', // Hot Hand
                '308;6', // Loch-n-Load                 == Demoman/Primary ==
                '405;6', // Ali Baba's Wee Booties
                '608;6', // Bootlegger
                '996;6', // Loose Cannon
                '1151;6', // Iron Bomber
                '130;6', // Scottish Resistance         == Demoman/Secondary ==
                '131;6', // Chargin' Targe
                '265;6', // Sticky Jumper
                '406;6', // Splendid Screen
                '1099;6', // Tide Turner
                '1150;6', // Quickiebomb Launcher
                '132;6', // Eyelander                   == Demoman/Melee ==
                '172;6', // Scotsman's Skullcutter
                '307;6', // Ullapool Caber
                '327;6', // Claidheamh Mòr
                '404;6', // Persian Persuader
                '482;6', // Nessie's Nine Iron
                '609;6', // Scottish Handshake
                '41;6', // Natascha                     == Heavy/Primary ==
                '312;6', // Brass Beast
                '424;6', // Tomislav
                '811;6', // Huo-Long Heater
                '42;6', // Sandvich                     == Heavy/Secondary ==
                '159;6', // Dalokohs Bar
                '311;6', // Buffalo Steak Sandvich
                '425;6', // Family Business
                '1190;6', // Second Banana
                '43;6', // Killing Gloves of Boxing     == Heavy/Melee ==
                '239;6', // Gloves of Running Urgently
                '310;6', // Warrior's Spirit
                '331;6', // Fists of Steel
                '426;6', // Eviction Notice
                '656;6', // Holiday Punch
                '141;6', // Frontier Justice            == Engineer/Primary ==
                '527;6', // Widowmaker
                '588;6', // Pomson 6000
                '997;6', // Rescue Ranger
                '140;6', // Wrangler                    == Engineer/Secondary ==
                '528;6', // Short Circuit
                '142;6', // Gunslinger                  == Engineer/Melee ==
                '155;6', // Southern Hospitality
                '329;6', // Jag
                '589;6', // Eureka Effect
                '36;6', // Blutsauger                   == Medic/Primary ==
                '305;6', // Crusader's Crossbow
                '412;6', // Overdose
                '35;6', // Kritzkrieg                   == Medic/Secondary ==
                '411;6', // Quick-Fix
                '998;6', // Vaccinator
                '37;6', // Ubersaw                      == Medic/Melee ==
                '173;6', // Vita-Saw
                '304;6', // Amputator
                '413;6', // Solemn Vow
                '56;6', // Huntsman                     == Sniper/Primary ==
                '230;6', // Sydney Sleeper
                '402;6', // Bazaar Bargain
                '526;6', // Machina
                '752;6', // Hitman's Heatmaker
                '1092;6', // Fortified Compound
                '1098;6', // Classic
                '57;6', // Razorback                    == Sniper/Secondary ==
                '58;6', // Jarate
                '231;6', // Darwin's Danger Shield
                '642;6', // Cozy Camper
                '751;6', // Cleaner's Carbine
                '171;6', // Tribalman's Shiv            == Sniper/Melee ==
                '232;6', // Bushwacka
                '401;6', // Shahanshah
                '61;6', // Ambassador                   == Spy/Primary ==
                '224;6', // L'Etranger
                '460;6', // Enforcer
                '525;6', // Diamondback
                '225;6', // Your Eternal Reward         == Spy/Melee ==
                '356;6', // Conniver's Kunai
                '461;6', // Big Earner
                '649;6', // Spy-cicle
                '810;6', // Red-Tape Recorder           == Spy/PDA ==
                '60;6', // Cloak and Dagger             == Spy/PDA2 ==
                '59;6', // Dead Ringer
                '939;6' // Bat Outta Hell               == All class/Melee ==
            ],
            uncraft: [
                '45;6;uncraftable', // Force-A-Nature               == Scout/Primary ==
                '220;6;uncraftable', // Shortstop
                '448;6;uncraftable', // Soda Popper
                '772;6;uncraftable', // Baby Face's Blaster
                '1103;6;uncraftable', // Back Scatter
                '46;6;uncraftable', // Bonk! Atomic Punch           == Scout/Secondary ==
                '163;6;uncraftable', // Crit-a-Cola
                '222;6;uncraftable', // Mad Milk
                '449;6;uncraftable', // Winger
                '773;6;uncraftable', // Pretty Boy's Pocket Pistol
                '812;6;uncraftable', // Flying Guillotine
                '44;6;uncraftable', // Sandman                      == Scout/Melee ==
                '221;6;uncraftable', // Holy Mackerel
                '317;6;uncraftable', // Candy Cane
                '325;6;uncraftable', // Boston Basher
                '349;6;uncraftable', // Sun-on-a-Stick
                '355;6;uncraftable', // Fan O'War
                '450;6;uncraftable', // Atomizer
                '648;6;uncraftable', // Wrap Assassin
                '127;6;uncraftable', // Direct Hit                  == Soldier/Primary ==
                '228;6;uncraftable', // Black Box
                '237;6;uncraftable', // Rocket Jumper
                '414;6;uncraftable', // Liberty Launcher
                '441;6;uncraftable', // Cow Mangler 5000
                '513;6;uncraftable', // Original
                '730;6;uncraftable', // Beggar's Bazooka
                '1104;6;uncraftable', // Air Strike
                '129;6;uncraftable', // Buff Banner                 == Soldier/Secondary ==
                '133;6;uncraftable', // Gunboats
                '226;6;uncraftable', // Battalion's Backup
                '354;6;uncraftable', // Concheror
                '415;6;uncraftable', // (Reserve Shooter - Shared - Soldier/Pyro)
                '442;6;uncraftable', // Righteous Bison
                '1101;6;uncraftable', // (B.A.S.E Jumper - Shared - Soldier/Demoman)
                '1153;6;uncraftable', // (Panic Attack - Shared - Soldier/Pyro/Heavy/Engineer)
                '444;6;uncraftable', // Mantreads
                '128;6;uncraftable', // Equalizer                   == Soldier/Melee ==
                '154;6;uncraftable', // (Pain Train - Shared - Soldier/Demoman)
                '357;6;uncraftable', // (Half-Zatoichi - Shared - Soldier/Demoman)
                '416;6;uncraftable', // Market Gardener
                '447;6;uncraftable', // Disciplinary Action
                '775;6;uncraftable', // Escape Plan
                '40;6;uncraftable', // Backburner                   == Pyro/Primary ==
                '215;6;uncraftable', // Degreaser
                '594;6;uncraftable', // Phlogistinator
                '741;6;uncraftable', // Rainblower
                '39;6;uncraftable', // Flare Gun                    == Pyro/Secondary ==
                '351;6;uncraftable', // Detonator
                '595;6;uncraftable', // Manmelter
                '740;6;uncraftable', // Scorch Shot
                '38;6;uncraftable', // Axtinguisher                 == Pyro/Melee ==
                '153;6;uncraftable', // Homewrecker
                '214;6;uncraftable', // Powerjack
                '326;6;uncraftable', // Back Scratcher
                '348;6;uncraftable', // Sharpened Volcano Fragment
                '457;6;uncraftable', // Postal Pummeler
                '593;6;uncraftable', // Third Degree
                '739;6;uncraftable', // Lollichop
                '813;6;uncraftable', // Neon Annihilator
                '308;6;uncraftable', // Loch-n-Load                 == Demoman/Primary ==
                '405;6;uncraftable', // Ali Baba's Wee Booties
                '608;6;uncraftable', // Bootlegger
                '996;6;uncraftable', // Loose Cannon
                '1151;6;uncraftable', // Iron Bomber
                '130;6;uncraftable', // Scottish Resistance         == Demoman/Secondary ==
                '131;6;uncraftable', // Chargin' Targe
                '265;6;uncraftable', // Sticky Jumper
                '406;6;uncraftable', // Splendid Screen
                '1099;6;uncraftable', // Tide Turner
                '1150;6;uncraftable', // Quickiebomb Launcher
                '132;6;uncraftable', // Eyelander                   == Demoman/Melee ==
                '172;6;uncraftable', // Scotsman's Skullcutter
                '307;6;uncraftable', // Ullapool Caber
                '327;6;uncraftable', // Claidheamh Mòr
                '404;6;uncraftable', // Persian Persuader
                '482;6;uncraftable', // Nessie's Nine Iron
                '609;6;uncraftable', // Scottish Handshake
                '41;6;uncraftable', // Natascha                     == Heavy/Primary ==
                '312;6;uncraftable', // Brass Beast
                '424;6;uncraftable', // Tomislav
                '811;6;uncraftable', // Huo-Long Heater
                '42;6;uncraftable', // Sandvich                     == Heavy/Secondary ==
                '159;6;uncraftable', // Dalokohs Bar
                '311;6;uncraftable', // Buffalo Steak Sandvich
                '425;6;uncraftable', // Family Business
                '43;6;uncraftable', // Killing Gloves of Boxing     == Heavy/Melee ==
                '239;6;uncraftable', // Gloves of Running Urgently
                '310;6;uncraftable', // Warrior's Spirit
                '331;6;uncraftable', // Fists of Steel
                '426;6;uncraftable', // Eviction Notice
                '656;6;uncraftable', // Holiday Punch
                '141;6;uncraftable', // Frontier Justice            == Engineer/Primary ==
                '527;6;uncraftable', // Widowmaker
                '588;6;uncraftable', // Pomson 6000
                '997;6;uncraftable', // Rescue Ranger
                '140;6;uncraftable', // Wrangler                    == Engineer/Secondary ==
                '528;6;uncraftable', // Short Circuit
                '142;6;uncraftable', // Gunslinger                  == Engineer/Melee ==
                '155;6;uncraftable', // Southern Hospitality
                '329;6;uncraftable', // Jag
                '589;6;uncraftable', // Eureka Effect
                '36;6;uncraftable', // Blutsauger                   == Medic/Primary ==
                '305;6;uncraftable', // Crusader's Crossbow
                '412;6;uncraftable', // Overdose
                '35;6;uncraftable', // Kritzkrieg                   == Medic/Secondary ==
                '411;6;uncraftable', // Quick-Fix
                '998;6;uncraftable', // Vaccinator
                '37;6;uncraftable', // Ubersaw                      == Medic/Melee ==
                '173;6;uncraftable', // Vita-Saw
                '304;6;uncraftable', // Amputator
                '413;6;uncraftable', // Solemn Vow
                '56;6;uncraftable', // Huntsman                     == Sniper/Primary ==
                '230;6;uncraftable', // Sydney Sleeper
                '402;6;uncraftable', // Bazaar Bargain
                '526;6;uncraftable', // Machina
                '752;6;uncraftable', // Hitman's Heatmaker
                '1092;6;uncraftable', // Fortified Compound
                '1098;6;uncraftable', // Classic
                '57;6;uncraftable', // Razorback                    == Sniper/Secondary ==
                '58;6;uncraftable', // Jarate
                '231;6;uncraftable', // Darwin's Danger Shield
                '642;6;uncraftable', // Cozy Camper
                '751;6;uncraftable', // Cleaner's Carbine
                '171;6;uncraftable', // Tribalman's Shiv            == Sniper/Melee ==
                '232;6;uncraftable', // Bushwacka
                '401;6;uncraftable', // Shahanshah
                '61;6;uncraftable', // Ambassador                   == Spy/Primary ==
                '224;6;uncraftable', // L'Etranger
                '460;6;uncraftable', // Enforcer
                '525;6;uncraftable', // Diamondback
                '225;6;uncraftable', // Your Eternal Reward         == Spy/Melee ==
                '356;6;uncraftable', // Conniver's Kunai
                '461;6;uncraftable', // Big Earner
                '649;6;uncraftable', // Spy-cicle
                '810;6;uncraftable', // Red-Tape Recorder           == Spy/PDA ==
                '60;6;uncraftable', // Cloak and Dagger             == Spy/PDA2 ==
                '59;6;uncraftable', // Dead Ringer
                '939;6;uncraftable' // Bat Outta Hell               == All class/Melee ==
            ]
        };
        return weapons;
    }

    private checkGroupInvites(): void {
        log.debug('Checking group invites');

        for (const groupID64 in this.bot.client.myGroups) {
            if (!Object.prototype.hasOwnProperty.call(this.bot.client.myGroups, groupID64)) {
                continue;
            }

            const relationship = this.bot.client.myGroups[groupID64];

            if (relationship === SteamUser.EClanRelationship.Invited) {
                this.bot.client.respondToGroupInvite(groupID64, false);
            }
        }

        this.groups.forEach(steamID => {
            if (
                this.bot.client.myGroups[steamID] !== SteamUser.EClanRelationship.Member &&
                this.bot.client.myGroups[steamID] !== SteamUser.EClanRelationship.Blocked
            ) {
                this.bot.community.getSteamGroup(new SteamID(steamID), function(err, group) {
                    if (err) {
                        log.warn('Failed to get group: ', err);
                        return;
                    }

                    log.info(`Not member of group ${group.name} ("${steamID}"), joining...`);
                    group.join(function(err) {
                        if (err) {
                            log.warn('Failed to join group: ', err);
                        }
                    });
                });
            }
        });
    }

    onPollData(pollData: PollData): void {
        files.writeFile(paths.files.pollData, pollData, true).catch(function(err) {
            log.warn('Failed to save polldata: ', err);
        });
    }

    onPricelist(pricelist: Entry[]): void {
        log.debug('Pricelist changed');

        if (pricelist.length === 0) {
            // Ignore errors
            this.bot.listings.removeAll().asCallback();
        }

        files
            .writeFile(
                paths.files.pricelist,
                pricelist.map(entry => entry.getJSON()),
                true
            )
            .catch(function(err) {
                log.warn('Failed to save pricelist: ', err);
            });
    }

    onPriceChange(sku: string, entry: Entry): void {
        this.bot.listings.checkBySKU(sku, entry);
    }

    onLoginThrottle(wait: number): void {
        log.warn('Waiting ' + wait + ' ms before trying to sign in...');
    }

    onTF2QueueCompleted(): void {
        log.debug('Queue finished');
        this.bot.client.gamesPlayed([this.customGameName, 440]);
    }
};

function summarizeSteamChat(
    trade: string,
    value: { diff: number; diffRef: number; diffKey: string },
    keyPrice: { buy: Currencies; sell: Currencies }
): string {
    const summary =
        `\n\nSummary\n` +
        trade.replace('Asked:', '• Asked:').replace('Offered:', '• Offered:') +
        (value.diff > 0
            ? `\n📈 Profit from overpay: ${value.diffRef} ref` +
              (value.diffRef >= keyPrice.sell.metal ? ` (${value.diffKey})` : '')
            : value.diff < 0
            ? `\n📉 Loss from underpay: ${value.diffRef} ref` +
              (value.diffRef >= keyPrice.sell.metal ? ` (${value.diffKey})` : '')
            : '');
    return summary;
}

function listItems(items: {
    invalid: string[];
    overstock: string[];
    understock: string[];
    duped: string[];
    dupedFailed: string[];
    highValue: string[];
}): string {
    let list = items.invalid.length !== 0 ? '🟨_INVALID_ITEMS:\n- ' + items.invalid.join(',\n- ') : '';
    list +=
        items.overstock.length !== 0
            ? (items.invalid.length !== 0 ? '\n\n' : '') + '🟦_OVERSTOCKED:\n- ' + items.overstock.join(',\n- ')
            : '';
    list +=
        items.understock.length !== 0
            ? (items.invalid.length !== 0 || items.overstock.length !== 0 ? '\n\n' : '') +
              '🟩_UNDERSTOCKED:\n- ' +
              items.understock.join(',\n- ')
            : '';
    list +=
        items.duped.length !== 0
            ? (items.invalid.length !== 0 || items.overstock.length !== 0 || items.understock.length !== 0
                  ? '\n\n'
                  : '') +
              '🟫_DUPED_ITEMS:\n- ' +
              items.duped.join(',\n- ')
            : '';
    list +=
        items.dupedFailed.length !== 0
            ? (items.invalid.length !== 0 ||
              items.overstock.length !== 0 ||
              items.understock.length !== 0 ||
              items.duped.length !== 0
                  ? '\n\n'
                  : '') +
              '🟪_DUPE_CHECK_FAILED:\n- ' +
              items.dupedFailed.join(',\n- ')
            : '';
    list +=
        items.highValue.length !== 0
            ? (items.invalid.length !== 0 ||
              items.overstock.length !== 0 ||
              items.understock.length !== 0 ||
              items.duped.length !== 0 ||
              items.dupedFailed.length !== 0
                  ? '\n\n'
                  : '') +
              '🔶_HIGH_VALUE_ITEMS:\n- ' +
              items.highValue.join(',\n- ')
            : '';

    if (list.length === 0) {
        list = '-';
    }
    return list;
}
