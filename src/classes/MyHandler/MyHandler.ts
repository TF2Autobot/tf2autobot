import SKU from 'tf2-sku-2';
import request from 'request-retry-dayjs';
import { EClanRelationship, EFriendRelationship, EPersonaState, EResult } from 'steam-user';
import TradeOfferManager, {
    TradeOffer,
    PollData,
    CustomError,
    ItemsDict,
    HighValueInput,
    HighValueOutput,
    Meta,
    WrongAboutOffer,
    Prices
} from 'steam-tradeoffer-manager';

import pluralize from 'pluralize';
import SteamID from 'steamid';
import Currencies from 'tf2-currencies';
import async from 'async';
import { UnknownDictionary } from '../../types/common';

import { accepted, declined, cancelled, acceptEscrow, invalid } from './offer/notify/export-notify';
import { processAccepted, updateListings } from './offer/accepted/exportAccepted';
import { sendReview } from './offer/review/export-review';
import { keepMetalSupply, craftDuplicateWeapons, craftClassWeapons, itemList } from './utils/export-utils';

import { BPTFGetUserInfo } from './interfaces';

import Handler from '../Handler';
import Bot from '../Bot';
import { Entry, EntryData } from '../Pricelist';
import Commands from '../Commands/Commands';
import CartQueue from '../Carts/CartQueue';
import Inventory from '../Inventory';
import TF2Inventory from '../TF2Inventory';
import Autokeys from '../Autokeys/Autokeys';

import { Paths } from '../../resources/paths';
import log from '../../lib/logger';
import * as files from '../../lib/files';
import { exponentialBackoff } from '../../lib/helpers';
import { craftAll, uncraftAll, giftWords, sheensData, killstreakersData } from '../../lib/data';
import { sendAlert } from '../../lib/DiscordWebhook/export';
import { check, uptime } from '../../lib/tools/export';
import genPaths from '../../resources/paths';

export default class MyHandler extends Handler {
    private readonly commands: Commands;

    public readonly autokeys: Autokeys;

    readonly cartQueue: CartQueue;

    private get groups(): string[] {
        const groups = this.bot.options.groups;
        if (groups !== null && Array.isArray(groups)) {
            groups.forEach(groupID64 => {
                if (!new SteamID(groupID64).isValid()) {
                    throw new Error(`Invalid group SteamID64 "${groupID64}"`);
                }
            });
            return groups;
        }
    }

    private get friendsToKeep(): string[] {
        const friendsToKeep = this.bot.options.keep.concat(this.bot.getAdmins().map(steamID => steamID.getSteamID64()));
        if (friendsToKeep !== null && Array.isArray(friendsToKeep)) {
            friendsToKeep.forEach(steamID64 => {
                if (!new SteamID(steamID64).isValid()) {
                    throw new Error(`Invalid SteamID64 "${steamID64}"`);
                }
            });
            return friendsToKeep;
        }
    }

    private get minimumScrap(): number {
        return this.bot.options.crafting.metals.minScrap;
    }

    private get minimumReclaimed(): number {
        return this.bot.options.crafting.metals.minRec;
    }

    private get combineThreshold(): number {
        return this.bot.options.crafting.metals.threshold;
    }

    private get dupeCheckEnabled(): boolean {
        return this.bot.options.manualReview.duped.enable;
    }

    private get minimumKeysDupeCheck(): number {
        return this.bot.options.manualReview.duped.minKeys;
    }

    private get isShowChanges(): boolean {
        return this.bot.options.tradeSummary.showStockChanges;
    }

    private get isPriceUpdateWebhook(): boolean {
        return (
            this.bot.options.discordWebhook.priceUpdate.enable && this.bot.options.discordWebhook.priceUpdate.url !== ''
        );
    }

    private get isWeaponsAsCurrency(): { enable: boolean; withUncraft: boolean } {
        return {
            enable: this.bot.options.weaponsAsCurrency.enable,
            withUncraft: this.bot.options.weaponsAsCurrency.withUncraft
        };
    }

    private get isAutoRelistEnabled(): boolean {
        return this.bot.options.autobump;
    }

    private get invalidValueException(): number {
        return Currencies.toScrap(this.bot.options.manualReview.invalidValue.exceptionValue.valueInRef);
    }

    private get invalidValueExceptionSKU(): string[] {
        // check if manualReview.invalidValue.exceptionValue.skus is an empty array
        const invalidValueExceptionSKU = this.bot.options.manualReview.invalidValue.exceptionValue.skus;
        if (invalidValueExceptionSKU === []) {
            log.warn(
                'You did not set manualReview.invalidValue.exceptionValue.skus array, resetting to apply only for Unusual and Australium'
            );
            return [';5;u', ';11;australium'];
        } else {
            return invalidValueExceptionSKU;
        }
    }

    private hasInvalidValueException = false;

    private get sheens(): string[] {
        // check if highValue.sheens is an empty array
        const sheens = this.bot.options.highValue.sheens;
        if (sheens === []) {
            log.warn(
                'You did not set highValue.sheens array in your options.json file, will mention/disable all sheens.'
            );
            return sheensData.map(sheen => sheen.toLowerCase().trim());
        } else {
            return sheens.map(sheen => sheen.toLowerCase().trim());
        }
    }

    private get killstreakers(): string[] {
        // check if highValue.killstreakers is an empty array
        const killstreakers = this.bot.options.highValue.killstreakers;
        if (killstreakers === []) {
            log.warn(
                'You did not set highValue.killstreakers array in your options.json file, will mention/disable all killstreakers.'
            );
            return killstreakersData.map(killstreaker => killstreaker.toLowerCase().trim());
        } else {
            return killstreakers.map(killstreaker => killstreaker.toLowerCase().trim());
        }
    }

    private get strangeParts(): string[] {
        return this.bot.options.highValue.strangeParts.map(strangePart => strangePart.toLowerCase().trim());
    }

