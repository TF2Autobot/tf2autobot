import SKU from '@tf2autobot/tf2-sku';
import axios, { AxiosError } from 'axios';
import { EClanRelationship, EFriendRelationship, EPersonaState } from 'steam-user';
import TradeOfferManager, {
    TradeOffer,
    PollData,
    ItemsDict,
    Meta,
    WrongAboutOffer,
    Prices,
    Items
} from '@tf2autobot/tradeoffer-manager';

import pluralize from 'pluralize';
import SteamID from 'steamid';
import Currencies from '@tf2autobot/tf2-currencies';
import { UnknownDictionary } from '../../types/common';

import { accepted, declined, cancelled, acceptEscrow, invalid } from './offer/notify/export-notify';
import { processAccepted, updateListings, PriceCheckQueue } from './offer/accepted/exportAccepted';
import processDeclined from './offer/processDeclined';
import { sendReview } from './offer/review/export-review';
import { keepMetalSupply, craftDuplicateWeapons, craftClassWeapons } from './utils/export-utils';

import { Blocked, BPTFGetUserInfo } from './interfaces';

import Handler, { OnRun } from '../Handler';
import Bot from '../Bot';
import Pricelist, { Entry, PricesDataObject, PricesObject } from '../Pricelist';
import Commands from '../Commands/Commands';
import CartQueue from '../Carts/CartQueue';
import Inventory from '../Inventory';
import TF2Inventory from '../TF2Inventory';
import Autokeys from '../Autokeys/Autokeys';

import { Paths } from '../../resources/paths';
import log from '../../lib/logger';
import * as files from '../../lib/files';
import { exponentialBackoff } from '../../lib/helpers';

import { noiseMakers } from '../../lib/data';
import { sendAlert } from '../DiscordWebhook/export';
import { summarize, uptime, getHighValueItems, testPriceKey } from '../../lib/tools/export';

import genPaths from '../../resources/paths';
import IPricer from '../IPricer';
import Options, { OfferType } from '../Options';
import SteamTradeOfferManager from '@tf2autobot/tradeoffer-manager';
import filterAxiosError from '@tf2autobot/filter-axios-error';

import sendTf2SystemMessage from '../DiscordWebhook/sendTf2SystemMessage';
import sendTf2DisplayNotification from '../DiscordWebhook/sendTf2DisplayNotification';
import sendTf2ItemBroadcast from '../DiscordWebhook/sendTf2ItemBroadcast';

const filterReasons = (reasons: string[]) => {
    const filtered = new Set(reasons);
    return [...filtered];
};

export default class MyHandler extends Handler {
    readonly commands: Commands;

    readonly autokeys: Autokeys;

    readonly cartQueue: CartQueue;

    private groupsStore: string[];

    private get opt(): Options {
        return this.bot.options;
    }

    private get groups(): string[] {
        if (this.groupsStore === undefined) {
            const groups = this.opt.groups;

            if (groups !== null && Array.isArray(groups)) {
                groups.forEach(groupID64 => {
                    if (!new SteamID(groupID64).isValid()) {
                        throw new Error(`Invalid group SteamID64 "${groupID64}"`);
                    }
                });

                this.groupsStore = groups;
                return groups;
            }
        } else {
            return this.groupsStore;
        }
    }

    private friendsToKeepStore: string[];

    get friendsToKeep(): string[] {
        if (this.friendsToKeepStore === undefined) {
            const friendsToKeep = this.opt.keep.concat(this.bot.getAdmins.map(steamID => steamID.getSteamID64()));

            if (friendsToKeep !== null && Array.isArray(friendsToKeep)) {
                friendsToKeep.forEach(steamID64 => {
                    if (!new SteamID(steamID64).isValid()) {
                        throw new Error(`Invalid SteamID64 "${steamID64}"`);
                    }
                });

                this.friendsToKeepStore = friendsToKeep;
                return friendsToKeep;
            }
        } else {
            return this.friendsToKeepStore;
        }
    }

    private get minimumScrap(): number {
        return this.opt.crafting.metals.minScrap;
    }

    private get minimumReclaimed(): number {
        return this.opt.crafting.metals.minRec;
    }

    private get combineThreshold(): number {
        return this.opt.crafting.metals.threshold;
    }

    get dupeCheckEnabled(): boolean {
        return this.opt.offerReceived.duped.enableCheck;
    }

    get minimumKeysDupeCheck(): number {
        return this.opt.offerReceived.duped.minKeys;
    }

    get isWeaponsAsCurrency(): { enable: boolean; withUncraft: boolean } {
        return {
            enable: this.opt.miscSettings.weaponsAsCurrency.enable,
            withUncraft: this.opt.miscSettings.weaponsAsCurrency.withUncraft
        };
    }

    private get invalidValueException(): number {
        return Currencies.toScrap(this.opt.offerReceived.invalidValue.exceptionValue.valueInRef);
    }

    private hasInvalidValueException = false;

    get customGameName(): string {
        const customGameName = this.opt.miscSettings.game.customName;
        return customGameName ? customGameName : `TF2Autobot`;
    }

    private get isCraftingManual(): boolean {
        return this.opt.crafting.manual;
    }

    private get isDeletingUntradableJunk(): boolean {
        return this.opt.miscSettings.deleteUntradableJunk.enable;
    }

    private isPremium = false;

    private botName = '';

    private botAvatarURL = '';

    private botSteamID: SteamID;

    get getBotInfo(): BotInfo {
        return { name: this.botName, avatarURL: this.botAvatarURL, steamID: this.botSteamID, premium: this.isPremium };
    }

    recentlySentMessage: UnknownDictionary<number> = {};

    private sentSummary: UnknownDictionary<boolean> = {};

    private resetSentSummaryTimeout: NodeJS.Timeout;

    private paths: Paths;

    get getPaths(): Paths {
        return this.paths;
    }

    private isUpdating = false;

    set isUpdatingStatus(setStatus: boolean) {
        this.isUpdating = setStatus;
    }

    private retryRequest: NodeJS.Timeout;

    private poller: NodeJS.Timeout;

    private refreshTimeout: NodeJS.Timeout;

    private classWeaponsTimeout: NodeJS.Timeout;

    private pollDataInterval: NodeJS.Timeout;

    constructor(public bot: Bot, private priceSource: IPricer) {
        super(bot);

        this.commands = new Commands(bot, priceSource);
        this.cartQueue = new CartQueue(bot);
        this.autokeys = new Autokeys(bot);

        this.paths = genPaths(this.opt.steamAccountName);

        PriceCheckQueue.setBot(this.bot);
        PriceCheckQueue.setRequestCheckFn(this.priceSource.requestCheck.bind(this.priceSource));
    }

    onRun(): Promise<OnRun> {
        this.poller = setInterval(() => {
            this.recentlySentMessage = {};
        }, 1000);

        return Promise.all([
            files.readFile(this.paths.files.pricelist, true),
            files.readFile(this.paths.files.loginAttempts, true),
            files.readFile(this.paths.files.pollData, true),
            files.readFile(this.paths.files.blockedList, true)
        ]).then(
            ([pricelist, loginAttempts, pollData, blockedList]: [PricesDataObject, number[], PollData, Blocked]) => {
                return { pricelist, loginAttempts, pollData, blockedList };
            }
        );
    }

    onReady(): void {
        log.info(
            `TF2Autobot v${process.env.BOT_VERSION} is ready | ${pluralize(
                'item',
                this.bot.pricelist.getLength,
                true
            )} in pricelist | Listings cap: ${String(this.bot.listingManager.cap)} | Startup time: ${process
                .uptime()
                .toFixed(0)} s`
        );

        this.bot.client.gamesPlayed(this.opt.miscSettings.game.playOnlyTF2 ? 440 : [this.customGameName, 440]);
        this.bot.client.setPersona(EPersonaState.Online);

        this.botSteamID = this.bot.client.steamID;

        // Get Premium info from backpack.tf
        this.getBPTFAccountInfo().catch(() => {
            // Ignore error
        });

        if (this.isCraftingManual === false) {
            // Smelt / combine metal if needed
            keepMetalSupply(this.bot, this.minimumScrap, this.minimumReclaimed, this.combineThreshold);

            // Craft duplicate weapons
            craftDuplicateWeapons(this.bot)
                .then(() => {
                    return craftClassWeapons(this.bot);
                })
                .catch(err => {
                    log.warn('Failed to craft duplicated craft/class weapons', err);
                });
        }

        if (this.isDeletingUntradableJunk) {
            // Delete untradable junk
            this.deleteUntradableJunk();
        }

        // Auto sell and buy keys if ref < minimum
        this.autokeys.check();

        // Sort the inventory after crafting / combining metal
        this.sortInventory();

        // Check friend requests that we got while offline
        this.checkFriendRequests();

        // Check group invites that we got while offline
        this.checkGroupInvites();

        // Initialize send stats
        this.bot.sendStats();

        // Check for missing listings every 30 minutes, initiate setInterval 5 minutes after start
        this.refreshTimeout = setTimeout(() => {
            this.bot.startAutoRefreshListings();
        }, 5 * 60 * 1000);

        this.pollDataInterval = setInterval(this.refreshPollDataPath.bind(this), 24 * 60 * 60 * 1000);

        // Send notification to admin/Discord Webhook if there's any item failed to go through updateOldPrices
        const failedToUpdateOldPrices = this.bot.pricelist.failedUpdateOldPrices;

        if (failedToUpdateOldPrices.length > 0) {
            const dw = this.opt.discordWebhook.sendAlert;
            const isDwEnabled = dw.enable && dw.url.main !== '';

            if (this.opt.sendAlert.enable && this.opt.sendAlert.failedToUpdateOldPrices) {
                if (isDwEnabled) {
                    sendAlert('failedToUpdateOldPrices', this.bot, '', null, null, failedToUpdateOldPrices);
                } else {
                    this.bot.messageAdmins(
                        `Failed to update old prices (probably because autoprice is set to true but item does not exist` +
                            ` on the pricer source):\n\n${failedToUpdateOldPrices.join(
                                '\n'
                            )}\n\nAll items above has been temporarily disabled.`,
                        []
                    );
                }
            }

            this.bot.pricelist.resetFailedUpdateOldPrices = 0;
        }

        // Send notification to admin/Discord Webhook if there's any partially priced item got reset on updateOldPrices
        const bulkUpdatedPartiallyPriced = this.bot.pricelist.partialPricedUpdateBulk;

        const count = bulkUpdatedPartiallyPriced.length;
        if (count > 0 && count < 20) {
            // we send only if less than 20
            const dw = this.opt.discordWebhook.sendAlert;
            const isDwEnabled = dw.enable && (dw.url.main !== '' || dw.url.partialPriceUpdate !== '');

            const msg = `All items below has been updated with partial price:\n\n• ${bulkUpdatedPartiallyPriced.join(
                '\n --- '
            )}`;

            if (this.opt.sendAlert.enable && this.opt.sendAlert.partialPrice.onBulkUpdatePartialPriced) {
                if (isDwEnabled) {
                    sendAlert('onBulkUpdatePartialPriced', this.bot, msg);
                } else {
                    this.bot.messageAdmins(msg, []);
                }
            }
        }

        // Send notification to admin/Discord Webhook if there's any partially priced item got reset on updateOldPrices
        const bulkResetPartiallyPriced = this.bot.pricelist.autoResetPartialPriceBulk;

        if (bulkResetPartiallyPriced.length > 0) {
            const dw = this.opt.discordWebhook.sendAlert;
            const isDwEnabled = dw.enable && (dw.url.main !== '' || dw.url.partialPriceUpdate !== '');

            const msg =
                `All partially priced items below has been reset to use the current prices ` +
                `because no longer in stock or exceed the threshold:\n\n• ${bulkResetPartiallyPriced
                    .map(sku => {
                        const name = this.bot.schema.getName(SKU.fromString(sku), this.opt.tradeSummary.showProperName);
                        return `${isDwEnabled ? `[${name}](https://autobot.tf/items/${sku})` : name} (${sku})`;
                    })
                    .join('\n• ')}`;

            if (this.opt.sendAlert.enable && this.opt.sendAlert.partialPrice.onResetAfterThreshold) {
                if (isDwEnabled) {
                    sendAlert('autoResetPartialPriceBulk', this.bot, msg);
                } else {
                    this.bot.messageAdmins(msg, []);
                }
            }
        }
    }

