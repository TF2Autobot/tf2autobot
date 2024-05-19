import Currencies from '@tf2autobot/tf2-currencies';
import { genUserPure, genScrapAdjustment } from './userSettings';
import Bot from '../Bot';
import { EntryData, KeyPrices, PricelistChangedSource } from '../Pricelist';
import log from '../../lib/logger';
import { currPure } from '../../lib/tools/pure';
import sendAlert from '../DiscordWebhook/sendAlert';

export interface OverallStatus {
    isBuyingKeys: boolean;
    isBankingKeys: boolean;
    checkAlertOnLowPure: boolean;
    alreadyUpdatedToBank: boolean;
    alreadyUpdatedToBuy: boolean;
    alreadyUpdatedToSell: boolean;
}

type SetOverallStatus = [boolean, boolean, boolean, boolean, boolean, boolean];

interface OldAmount {
    keysCanBuy: number;
    keysCanSell: number;
    keysCanBankMin: number;
    keysCanBankMax: number;
    ofKeys: number;
}

type SetOldAmount = [number, number, number, number, number];

export default class Autokeys {
    get isEnabled(): boolean {
        return this.bot.options.autokeys.enable;
    }

    get isKeyBankingEnabled(): boolean {
        return this.bot.options.autokeys.banking.enable;
    }

    get isEnableScrapAdjustment(): boolean {
        return genScrapAdjustment(
            this.bot.options.autokeys.scrapAdjustment.value,
            this.bot.options.autokeys.scrapAdjustment.enable
        ).enabled;
    }

    get scrapAdjustmentValue(): number {
        return genScrapAdjustment(
            this.bot.options.autokeys.scrapAdjustment.value,
            this.bot.options.autokeys.scrapAdjustment.enable
        ).value;
    }

    get userPure(): {
        minKeys: number;
        maxKeys: number;
        minRefs: number;
        maxRefs: number;
    } {
        return genUserPure(
            this.bot.options.autokeys.minKeys,
            this.bot.options.autokeys.maxKeys,
            this.bot.options.autokeys.minRefined,
            this.bot.options.autokeys.maxRefined
        );
    }

    private isActive = false;

    private set setActiveStatus(set: boolean) {
        this.isActive = set;
    }

    get getActiveStatus(): boolean {
        return this.isActive;
    }

    private status: OverallStatus = {
        isBuyingKeys: false,
        isBankingKeys: false,
        checkAlertOnLowPure: false,
        alreadyUpdatedToBank: false,
        alreadyUpdatedToBuy: false,
        alreadyUpdatedToSell: false
    };

    private set setOverallStatus(set: SetOverallStatus) {
        this.status = {
            isBuyingKeys: set[0],
            isBankingKeys: set[1],
            checkAlertOnLowPure: set[2],
            alreadyUpdatedToBank: set[3],
            alreadyUpdatedToBuy: set[4],
            alreadyUpdatedToSell: set[5]
        };
    }

    get getOverallStatus(): OverallStatus {
        return this.status;
    }

    private oldAmount: OldAmount = {
        keysCanBuy: 0,
        keysCanSell: 0,
        keysCanBankMin: 0,
        keysCanBankMax: 0,
        ofKeys: 0
    };

    private set setOldAmount(set: SetOldAmount) {
        this.oldAmount = {
            keysCanBuy: set[0],
            keysCanSell: set[1],
            keysCanBankMin: set[2],
            keysCanBankMax: set[3],
            ofKeys: set[4]
        };
    }

    private OldKeyPrices: { buy: Currencies; sell: Currencies };

    constructor(private readonly bot: Bot) {
        this.bot = bot;
    }