    private get painted(): string[] {
        return this.bot.options.highValue.painted.map(paint => paint.toLowerCase().trim());
    }

    private isTradingKeys = false;

    private get customGameName(): string {
        // check if game.customName is more than 60 characters.
        const customGameName = this.bot.options.game.customName;

        if (!customGameName || customGameName === 'TF2Autobot') {
            return `TF2Autobot v${process.env.BOT_VERSION}`;
        } else {
            return customGameName;
        }
    }

    private isPremium = false;

    private botName = '';

    private botAvatarURL = '';

    private retryRequest;

    private autokeysStatus: {
        isActive: boolean;
        isBuying: boolean;
        isBanking: boolean;
    };

    private weapons: string[] = [];

    private shuffleWeaponsTimeout;

    private classWeaponsTimeout;

    private autoRefreshListingsTimeout;

    private botSteamID: SteamID;

    recentlySentMessage: UnknownDictionary<number> = {};

    private paths: Paths;

    constructor(bot: Bot) {
        super(bot);

        this.commands = new Commands(bot);
        this.cartQueue = new CartQueue(bot);
        this.autokeys = new Autokeys(bot);

        this.paths = genPaths(this.bot.options.steamAccountName);

        setInterval(() => {
            this.recentlySentMessage = {};
        }, 1000);
    }

    getFriendToKeep(): number {
        return this.friendsToKeep.length;
    }

    getBotSteamID(): SteamID {
        return this.botSteamID;
    }

    hasDupeCheckEnabled(): boolean {
        return this.dupeCheckEnabled;
    }

    getMinimumKeysDupeCheck(): number {
        return this.minimumKeysDupeCheck;
    }

    getBotInfo(): BotInfo {
        const name = this.botName;
        const avatarURL = this.botAvatarURL;
        const steamID = this.botSteamID.getSteamID64();
        const premium = this.isPremium;
        return { name, avatarURL, steamID, premium };
    }

    getToMention(): GetToMention {
        const sheens = this.sheens;
        const killstreakers = this.killstreakers;
        const strangeParts = this.strangeParts;
        const painted = this.painted;
        return { sheens, killstreakers, strangeParts, painted };
    }

    getAutokeysStatus(): GetAutokeysStatus {
        return this.autokeysStatus;
    }