    onShutdown(): Promise<void> {
        if (this.poller) {
            clearInterval(this.poller);
        }

        if (this.refreshTimeout) {
            clearInterval(this.refreshTimeout);
        }

        if (this.bot.sendStatsInterval) {
            clearInterval(this.bot.sendStatsInterval);
        }

        if (this.bot.autoRefreshListingsInterval) {
            clearInterval(this.bot.autoRefreshListingsInterval);
        }

        if (this.classWeaponsTimeout) {
            clearTimeout(this.classWeaponsTimeout);
        }

        if (this.retryRequest) {
            clearTimeout(this.retryRequest);
        }

        if (this.bot.periodicCheckAdmin) {
            clearInterval(this.bot.periodicCheckAdmin);
        }

        if (this.pollDataInterval) {
            clearInterval(this.pollDataInterval);
        }

        return new Promise(resolve => {
            if (this.opt.autokeys.enable) {
                log.debug('Disabling Autokeys and disabling key entry in the pricelist...');
                this.autokeys
                    .disable(this.bot.pricelist.getKeyPrices)
                    .catch(() => {
                        log.warn('Unable to disable Mann Co. Supply Crate Key...');
                    })
                    .finally(() => {
                        if (!this.bot.listingManager || this.bot.listingManager.ready !== true) {
                            // We have not set up the listing manager, don't try and remove listings
                            return resolve();
                        }

                        this.bot.listings
                            .removeAll()
                            .catch((err: Error) =>
                                log.warn('Failed to remove all listings on shutdown (autokeys was enabled): ', err)
                            )
                            .finally(() => resolve());
                    });
            } else {
                if (!this.bot.listingManager || this.bot.listingManager.ready !== true) {
                    // We have not set up the listing manager, don't try and remove listings
                    return resolve();
                }

                this.bot.listings
                    .removeAll()
                    .catch((err: Error) => log.warn('Failed to remove all listings on shutdown: ', err))
                    .finally(() => resolve());
            }
        });
    }

    onLoggedOn(): void {
        if (this.bot.isReady) {
            this.bot.client.setPersona(EPersonaState.Online);
            this.bot.client.gamesPlayed(this.opt.miscSettings.game.playOnlyTF2 ? 440 : [this.customGameName, 440]);
        }
    }

    async onMessage(steamID: SteamID, message: string): Promise<void> {
        if (!this.opt.commands.enable) {
            if (!this.bot.isAdmin(steamID)) {
                const custom = this.opt.commands.customDisableReply;
                return this.bot.sendMessage(steamID, custom ? custom : '❌ Command function is disabled by the owner.');
            }
        }

        if (this.bot.isHalted && !this.bot.isAdmin(steamID)) {
            const custom = this.opt.customMessage.halted;
            return this.bot.sendMessage(
                steamID,
                custom ? custom : '❌ The bot is not operational right now. Please come back later.'
            );
        }

        if (this.isUpdating) {
            return this.bot.sendMessage(steamID, '⚠️ The bot is updating, please wait until I am back online.');
        }

        if (steamID.type !== 0) {
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
        } else if (steamID instanceof SteamID && steamID.redirectAnswerTo) {
            if (
                this.recentlySentMessage[steamID.redirectAnswerTo.author.id] !== undefined &&
                this.recentlySentMessage[steamID.redirectAnswerTo.author.id] >= 1
            ) {
                return;
            }

            this.recentlySentMessage[steamID.redirectAnswerTo.author.id] =
                (this.recentlySentMessage[steamID.redirectAnswerTo.author.id] === undefined
                    ? 0
                    : this.recentlySentMessage[steamID.redirectAnswerTo.author.id]) + 1;
        }

        await this.commands.processMessage(steamID, message);
    }