    check(): void {
        log.debug(`checking autokeys (Enabled: ${String(this.isEnabled)})`);
        if (this.isEnabled === false) return;

        const userPure = this.userPure;

        const userMinKeys = userPure.minKeys;
        const userMaxKeys = userPure.maxKeys;
        const userMinRef = userPure.minRefs;
        const userMaxRef = userPure.maxRefs;

        if (isNaN(userMinKeys) || isNaN(userMaxKeys) || isNaN(userMinRef) || isNaN(userMaxRef)) {
            log.warn(
                "You've entered a non-number on either your MINIMUM_KEYS/MINIMUM_REFINED/MAXIMUM_REFINED variables," +
                    ' please correct it. Autokeys is disabled until you correct it.'
            );
            return;
        }

        const pure = currPure(this.bot);
        const currKeys = pure.key;
        const currRef = pure.refTotalInScrap;

        const currKeyPrice = this.bot.pricelist.getKeyPrices;
        if (currKeyPrice !== this.OldKeyPrices && this.isEnableScrapAdjustment) {
            // When scrap adjustment activated, if key rate changes, then it will force update key prices after a trade.
            this.setOverallStatus = [false, false, false, false, false, false];
            this.OldKeyPrices = { buy: currKeyPrice.buy, sell: currKeyPrice.sell };
        }

        /** enable Autokeys - Buying - true if currRef \> maxRef AND currKeys \< maxKeys */
        const isBuyingKeys = currRef > userMaxRef && currKeys < userMaxKeys;
        /*
         *      <————————————○      \
         * Keys ----|--------|---->  ⟩ AND
         *                   ○————> /
         * Refs ----|--------|---->
         *         min     max
         */

        /** enable Autokeys - Selling - true if currRef \< minRef AND currKeys \> minKeys */
        const isSellingKeys = currRef < userMinRef && currKeys > userMinKeys;
        /*
         *          ○—————————————> \
         * Keys ----|--------|---->  ⟩ AND
         *      <———○               /
         * Refs ----|--------|---->
         *         min      max
         */

        /**
         * disable Autokeys - true if currRef \>= maxRef AND currKeys \>= maxKeys OR
         * (minRef \<= currRef \<= maxRef AND currKeys \<= maxKeys)
         */
        const isRemoveAutoKeys =
            (currRef >= userMaxRef && currKeys >= userMaxKeys) ||
            (currRef >= userMinRef && currRef <= userMaxRef && currKeys <= userMaxKeys);
        /*
         *      <————————————●····> \
         * Keys ----|--------|---->  ⟩ AND
         *          ●————————●····> /
         * Refs ----|--------|---->
         *         min      max
         *                 ^^|^^
         *                   OR
         */

        /** enable Autokeys - Banking - true if user set autokeys.banking.enable to true */
        const isEnableKeyBanking = this.isKeyBankingEnabled;

        /** enable Autokeys - Banking - true if minRef \< currRef \< maxRef AND currKeys \> minKeys */
        const isBankingKeys = currRef > userMinRef && currRef < userMaxRef && currKeys > userMinKeys;
        /*
         *          ○—————————————> \
         * Keys ----|--------|---->  ⟩ AND
         *          ○————————○      /
         * Refs ----|-------|---->
         *         min     max
         */

        /** enable Autokeys - Banking - true if currRef \> minRef AND keys \< minKeys will buy keys. */
        const isBankingBuyKeysWithEnoughRefs = currRef > userMinRef && currKeys <= userMinKeys;
        /*
         *      <———●               \
         * Keys ----|--------|---->  ⟩ AND
         *          ○—————————————> /
         * Refs ----|--------|---->
         *         min      max
         */

        /** disable Autokeys - Banking - true if currRef \< minRef AND currKeys \< minKeys */
        const isRemoveBankingKeys = currRef <= userMaxRef && currKeys <= userMinKeys;
        /*
         *      <———●               \
         * Keys ----|--------|---->  ⟩ AND
         *      <————————————●      /
         * Refs ----|--------|---->
         *         min      max
         */

        /** send alert to admins when both keys and refs below minimum */
        const isAlertAdmins = currRef <= userMinRef && currKeys <= userMinKeys;
        /*
         *      <———●               \
         * Keys ----|--------|---->  ⟩ AND
         *      <———●               /
         * Refs ----|--------|---->
         *         min      max
         */

        let setMinKeys: number;
        let setMaxKeys: number;
        const rKeysCanBuy = Math.round((currRef - userMaxRef) / currKeyPrice.buy.toValue());
        const rKeysCanSell = Math.round((userMinRef - currRef) / currKeyPrice.sell.toValue());
        const rKeysCanBankMin = Math.round((userMaxRef - currRef) / currKeyPrice.sell.toValue());
        const rKeysCanBankMax = Math.round((currRef - userMinRef) / currKeyPrice.buy.toValue());

        // Check and set new min and max
        if (isBuyingKeys) {
            const inventoryManager = this.bot.inventoryManager;
            if (!inventoryManager.isCanAffordToBuy(currKeyPrice.buy, inventoryManager.getInventory)) {
                // if the bot can't afford to buy, just abort
                // this is very unlikely, but possible I guess.
                return;
            }

            // If buying - we need to set min = currKeys and max = currKeys + CanBuy
            const min = currKeys;
            setMinKeys = min <= userMinKeys ? userMinKeys : min;

            const max = currKeys + rKeysCanBuy;
            setMaxKeys = max >= userMaxKeys ? userMaxKeys : max < 1 ? 1 : max;

            if (setMinKeys === setMaxKeys) {
                setMaxKeys += 1;
            } else if (setMinKeys > setMaxKeys) {
                setMaxKeys = setMinKeys + 1;
            }
            //
        } else if (isBankingBuyKeysWithEnoughRefs && isEnableKeyBanking) {
            const inventoryManager = this.bot.inventoryManager;
            if (!inventoryManager.isCanAffordToBuy(currKeyPrice.buy, inventoryManager.getInventory)) {
                // if the bot can't afford to buy, just abort
                // example, set min ref to 60 ref, but the bot have 50 ref and the current buying price is 68 ref
                return;
            }

            // If buying (while banking) - we need to set min = currKeys and max = currKeys + CanBankMax
            const min = currKeys;
            setMinKeys = min <= userMinKeys ? userMinKeys : min;

            const max = currKeys + rKeysCanBankMax;
            setMaxKeys = max >= userMaxKeys ? userMaxKeys : max < 1 ? 1 : max;

            if (setMinKeys === setMaxKeys) {
                setMaxKeys += 1;
            } else if (setMinKeys > setMaxKeys) {
                setMaxKeys = setMinKeys + 2;
            }
            //
        } else if (isSellingKeys) {
            // If selling - we need to set min = currKeys - CanSell and max = currKeys
            const min = currKeys - rKeysCanSell;
            setMinKeys = min <= userMinKeys ? userMinKeys : min;

            const max = currKeys;
            setMaxKeys = max >= userMaxKeys ? userMaxKeys : max < 1 ? 1 : max;

            if (setMinKeys === setMaxKeys) {
                setMinKeys -= 1;
            } else if (setMinKeys > setMaxKeys) {
                setMaxKeys = setMinKeys + 1;
            }
            //
        } else if (isBankingKeys && isEnableKeyBanking) {
            // If banking - we need to set min = currKeys - CanBankMin and max = currKeys + CanBankMax
            const min = currKeys - rKeysCanBankMin;
            setMinKeys = min <= userMinKeys ? userMinKeys : min;

            const max = currKeys + rKeysCanBankMax;
            setMaxKeys = max >= userMaxKeys ? userMaxKeys : max < 1 ? 1 : max;

            if (setMinKeys === setMaxKeys) {
                setMinKeys -= 1;
            } else if (setMaxKeys - setMinKeys === 1) {
                setMaxKeys += 1;
            } else if (setMinKeys > setMaxKeys) {
                // When banking, the bot should be able to both buy and sell keys.
                setMaxKeys = setMinKeys + 2;
            }

            // When banking, the bot should be able to both buy and sell keys.
            if (setMaxKeys === currKeys) {
                setMaxKeys += 1;
            }
            if (currKeys >= setMaxKeys) {
                setMaxKeys = currKeys + 1;
            }
        }

        const opt = this.bot.options;

        const isBanking =
            isBankingKeys &&
            isEnableKeyBanking &&
            (!this.status.alreadyUpdatedToBank ||
                rKeysCanBankMin !== this.oldAmount.keysCanBankMin ||
                rKeysCanBankMax !== this.oldAmount.keysCanBankMax ||
                currKeys !== this.oldAmount.ofKeys);

        const isTooManyRefWhileBanking =
            isBankingBuyKeysWithEnoughRefs &&
            isEnableKeyBanking &&
            (!this.status.alreadyUpdatedToBuy ||
                rKeysCanBankMax !== this.oldAmount.keysCanBuy ||
                currKeys !== this.oldAmount.ofKeys);

        const buyKeys =
            isBuyingKeys &&
            (!this.status.alreadyUpdatedToBuy ||
                rKeysCanBuy !== this.oldAmount.keysCanBuy ||
                currKeys !== this.oldAmount.ofKeys);

        const sellKeys =
            isSellingKeys &&
            (!this.status.alreadyUpdatedToSell ||
                rKeysCanSell !== this.oldAmount.keysCanSell ||
                currKeys !== this.oldAmount.ofKeys);

        const alertLowPure = () => {
            const msg = 'I am now low on both keys and refs.';
            if (opt.sendAlert.enable && opt.sendAlert.autokeys.lowPure) {
                if (opt.discordWebhook.sendAlert.enable && opt.discordWebhook.sendAlert.url.main !== '')
                    sendAlert('lowPure', this.bot, msg);
                else this.bot.messageAdmins(msg, []);
            }
        };

        const common1 = () => {
            this.setOverallStatus = [false, true, false, true, false, false];
            this.setOldAmount = [0, 0, rKeysCanBankMin, rKeysCanBankMax, currKeys];
            this.setActiveStatus = true;
        };

        const common2 = () => {
            this.setOverallStatus = [true, false, false, false, true, false];
            this.setOldAmount = [0, rKeysCanBankMax, 0, 0, currKeys];
            this.setActiveStatus = true;
        };

        const common3 = () => {
            this.setOverallStatus = [true, false, false, false, true, false];
            this.setOldAmount = [0, rKeysCanBuy, 0, 0, currKeys];
            this.setActiveStatus = true;
        };

        const common4 = () => {
            this.setOverallStatus = [false, false, false, false, false, true];
            this.setOldAmount = [rKeysCanSell, 0, 0, 0, currKeys];
            this.setActiveStatus = true;
        };

        const common5 = () => {
            this.setOverallStatus = [false, false, true, false, false, false];
            this.setActiveStatus = false;
            alertLowPure();
        };

        const isNotInPricelist = this.bot.pricelist.getPrice({ priceKey: '5021;6', onlyEnabled: false }) === null;

        if (this.isActive || (!this.isActive && !isNotInPricelist)) {
            // if Autokeys already running OR Not running and exist in pricelist
            if (isBanking) {
                // enable keys banking - if banking conditions to enable banking matched and banking is enabled
                common1();
                this.updateToBank(setMinKeys, setMaxKeys, currKeyPrice);
                //
            } else if (isTooManyRefWhileBanking) {
                // enable keys banking - if refs > minRefs but Keys < minKeys, will buy keys.
                common2();
                this.update(setMinKeys, setMaxKeys, currKeyPrice, 'buy');
                //
            } else if (buyKeys) {
                // enable Autokeys - Buying - if buying keys conditions matched
                common3();
                this.update(setMinKeys, setMaxKeys, currKeyPrice, 'buy');
                //
            } else if (sellKeys) {
                // enable Autokeys - Selling - if selling keys conditions matched
                common4();
                this.update(setMinKeys, setMaxKeys, currKeyPrice, 'sell');
                //
            } else if (
                this.isActive &&
                ((isRemoveBankingKeys && isEnableKeyBanking) || (isRemoveAutoKeys && !isEnableKeyBanking))
            ) {
                // disable keys banking - if to conditions to disable banking matched and banking is enabled
                this.setOverallStatus = [false, false, false, false, false, false];
                this.setActiveStatus = false;
                void this.disable(currKeyPrice);
                //
            } else if (isAlertAdmins && !this.status.checkAlertOnLowPure) {
                // alert admins when low pure
                common5();
            }
        } else if (isNotInPricelist) {
            // if Autokeys is not running/disabled AND not exist in pricelist
            if (isBankingKeys && isEnableKeyBanking) {
                //create new Key entry and enable keys banking - if banking conditions to enable banking matched and banking is enabled
                common1();
                this.createToBank(setMinKeys, setMaxKeys, currKeyPrice);
                //
            } else if (isBankingBuyKeysWithEnoughRefs && isEnableKeyBanking) {
                // enable keys banking - if refs > minRefs but Keys < minKeys, will buy keys.
                common2();
                this.create(setMinKeys, setMaxKeys, currKeyPrice, 'buy');
                //
            } else if (isBuyingKeys) {
                // create new Key entry and enable Autokeys - Buying - if buying keys conditions matched
                common3();
                this.create(setMinKeys, setMaxKeys, currKeyPrice, 'buy');
                //
            } else if (isSellingKeys) {
                // create new Key entry and enable Autokeys - Selling - if selling keys conditions matched
                common4();
                this.create(setMinKeys, setMaxKeys, currKeyPrice, 'sell');
                //
            } else if (isAlertAdmins && !this.status.checkAlertOnLowPure) {
                // alert admins when low pure
                common5();
            }
        }
        log.debug(
            `Autokeys status:-\n   Ref: minRef(${Currencies.toRefined(userMinRef)})` +
                ` < currRef(${Currencies.toRefined(currRef)})` +
                ` < maxRef(${Currencies.toRefined(userMaxRef)})` +
                `\n   Key: minKeys(${userMinKeys}) ≤ currKeys(${currKeys}) ≤ maxKeys(${userMaxKeys})` +
                `\nStatus: ${
                    isBankingKeys && isEnableKeyBanking && this.isActive
                        ? `Banking (Min: ${setMinKeys}, Max: ${setMaxKeys})`
                        : isBuyingKeys && this.isActive
                        ? `Buying (Min: ${setMinKeys}, Max: ${setMaxKeys})`
                        : isSellingKeys && this.isActive
                        ? `Selling (Min: ${setMinKeys}, Max: ${setMaxKeys})`
                        : 'Not active'
                }`
        );
    }