    onRun(): Promise<OnRun> {
        return Promise.all([
            files.readFile(this.paths.files.loginKey, false),
            files.readFile(this.paths.files.pricelist, true),
            files.readFile(this.paths.files.loginAttempts, true),
            files.readFile(this.paths.files.pollData, true)
        ]).then(([loginKey, pricelist, loginAttempts, pollData]) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            return { loginKey, pricelist, loginAttempts, pollData };
        });
    }

    onReady(): void {
        log.info(
            'TF2Autobot v' +
                process.env.BOT_VERSION +
                ' is ready! ' +
                pluralize('item', this.bot.pricelist.getLength(), true) +
                ' in pricelist, ' +
                pluralize('listing', this.bot.listingManager.listings.length, true) +
                ' on www.backpack.tf (cap: ' +
                String(this.bot.listingManager.cap) +
                ')'
        );

        this.bot.client.gamesPlayed(this.bot.options.game.playOnlyTF2 ? 440 : [this.customGameName, 440]);
        this.bot.client.setPersona(EPersonaState.Online);

        this.botSteamID = this.bot.client.steamID;

        // Get Premium info from backpack.tf
        void this.getBPTFAccountInfo();

        // Smelt / combine metal if needed
        keepMetalSupply(this.bot, this.minimumScrap, this.minimumReclaimed, this.combineThreshold);

        // Craft duplicate weapons
        craftDuplicateWeapons(this.bot);

        // Shuffle weapons on start
        this.shuffleWeapons();

        // Craft class weapons
        this.classWeaponsTimeout = setTimeout(() => {
            // called after 2 minutes to craft metals and duplicated weapons first.
            void craftClassWeapons(this.bot);
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

        // Check for missing listings every 30 minutes, initiate setInterval 5 minutes after start
        setTimeout(() => {
            this.enableAutoRefreshListings();
        }, 5 * 60 * 1000);
    }

    onShutdown(): Promise<void> {
        return new Promise(resolve => {
            if (this.bot.options.autokeys.enable && this.autokeys.isActive) {
                log.debug('Disabling Autokeys and disabling key entry in the pricelist...');
                this.autokeys.disable();
            }

            if (this.bot.listingManager.ready !== true) {
                // We have not set up the listing manager, don't try and remove listings
                return resolve();
            }

            void this.bot.listings.removeAll().asCallback(err => {
                if (err) {
                    log.warn('Failed to remove all listings: ', err);
                }

                resolve();
            });
        });
    }

    onLoggedOn(): void {
        if (this.bot.isReady()) {
            this.bot.client.setPersona(EPersonaState.Online);
            this.bot.client.gamesPlayed(this.bot.options.game.playOnlyTF2 ? 440 : [this.customGameName, 440]);
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

        this.recentlySentMessage[steamID64] =
            (this.recentlySentMessage[steamID64] === undefined ? 0 : this.recentlySentMessage[steamID64]) + 1;

        this.commands.processMessage(steamID, message);
    }

    onLoginKey(loginKey: string): void {
        log.debug('New login key');

        files.writeFile(this.paths.files.loginKey, loginKey, false).catch(err => {
            log.warn('Failed to save login key: ', err);
        });
    }

    onLoginError(err: CustomError): void {
        if (err.eresult === EResult.InvalidPassword) {
            files.deleteFile(this.paths.files.loginKey).catch(err => {
                log.warn('Failed to delete login key: ', err);
            });
        }
    }

    onLoginAttempts(attempts: number[]): void {
        files.writeFile(this.paths.files.loginAttempts, attempts, true).catch(err => {
            log.warn('Failed to save login attempts: ', err);
        });
    }

    onFriendRelationship(steamID: SteamID, relationship: number): void {
        if (relationship === EFriendRelationship.Friend) {
            this.onNewFriend(steamID);
            this.checkFriendsCount(steamID);
        } else if (relationship === EFriendRelationship.RequestRecipient) {
            this.respondToFriendRequest(steamID);
        }
    }

    onGroupRelationship(groupID: SteamID, relationship: number): void {
        log.debug('Group relation changed', { steamID: groupID, relationship: relationship });
        if (relationship === EClanRelationship.Invited) {
            const join = this.groups.includes(groupID.getSteamID64());

            log.info(`Got invited to group ${groupID.getSteamID64()}, ${join ? 'accepting...' : 'declining...'}`);
            this.bot.client.respondToGroupInvite(groupID, this.groups.includes(groupID.getSteamID64()));
        } else if (relationship === EClanRelationship.Member) {
            log.info(`Joined group ${groupID.getSteamID64()}`);
        }
    }

    onBptfAuth(auth: { apiKey: string; accessToken: string }): void {
        const details = Object.assign({ private: true }, auth);

        log.warn('Please add your backpack.tf API key and access token to your environment variables!', details);
    }

    enableAutoRefreshListings(): void {
        // Automatically check for missing listings every 30 minutes
        if (this.isAutoRelistEnabled && this.isPremium === false) {
            return;
        }

        this.autoRefreshListingsTimeout = setInterval(() => {
            log.debug('Running automatic check for missing listings...');

            const listingsSKUs: string[] = [];
            this.bot.listingManager.getListings(err => {
                if (err) {
                    setTimeout(() => {
                        this.enableAutoRefreshListings();
                    }, 30 * 60 * 1000);
                    clearTimeout(this.autoRefreshListingsTimeout);
                    return;
                }
                this.bot.listingManager.listings.forEach(listing => {
                    listingsSKUs.push(listing.getSKU());
                });

                // Remove duplicate elements
                const newlistingsSKUs: string[] = [];
                listingsSKUs.forEach(sku => {
                    if (!newlistingsSKUs.includes(sku)) {
                        newlistingsSKUs.push(sku);
                    }
                });

                const pricelist = this.bot.pricelist.getPrices().filter(entry => {
                    // Filter our pricelist to only the items that are missing.
                    return entry.enabled && !newlistingsSKUs.includes(entry.sku);
                });

                if (pricelist.length > 0) {
                    log.debug('Checking listings for ' + pluralize('item', pricelist.length, true) + '...');
                    void this.bot.listings.recursiveCheckPricelistWithDelay(pricelist).asCallback(() => {
                        log.debug('✅ Done checking ' + pluralize('item', pricelist.length, true));
                    });
                } else {
                    log.debug('❌ Nothing to refresh.');
                }
            });
        }, 30 * 60 * 1000);
    }

    disableAutoRefreshListings(): void {
        if (this.isPremium) {
            return;
        }
        clearTimeout(this.autoRefreshListingsTimeout);
    }

    getWeapons(): string[] {
        return this.weapons;
    }

    shuffleWeapons(): void {
        if (!this.isWeaponsAsCurrency.enable) {
            return;
        }
        const weapons = this.isWeaponsAsCurrency.withUncraft ? craftAll.concat(uncraftAll) : craftAll;
        this.weapons = shuffleArray(weapons);

        // Shuffle weapons position every 11 minutes (prime number)
        this.shuffleWeaponsTimeout = setInterval(() => {
            this.weapons = shuffleArray(weapons);
        }, 11 * 60 * 1000);
    }

    disableWeaponsAsCurrency(): void {
        this.weapons.length = 0;
        clearTimeout(this.shuffleWeaponsTimeout);
    }

    async onNewTradeOffer(offer: TradeOffer): Promise<null | OnNewTradeOffer> {
        offer.log('info', 'is being processed...');

        // Allow sending notifications
        offer.data('notify', true);

        // If crafting class weapons still waiting, cancel it.
        clearTimeout(this.classWeaponsTimeout);

        const opt = this.bot.options;

        const ourItems = Inventory.fromItems(
            this.bot.client.steamID === null ? this.botSteamID : this.bot.client.steamID,
            offer.itemsToGive,
            this.bot.manager,
            this.bot.schema,
            this.bot.options
        );

        const theirItems = Inventory.fromItems(
            offer.partner,
            offer.itemsToReceive,
            this.bot.manager,
            this.bot.schema,
            this.bot.options
        );

        const items = {
            our: ourItems.getItems(),
            their: theirItems.getItems()
        };

        const exchange = {
            contains: { items: false, metal: false, keys: false },
            our: { value: 0, keys: 0, scrap: 0, contains: { items: false, metal: false, keys: false } },
            their: { value: 0, keys: 0, scrap: 0, contains: { items: false, metal: false, keys: false } }
        };

        const itemsDict: ItemsDict = { our: {}, their: {} };

        const states = [false, true];

        let hasInvalidItems = false;

        const entry = this.bot.pricelist;
        const stock = this.bot.inventoryManager.getInventory();

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

                const itemEntry = entry.getPrice(sku, false);
                const currentStock = stock.getAmount(sku, true);

                if (which === 'our') {
                    itemsDict.our[sku] = {
                        amount: amount,
                        stock: currentStock,
                        maxStock: itemEntry !== null ? itemEntry.max : 0
                    };
                } else {
                    itemsDict.their[sku] = {
                        amount: amount,
                        stock: currentStock,
                        maxStock: itemEntry !== null ? itemEntry.max : 0
                    };
                }
            }
        }

        offer.data('dict', itemsDict);

        // Always check if trade partner is taking higher value items (such as spelled or strange parts) that are not in our pricelist

        const highValueOur = check.highValue(
            offer.itemsToGive,
            this.sheens,
            this.killstreakers,
            this.strangeParts,
            this.painted,
            this.bot
        );
        const highValueTheir = check.highValue(
            offer.itemsToReceive,
            this.sheens,
            this.killstreakers,
            this.strangeParts,
            this.painted,
            this.bot
        );

        const input: HighValueInput = {
            our: highValueOur,
            their: highValueTheir
        };

        // Check if the offer is from an admin
        if (this.bot.isAdmin(offer.partner)) {
            offer.log(
                'trade',
                `is from an admin, accepting. Summary:\n${
                    this.isShowChanges
                        ? offer.summarizeWithStockChanges(this.bot.schema, 'summary')
                        : offer.summarize(this.bot.schema)
                }`
            );
            return {
                action: 'accept',
                reason: 'ADMIN',
                meta: { highValue: highValueMeta(input) }
            };
        }

        if (hasInvalidItems) {
            // Using boolean because items dict always needs to be saved
            offer.log('info', 'contains items not from TF2, declining...');
            return { action: 'decline', reason: '🟨_INVALID_ITEMS_CONTAINS_NON_TF2' };
        }

        const itemsDiff = offer.getDiff();

        const offerMessage = offer.message.toLowerCase();

        const isGift = giftWords.some(word => {
            return offerMessage.includes(word);
        });

        if (offer.itemsToGive.length === 0 && isGift) {
            offer.log(
                'trade',
                `is a gift offer, accepting. Summary:\n${
                    this.isShowChanges
                        ? offer.summarizeWithStockChanges(this.bot.schema, 'summary')
                        : offer.summarize(this.bot.schema)
                }`
            );
            return {
                action: 'accept',
                reason: 'GIFT',
                meta: { highValue: highValueMeta(input) }
            };
        } else if (offer.itemsToGive.length === 0 && offer.itemsToReceive.length > 0 && !isGift) {
            if (opt.allowGiftNoMessage) {
                offer.log(
                    'info',
                    'is a gift offer without any offer message, but allowed to be accepted, accepting...'
                );
                return {
                    action: 'accept',
                    reason: 'GIFT',
                    meta: { highValue: highValueMeta(input) }
                };
            } else {
                offer.log('info', 'is a gift offer without any offer message, declining...');
                return { action: 'decline', reason: 'GIFT_NO_NOTE' };
            }
        } else if (offer.itemsToGive.length > 0 && offer.itemsToReceive.length === 0) {
            offer.log('info', 'is taking our items for free, declining...');
            return { action: 'decline', reason: 'CRIME_ATTEMPT' };
        }

        // Check for Dueling Mini-Game and/or Noise maker for 5x/25x Uses only when enabled
        // and decline if not 5x/25x and exist in pricelist

        const checkExist = this.bot.pricelist;

        if (opt.checkUses.duel || opt.checkUses.noiseMaker) {
            const im = check.uses(offer, offer.itemsToReceive, this.bot);

            if (im.isNot5Uses && checkExist.getPrice('241;6', true) !== null) {
                // Dueling Mini-Game: Only decline if exist in pricelist
                offer.log('info', 'contains Dueling Mini-Game that does not have 5 uses.');
                return { action: 'decline', reason: 'DUELING_NOT_5_USES' };
            }

            const isHasNoiseMaker = im.noiseMakerSKU.some(sku => {
                return checkExist.getPrice(sku, true) !== null;
            });

            if (im.isNot25Uses && isHasNoiseMaker) {
                // Noise Maker: Only decline if exist in pricelist
                offer.log('info', 'contains Noice Maker that does not have 25 uses.');
                return { action: 'decline', reason: 'NOISE_MAKER_NOT_25_USES' };
            }
        }

        const isInPricelist =
            highValueOur.skus.length > 0 // Only check if this not empty
                ? highValueOur.skus.some(sku => {
                      return checkExist.getPrice(sku, false) !== null; // Return true if exist in pricelist, enabled or not.
                  })
                : null;

        if (highValueOur.has && isInPricelist === false) {
            // Decline trade that offer overpay on high valued (spelled) items that are not in our pricelist.
            offer.log('info', 'contains higher value item on our side that is not in our pricelist.');

            // Inform admin via Steam Chat or Discord Webhook Something Wrong Alert.
            if (opt.discordWebhook.sendAlert.enable && opt.discordWebhook.sendAlert.url !== '') {
                sendAlert('highValue', this.bot, null, null, null, highValueOur.names);
            } else {
                this.bot.messageAdmins(
                    `Someone is attempting to purchase a high valued item that you own but is not in your pricelist:\n- ${highValueOur.names.join(
                        '\n\n- '
                    )}`,
                    []
                );
            }

            return {
                action: 'decline',
                reason: 'HIGH_VALUE_ITEMS_NOT_SELLING',
                meta: {
                    highValueName: highValueOur.names
                }
            };
        }

        const manualReviewEnabled = opt.manualReview.enable;

        const itemPrices: Prices = {};

        const keyPrice = this.bot.pricelist.getKeyPrice();

        let hasOverstock = false;

        let hasUnderstock = false;

        // A list of things that is wrong about the offer and other information
        const wrongAboutOffer: WrongAboutOffer[] = [];

        let assetidsToCheck: string[] = [];
        let skuToCheck: string[] = [];
        let hasNoPrice = false;
        let hasInvalidItemsOur = false;

        for (let i = 0; i < states.length; i++) {
            const buying = states[i];
            const which = buying ? 'their' : 'our';
            const intentString = buying ? 'buy' : 'sell';

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
                    this.isWeaponsAsCurrency.enable &&
                    (craftAll.includes(sku) || (this.isWeaponsAsCurrency.withUncraft && uncraftAll.includes(sku))) &&
                    this.bot.pricelist.getPrice(sku, true) === null
                ) {
                    const value = 0.5 * amount;
                    exchange[which].value += value;
                    exchange[which].scrap += value;
                } else {
                    const match = this.bot.pricelist.getPrice(sku, true);
                    const notIncludeCraftweapon = this.isWeaponsAsCurrency.enable
                        ? !(
                              craftAll.includes(sku) ||
                              (this.isWeaponsAsCurrency.withUncraft && uncraftAll.includes(sku))
                          )
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
                        const diff = itemsDiff[sku] as number | null;

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

                            this.bot.listings.checkBySKU(match.sku);
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

                            this.bot.listings.checkBySKU(match.sku);
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
                    } else if (
                        (match === null && notIncludeCraftweapon) ||
                        (match !== null && match.intent === (buying ? 1 : 0))
                    ) {
                        // Offer contains an item that we are not trading
                        hasInvalidItems = true;

                        // If that particular item is on our side, then put to review
                        if (which === 'our') {
                            hasInvalidItemsOur = true;
                        }

                        // await sleepasync().Promise.sleep(1 * 1000);
                        const price = (await this.bot.pricelist.getPricesTF(sku)) as GetPrices;

                        const item = SKU.fromString(sku);

                        // "match" will return null if the item is not enabled
                        // define "recheckMatch" with onlyEnabled = false
                        const recheckMatch = this.bot.pricelist.getPrice(sku, false);

                        // If recheckMatch is not null, then check the enabled key (most likely false here),
                        // else means the item is truly not in pricelist and make "isCanBePriced" true
                        const isCanBePriced = recheckMatch !== null ? recheckMatch.enabled : true;

                        let itemSuggestedValue: string;

                        if (price === null) {
                            itemSuggestedValue = 'No price';
                            hasNoPrice = true;
                        } else {
                            price.buy = new Currencies(price.buy);
                            price.sell = new Currencies(price.sell);

                            if (opt.manualReview.invalidItems.givePrice && item.wear === null && isCanBePriced) {
                                // if DISABLE_GIVE_PRICE_TO_INVALID_ITEMS is set to false (enable) and items is not skins/war paint,
                                // and the item is not enabled=false,
                                // then give that item price and include in exchange
                                exchange[which].value += price[intentString].toValue(keyPrice.metal) * amount;
                                exchange[which].keys += price[intentString].keys * amount;
                                exchange[which].scrap += Currencies.toScrap(price[intentString].metal) * amount;
                            }
                            const valueInRef = {
                                buy: Currencies.toRefined(price.buy.toValue(keyPrice.metal)),
                                sell: Currencies.toRefined(price.sell.toValue(keyPrice.metal))
                            };

                            itemSuggestedValue =
                                (intentString === 'buy' ? valueInRef.buy : valueInRef.sell) >= keyPrice.metal
                                    ? `${valueInRef.buy.toString()} ref (${price.buy.toString()})` +
                                      ` / ${valueInRef.sell.toString()} ref (${price.sell.toString()})`
                                    : `${price.buy.toString()} / ${price.sell.toString()}`;
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
        if (opt.showOnlyMetal) {
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
                const diff = itemsDiff['5021;6'] as number | null;
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

                    this.bot.listings.checkBySKU('5021;6');
                }

                const acceptUnderstock = opt.autokeys.accept.understock;

                if (diff !== 0 && !isBuying && amountCanTrade < Math.abs(diff) && !acceptUnderstock) {
                    // User is taking too many
                    hasUnderstock = true;

                    wrongAboutOffer.push({
                        reason: '🟩_UNDERSTOCKED',
                        sku: '5021;6',
                        selling: !isBuying,
                        diff: diff,
                        amountCanTrade: amountCanTrade
                    });

                    this.bot.listings.checkBySKU('5021;6');
                }
            }
        }

        const exceptionSKU = this.invalidValueExceptionSKU;
        const itemsList = itemList(offer);
        const ourItemsSKU = itemsList.our;
        const theirItemsSKU = itemsList.their;

        const isOurItems = exceptionSKU.some(fromEnv => {
            return ourItemsSKU.some(ourItemSKU => {
                return ourItemSKU.includes(fromEnv);
            });
        });

        const isThierItems = exceptionSKU.some(fromEnv => {
            return theirItemsSKU.some(theirItemSKU => {
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
                        uniqueReasons: filterReasons(uniqueReasons),
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
                        uniqueReasons: filterReasons(uniqueReasons),
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
                        uniqueReasons: filterReasons(uniqueReasons),
                        reasons: wrongAboutOffer
                    }
                };
            }
        }

        if (exchange.our.value < exchange.their.value && !opt.allowOverpay) {
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
                    uniqueReasons: filterReasons(uniqueReasons),
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
                    uniqueReasons: filterReasons(uniqueReasons),
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
                    void Promise.resolve(inventory.isDuped(assetid)).asCallback((err, result) => {
                        log.debug('Dupe check for ' + assetid + ' done');
                        callback(err, result);
                    });
                };
            });

            try {
                const result: (boolean | null)[] = await Promise.fromCallback(callback => {
                    async.series(requests, callback);
                });

                log.debug('Got result from dupe checks on ' + assetidsToCheck.join(', '), { result: result });

                const declineDupes = opt.manualReview.duped.declineDuped;

                for (let i = 0; i < result.length; i++) {
                    if (result[i] === true) {
                        // Found duped item
                        if (declineDupes) {
                            // Offer contains duped items, decline it
                            return {
                                action: 'decline',
                                reason: '🟫_DUPED_ITEMS',
                                meta: { assetids: assetidsToCheck, sku: skuToCheck, result: result }
                            };
                        } else {
                            // Offer contains duped items but we don't decline duped items, instead add it to the wrong about offer list and continue
                            wrongAboutOffer.push({
                                reason: '🟫_DUPED_ITEMS',
                                assetid: assetidsToCheck[i],
                                sku: skuToCheck[i]
                            });
                        }
                    } else if (result[i] === null) {
                        // Could not determine if the item was duped, make the offer be pending for review
                        wrongAboutOffer.push({
                            reason: '🟪_DUPE_CHECK_FAILED',
                            withError: false,
                            assetid: assetidsToCheck[i],
                            sku: skuToCheck[i]
                        });
                    }
                }
            } catch (err) {
                const theErr = err as Error;

                log.warn('Failed dupe check on ' + assetidsToCheck.join(', ') + ': ' + theErr.message);
                wrongAboutOffer.push({
                    reason: '🟪_DUPE_CHECK_FAILED',
                    withError: true,
                    assetid: assetidsToCheck,
                    sku: skuToCheck,
                    error: theErr.message
                });
            }
        }

        // TO DO: Counter offer?

        if (wrongAboutOffer.length !== 0) {
            const reasons = wrongAboutOffer.map(wrong => wrong.reason);
            const uniqueReasons = filterReasons(reasons.filter(reason => reasons.includes(reason)));

            const isInvalidValue = uniqueReasons.includes('🟥_INVALID_VALUE');
            const isInvalidItem = uniqueReasons.includes('🟨_INVALID_ITEMS');
            const isOverstocked = uniqueReasons.includes('🟦_OVERSTOCKED');
            const isUnderstocked = uniqueReasons.includes('🟩_UNDERSTOCKED');
            const isDupedItem = uniqueReasons.includes('🟫_DUPED_ITEMS');
            const isDupedCheckFailed = uniqueReasons.includes('🟪_DUPE_CHECK_FAILED');

            const canAcceptInvalidItemsOverpay = opt.manualReview.invalidItems.autoAcceptOverpay;
            const canAcceptOverstockedOverpay = opt.manualReview.overstocked.autoAcceptOverpay;
            const canAcceptUnderstockedOverpay = opt.manualReview.understocked.autoAcceptOverpay;

            // accepting 🟨_INVALID_ITEMS overpay

            const isAcceptInvalidItems =
                isInvalidItem &&
                canAcceptInvalidItemsOverpay &&
                !hasInvalidItemsOur &&
                (exchange.our.value < exchange.their.value ||
                    (exchange.our.value === exchange.their.value && hasNoPrice)) &&
                (isOverstocked ? canAcceptOverstockedOverpay : true) &&
                (isUnderstocked ? canAcceptUnderstockedOverpay : true);

            // accepting 🟦_OVERSTOCKED overpay

            const isAcceptOverstocked =
                isOverstocked &&
                canAcceptOverstockedOverpay &&
                exchange.our.value < exchange.their.value &&
                (isInvalidItem ? canAcceptInvalidItemsOverpay : true) &&
                (isUnderstocked ? canAcceptUnderstockedOverpay : true);

            // accepting 🟩_UNDERSTOCKED overpay

            const isAcceptUnderstocked =
                isUnderstocked &&
                canAcceptUnderstockedOverpay &&
                exchange.our.value < exchange.their.value &&
                (isInvalidItem ? canAcceptInvalidItemsOverpay : true) &&
                (isOverstocked ? canAcceptOverstockedOverpay : true);

            if (
                (isAcceptInvalidItems || isAcceptOverstocked || isAcceptUnderstocked) &&
                exchange.our.value !== 0 &&
                !(isInvalidValue || isDupedItem || isDupedCheckFailed)
            ) {
                // if the offer is Invalid_items/over/understocked and accepting overpay enabled, but the offer is not
                // includes Invalid_value, duped or duped check failed, true for acceptTradeCondition and our side not empty,
                // accept the trade.
                offer.log(
                    'trade',
                    `contains INVALID_ITEMS/OVERSTOCKED/UNDERSTOCKED, but offer value is greater or equal, accepting. Summary:\n${
                        this.isShowChanges
                            ? offer.summarizeWithStockChanges(this.bot.schema, 'summary')
                            : offer.summarize(this.bot.schema)
                    }`
                );

                const isManyItems = offer.itemsToGive.length + offer.itemsToReceive.length > 50;

                if (isManyItems) {
                    this.bot.sendMessage(
                        offer.partner,
                        'I have accepted your offer. The trade may take a while to finalize due to it being a large offer.' +
                            ' If the trade does not finalize after 5-10 minutes has passed, please send your offer again, or add me and use the !sell/!sellcart or !buy/!buycart command.'
                    );
                } else {
                    this.bot.sendMessage(
                        offer.partner,
                        'I have accepted your offer. The trade should be finalized shortly.' +
                            ' If the trade does not finalize after 1-2 minutes has passed, please send your offer again, or add me and use the !sell/!sellcart or !buy/!buycart command.'
                    );
                }

                return {
                    action: 'accept',
                    reason: 'VALID_WITH_OVERPAY',
                    meta: {
                        uniqueReasons: uniqueReasons,
                        reasons: wrongAboutOffer,
                        highValue: highValueMeta(input)
                    }
                };
            } else if (
                opt.manualReview.invalidValue.autoDecline.enable &&
                isInvalidValue &&
                !(isUnderstocked || isInvalidItem || isOverstocked || isDupedItem || isDupedCheckFailed) &&
                this.hasInvalidValueException === false
            ) {
                // If only INVALID_VALUE and did not matched exception value, will just decline the trade.
                return { action: 'decline', reason: 'ONLY_INVALID_VALUE' };
            } else if (
                opt.manualReview.overstocked.autoDecline &&
                isOverstocked &&
                !(isInvalidItem || isDupedItem || isDupedCheckFailed)
            ) {
                // If only OVERSTOCKED and Auto-decline OVERSTOCKED enabled, will just decline the trade.
                return { action: 'decline', reason: 'ONLY_OVERSTOCKED' };
            } else if (
                opt.manualReview.understocked.autoDecline &&
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
                    highValue: highValueMeta(input)
                };

                offer.data('reviewMeta', reviewMeta);

                return {
                    action: 'skip',
                    reason: 'REVIEW',
                    meta: reviewMeta
                };
            }
        }

        offer.log(
            'trade',
            `accepting. Summary:\n${
                this.isShowChanges
                    ? offer.summarizeWithStockChanges(this.bot.schema, 'summary')
                    : offer.summarize(this.bot.schema)
            }`
        );

        const isManyItems = offer.itemsToGive.length + offer.itemsToReceive.length > 50;

        if (isManyItems) {
            this.bot.sendMessage(
                offer.partner,
                'I have accepted your offer. The trade may take a while to finalize due to it being a large offer.' +
                    ' If the trade does not finalize after 5-10 minutes has passed, please send your offer again, or add me and use the !sell/!sellcart or !buy/!buycart command.'
            );
        } else {
            this.bot.sendMessage(
                offer.partner,
                'I have accepted your offer. The trade will be finalized shortly.' +
                    ' If the trade does not finalize after 1-2 minutes has passed, please send your offer again, or add me and use the !sell/!sellcart or !buy/!buycart command.'
            );
        }

        return {
            action: 'accept',
            reason: 'VALID',
            meta: {
                highValue: highValueMeta(input)
            }
        };
    }

    // TODO: checkBanned and checkEscrow are copied from UserCart, don't duplicate them

    onTradeOfferChanged(offer: TradeOffer, oldState: number, processTime?: number): void {
        // Not sure if it can go from other states to active
        if (oldState === TradeOfferManager.ETradeOfferState['Accepted']) {
            offer.data('switchedState', oldState);
        }

        const highValue: {
            isDisableSKU: string[];
            theirItems: string[];
        } = {
            isDisableSKU: [],
            theirItems: []
        };

        const handledByUs = offer.data('handledByUs') === true;
        const notify = offer.data('notify') === true;

        if (handledByUs && offer.data('switchedState') !== offer.state) {
            if (notify) {
                if (offer.state === TradeOfferManager.ETradeOfferState['Accepted']) {
                    accepted(offer, this.bot);
                } else if (offer.state === TradeOfferManager.ETradeOfferState['InEscrow']) {
                    acceptEscrow(offer, this.bot);
                } else if (offer.state === TradeOfferManager.ETradeOfferState['Declined']) {
                    declined(offer, this.bot, this.isTradingKeys);
                    this.isTradingKeys = false; // reset
                } else if (offer.state === TradeOfferManager.ETradeOfferState['Canceled']) {
                    cancelled(offer, oldState, this.bot);
                } else if (offer.state === TradeOfferManager.ETradeOfferState['InvalidItems']) {
                    invalid(offer, this.bot);
                }
            }

            if (offer.state === TradeOfferManager.ETradeOfferState['Accepted']) {
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

                const result = processAccepted(offer, autokeys, this.bot, this.isTradingKeys, processTime);

                this.isTradingKeys = false; // reset

                highValue.isDisableSKU = result.isDisableSKU;
                highValue.theirItems = result.theirHighValuedItems;
            }
        }

        if (offer.state === TradeOfferManager.ETradeOfferState['Accepted']) {
            // Offer is accepted

            // Smelt / combine metal
            keepMetalSupply(this.bot, this.minimumScrap, this.minimumReclaimed, this.combineThreshold);

            // Craft duplicated weapons
            craftDuplicateWeapons(this.bot);

            this.classWeaponsTimeout = setTimeout(() => {
                // called after 2 minutes to craft metals and duplicated weapons first.
                void craftClassWeapons(this.bot);
            }, 2 * 60 * 1000);

            // Sort inventory
            this.sortInventory();

            // Tell bot uptime
            log.debug(uptime());

            // Update listings
            updateListings(offer, this.bot, highValue);

            // Invite to group
            this.inviteToGroups(offer.partner);
        }
    }

    onOfferAction(offer: TradeOffer, action: 'accept' | 'decline' | 'skip', reason: string, meta: Meta): void {
        const notify = offer.data('notify') === true;
        if (!notify) {
            return;
        }

        if (action === 'skip') {
            sendReview(offer, this.bot, meta, this.isTradingKeys);
            this.isTradingKeys = false; // reset
        }
    }

    private sortInventory(): void {
        if (this.bot.options.sortInventory) {
            this.bot.tf2gc.sortInventory(3);
        }
    }

    private inviteToGroups(steamID: SteamID | string): void {
        if (!this.bot.options.enableGroupInvites) {
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

            const relation = this.bot.client.myFriends[steamID64] as number;
            if (relation === EFriendRelationship.RequestRecipient) {
                this.respondToFriendRequest(steamID64);
            }
        }

        this.bot.getAdmins().forEach(steamID => {
            if (!this.bot.friends.isFriend(steamID)) {
                log.info(`Not friends with admin ${steamID.toString()}, sending friend request...`);
                this.bot.client.addFriend(steamID, err => {
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

        this.bot.client.addFriend(steamID, err => {
            if (err) {
                log.warn(`Failed to a send friend request to ${steamID64}: `, err);
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
                        this.bot.options.customMessage.welcome
                            ? this.bot.options.customMessage.welcome
                                  .replace(/%name%/g, '')
                                  .replace(/%admin%/g, isAdmin ? '!help' : '!how2trade') +
                                  ` - TF2Autobot v${process.env.BOT_VERSION}`
                            : `Hi! If you don't know how things work, please type "!` +
                                  (isAdmin ? 'help' : 'how2trade') +
                                  `" - TF2Autobot v${process.env.BOT_VERSION}`
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
                this.bot.options.customMessage.welcome
                    ? this.bot.options.customMessage.welcome
                          .replace(/%name%/g, friend.player_name)
                          .replace(/%admin%/g, isAdmin ? '!help' : '!how2trade') +
                          ` - TF2Autobot v${process.env.BOT_VERSION}`
                    : `Hi ${friend.player_name}! If you don't know how things work, please type "!` +
                          (isAdmin ? 'help' : 'how2trade') +
                          `" - TF2Autobot v${process.env.BOT_VERSION}`
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
            this.friendsToKeep.forEach(steamID => {
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
                    this.bot.options.customMessage.clearFriends
                        ? this.bot.options.customMessage.clearFriends.replace(/%name%/g, friend.player_name)
                        : '/quote I am cleaning up my friend list and you have randomly been selected to be removed. Please feel free to add me again if you want to trade at a later time!'
                );
                this.bot.client.removeFriend(element.steamID);
            });
        }
    }

    private getBPTFAccountInfo(): Promise<void> {
        return new Promise((resolve, reject) => {
            const steamID64 = this.bot.manager.steamID.getSteamID64();

            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            request(
                {
                    url: 'https://backpack.tf/api/users/info/v1',
                    method: 'GET',
                    qs: {
                        key: this.bot.options.bptfAPIKey,
                        steamids: steamID64
                    },
                    gzip: true,
                    json: true
                },
                (err, reponse, body) => {
                    if (err) {
                        log.debug('Failed requesting bot info from backpack.tf, retrying in 5 minutes: ', err);
                        clearTimeout(this.retryRequest);

                        this.retryRequest = setTimeout(() => {
                            void this.getBPTFAccountInfo();
                        }, 5 * 60 * 1000);
                        return reject();
                    }

                    const thisBody = body as BPTFGetUserInfo;

                    const user = thisBody.users[steamID64];
                    this.botName = user.name;
                    this.botAvatarURL = user.avatar;

                    const isPremium = user.premium ? user.premium === 1 : false;
                    this.isPremium = isPremium;
                    return resolve();
                }
            );
        });
    }

    private checkGroupInvites(): void {
        log.debug('Checking group invites');

        for (const groupID64 in this.bot.client.myGroups) {
            if (!Object.prototype.hasOwnProperty.call(this.bot.client.myGroups, groupID64)) {
                continue;
            }

            const relationship = this.bot.client.myGroups[groupID64] as number;

            if (relationship === EClanRelationship.Invited) {
                this.bot.client.respondToGroupInvite(groupID64, false);
            }
        }

        this.groups.forEach(steamID => {
            if (
                this.bot.client.myGroups[steamID] !== EClanRelationship.Member &&
                this.bot.client.myGroups[steamID] !== EClanRelationship.Blocked
            ) {
                this.bot.community.getSteamGroup(new SteamID(steamID), (err, group) => {
                    if (err) {
                        log.warn('Failed to get group: ', err);
                        return;
                    }

                    log.info(`Not member of group ${group.name} ("${steamID}"), joining...`);
                    group.join(err => {
                        if (err) {
                            log.warn('Failed to join group: ', err);
                        }
                    });
                });
            }
        });
    }

    onPollData(pollData: PollData): void {
        files.writeFile(this.paths.files.pollData, pollData, true).catch(err => {
            log.warn('Failed to save polldata: ', err);
        });
    }

    onPricelist(pricelist: Entry[]): void {
        if (!this.isPriceUpdateWebhook) {
            log.debug('Pricelist changed');
        }

        if (pricelist.length === 0) {
            // Ignore errors
            void this.bot.listings.removeAll().asCallback();
        }

        files
            .writeFile(
                this.paths.files.pricelist,
                pricelist.map(entry => entry.getJSON()),
                true
            )
            .catch(err => {
                log.warn('Failed to save pricelist: ', err);
            });
    }

    onPriceChange(sku: string, entry: Entry): void {
        this.bot.listings.checkBySKU(sku, entry);
    }

    onLoginThrottle(wait: number): void {
        log.warn(`Waiting ${wait} ms before trying to sign in...`);
    }

    onTF2QueueCompleted(): void {
        log.debug('Queue finished');
        this.bot.client.gamesPlayed(this.bot.options.game.playOnlyTF2 ? 440 : [this.customGameName, 440]);
    }
}

function shuffleArray(arr: string[]): string[] {
    return arr.sort(() => Math.random() - 0.5);
}

function filterReasons(reasons: string[]): string[] {
    const filtered: string[] = [];

    // Filter out duplicate reasons
    reasons.forEach(reason => {
        if (!filtered.includes(reason)) {
            filtered.push(reason);
        }
    });

    return filtered;
}

function highValueMeta(info: HighValueInput): HighValueOutput {
    return {
        has: {
            our: info.our.has,
            their: info.their.has
        },
        items: {
            our: {
                skus: info.our.skus,
                names: info.our.names
            },
            their: {
                skus: info.their.skus,
                names: info.their.names
            }
        },
        isMention: {
            our: info.our.isMention,
            their: info.their.isMention
        }
    };
}

interface OnRun {
    loginAttempts?: number[];
    pricelist?: EntryData[];
    loginKey?: string;
    pollData?: PollData;
}

interface OnNewTradeOffer {
    action: 'accept' | 'decline' | 'skip';
    reason: string;
    meta?: Meta;
}

interface BotInfo {
    name: string;
    avatarURL: string;
    steamID: string;
    premium: boolean;
}

interface GetToMention {
    sheens: string[];
    killstreakers: string[];
    strangeParts: string[];
    painted: string[];
}

interface GetAutokeysStatus {
    isActive: boolean;
    isBuying: boolean;
    isBanking: boolean;
}

interface GetPrices {
    success: boolean;
    sku?: string;
    name?: string;
    currency?: number | string;
    source?: string;
    time?: string;
    buy?: Currencies;
    sell?: Currencies;
    message?: string;
}