    onRefreshToken(token: string): void {
        log.debug('New refresh key');

        files.writeFile(this.paths.files.refreshToken, token, false).catch(err => {
            log.warn('Failed to save refresh token: ', err);
        });
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
            this.bot.client.respondToGroupInvite(groupID, join);
        } else if (relationship === EClanRelationship.Member) {
            log.info(`Joined group ${groupID.getSteamID64()}`);
        }
    }

    onBptfAuth(auth: { apiKey: string; accessToken: string }): void {
        const details = Object.assign({ private: true }, auth);
        log.warn('Please add your backpack.tf API key and access token to your environment variables!', details);
    }

    async onNewTradeOffer(offer: TradeOffer): Promise<null | OnNewTradeOffer> {
        offer.log('info', 'is being processed...');

        // Allow sending notifications
        offer.data('notify', true);

        // If crafting class weapons still waiting, cancel it.
        clearTimeout(this.classWeaponsTimeout);

        const opt = this.opt;
        const isAdmin = this.bot.isAdmin(offer.partner);
        const partnerSteamID = offer.partner.getSteamID64();

        const items = {
            our: Inventory.fromItems(
                this.bot.client.steamID === null ? this.botSteamID : this.bot.client.steamID,
                offer.itemsToGive,
                this.bot,
                'our',
                this.bot.boundInventoryGetter
            ).getItems,
            their: Inventory.fromItems(
                offer.partner,
                offer.itemsToReceive,
                this.bot,
                isAdmin ? 'admin' : 'their',
                this.bot.boundInventoryGetter
            ).getItems
        };

        const exchange = {
            contains: { items: false, metal: false, keys: false, pricedAssets: false },
            our: {
                value: 0,
                keys: 0,
                scrap: 0,
                contains: { items: false, metal: false, keys: false, pricedAssets: false },
                pricedAssetSkus: new Set<string>(),
                pricedAssetIds: new Set<string>(),
                pricedAsset: new Map<string, string>(),
                pricedAssetSkuTotals: {}
            },
            their: {
                value: 0,
                keys: 0,
                scrap: 0,
                contains: { items: false, metal: false, keys: false, pricedAssets: false },
                pricedAssetSkus: new Set<string>(),
                pricedAssetIds: new Set<string>(),
                pricedAsset: new Map<string, string>(),
                pricedAssetSkuTotals: {}
            }
        };

        const itemsDict: ItemsDict = { our: {}, their: {} };
        const getHighValue: GetHighValue = {
            our: {
                items: {},
                isMention: false
            },
            their: {
                items: {},
                isMention: false
            }
        };

        let isDuelingNotFullUses = false;
        let isNoiseMakerNotFullUses = false;
        const noiseMakerNotFullSKUs: string[] = [];
        let hasNonTF2Items = false;
        let keyOurSide = false;
        let keyOnBothSide = false;

        const states = [false, true];
        for (let i = 0; i < states.length; i++) {
            const buying = states[i];
            const which = buying ? 'their' : 'our';
            for (const sku in items[which]) {
                if (!Object.prototype.hasOwnProperty.call(items[which], sku)) {
                    continue;
                }

                for (const entry of items[which][sku]) {
                    const { id } = entry;
                    const price = this.bot.pricelist.getPrice({ priceKey: id });
                    if (price) {
                        exchange[which].pricedAssetIds.add(id);
                        exchange[which].pricedAsset[id] = sku;
                        itemsDict[which][id] = 1;
                        exchange.contains.pricedAssets = true;
                        exchange[which].contains.pricedAssets = true;
                        exchange.contains.items = true; // we consider pricedAssets as items
                        exchange[which].contains.items = true;
                        if (exchange[which].pricedAssetSkus.has(sku)) {
                            exchange[which].pricedAssetSkuTotals[sku] += 1;
                        } else {
                            exchange[which].pricedAssetSkus.add(sku);
                            exchange[which].pricedAssetSkuTotals[sku] = 1;
                        }
                    }
                }

                let totalGeneric = 0;
                // assign amount for sku
                if (exchange[which].pricedAssetSkus.has(sku)) {
                    totalGeneric = items[which][sku].length - exchange[which].pricedAssetSkuTotals[sku];
                    if (totalGeneric > 0) {
                        itemsDict[which][sku] = totalGeneric;
                    }
                } else {
                    totalGeneric = items[which][sku].length;
                    itemsDict[which][sku] = totalGeneric;
                }

                if (!testPriceKey(sku)) {
                    // Offer contains an item that is not from TF2
                    hasNonTF2Items = true;
                }

                if (totalGeneric > 0) {
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
                        if (which === 'our') {
                            keyOurSide = true;
                        } else if (which === 'their' && keyOurSide === true) {
                            // Consider this as an invalid offer
                            keyOnBothSide = true;
                        }
                    } else {
                        exchange.contains.items = true;
                        exchange[which].contains.items = true;
                    }
                }

                // Get High-value items
                items[which][sku].forEach(item => {
                    if (item.hv !== undefined) {
                        const priceKey = this.bot.pricelist.hasPrice({ priceKey: item.id }) ? item.id : sku;
                        // If hv exist, get the high value and assign into items
                        getHighValue[which].items[priceKey] = item.hv;

                        Object.keys(item.hv).forEach(attachment => {
                            if (item.hv[attachment] !== undefined) {
                                for (const pSku in item.hv[attachment]) {
                                    if (!Object.prototype.hasOwnProperty.call(item.hv[attachment], pSku)) {
                                        continue;
                                    }

                                    if (item.hv[attachment as 's' | 'sp' | 'ks' | 'ke' | 'p'][pSku] === true) {
                                        getHighValue[which].isMention = true;
                                    }
                                }
                            }
                        });
                    } else if (item.isFullUses !== undefined) {
                        const priceKey = this.bot.pricelist.hasPrice({ priceKey: item.id }) ? item.id : sku;
                        getHighValue[which].items[priceKey] = { isFull: item.isFullUses };

                        if (which === 'their') {
                            // Only check for their side
                            if (sku === '241;6' && item.isFullUses === false) {
                                isDuelingNotFullUses = true;
                            } else if (noiseMakers.has(sku) && item.isFullUses === false) {
                                isNoiseMakerNotFullUses = true;
                                noiseMakerNotFullSKUs.push(sku);
                            }
                        }
                    }
                });
            }
        }

        offer.data('dict', itemsDict);
        offer.data('keyOurSide', keyOurSide);

        // Always check if trade partner is taking higher value items (such as spelled or strange parts) that are not in our pricelist

        const highValueMeta = {
            items: {
                our: getHighValue.our.items,
                their: getHighValue.their.items
            },
            isMention: {
                our: getHighValue.our.isMention,
                their: getHighValue.their.isMention
            }
        };

        const isContainsHighValue =
            Object.keys(getHighValue.our.items).length > 0 || Object.keys(getHighValue.their.items).length > 0;

        // Check if the offer is from an admin
        if (isAdmin) {
            offer.log(
                'trade',
                `is from an admin, accepting. Summary:\n${JSON.stringify(
                    summarize(offer, this.bot, 'summary-accepting', false),
                    null,
                    4
                )}`
            );

            return {
                action: 'accept',
                reason: 'ADMIN',
                meta: isContainsHighValue ? { highValue: highValueMeta } : undefined
            };
        }

        // Check if the offer has keys on both sides
        if (keyOnBothSide) {
            offer.log('info', 'offer contains keys on both sides');
            return {
                action: 'decline',
                reason: 'CONTAINS_KEYS_ON_BOTH_SIDES',
                meta: isContainsHighValue ? { highValue: highValueMeta } : undefined
            };
        }

        const itemsToGiveCount = offer.itemsToGive.length;
        const itemsToReceiveCount = offer.itemsToReceive.length;

        // check if the trade is valid
        const isCannotProceedProcessingOffer = itemsToGiveCount === 0 && itemsToReceiveCount === 0;

        if (isCannotProceedProcessingOffer) {
            log.warn('isCannotProceedProcessingOffer', {
                status: isCannotProceedProcessingOffer,
                offerData: offer
            });
            // Both itemsToGive and itemsToReceive are an empty array, abort.
            this.bot.sendMessage(
                offer.partner,
                `❌ Looks like there was some issue with Steam getting your offer data.` +
                    ` I will retry to get the offer data now.` +
                    ` My owner has been informed, and they might manually act on your offer later.`
            );

            const optDw = opt.discordWebhook;

            if (opt.sendAlert.enable && opt.sendAlert.unableToProcessOffer) {
                if (optDw.sendAlert.enable && optDw.sendAlert.url.main !== '') {
                    sendAlert('failed-processing-offer', this.bot, null, null, null, [partnerSteamID, offer.id]);
                } else {
                    const prefix = this.bot.getPrefix();
                    this.bot.messageAdmins(
                        '',
                        `Unable to process offer #${offer.id} with ${partnerSteamID}.` +
                            ' The offer data received was broken because our side and their side are both empty.' +
                            `\nPlease manually check the offer (login as me): https://steamcommunity.com/tradeoffer/${offer.id}/` +
                            `\nSend "${prefix}faccept ${offer.id}" to force accept, or "${prefix}fdecline ${offer.id}" to decline.`,
                        []
                    );
                }
            }

            // Abort processing the offer.
            return;
        }

        const manualReviewEnabled = opt.manualReview.enable;
        const isIgnoreHalted = opt.offerReceived.halted.ignoreHalted;

        // A list of things that is wrong about the offer and other information
        const wrongAboutOffer: WrongAboutOffer[] = [];

        if (this.bot.isHalted) {
            if (manualReviewEnabled && !isIgnoreHalted) {
                wrongAboutOffer.push({
                    reason: '⬜_HALTED'
                });
                offer.log('info', 'bot is halted, review enabled & not ignore -> marking as halted ang going to skip');
            } else if (isIgnoreHalted) {
                // do nothing
                offer.log('info', 'bot is halted, review disabled & set to ignore -> Do nothing');
                return;
            } else {
                offer.log('info', 'bot is halted, review disabled -> declining');
                return {
                    action: 'decline',
                    reason: 'HALTED',
                    meta: isContainsHighValue ? { highValue: highValueMeta } : undefined
                };
            }
        }

        let checkBannedFailed = false;

        offer.log('info', 'checking escrow...');

        try {
            const hasEscrow = await this.bot.checkEscrow(offer);

            if (hasEscrow) {
                offer.log('info', 'would be held if accepted, declining...');
                return {
                    action: 'decline',
                    reason: 'ESCROW',
                    meta: isContainsHighValue ? { highValue: highValueMeta } : undefined
                };
            }
        } catch (err) {
            wrongAboutOffer.push({
                reason: '⬜_ESCROW_CHECK_FAILED'
            });
            log.warn('Failed to check escrow: ', err);
        }

        offer.log('info', 'checking bans...');

        try {
            const isBanned = await this.bot.checkBanned(partnerSteamID);

            if (isBanned.isBanned) {
                offer.log('info', 'partner is banned in one or more communities, declining...');
                this.bot.client.blockUser(offer.partner, err => {
                    if (err) {
                        log.warn(`❌ Failed to block user ${partnerSteamID}: `, err);
                    } else log.info(`✅ Successfully blocked user ${partnerSteamID}`);
                });

                this.saveBlockedUser(
                    partnerSteamID,
                    `[onReceivedOffer] Banned on ${Object.keys(isBanned.contents)
                        .filter(website => isBanned.contents[website] !== 'clean')
                        .join(', ')}`
                );

                return {
                    action: 'decline',
                    reason: 'BANNED',
                    meta: isContainsHighValue ? { highValue: highValueMeta, banned: isBanned.contents } : undefined
                };
            }
        } catch (err) {
            checkBannedFailed = true;
            wrongAboutOffer.push({
                reason: '⬜_BANNED_CHECK_FAILED'
            });
            log.error('Failed to check banned: ', err);
        }

        if (hasNonTF2Items && opt.offerReceived.alwaysDeclineNonTF2Items) {
            // Using boolean because items dict always needs to be saved
            offer.log('info', 'contains items not from TF2, declining...');
            return { action: 'decline', reason: '🟨_CONTAINS_NON_TF2' };
        }

        const offerMessage = offer.message.toLowerCase();

        const forcesReview =
            opt.manualReview.enable &&
            opt.offerReceived.reviewForced.enable &&
            ['refund', 'review', 'check', 'manual'].some(word => offerMessage.includes(word)); // "Please review" will also make this true this way.
        if (forcesReview) {
            wrongAboutOffer.push({
                reason: '⬜_REVIEW_FORCED'
            });
        } else {
            if (itemsToGiveCount === 0) {
                const isGift = [
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
                    'cute', // right?
                    'enjoy',
                    'prize',
                    'free',
                    'tnx',
                    'ty',
                    'love',
                    '<3'
                ].some(word => offerMessage.includes(word));

                if (isGift) {
                    // We can accept escrow if it's gift
                    if (checkBannedFailed) {
                        offer.log('info', `is a gift offer, but failed to check for banned status, declining...`);
                        return {
                            action: 'decline',
                            reason: 'GIFT_FAILED_CHECK_BANNED',
                            meta: isContainsHighValue ? { highValue: highValueMeta } : undefined
                        };
                    }

                    offer.log(
                        'trade',
                        `is a gift offer, accepting. Summary:\n${JSON.stringify(
                            summarize(offer, this.bot, 'summary-accepting', false),
                            null,
                            4
                        )}`
                    );

                    return {
                        action: 'accept',
                        reason: 'GIFT',
                        meta: isContainsHighValue ? { highValue: highValueMeta } : undefined
                    };
                } else {
                    if (opt.bypass.giftWithoutMessage.allow) {
                        if (checkBannedFailed) {
                            offer.log(
                                'info',
                                `is a gift offer without any offer message, but failed to check for banned status, declining...`
                            );
                            return {
                                action: 'decline',
                                reason: 'GIFT_FAILED_CHECK_BANNED',
                                meta: isContainsHighValue ? { highValue: highValueMeta } : undefined
                            };
                        }

                        offer.log(
                            'trade',
                            'is a gift offer without any offer message, but allowed to be accepted, accepting...'
                        );

                        return {
                            action: 'accept',
                            reason: 'GIFT',
                            meta: isContainsHighValue ? { highValue: highValueMeta } : undefined
                        };
                    } else {
                        offer.log('info', 'is a gift offer without any offer message, declining...');
                        return {
                            action: 'decline',
                            reason: 'GIFT_NO_NOTE',
                            meta: isContainsHighValue ? { highValue: highValueMeta } : undefined
                        };
                    }
                }
            } else if (
                itemsToGiveCount > 0 &&
                itemsToReceiveCount === 0 &&
                !(
                    (opt.miscSettings.counterOffer.enable
                        ? !opt.miscSettings.counterOffer.autoDeclineLazyOffer
                        : false) && exchange.contains.items
                )
            ) {
                offer.log('info', 'is taking our items for free, declining...');
                return {
                    action: 'decline',
                    reason: 'CRIME_ATTEMPT',
                    meta: isContainsHighValue ? { highValue: highValueMeta } : undefined
                };
            }
        }

        // Check for Dueling Mini-Game and/or Noise maker for 5x/25x Uses only when enabled
        // and decline if not 5x/25x and exist in pricelist

        const checkExist = this.bot.pricelist;

        if (opt.miscSettings.checkUses.duel && isDuelingNotFullUses) {
            if (checkExist.getPrice({ priceKey: '241;6', onlyEnabled: true }) !== null) {
                // Dueling Mini-Game: Only decline if exist in pricelist
                offer.log('info', 'contains Dueling Mini-Game that does not have 5 uses.');
                return {
                    action: 'decline',
                    reason: 'DUELING_NOT_5_USES',
                    meta: isContainsHighValue ? { highValue: highValueMeta } : undefined
                };
            }
        }

        if (opt.miscSettings.checkUses.noiseMaker && isNoiseMakerNotFullUses) {
            const isHasNoiseMaker = noiseMakerNotFullSKUs.some(
                sku => checkExist.getPrice({ priceKey: sku, onlyEnabled: true }) !== null
            );
            if (isHasNoiseMaker) {
                // Noise Maker: Only decline if exist in pricelist
                offer.log('info', 'contains Noise Maker that does not have 25 uses.');
                return {
                    action: 'decline',
                    reason: 'NOISE_MAKER_NOT_25_USES',
                    meta: isContainsHighValue ? { highValue: highValueMeta } : undefined
                };
            }
        }

        const ourItemsHVCount = Object.keys(getHighValue.our.items).length;

        const isInPricelist =
            ourItemsHVCount > 0 // Only check if this not empty
                ? Object.keys(getHighValue.our.items).some(sku => {
                      return checkExist.getPrice({ priceKey: sku, onlyEnabled: false }) !== null; // Return true if exist in pricelist, enabled or not.
                  })
                : null;

        if (ourItemsHVCount > 0 && isInPricelist === false) {
            // Decline trade that offer overpay on high valued (spelled) items that are not in our pricelist.
            offer.log('info', 'contains higher value item on our side that is not in our pricelist.');

            // Inform admin via Steam Chat or Discord Webhook Something Wrong Alert.
            const highValueOurNames: string[] = [];
            const itemsName = getHighValueItems(getHighValue.our.items, this.bot);

            if (opt.sendAlert.enable && opt.sendAlert.highValue.tryingToTake) {
                if (opt.discordWebhook.sendAlert.enable && opt.discordWebhook.sendAlert.url.main !== '') {
                    for (const name in itemsName) {
                        if (!Object.prototype.hasOwnProperty.call(itemsName, name)) {
                            continue;
                        }

                        highValueOurNames.push(`_${name}_` + itemsName[name]);
                    }

                    sendAlert('tryingToTake', this.bot, null, null, null, highValueOurNames);
                } else {
                    for (const name in itemsName) {
                        if (!Object.prototype.hasOwnProperty.call(itemsName, name)) {
                            continue;
                        }

                        highValueOurNames.push(name + itemsName[name]);
                    }

                    this.bot.messageAdmins(
                        `Someone is attempting to purchase a high valued item that you own ` +
                            `but is not in your pricelist:\n- ${highValueOurNames.join('\n\n- ')}`,
                        []
                    );
                }
            }

            if (!forcesReview) {
                return {
                    action: 'decline',
                    reason: 'HIGH_VALUE_ITEMS_NOT_SELLING',
                    meta: {
                        highValueName: highValueOurNames
                    }
                };
            }
        }

        const itemPrices: Prices = {};

        const keyPrice = this.bot.pricelist.getKeyPrices[keyOurSide ? 'sell' : 'buy'];
        let hasOverstockAndIsPartialPriced = false;
        let assetidsToCheck: string[] = [];
        let skuToCheck: string[] = [];
        let hasNoPrice = false;
        let hasInvalidItemsOur = false;

        let isTakingOurItemWithIntentBuy = false;
        let isGivingTheirItemWithIntentSell = false;

        const craftAll = this.bot.craftWeapons;
        const uncraftAll = this.bot.uncraftWeapons;

        const itemsDiff = offer.getDiff();
        /* this loop goes through the following
        buying = false; which = 'our';   intent = 'sell';
        buying = true;  which = 'their'; intent = 'buy';
         */
        for (let i = 0; i < states.length; i++) {
            const buying = states[i];
            const which = buying ? 'their' : 'our';
            const intentString = buying ? 'buy' : 'sell';

            if (exchange[which].contains.pricedAssets) {
                for (const id of exchange[which].pricedAssetIds) {
                    const match = this.bot.pricelist.getPrice({ priceKey: id });
                    // Add value of items
                    exchange[which].value += match[intentString].toValue(keyPrice.metal);
                    exchange[which].keys += match[intentString].keys;
                    exchange[which].scrap += Currencies.toScrap(match[intentString].metal);
                    itemPrices[id] = {
                        buy: match.buy,
                        sell: match.sell
                    };
                    // Check if asset is disabled
                    if (!match.enabled) {
                        wrongAboutOffer.push({
                            reason: '🟧_DISABLED_ITEMS',
                            sku: exchange[which].pricedAsset[id] as string
                        });
                    }
                }
            }
            for (const sku in itemsDict[which]) {
                if (!Object.prototype.hasOwnProperty.call(itemsDict[which], sku) || Pricelist.isAssetId(sku)) {
                    continue;
                }

                const amount = itemsDict[which][sku];

                if (amount === 0) {
                    continue;
                }

                let isNonTF2Items = false;

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
                    this.bot.pricelist.getPrice({ priceKey: sku, onlyEnabled: true }) === null
                ) {
                    const value = 0.5 * amount;
                    exchange[which].value += value;
                    exchange[which].scrap += value;
                } else {
                    let match: Entry | null = null;

                    if (hasNonTF2Items) {
                        if (testPriceKey(sku)) {
                            match =
                                which === 'our'
                                    ? this.bot.pricelist.getPrice({ priceKey: sku })
                                    : this.bot.pricelist.getPrice({
                                          priceKey: sku,
                                          onlyEnabled: false,
                                          getGenericPrice: true
                                      });
                        } else {
                            isNonTF2Items = true;
                        }
                    } else {
                        match =
                            which === 'our'
                                ? this.bot.pricelist.getPrice({ priceKey: sku })
                                : this.bot.pricelist.getPrice({
                                      priceKey: sku,
                                      onlyEnabled: false,
                                      getGenericPrice: true
                                  });
                    }

                    const notIncludeCraftweapons = this.isWeaponsAsCurrency.enable
                        ? !(
                              craftAll.includes(sku) ||
                              (this.isWeaponsAsCurrency.withUncraft && uncraftAll.includes(sku))
                          )
                        : true;

                    if (match !== null && (sku !== '5021;6' || !exchange.contains.items)) {
                        // If we found a matching price and the item is not a key, or the we are not trading items
                        // (meaning that we are trading keys) then add the price of the item

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
                        const inventoryManager = this.bot.inventoryManager;
                        const amountCanTrade = inventoryManager.amountCanTrade({
                            priceKey: sku,
                            tradeIntent: isBuying ? 'buying' : 'selling',
                            getGenericAmount: which === 'their'
                        }); // return a number

                        if (diff !== 0 && sku !== '5021;6' && amountCanTrade < diff && notIncludeCraftweapons) {
                            if (match.enabled) {
                                // User is offering too many
                                if (match.isPartialPriced) {
                                    hasOverstockAndIsPartialPriced = true;
                                }

                                wrongAboutOffer.push({
                                    reason: '🟦_OVERSTOCKED',
                                    sku: sku,
                                    buying: isBuying,
                                    diff: diff,
                                    amountCanTrade: amountCanTrade,
                                    amountOffered: amount
                                });

                                this.bot.listings.checkByPriceKey({
                                    priceKey: match.sku,
                                    checkGenerics: which === 'their',
                                    showLogs: true
                                });
                            } else {
                                // Item was disabled
                                wrongAboutOffer.push({
                                    reason: '🟧_DISABLED_ITEMS',
                                    sku: sku
                                });
                            }
                        }

                        if (which === 'our' && match.intent === 0) {
                            isTakingOurItemWithIntentBuy = true;
                        } else if (which === 'their' && match.intent === 1) {
                            isGivingTheirItemWithIntentSell = true;
                        }

                        if (
                            diff !== 0 &&
                            !isBuying &&
                            sku !== '5021;6' &&
                            amountCanTrade < Math.abs(diff) &&
                            notIncludeCraftweapons
                        ) {
                            if (match.enabled) {
                                // User is taking too many

                                if (match.min !== 0 || match.intent === 0) {
                                    // If min is set to 0, how come it can be understocked right?
                                    // fix exploit found on August 4th, 2021
                                    const amountInInventory = inventoryManager.getInventory.getAmount({
                                        priceKey: sku,
                                        includeNonNormalized: false
                                    });

                                    if (amountInInventory > 0) {
                                        wrongAboutOffer.push({
                                            reason: '🟩_UNDERSTOCKED',
                                            sku: sku,
                                            selling: !isBuying,
                                            diff: diff,
                                            amountCanTrade: amountCanTrade,
                                            amountTaking: amount
                                        });

                                        this.bot.listings.checkByPriceKey({
                                            priceKey: match.sku,
                                            checkGenerics: which === 'their',
                                            showLogs: true
                                        });
                                    }
                                }
                            } else {
                                // Item was disabled
                                wrongAboutOffer.push({
                                    reason: '🟧_DISABLED_ITEMS',
                                    sku: sku
                                });
                            }
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
                            assetidsToCheck = assetidsToCheck.concat(items[which][sku].map(item => item.id));
                        }
                        //
                    } else if (sku === '5021;6' && exchange.contains.items) {
                        // Offer contains keys and we are not trading keys, add key value
                        exchange[which].value += keyPrice.toValue() * amount;
                        exchange[which].keys += amount;
                        //
                    } else if (
                        (match === null && notIncludeCraftweapons) ||
                        (match !== null && match.intent === (buying ? 1 : 0))
                    ) {
                        // Offer contains an item that we are not trading
                        // hasInvalidItems = true;

                        // If that particular item is on our side, then put to review
                        if (which === 'our') {
                            hasInvalidItemsOur = true;
                        }

                        let itemSuggestedValue = 'No price';

                        if (!isNonTF2Items) {
                            // await timersPromises.setTimeout(1 * 1000);
                            const price = await this.bot.pricelist.getItemPrices(sku);
                            const item = SKU.fromString(sku);

                            const isCrateOrCases = item.crateseries !== null || ['5737;6', '5738;6'].includes(sku);
                            // 5737;6 and 5738;6 - Mann Co. Stockpile Crate

                            const isWinterNoiseMaker = ['673;6'].includes(sku);

                            const isSkinsOrWarPaints = item.wear !== null;

                            if (price === null) {
                                hasNoPrice = true;
                            } else {
                                price.buy = new Currencies(price.buy);
                                price.sell = new Currencies(price.sell);

                                itemPrices[sku] = {
                                    buy: price.buy,
                                    sell: price.sell
                                };

                                if (
                                    opt.offerReceived.invalidItems.givePrice &&
                                    !isSkinsOrWarPaints &&
                                    !isCrateOrCases &&
                                    !isWinterNoiseMaker // all of these (with !) should be false in order to be true
                                ) {
                                    // if offerReceived.invalidItems.givePrice is set to true (enable) and items is not skins/war paint/crate/cases,
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
        if (opt.miscSettings.showOnlyMetal.enable) {
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

        if (isTakingOurItemWithIntentBuy) {
            // Always decline an offer taking our item(s) with intent to only buy
            offer.log('info', 'is trying to take item(s) with intent buy, declining...');
            return {
                action: 'decline',
                reason: 'TAKING_ITEMS_WITH_INTENT_BUY',
                meta: isContainsHighValue ? { highValue: highValueMeta } : undefined
            };
        }

        if (isGivingTheirItemWithIntentSell) {
            // Always decline an offer giving their item(s) with intent to only sell
            offer.log('info', 'is trying to give item(s) with intent sell, declining...');
            return {
                action: 'decline',
                reason: 'GIVING_ITEMS_WITH_INTENT_SELL',
                meta: isContainsHighValue ? { highValue: highValueMeta } : undefined
            };
        }

        if (!forcesReview && exchange.contains.metal && !exchange.contains.keys && !exchange.contains.items) {
            // Offer only contains metal
            offer.log('info', 'only contains metal, declining...');
            return { action: 'decline', reason: 'ONLY_METAL' };
        } else if (exchange.contains.keys && !exchange.contains.items) {
            // Offer is for trading keys, check if we are trading them
            const priceEntry = this.bot.pricelist.getPrice({ priceKey: '5021;6', onlyEnabled: true });
            if (!forcesReview && priceEntry === null) {
                // We are not trading keys
                offer.log('info', 'we are not trading keys, declining...');
                this.bot.listings.checkByPriceKey({
                    priceKey: '5021;6',
                    checkGenerics: false,
                    showLogs: true
                });
                return { action: 'decline', reason: 'NOT_TRADING_KEYS' };
            } else if (
                !forcesReview &&
                exchange.our.contains.keys &&
                priceEntry.intent !== 1 &&
                priceEntry.intent !== 2
            ) {
                // We are not selling keys
                offer.log('info', 'we are not selling keys, declining...');
                this.bot.listings.checkByPriceKey({
                    priceKey: '5021;6',
                    checkGenerics: false,
                    showLogs: true
                });
                return { action: 'decline', reason: 'NOT_SELLING_KEYS' };
            } else if (
                !forcesReview &&
                exchange.their.contains.keys &&
                priceEntry.intent !== 0 &&
                priceEntry.intent !== 2
            ) {
                // We are not buying keys
                offer.log('info', 'we are not buying keys, declining...');
                this.bot.listings.checkByPriceKey({
                    priceKey: '5021;6',
                    checkGenerics: false,
                    showLogs: true
                });
                return { action: 'decline', reason: 'NOT_BUYING_KEYS' };
            } else {
                // Check overstock / understock on keys
                const diff = itemsDiff['5021;6'] as number | null;
                // If the diff is greater than 0 then we are buying, less than is selling
                const isBuying = diff > 0;
                const inventoryManager = this.bot.inventoryManager;
                const amountCanTrade = inventoryManager.amountCanTrade({
                    priceKey: '5021;6',
                    tradeIntent: isBuying ? 'buying' : 'selling'
                });

                if (diff !== 0 && amountCanTrade < diff) {
                    // User is offering too many
                    wrongAboutOffer.push({
                        reason: '🟦_OVERSTOCKED',
                        sku: '5021;6',
                        buying: isBuying,
                        diff: diff,
                        amountCanTrade: amountCanTrade,
                        amountOffered: itemsDict['their']['5021;6']
                    });

                    this.bot.listings.checkByPriceKey({
                        priceKey: '5021;6',
                        checkGenerics: false,
                        showLogs: true
                    });
                }

                const acceptUnderstock = opt.autokeys.accept.understock;
                if (diff !== 0 && !isBuying && amountCanTrade < Math.abs(diff) && !acceptUnderstock) {
                    // User is taking too many

                    if (priceEntry.min !== 0) {
                        const amountInInventory = inventoryManager.getInventory.getAmount({
                            priceKey: '5021;6',
                            includeNonNormalized: false
                        });

                        if (amountInInventory > 0) {
                            wrongAboutOffer.push({
                                reason: '🟩_UNDERSTOCKED',
                                sku: '5021;6',
                                selling: !isBuying,
                                diff: diff,
                                amountCanTrade: amountCanTrade,
                                amountTaking: itemsDict['our']['5021;6']
                            });

                            this.bot.listings.checkByPriceKey({
                                priceKey: '5021;6',
                                checkGenerics: false,
                                showLogs: true
                            });
                        }
                    }
                }
            }
        }

        let isOurItems = false;
        let isTheirItems = false;
        const exceptionSKU = opt.offerReceived.invalidValue.exceptionValue.skus;
        const exceptionValue = this.invalidValueException;
        const ourItems = Object.keys(itemsDict.our);
        const theirItems = Object.keys(itemsDict.their);

        if (exceptionSKU.length > 0 && exceptionValue > 0) {
            isOurItems = exceptionSKU.some(sku => {
                return ourItems.some(ourItemSKU => {
                    return ourItemSKU.includes(sku);
                });
            });

            isTheirItems = exceptionSKU.some(sku => {
                return theirItems.some(theirItemSKU => {
                    return theirItemSKU.includes(sku);
                });
            });
        }

        const isExcept = isOurItems || isTheirItems;

        if (exchange.our.value > exchange.their.value) {
            if (!isExcept || (isExcept && exchange.our.value - exchange.their.value >= exceptionValue)) {
                // Check if the values are correct and is not include the exception sku
                // OR include the exception sku but the invalid value is more than or equal to exception value
                this.hasInvalidValueException = false;
                wrongAboutOffer.push({
                    reason: '🟥_INVALID_VALUE',
                    our: exchange.our.value,
                    their: exchange.their.value,
                    missing: exchange.our.value - exchange.their.value
                });

                // Always run checkBySKU for INVALID_VALUE offer so that the listings will always be updated if incorrect
                ourItems
                    .concat(theirItems)
                    .filter(sku => !['5000;6', '5001;6', '5002;6'].includes(sku))
                    .forEach(sku => this.bot.listings.checkByPriceKey({ priceKey: sku }));
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

        if (!forcesReview && exchange.our.value < exchange.their.value && !opt.bypass.overpay.allow) {
            offer.log('info', 'is offering more than needed, declining...');
            return {
                action: 'decline',
                reason: 'OVERPAY',
                meta: isContainsHighValue ? { highValue: highValueMeta } : undefined
            };
        }

        const assetidsToCheckCount = assetidsToCheck.length;

        if (this.dupeCheckEnabled && assetidsToCheckCount > 0) {
            offer.log('info', 'checking ' + pluralize('item', assetidsToCheckCount, true) + ' for dupes...');
            const inventory = new TF2Inventory(offer.partner, this.bot.manager);

            const requests = assetidsToCheck.map(async (assetid): Promise<boolean | null> => {
                log.debug(`Dupe checking ${assetid}...`);
                const result = await inventory.isDuped(assetid, this.bot.userID);
                log.debug(`Dupe check for ${assetid}... done`);
                return result;
            });

            try {
                const result: (boolean | null)[] = await Promise.all(requests);
                log.info(`Got result from dupe checks on ${assetidsToCheck.join(', ')}`, { result: result });

                const resultCount = result.length;

                for (let i = 0; i < resultCount; i++) {
                    if (result[i] === true) {
                        // Found duped item
                        // Offer contains duped items but we don't decline duped items, instead add it to the wrong about offer list and continue
                        wrongAboutOffer.push({
                            reason: '🟫_DUPED_ITEMS',
                            assetid: assetidsToCheck[i],
                            sku: skuToCheck[i]
                        });
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
                log.error(`Failed dupe check on ${assetidsToCheck.join(', ')}`, err);
                wrongAboutOffer.push({
                    reason: '🟪_DUPE_CHECK_FAILED',
                    withError: true,
                    assetid: assetidsToCheck,
                    sku: skuToCheck,
                    error: (err as Error).message
                });
            }
        }

        if (wrongAboutOffer.length !== 0) {
            const reasons = wrongAboutOffer.map(wrong => wrong.reason);
            const uniqueReasons = filterReasons(reasons.filter(reason => reasons.includes(reason)));

            const hasInvalidValue = uniqueReasons.includes('🟥_INVALID_VALUE');
            const hasInvalidItem = uniqueReasons.includes('🟨_INVALID_ITEMS');
            const hasDisabledItem = uniqueReasons.includes('🟧_DISABLED_ITEMS');
            const hasOverstocked = uniqueReasons.includes('🟦_OVERSTOCKED');
            const hasUnderstocked = uniqueReasons.includes('🟩_UNDERSTOCKED');
            const hasDupedItem = uniqueReasons.includes('🟫_DUPED_ITEMS');
            const hasDupedCheckFailed = uniqueReasons.includes('🟪_DUPE_CHECK_FAILED');
            const hasEscrowCheckFailed = uniqueReasons.includes('⬜_ESCROW_CHECK_FAILED');
            const hasBannedCheckFailed = uniqueReasons.includes('⬜_BANNED_CHECK_FAILED');

            const canAcceptInvalidItemsOverpay = opt.offerReceived.invalidItems.autoAcceptOverpay;
            const canAcceptDisabledItemsOverpay = opt.offerReceived.disabledItems.autoAcceptOverpay;
            const canAcceptOverstockedOverpay = opt.offerReceived.overstocked.autoAcceptOverpay;
            const canAcceptUnderstockedOverpay = opt.offerReceived.understocked.autoAcceptOverpay;

            const isIgnoreEscrowCheckFailed = opt.offerReceived.escrowCheckFailed.ignoreFailed;
            const isIgnoreBannedCheckFailed = opt.offerReceived.bannedCheckFailed.ignoreFailed;

            // accepting 🟨_INVALID_ITEMS overpay
            const isAcceptInvalidItems =
                hasInvalidItem &&
                canAcceptInvalidItemsOverpay &&
                !hasInvalidItemsOur &&
                (exchange.our.value < exchange.their.value ||
                    (exchange.our.value === exchange.their.value && hasNoPrice)) &&
                (hasOverstocked ? canAcceptOverstockedOverpay : true) &&
                (hasUnderstocked ? canAcceptUnderstockedOverpay : true) &&
                (hasDisabledItem ? canAcceptDisabledItemsOverpay : true);

            // accepting 🟧_DISABLED_ITEMS overpay
            const isAcceptDisabledItems =
                hasDisabledItem &&
                canAcceptDisabledItemsOverpay &&
                exchange.our.value < exchange.their.value &&
                (hasInvalidItem ? canAcceptInvalidItemsOverpay : true) &&
                (hasOverstocked ? canAcceptOverstockedOverpay : true) &&
                (hasUnderstocked ? canAcceptUnderstockedOverpay : true);

            // accepting 🟦_OVERSTOCKED overpay
            const isAcceptOverstocked =
                hasOverstocked &&
                canAcceptOverstockedOverpay &&
                !hasOverstockAndIsPartialPriced && // because partial priced will use old buying prices
                exchange.our.value < exchange.their.value &&
                (hasInvalidItem ? canAcceptInvalidItemsOverpay : true) &&
                (hasUnderstocked ? canAcceptUnderstockedOverpay : true) &&
                (hasDisabledItem ? canAcceptDisabledItemsOverpay : true);

            // accepting 🟩_UNDERSTOCKED overpay
            const isAcceptUnderstocked =
                hasUnderstocked &&
                canAcceptUnderstockedOverpay &&
                exchange.our.value < exchange.their.value &&
                (hasInvalidItem ? canAcceptInvalidItemsOverpay : true) &&
                (hasOverstocked ? canAcceptOverstockedOverpay : true) &&
                (hasDisabledItem ? canAcceptDisabledItemsOverpay : true);

            const isOnlyInvalidValue =
                hasInvalidValue &&
                !(
                    hasInvalidItem ||
                    hasDisabledItem ||
                    hasOverstocked ||
                    hasUnderstocked ||
                    hasDupedItem ||
                    hasDupedCheckFailed ||
                    hasEscrowCheckFailed ||
                    hasBannedCheckFailed
                );

            const isOnlyInvalidItem =
                hasInvalidItem &&
                !(
                    hasInvalidValue ||
                    hasDisabledItem ||
                    hasOverstocked ||
                    hasUnderstocked ||
                    hasDupedItem ||
                    hasDupedCheckFailed ||
                    hasEscrowCheckFailed ||
                    hasBannedCheckFailed
                );

            const isOnlyDisabledItem =
                hasDisabledItem && // if contains 🟥_INVALID_VALUE too, this will pass
                !(
                    hasInvalidItem ||
                    hasOverstocked ||
                    hasUnderstocked ||
                    hasDupedItem ||
                    hasDupedCheckFailed ||
                    hasEscrowCheckFailed ||
                    hasBannedCheckFailed
                );

            const isOnlyOverstocked =
                hasOverstocked && // if contains 🟥_INVALID_VALUE too, this will pass
                !(
                    hasInvalidItem ||
                    hasDisabledItem ||
                    hasUnderstocked ||
                    hasDupedItem ||
                    hasDupedCheckFailed ||
                    hasEscrowCheckFailed ||
                    hasBannedCheckFailed
                );

            const isOnlyUnderstocked =
                hasUnderstocked && // if contains 🟥_INVALID_VALUE too, this will pass
                !(
                    hasInvalidItem ||
                    hasOverstocked ||
                    hasDisabledItem ||
                    hasDupedItem ||
                    hasDupedCheckFailed ||
                    hasEscrowCheckFailed ||
                    hasBannedCheckFailed
                );

            const isOnlyDupedItem =
                hasDupedItem && // if contains 🟥_INVALID_VALUE too, this will pass
                !(
                    hasInvalidItem ||
                    hasOverstocked ||
                    hasUnderstocked ||
                    hasDisabledItem ||
                    hasDupedCheckFailed ||
                    hasEscrowCheckFailed ||
                    hasBannedCheckFailed
                );

            const isOnlyFailedToCheckDupedItem =
                hasDupedCheckFailed && // if contains 🟥_INVALID_VALUE too, this will pass
                !(
                    hasInvalidItem ||
                    hasOverstocked ||
                    hasUnderstocked ||
                    hasDisabledItem ||
                    hasDupedItem ||
                    hasEscrowCheckFailed ||
                    hasBannedCheckFailed
                );

            const isOnlyEscrowCheckFailed =
                hasEscrowCheckFailed && // if contains 🟥_INVALID_VALUE too, this will pass
                !(
                    hasInvalidItem ||
                    hasDisabledItem ||
                    hasOverstocked ||
                    hasUnderstocked ||
                    hasDupedItem ||
                    hasDupedCheckFailed ||
                    hasBannedCheckFailed
                );

            const isOnlyBannedCheckFailed =
                hasBannedCheckFailed && // if contains 🟥_INVALID_VALUE too, this will pass
                !(
                    hasInvalidItem ||
                    hasDisabledItem ||
                    hasOverstocked ||
                    hasUnderstocked ||
                    hasDupedItem ||
                    hasDupedCheckFailed ||
                    hasEscrowCheckFailed
                );

            const meta = {
                uniqueReasons: uniqueReasons,
                reasons: wrongAboutOffer,
                highValue: isContainsHighValue ? highValueMeta : undefined
            };

            // don't use business logic if the bot is not operational or the trade must be reviewed
            if (this.bot.isHalted || forcesReview) {
                return {
                    action: 'skip',
                    reason: 'REVIEW',
                    meta: meta
                };
            }

            if (
                (isAcceptInvalidItems || isAcceptOverstocked || isAcceptUnderstocked || isAcceptDisabledItems) &&
                exchange.our.value !== 0 &&
                !(
                    hasInvalidValue ||
                    hasDupedItem ||
                    hasDupedCheckFailed ||
                    hasEscrowCheckFailed ||
                    hasBannedCheckFailed
                )
            ) {
                // if the offer is Invalid_items/disabled_items/over/understocked and accepting overpay enabled, but the offer is not
                // includes Invalid_value, duped or duped check failed, true for acceptTradeCondition and our side not empty,
                // accept the trade.
                offer.log(
                    'trade',
                    `contains ${
                        (isAcceptInvalidItems ? 'INVALID_ITEMS' : '') +
                        (isAcceptOverstocked ? `${isAcceptInvalidItems ? '/' : ''}OVERSTOCKED` : '') +
                        (isAcceptUnderstocked
                            ? `${isAcceptInvalidItems || isAcceptOverstocked ? '/' : ''}UNDERSTOCKED`
                            : '') +
                        (isAcceptDisabledItems
                            ? `${
                                  isAcceptInvalidItems || isAcceptOverstocked || isAcceptUnderstocked ? '/' : ''
                              }DISABLED_ITEMS`
                            : '')
                    }, but offer value is greater or equal, accepting. Summary:\n${JSON.stringify(
                        summarize(offer, this.bot, 'summary-accepting', false),
                        null,
                        4
                    )}`
                );

                if (opt.offerReceived.sendPreAcceptMessage.enable) {
                    const preAcceptMessage = opt.customMessage.accepted.automatic;

                    MyHandler.sendPreAcceptedMessage(
                        this.bot,
                        offer.partner,
                        preAcceptMessage,
                        itemsToGiveCount + itemsToReceiveCount > 50
                    );
                }

                return {
                    action: 'accept',
                    reason: 'VALID_WITH_OVERPAY',
                    meta: meta
                };
            } else if (
                (opt.offerReceived.invalidValue.autoDecline.enable || opt.miscSettings.counterOffer.enable) &&
                isOnlyInvalidValue &&
                this.hasInvalidValueException === false
            ) {
                if (opt.miscSettings.counterOffer.enable) {
                    // if counteroffer enabled
                    if (manualReviewEnabled && opt.miscSettings.counterOffer.skipIncludeMessage && offerMessage) {
                        // if skipIncludeMessage is set to true and offer contains message, skip for review
                        offer.log('info', `offer needs review (${uniqueReasons.join(', ')}), skipping...`);

                        return {
                            action: 'skip',
                            reason: 'REVIEW',
                            meta: meta
                        };
                    }

                    offer.log(
                        'info',
                        `offer need to counter.\nSummary:\n${JSON.stringify(
                            summarize(offer, this.bot, 'summary-countering', false),
                            null,
                            4
                        )}`
                    );

                    return {
                        action: 'counter',
                        reason: 'COUNTER_INVALID_VALUE',
                        meta: meta
                    };
                }

                // If only 🟥_INVALID_VALUE and did not matched exception value, will just decline the trade.
                return { action: 'decline', reason: 'ONLY_INVALID_VALUE', meta: meta };
            } else if (opt.offerReceived.invalidItems.autoDecline.enable && isOnlyInvalidItem) {
                // If only 🟨_INVALID_ITEMS and Auto-decline INVALID_ITEMS enabled, will just decline the trade.
                return { action: 'decline', reason: 'ONLY_INVALID_ITEMS', meta: meta };
            } else if (opt.offerReceived.disabledItems.autoDecline.enable && isOnlyDisabledItem) {
                // If only 🟧_DISABLED_ITEMS (and with 🟥_INVALID_VALUE)
                // and Auto-decline DISABLED_ITEMS enabled, will just decline the trade.
                return { action: 'decline', reason: 'ONLY_DISABLED_ITEMS', meta: meta };
            } else if (opt.offerReceived.overstocked.autoDecline.enable && isOnlyOverstocked) {
                // If only 🟦_OVERSTOCKED (and with 🟥_INVALID_VALUE)
                // and Auto-decline OVERSTOCKED enabled, will just decline the trade.
                return { action: 'decline', reason: 'ONLY_OVERSTOCKED', meta: meta };
            } else if (opt.offerReceived.understocked.autoDecline.enable && isOnlyUnderstocked) {
                // If only 🟩_UNDERSTOCKED (and with 🟥_INVALID_VALUE)
                // and Auto-decline UNDERSTOCKED enabled, will just decline the trade.
                return { action: 'decline', reason: 'ONLY_UNDERSTOCKED', meta: meta };
            } else if (opt.offerReceived.duped.autoDecline.enable && isOnlyDupedItem) {
                // If only 🟫_DUPED_ITEMS (and with 🟥_INVALID_VALUE)
                // and Auto-decline DUPED_ITEMS enabled, will just decline the trade.
                return {
                    action: 'decline',
                    reason: 'ONLY_DUPED_ITEM',
                    meta: meta
                };
            } else if (opt.offerReceived.failedToCheckDuped.autoDecline.enable && isOnlyFailedToCheckDupedItem) {
                // If only 🟪_DUPE_CHECK_FAILED (and with 🟥_INVALID_VALUE)
                // and Auto-decline DUPE_CHECK_FAILED enabled, will just decline the trade.
                return {
                    action: 'decline',
                    reason: 'ONLY_DUPE_CHECK_FAILED',
                    meta: meta
                };
            } else if (isIgnoreEscrowCheckFailed && isOnlyEscrowCheckFailed) {
                // If only ⬜_ESCROW_CHECK_FAILED (and with 🟥_INVALID_VALUE)
                // and always ignore enabled, will do nothing.
                return;
            } else if (isIgnoreBannedCheckFailed && isOnlyBannedCheckFailed) {
                // If only ⬜_BANNED_CHECK_FAILED  (and with 🟥_INVALID_VALUE)
                // and always ignore enabled, will do nothing.
                return;
            } else if (manualReviewEnabled) {
                offer.log('info', `offer needs review (${uniqueReasons.join(', ')}), skipping...`);

                return {
                    action: 'skip',
                    reason: 'REVIEW',
                    meta: meta
                };
            } else {
                // hhhmmmmm should we combine this?
                if (hasOverstocked) {
                    offer.log('info', 'is offering too many, declining...');

                    return {
                        action: 'decline',
                        reason: '🟦_OVERSTOCKED',
                        meta: meta
                    };
                } else if (hasUnderstocked) {
                    offer.log('info', 'is taking too many, declining...');

                    return {
                        action: 'decline',
                        reason: '🟩_UNDERSTOCKED',
                        meta: meta
                    };
                } else if (hasDisabledItem) {
                    offer.log('info', 'is taking disabled item(s), declining...');

                    return {
                        action: 'decline',
                        reason: '🟧_DISABLED_ITEMS',
                        meta: meta
                    };
                } else if (hasInvalidItem) {
                    offer.log('info', 'contains invalid item(s), declining...');

                    return {
                        action: 'decline',
                        reason: '🟨_INVALID_ITEMS',
                        meta: meta
                    };
                } else if (hasDupedItem) {
                    offer.log('info', 'contains duped item(s), declining...');

                    return {
                        action: 'decline',
                        reason: '🟫_DUPED_ITEMS',
                        meta: meta
                    };
                } else if (hasDupedCheckFailed) {
                    offer.log('info', 'failed to check for duped item, declining...');

                    return {
                        action: 'decline',
                        reason: '🟪_DUPE_CHECK_FAILED',
                        meta: meta
                    };
                } else if (hasInvalidValue) {
                    // We are offering more than them, decline the offer
                    offer.log('info', 'is not offering enough, declining...');

                    return {
                        action: 'decline',
                        reason: '🟥_INVALID_VALUE',
                        meta: meta
                    };
                }
            }
        }

        offer.log(
            'trade',
            `accepting. Summary:\n${JSON.stringify(summarize(offer, this.bot, 'summary-accepting', false), null, 4)}`
        );

        if (opt.offerReceived.sendPreAcceptMessage.enable) {
            const preAcceptMessage = opt.customMessage.accepted.automatic;

            MyHandler.sendPreAcceptedMessage(
                this.bot,
                offer.partner,
                preAcceptMessage,
                itemsToGiveCount + itemsToReceiveCount > 50
            );
        }

        return {
            action: 'accept',
            reason: 'VALID',
            meta: isContainsHighValue ? { highValue: highValueMeta } : undefined
        };
    }

    private static sendPreAcceptedMessage(
        bot: Bot,
        steamID: SteamID,
        preAcceptMessageOpt: OfferType,
        itemsLarge: boolean
    ): void {
        if (itemsLarge) {
            bot.sendMessage(
                steamID,
                preAcceptMessageOpt.largeOffer
                    ? preAcceptMessageOpt.largeOffer
                    : 'I have accepted your offer. The trade may take a while to finalize due to it being a large offer.' +
                          ' If the trade does not finalize after 5-10 minutes has passed, please send your offer again, ' +
                          'or add me and use the !sell/!sellcart or !buy/!buycart command.'
            );
        } else {
            bot.sendMessage(
                steamID,
                preAcceptMessageOpt.smallOffer
                    ? preAcceptMessageOpt.smallOffer
                    : 'I have accepted your offer. The trade will be finalized shortly.' +
                          ' If the trade does not finalize after 1-2 minutes has passed, please send your offer again, ' +
                          'or add me and use the !sell/!sellcart or !buy/!buycart command.'
            );
        }
    }

    onTradeOfferChanged(offer: TradeOffer, oldState: number, timeTakenToComplete?: number): void {
        // Not sure if it can go from other states to active
        if (oldState === TradeOfferManager.ETradeOfferState['Accepted']) {
            offer.data('switchedState', oldState);
        }

        const highValue: {
            isDisableSKU: string[];
            theirItems: string[];
            items: Items;
        } = {
            isDisableSKU: [],
            theirItems: [],
            items: {}
        };

        if (offer.data('handledByUs') === true) {
            if (offer.data('notify') === true && offer.data('switchedState') !== offer.state) {
                const notifyOpt = this.opt.steamChat.notifyTradePartner;

                if (offer.state === TradeOfferManager.ETradeOfferState['Accepted']) {
                    if (notifyOpt.onSuccessAccepted) accepted(offer, this.bot);

                    if (offer.data('donation')) {
                        this.bot.messageAdmins('✅ Success! Your donation has been sent and received!', []);
                    } else if (offer.data('buyBptfPremium')) {
                        this.bot.messageAdmins('✅ Success! Your premium purchase has been sent and received!', []);
                    }
                } else if (offer.state === TradeOfferManager.ETradeOfferState['InEscrow']) {
                    if (notifyOpt.onSuccessAcceptedEscrow) acceptEscrow(offer, this.bot);
                } else if (offer.state === TradeOfferManager.ETradeOfferState['Declined']) {
                    if (notifyOpt.onDeclined) declined(offer, this.bot);
                    offer.data('isDeclined', true);
                } else if (offer.state === TradeOfferManager.ETradeOfferState['Canceled']) {
                    if (notifyOpt.onCancelled) cancelled(offer, oldState, this.bot);

                    if (offer.data('canceledByUser') === true) {
                        // do nothing
                    } else if (oldState === TradeOfferManager.ETradeOfferState['CreatedNeedsConfirmation']) {
                        offer.data('isFailedConfirmation', true);
                    } else {
                        offer.data('isCanceledUnknown', true);
                    }
                    MyHandler.removePolldataKeys(offer);
                } else if (offer.state === TradeOfferManager.ETradeOfferState['InvalidItems']) {
                    if (notifyOpt.onTradedAway) invalid(offer, this.bot);
                    offer.data('isInvalid', true);
                    MyHandler.removePolldataKeys(offer);
                }

                // Update assetid in pricelist if needed
                if (
                    ((offer.state === TradeOfferManager.ETradeOfferState['Canceled'] &&
                        offer.data('isCanceledUnknown') === true) ||
                        offer.state === TradeOfferManager.ETradeOfferState['InvalidItems']) &&
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    offer.tradeID
                ) {
                    if (Object.keys(this.bot.pricelist.assetidInPricelist).length < 1) {
                        // Check if cache is not empty
                        return;
                    }

                    offer.getExchangeDetails(true, (err, status, tradeInitTime, receivedItems, sentItems) => {
                        if (err) {
                            return log.error(err);
                        }

                        if (Array.isArray(sentItems)) {
                            sentItems.forEach(item => {
                                const entry = this.bot.pricelist.getPriceBySkuOrAsset({ priceKey: item.assetid });

                                if (entry !== null && entry.id && item.rollback_new_assetid) {
                                    const newEntry = Object.assign({}, entry);
                                    const oldId = entry.id;
                                    newEntry.id = item.rollback_new_assetid;
                                    delete newEntry.name;
                                    delete newEntry.time;

                                    this.bot.pricelist.replacePriceEntry(oldId, newEntry);
                                    const msg = `✅ Automatically replaced ${oldId} with ${newEntry.id} in pricelist due to rollback.`;
                                    log.debug(msg);
                                    const dwEnabled =
                                        this.bot.options.discordWebhook.sendAlert.enable &&
                                        this.bot.options.discordWebhook.sendAlert.url.main !== '';
                                    if (
                                        this.bot.options.sendAlert.enable &&
                                        this.bot.options.sendAlert.autoUpdateAssetid
                                    ) {
                                        if (dwEnabled) {
                                            sendAlert('autoUpdateAssetid', this.bot, msg, null, null, [
                                                oldId,
                                                newEntry.id
                                            ]);
                                        } else {
                                            this.bot.messageAdmins(msg, []);
                                        }
                                    }
                                }
                            });
                        }
                    });
                }
            }

            if (offer.state === TradeOfferManager.ETradeOfferState['Accepted'] && !this.sentSummary[offer.id]) {
                // Only run this if the bot handled the offer and do not send again if already sent once

                clearTimeout(this.resetSentSummaryTimeout);
                this.sentSummary[offer.id] = true;

                offer.data('isAccepted', true);
                offer.log('trade', 'has been accepted.');

                // Auto sell and buy keys if ref < minimum

                this.autokeys.check();

                const result = processAccepted(offer, this.bot, timeTakenToComplete);

                highValue.isDisableSKU = result.isDisableSKU;
                highValue.theirItems = result.theirHighValuedItems;
                highValue.items = result.items;
            } else if (
                offer.state === TradeOfferManager.ETradeOfferState['Declined'] &&
                this.bot.options.tradeSummary.declinedTrade.enable &&
                !this.sentSummary[offer.id]
            ) {
                //No need to create a new timeout cause a trade can't be accepted after getting declined or cant be declined after being accepted.
                clearTimeout(this.resetSentSummaryTimeout);
                this.sentSummary[offer.id] = true;

                processDeclined(offer, this.bot);
                MyHandler.removePolldataKeys(offer);
            }
        }

        if (offer.state === TradeOfferManager.ETradeOfferState['Accepted']) {
            // Offer is accepted

            if (this.isCraftingManual === false) {
                // Smelt / combine metal
                keepMetalSupply(this.bot, this.minimumScrap, this.minimumReclaimed, this.combineThreshold);

                // Craft duplicate weapons
                craftDuplicateWeapons(this.bot)
                    .then(() => {
                        return craftClassWeapons(this.bot);
                    })
                    .catch(err => {
                        log.warn('Failed to craft duplicated craft/class weapons', err);
                    });
            }

            // Sort inventory
            this.sortInventory();

            // Tell bot uptime
            log.debug(uptime());

            // Update listings
            updateListings(offer, this.bot, highValue);

            // Invite to group
            this.inviteToGroups(offer.partner);

            // delete notify and meta keys from polldata after each successful trades
            MyHandler.removePolldataKeys(offer);

            this.resetSentSummaryTimeout = setTimeout(() => {
                this.sentSummary = {};
            }, 2 * 60 * 1000);
        } else {
            this.bot.client.gamesPlayed(this.opt.miscSettings.game.playOnlyTF2 ? 440 : [this.customGameName, 440]);
        }
    }

    private static removePolldataKeys(offer: TradeOffer): void {
        offer.data('notify', undefined);
        offer.data('meta', undefined);
    }

    onOfferAction(
        offer: TradeOffer,
        action: 'accept' | 'decline' | 'skip' | 'counter',
        reason: string,
        meta: Meta
    ): void {
        if (offer.data('notify') !== true) {
            return;
        }

        if (action === 'skip') {
            void sendReview(offer, this.bot, meta);
            return;
        }
    }

    private sortInventory(): void {
        if (this.opt.miscSettings.sortInventory.enable) {
            const type = this.opt.miscSettings.sortInventory.type;
            this.bot.tf2gc.sortInventory(type);
        }
    }

    private inviteToGroups(steamID: SteamID | string): void {
        if (!this.opt.miscSettings.sendGroupInvite.enable) {
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

            if ((this.bot.client.myFriends[steamID64] as number) === EFriendRelationship.RequestRecipient) {
                // relation
                this.respondToFriendRequest(steamID64);
            }
        }

        this.bot.getAdmins.forEach(steamID => {
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
        if (!this.opt.miscSettings.addFriends.enable) {
            if (!this.bot.isAdmin(steamID)) {
                return this.bot.client.removeFriend(steamID);
            }
        }

        const steamID64 = typeof steamID === 'string' ? steamID : steamID.getSteamID64();
        const accept = () => {
            log.info(`Accepting friend request from ${steamID64}...`);
            this.bot.client.addFriend(steamID, err => {
                if (err) {
                    log.warn(`Failed to accept friend request from ${steamID64}: `, err);
                    return;
                }
                log.debug('Friend request has been accepted');
            });
        };

        if (this.bot.isAdmin(steamID)) {
            return accept();
        }

        void this.bot
            .checkBanned(steamID)
            .then(banned => {
                if (banned.isBanned) {
                    log.info(`Declining friend request and blocking ${steamID64}...`);

                    this.bot.client.removeFriend(steamID);
                    this.bot.client.blockUser(steamID, err => {
                        if (err) {
                            log.error(`❌ Failed to block user ${steamID64}: `, err);
                        } else log.info(`✅ Successfully blocked user ${steamID64}`);
                    });

                    this.saveBlockedUser(
                        steamID64,
                        `[onFriendRequest] Banned on ${Object.keys(banned.contents)
                            .filter(website => banned.contents[website] !== 'clean')
                            .join(', ')}`
                    );

                    return;
                }

                return accept();
            })
            .catch(err => {
                log.error('Failed to check banned on respondToFriendRequest: ', err);
                return; // We respond again later
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

                    return this.bot.sendMessage(
                        steamID,
                        this.opt.customMessage.welcome
                            ? this.opt.customMessage.welcome
                                  .replace(/%name%/g, '')
                                  .replace(/%admin%/g, isAdmin ? '!help' : '!how2trade')
                            : `Hi! If you don't know how things work, please type "!${isAdmin ? 'help' : 'how2trade'}"`
                    );
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
                this.opt.customMessage.welcome
                    ? this.opt.customMessage.welcome
                          .replace(/%name%/g, friend.player_name)
                          .replace(/%admin%/g, isAdmin ? '!help' : '!how2trade')
                    : `Hi ${friend.player_name}! If you don't know how things work, please type ` +
                          `"!${isAdmin ? 'help' : 'how2trade'}"`
            );
        });
    }

    private checkFriendsCount(steamIDToIgnore?: SteamID | string): void {
        log.debug('Checking friends count');
        const friends = this.bot.friends.getFriends;
        const friendslistBuffer = 20;
        const friendsToRemoveCount = friends.length + friendslistBuffer - this.bot.friends.maxFriends;

        log.debug(`Friends to remove: ${friendsToRemoveCount}`);
        if (friendsToRemoveCount > 0) {
            // We have friends to remove, find people with fewest trades and remove them
            const friendsWithTrades = this.bot.trades.getTradesWithPeople(friends);

            // Ignore friends to keep
            this.friendsToKeep.forEach(steamID => delete friendsWithTrades[steamID]);

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

            // Sorts people by trades and picks people with lowest amounts of trades but not the 2 latest people
            const friendsToRemove = tradesWithPeople
                .sort((a, b) => a.trades - b.trades)
                .splice(1, friendsToRemoveCount - 2 <= 0 ? 2 : friendsToRemoveCount);

            log.info(`Cleaning up friendslist, removing ${friendsToRemove.length} people...`);
            friendsToRemove.forEach(friend => {
                const friendSteamID = friend.steamID;
                const getFriend = this.bot.friends.getFriend(friendSteamID);

                this.bot.sendMessage(
                    friendSteamID,
                    this.opt.customMessage.clearFriends
                        ? this.opt.customMessage.clearFriends.replace(
                              /%name%/g,
                              getFriend ? getFriend.player_name : friendSteamID
                          )
                        : '/quote I am cleaning up my friend list and you have randomly been selected to be removed. ' +
                              'Please feel free to add me again if you want to trade at a later time!'
                );
                this.bot.client.removeFriend(friendSteamID);
            });
        }
    }

    private getBPTFAccountInfo(): Promise<void> {
        return new Promise((resolve, reject) => {
            const steamID64 = this.bot.manager.steamID.getSteamID64();

            void axios({
                url: 'https://api.backpack.tf/api/users/info/v1',
                method: 'GET',
                headers: {
                    'User-Agent': 'TF2Autobot@' + process.env.BOT_VERSION,
                    Cookie: 'user-id=' + this.bot.userID
                },
                params: {
                    key: this.opt.bptfApiKey,
                    steamids: steamID64
                }
            })
                .then(response => {
                    const body = response.data as BPTFGetUserInfo;

                    const user = body.users[steamID64];
                    this.botName = user.name;
                    this.botAvatarURL = user.avatar;
                    this.isPremium = user.premium ? user.premium === 1 : false;
                    return resolve();
                })
                .catch((err: AxiosError) => {
                    if (err) {
                        log.error(
                            'Failed requesting bot info from backpack.tf, retrying in 5 minutes: ',
                            filterAxiosError(err)
                        );
                        clearTimeout(this.retryRequest);

                        this.retryRequest = setTimeout(() => {
                            this.getBPTFAccountInfo().catch(() => {
                                // ignore error
                            });
                        }, 5 * 60 * 1000);
                        return reject();
                    }
                });
        });
    }

    private checkGroupInvites(): void {
        for (const groupID64 in this.bot.client.myGroups) {
            if (!Object.prototype.hasOwnProperty.call(this.bot.client.myGroups, groupID64)) {
                continue;
            }

            if ((this.bot.client.myGroups[groupID64] as number) === EClanRelationship.Invited) {
                // relation
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

    private deleteUntradableJunk(): void {
        const assetidsToDelete = this.bot.inventoryManager.getInventory.findUntradableJunk();

        for (const assetid of assetidsToDelete) {
            log.debug(`Deleting junk item ${assetid}`);
            this.bot.tf2gc.deleteItem(assetid, err => {
                log.warn('Error deleting untradable junk', err);
            });
        }
    }

    onPollData(pollData: PollData): void {
        files.writeFile(this.paths.files.pollData, pollData, true).catch(err => {
            log.warn('Failed to save polldata: ', err);
        });
    }

    async onPricelist(pricelist: PricesObject): Promise<void> {
        if (Object.keys(pricelist).length === 0) {
            // Ignore errors
            await this.bot.listings.removeAll().catch(err => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                log.error('Error on removing all listings: ', filterAxiosError(err));
            });
        }

        /*
         * was: Failed to save pricelist:  The "data" argument must be of type string or an instance of Buffer, TypedArray, or
         * DataView. Received undefined {"code":"ERR_INVALID_ARG_TYPE"}
         *
         * This will also save the "name" property. I think it's okay.
         */
        files.writeFile(this.paths.files.pricelist, pricelist, true).catch(err => {
            log.warn('Failed to save pricelist: ', err);
        });
    }

    onPriceChange(priceKey: string, entry: Entry): void {
        this.bot.listings.checkByPriceKey({ priceKey, data: entry, checkGenerics: false, showLogs: true });
    }

    saveBlockedUser(steamID: string, reason: string): void {
        if (reason) {
            // Will add or replace new one, if reason is defined
            this.bot.blockedList[steamID] = reason;

            files.writeFile(this.paths.files.blockedList, this.bot.blockedList, true).catch(err => {
                log.warn('Failed to save blockedList: ', err);
            });
        }
    }

    removeBlockedUser(steamID: string): void {
        delete this.bot.blockedList[steamID];

        files.writeFile(this.paths.files.blockedList, this.bot.blockedList, true).catch(err => {
            log.warn('Failed to update blockedList: ', err);
        });
    }

    onUserAgent(pulse: { status: string; current_time?: number; expire_at?: number; client?: string }): void {
        if (pulse.client) {
            delete pulse.client;
        }
        // log.debug('user-agent', pulse);
    }

    onLoginThrottle(wait: number): void {
        log.warn(`Waiting ${wait} ms before trying to sign in...`);
    }

    onTF2QueueCompleted(): void {
        log.debug('Queue finished');
        this.bot.client.gamesPlayed(this.opt.miscSettings.game.playOnlyTF2 ? 440 : [this.customGameName, 440]);
    }

    onCreateListingsSuccessful(response: { created: number; archived: number; errors: any[] }): void {
        log.debug('Successfully create listings:', response);
    }

    onUpdateListingsSuccessful(response: { updated: number; errors: any[] }): void {
        log.debug('Successfully update listings:', response);
    }

    onDeleteListingsSuccessful(response: Record<string, unknown>): void {
        log.debug('Successfully delete listings:', response);
    }

    onDeleteArchivedListingSuccessful(response: boolean): void {
        log.debug('Successfully delete an archived listing:', response);
    }

    onCreateListingsError(err: Error): void {
        log.error('Error on create listings:', err);
    }

    onUpdateListingsError(err: Error): void {
        log.error('Error on update listings:', err);
    }

    onDeleteListingsError(err: Error): void {
        log.error('Error on delete listings:', err);
    }

    onDeleteArchivedListingError(err: Error): void {
        log.error('Error on delete archived listings:', err);
    }

    onSystemMessage(message: string): void {
        if (
            this.opt.discordWebhook.sendTf2Events.systemMessage.enable &&
            this.opt.discordWebhook.sendTf2Events.systemMessage.url !== ''
        ) {
            sendTf2SystemMessage(this.bot, message);
        }
    }

    onDisplayNotification(title: string, body: string): void {
        if (
            this.opt.discordWebhook.sendTf2Events.displayNotification.enable &&
            this.opt.discordWebhook.sendTf2Events.displayNotification.url !== ''
        ) {
            sendTf2DisplayNotification(this.bot, title, body);
        }
    }

    onItemBroadcast(message: string, username: string, wasDestruction: boolean, defindex: number): void {
        if (
            this.opt.discordWebhook.sendTf2Events.itemBroadcast.enable &&
            this.opt.discordWebhook.sendTf2Events.itemBroadcast.url !== ''
        ) {
            sendTf2ItemBroadcast(this.bot, message, username, wasDestruction, defindex);
        }
    }

    refreshPollDataPath() {
        const newPaths = genPaths(this.opt.steamAccountName);
        const pathChanged = newPaths.files.pollData !== this.paths.files.pollData;
        this.paths = newPaths;

        if (!pathChanged) {
            return;
        }

        files
            .readFile(this.paths.files.pollData, true)
            .then((pollDataFile: SteamTradeOfferManager.PollData | null) => {
                const currentPollData = this.bot.manager.pollData;
                const activeOffers = this.bot.trades.getActiveOffers(currentPollData);
                const newPollData = pollDataFile
                    ? pollDataFile
                    : ({ sent: {}, received: {}, offerData: {} } as SteamTradeOfferManager.PollData);
                Object.keys(activeOffers).forEach(intent => {
                    (activeOffers[intent] as string[]).forEach(id => {
                        (newPollData[intent] as Record<string, number>)[id] = (
                            currentPollData[intent] as Record<string, number>
                        )[id];

                        newPollData.offerData[id] = currentPollData.offerData[id];
                    });
                });
                this.bot.manager.pollData = newPollData;
                // TODO: Remove duplicate entries
                // Duplicates are already handled in src/lib/tools/polldata
                // so this is only for optimizing storage
            })
            .catch(err => {
                log.error('Failed to update polldata path:', err);
            });
    }
}

interface OnNewTradeOffer {
    action: 'accept' | 'decline' | 'skip' | 'counter';
    reason: string;
    meta?: Meta;
}

export interface BotInfo {
    name: string;
    avatarURL: string;
    steamID: SteamID;
    premium: boolean;
}

interface GetHighValue {
    our: Which;
    their: Which;
}

interface Which {
    items: Record<string, any>;
    isMention: boolean;
}