    private static generateEntry(enabled: boolean, min: number, max: number, intent: 0 | 1 | 2): EntryData {
        return {
            sku: '5021;6',
            enabled: enabled,
            autoprice: true,
            min: min,
            max: max,
            intent: intent
        };
    }

    private static setManual(entry: EntryData, keyPrices: KeyPrices): EntryData {
        entry.autoprice = false;
        entry.buy = {
            keys: 0,
            metal: keyPrices.buy.metal
        };
        entry.sell = {
            keys: 0,
            metal: keyPrices.sell.metal
        };
        return entry;
    }

    private setWithScrapAdjustment(entry: EntryData, keyPrices: KeyPrices, type: 'buy' | 'sell'): EntryData {
        const optSA = this.bot.options.autokeys.scrapAdjustment;
        const scrapAdjustment = genScrapAdjustment(optSA.value, optSA.enable);

        entry.autoprice = false;
        entry.buy = {
            keys: 0,
            metal: Currencies.toRefined(
                keyPrices.buy.toValue() + (type === 'buy' ? scrapAdjustment.value : -scrapAdjustment.value)
            )
        };
        entry.sell = {
            keys: 0,
            metal: Currencies.toRefined(
                keyPrices.sell.toValue() + (type === 'buy' ? scrapAdjustment.value : -scrapAdjustment.value)
            )
        };
        return entry;
    }

    private onError(
        setActive: boolean,
        msg: string,
        isEnableSend: boolean,
        sendToDiscord: boolean,
        type: string
    ): void {
        this.setActiveStatus = setActive;
        log.warn(msg);

        if (isEnableSend) {
            if (sendToDiscord) {
                sendAlert(type as AlertType, this.bot, msg);
            } else {
                this.bot.messageAdmins(msg, []);
            }
        }
    }

    private createToBank(minKeys: number, maxKeys: number, keyPrices: KeyPrices): void {
        let entry = Autokeys.generateEntry(true, minKeys, maxKeys, 2);

        if (keyPrices.src === 'manual') {
            entry = Autokeys.setManual(entry, keyPrices);
        }

        this.bot.pricelist
            .addPrice({ entryData: entry, emitChange: true, src: PricelistChangedSource.Autokeys })
            .then(() => log.debug(`✅ Automatically added Mann Co. Supply Crate Key to bank.`))
            .catch(err => {
                const opt2 = this.bot.options;
                this.onError(
                    false,
                    `❌ Failed to add Mann Co. Supply Crate Key to bank automatically: ${(err as Error).message}`,
                    opt2.sendAlert.enable && opt2.sendAlert.autokeys.failedToAdd,
                    opt2.discordWebhook.sendAlert.enable && opt2.discordWebhook.sendAlert.url.main !== '',
                    'autokeys-failedToAdd-bank'
                );
            });
    }

    private create(minKeys: number, maxKeys: number, keyPrices: KeyPrices, intent: 'buy' | 'sell'): void {
        let entry = Autokeys.generateEntry(true, minKeys, maxKeys, intent === 'buy' ? 0 : 1);

        if (keyPrices.src === 'manual' && !this.isEnableScrapAdjustment) {
            entry = Autokeys.setManual(entry, keyPrices);
        } else if (this.isEnableScrapAdjustment) {
            entry = this.setWithScrapAdjustment(entry, keyPrices, intent);
        }

        this.bot.pricelist
            .addPrice({ entryData: entry, emitChange: true, src: PricelistChangedSource.Autokeys })
            .then(() => log.debug(`✅ Automatically added Mann Co. Supply Crate Key to ${intent}.`))
            .catch(err => {
                const opt2 = this.bot.options;
                this.onError(
                    false,
                    `❌ Failed to add Mann Co. Supply Crate Key to ${intent} automatically: ${(err as Error).message}`,
                    opt2.sendAlert.enable && opt2.sendAlert.autokeys.failedToAdd,
                    opt2.discordWebhook.sendAlert.enable && opt2.discordWebhook.sendAlert.url.main !== '',
                    `autokeys-failedToAdd-${intent}`
                );
            });
    }

    private updateToBank(minKeys: number, maxKeys: number, keyPrices: KeyPrices): void {
        let entry = Autokeys.generateEntry(true, minKeys, maxKeys, 2);

        if (keyPrices.src === 'manual') {
            entry = Autokeys.setManual(entry, keyPrices);
        }

        this.bot.pricelist
            .updatePrice({
                priceKey: entry.sku,
                entryData: entry,
                emitChange: true,
                src: PricelistChangedSource.Autokeys
            })
            .then(() => log.debug(`✅ Automatically updated Mann Co. Supply Crate Key to bank.`))
            .catch(err => {
                const opt2 = this.bot.options;
                this.onError(
                    false,
                    `❌ Failed to update Mann Co. Supply Crate Key to bank automatically: ${(err as Error).message}`,
                    opt2.sendAlert.enable && opt2.sendAlert.autokeys.failedToUpdate,
                    opt2.discordWebhook.sendAlert.enable && opt2.discordWebhook.sendAlert.url.main !== '',
                    'autokeys-failedToUpdate-bank'
                );
            });
    }

    private update(minKeys: number, maxKeys: number, keyPrices: KeyPrices, intent: 'buy' | 'sell'): void {
        let entry = Autokeys.generateEntry(true, minKeys, maxKeys, intent === 'buy' ? 0 : 1);

        if (keyPrices.src === 'manual' && !this.isEnableScrapAdjustment) {
            entry = Autokeys.setManual(entry, keyPrices);
        } else if (this.isEnableScrapAdjustment) {
            entry = this.setWithScrapAdjustment(entry, keyPrices, intent);
        }

        this.bot.pricelist
            .updatePrice({
                priceKey: entry.sku,
                entryData: entry,
                emitChange: true,
                src: PricelistChangedSource.Autokeys
            })
            .then(() => log.debug(`✅ Automatically update Mann Co. Supply Crate Key to ${intent}.`))
            .catch(err => {
                const opt2 = this.bot.options;
                this.onError(
                    false,
                    `❌ Failed to update Mann Co. Supply Crate Key to ${intent} automatically: ${
                        (err as Error).message
                    }`,
                    opt2.sendAlert.enable && opt2.sendAlert.autokeys.failedToUpdate,
                    opt2.discordWebhook.sendAlert.enable && opt2.discordWebhook.sendAlert.url.main !== '',
                    `autokeys-failedToUpdate-${intent}`
                );
            });
    }

    disable(keyPrices: KeyPrices): Promise<void> {
        return new Promise((resolve, reject) => {
            const match = this.bot.pricelist.getPrice({ priceKey: '5021;6', onlyEnabled: false });
            if (match === null || !match.enabled) {
                return resolve();
            }

            let entry = Autokeys.generateEntry(false, 0, 1, 2);

            if (keyPrices.src === 'manual') {
                entry = Autokeys.setManual(entry, keyPrices);
            }

            this.bot.pricelist
                .updatePrice({
                    priceKey: entry.sku,
                    entryData: entry,
                    emitChange: true,
                    src: PricelistChangedSource.Autokeys
                })
                .then(() => {
                    log.debug('✅ Automatically disabled Autokeys.');
                    resolve();
                })
                .catch(err => {
                    const opt2 = this.bot.options;
                    this.onError(
                        true,
                        `❌ Failed to disable Autokeys: ${(err as Error).message}`,
                        opt2.sendAlert.enable && opt2.sendAlert.autokeys.failedToDisable,
                        opt2.discordWebhook.sendAlert.enable && opt2.discordWebhook.sendAlert.url.main !== '',
                        'autokeys-failedToDisable'
                    );
                    reject();
                });
        });
    }

    refresh(): void {
        this.setOverallStatus = [false, false, false, false, false, false];
        this.setActiveStatus = false;
        this.check();
    }
}

type AlertType =
    | 'autokeys-failedToDisable'
    | 'autokeys-failedToAdd-bank'
    | 'autokeys-failedToAdd-sell'
    | 'autokeys-failedToAdd-buy'
    | 'autokeys-failedToUpdate-bank'
    | 'autokeys-failedToUpdate-sell'
    | 'autokeys-failedToUpdate-buy';
