import Currencies from 'tf2-currencies';

import { genUserPure, genScrapAdjustment } from './userSettings';
import { createToBank, createToBuy, createToSell, updateToBank, updateToBuy, updateToSell } from './export';

import Bot from '../Bot';
import { EntryData, PricelistChangedSource } from '../Pricelist';

import { currPure } from '../../lib/tools/pure';
import log from '../../lib/logger';
import sendAlert from '../../lib/DiscordWebhook/sendAlert';

export default class Autokeys {
    private readonly bot: Bot;

    get isKeyBankingEnabled(): boolean {
        return this.bot.options.autokeys.banking.enable;
    }

    isActive = false;

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

    status = {
        isBuyingKeys: false,
        isBankingKeys: false,
        checkAlertOnLowPure: false,
        alreadyUpdatedToBank: false,
        alreadyUpdatedToBuy: false,
        alreadyUpdatedToSell: false
    };

    private oldAmount = {
        keysCanBuy: 0,
        keysCanSell: 0,
        keysCanBankMin: 0,
        keysCanBankMax: 0,
        ofKeys: 0
    };

    private OldKeyPrices: { buy: Currencies; sell: Currencies };

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

    get isEnabled(): boolean {
        return this.bot.options.autokeys.enable;
    }

    constructor(bot: Bot) {
        this.bot = bot;
    }

    check(): void {
        log.debug(`checking autokeys (Enabled: ${String(this.isEnabled)})`);
        if (this.isEnabled === false) {
            return;
        }

        const userPure = this.userPure;

        const userMinKeys = userPure.minKeys;
        const userMaxKeys = userPure.maxKeys;
        const userMinRef = userPure.minRefs;
        const userMaxRef = userPure.maxRefs;

        if (isNaN(userMinKeys) || isNaN(userMaxKeys) || isNaN(userMinRef) || isNaN(userMaxRef)) {
            log.warn(
                "You've entered a non-number on either your MINIMUM_KEYS/MINIMUM_REFINED/MAXIMUM_REFINED variables, please correct it. Autokeys is disabled until you correct it."
            );
            return;
        }

        const pure = currPure(this.bot);
        const currKeys = pure.key;
        const currRef = pure.refTotalInScrap;

        const keyEntry = this.bot.pricelist.getPrice('5021;6', false);

        const currKeyPrice = this.bot.pricelist.getKeyPrices();

        if (currKeyPrice !== this.OldKeyPrices && this.isEnableScrapAdjustment) {
            // When scrap adjustment activated, if key rate changes, then it will force update key prices after a trade.
            this.status = {
                isBuyingKeys: false,
                isBankingKeys: false,
                checkAlertOnLowPure: false,
                alreadyUpdatedToBank: false,
                alreadyUpdatedToBuy: false,
                alreadyUpdatedToSell: false
            };
            this.OldKeyPrices = { buy: currKeyPrice.buy, sell: currKeyPrice.sell };
        }

        /**
         * enable Autokeys - Buying - true if currRef \> maxRef AND currKeys \< maxKeys
         */
        const isBuyingKeys = currRef > userMaxRef && currKeys < userMaxKeys;
        /*
        //        <——————————————————————————————————○            \
        // Keys --------|----------------------------|---------->  ⟩ AND
        //                                           ○——————>     /
        // Refs --------|----------------------------|---------->
        //             min                          max
        */

        /**
         * enable Autokeys - Selling - true if currRef \< minRef AND currKeys \> minKeys
         */
        const isSellingKeys = currRef < userMinRef && currKeys > userMinKeys;
        /*
        //              ○———————————————————————————————————>     \
        // Keys --------|----------------------------|---------->  ⟩ AND
        //        <—————○                                         /
        // Refs --------|----------------------------|---------->
        //             min                          max
        */

        /**
         * disable Autokeys - true if currRef \>= maxRef AND currKeys \>= maxKeys OR
         * (minRef \<= currRef \<= maxRef AND currKeys \<= maxKeys)
         */
        const isRemoveAutoKeys =
            (currRef >= userMaxRef && currKeys >= userMaxKeys) ||
            (currRef >= userMinRef && currRef <= userMaxRef && currKeys <= userMaxKeys);
        /*
        //        <——————————————————————————————————●·····>      \
        // Keys --------|----------------------------|---------->  ⟩ AND
        //              ●————————————————————————————●·····>      /
        // Refs --------|----------------------------|---------->
        //             min                          max
        */

        /**
         * enable Autokeys - Banking - true if user set ENABLE_AUTO_KEY_BANKING to true
         */
        const isEnableKeyBanking = this.isKeyBankingEnabled;

        /**
         * enable Autokeys - Banking - true if minRef \< currRef \< maxRef AND currKeys \> minKeys
         */
        const isBankingKeys = currRef > userMinRef && currRef < userMaxRef && currKeys > userMinKeys;
        /*
        //              ○———————————————————————————————————>     \
        // Keys --------|----------------------------|---------->  ⟩ AND
        //              ○————————————————————————————○            /
        // Refs --------|----------------------------|---------->
        //             min                          max
        */

        /**
         * enable Autokeys - Banking - true if currRef \> minRef AND keys \< minKeys
         * Will buy keys.
         */
        const isBankingBuyKeysWithEnoughRefs = currRef > userMinRef && currKeys <= userMinKeys;
        /*
        //        <—————●                                         \
        // Keys --------|----------------------------|---------->  ⟩ AND
        //              ○———————————————————————————————————>     /
        // Refs --------|----------------------------|---------->
        //             min                          max
        */

        /**
         * disable Autokeys - Banking - true if currRef \< minRef AND currKeys \< minKeys
         */
        const isRemoveBankingKeys = currRef <= userMaxRef && currKeys <= userMinKeys;
        /*
        //        <—————●                                         \
        // Keys --------|----------------------------|---------->  ⟩ AND
        //        <——————————————————————————————————●            /
        // Refs --------|----------------------------|---------->
        //             min                          max
        */

        const isAlreadyAlert = this.status.checkAlertOnLowPure;

        /**
         * send alert to admins when both keys and refs below minimum
         */
        const isAlertAdmins = currRef <= userMinRef && currKeys <= userMinKeys;
        /*
        //        <—————●                                         \
        // Keys --------|----------------------------|---------->  ⟩ AND
        //        <—————●                                         /
        // Refs --------|----------------------------|---------->
        //             min                          max
        */

        const isAlreadyUpdatedToBank = this.status.alreadyUpdatedToBank;
        const isAlreadyUpdatedToBuy = this.status.alreadyUpdatedToBuy;
        const isAlreadyUpdatedToSell = this.status.alreadyUpdatedToSell;

        let setMinKeys: number;
        let setMaxKeys: number;
        const rKeysCanBuy = Math.round((currRef - userMaxRef) / currKeyPrice.buy.toValue());
        const rKeysCanSell = Math.round((userMinRef - currRef) / currKeyPrice.sell.toValue());
        const rKeysCanBankMin = Math.round((userMaxRef - currRef) / currKeyPrice.sell.toValue());
        const rKeysCanBankMax = Math.round((currRef - userMinRef) / currKeyPrice.buy.toValue());

        // Check and set new min and max
        if (isBuyingKeys) {
            // If buying - we need to set min = currKeys and max = currKeys + CanBuy
            const min = currKeys;
            setMinKeys = min <= userMinKeys ? userMinKeys : min;

            const max = currKeys + rKeysCanBuy;
            setMaxKeys = max >= userMaxKeys ? userMaxKeys : max < 1 ? 1 : max;

            if (setMinKeys === setMaxKeys) {
                setMaxKeys += 1;
            }
            //
        } else if (isBankingBuyKeysWithEnoughRefs && isEnableKeyBanking) {
            // If buying (while banking) - we need to set min = currKeys and max = currKeys + CanBankMax
            const min = currKeys;
            setMinKeys = min <= userMinKeys ? userMinKeys : min;

            const max = currKeys + rKeysCanBankMax;
            setMaxKeys = max >= userMaxKeys ? userMaxKeys : max < 1 ? 1 : max;

            if (setMinKeys === setMaxKeys) {
                setMaxKeys += 1;
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
            }
        }

        const isAlreadyRunningAutokeys = this.isActive;
        const isKeysAlreadyExist = keyEntry !== null;

        const opt = this.bot.options;

        if (isAlreadyRunningAutokeys) {
            // if Autokeys already running
            if (
                isBankingKeys &&
                isEnableKeyBanking &&
                (!isAlreadyUpdatedToBank ||
                    rKeysCanBankMin !== this.oldAmount.keysCanBankMin ||
                    rKeysCanBankMax !== this.oldAmount.keysCanBankMax ||
                    currKeys !== this.oldAmount.ofKeys)
            ) {
                // enable keys banking - if banking conditions to enable banking matched and banking is enabled
                this.status = {
                    isBuyingKeys: false,
                    isBankingKeys: true,
                    checkAlertOnLowPure: false,
                    alreadyUpdatedToBank: true,
                    alreadyUpdatedToBuy: false,
                    alreadyUpdatedToSell: false
                };
                this.oldAmount = {
                    keysCanSell: 0,
                    keysCanBuy: 0,
                    keysCanBankMin: rKeysCanBankMin,
                    keysCanBankMax: rKeysCanBankMax,
                    ofKeys: currKeys
                };
                this.isActive = true;
                updateToBank(setMinKeys, setMaxKeys, this.bot);
            } else if (
                isBankingBuyKeysWithEnoughRefs &&
                isEnableKeyBanking &&
                (!isAlreadyUpdatedToBuy ||
                    rKeysCanBankMax !== this.oldAmount.keysCanBuy ||
                    currKeys !== this.oldAmount.ofKeys)
            ) {
                // enable keys banking - if refs > minRefs but Keys < minKeys, will buy keys.
                this.status = {
                    isBuyingKeys: true,
                    isBankingKeys: false,
                    checkAlertOnLowPure: false,
                    alreadyUpdatedToBank: false,
                    alreadyUpdatedToBuy: true,
                    alreadyUpdatedToSell: false
                };
                this.oldAmount = {
                    keysCanSell: 0,
                    keysCanBuy: rKeysCanBankMax,
                    keysCanBankMin: 0,
                    keysCanBankMax: 0,
                    ofKeys: currKeys
                };
                this.isActive = true;
                updateToBuy(setMinKeys, setMaxKeys, this.bot);
            } else if (
                isBuyingKeys &&
                (!isAlreadyUpdatedToBuy ||
                    rKeysCanBuy !== this.oldAmount.keysCanBuy ||
                    currKeys !== this.oldAmount.ofKeys)
            ) {
                // enable Autokeys - Buying - if buying keys conditions matched
                this.status = {
                    isBuyingKeys: true,
                    isBankingKeys: false,
                    checkAlertOnLowPure: false,
                    alreadyUpdatedToBank: false,
                    alreadyUpdatedToBuy: true,
                    alreadyUpdatedToSell: false
                };
                this.oldAmount = {
                    keysCanSell: 0,
                    keysCanBuy: rKeysCanBuy,
                    keysCanBankMin: 0,
                    keysCanBankMax: 0,
                    ofKeys: currKeys
                };
                this.isActive = true;
                updateToBuy(setMinKeys, setMaxKeys, this.bot);
            } else if (
                isSellingKeys &&
                (!isAlreadyUpdatedToSell ||
                    rKeysCanSell !== this.oldAmount.keysCanSell ||
                    currKeys !== this.oldAmount.ofKeys)
            ) {
                // enable Autokeys - Selling - if selling keys conditions matched
                this.status = {
                    isBuyingKeys: false,
                    isBankingKeys: false,
                    checkAlertOnLowPure: false,
                    alreadyUpdatedToBank: false,
                    alreadyUpdatedToBuy: false,
                    alreadyUpdatedToSell: true
                };
                this.oldAmount = {
                    keysCanSell: rKeysCanSell,
                    keysCanBuy: 0,
                    keysCanBankMin: 0,
                    keysCanBankMax: 0,
                    ofKeys: currKeys
                };
                this.isActive = true;
                updateToSell(setMinKeys, setMaxKeys, this.bot);
            } else if (isRemoveBankingKeys && isEnableKeyBanking) {
                // disable keys banking - if to conditions to disable banking matched and banking is enabled
                this.status = {
                    isBuyingKeys: false,
                    isBankingKeys: false,
                    checkAlertOnLowPure: false,
                    alreadyUpdatedToBank: false,
                    alreadyUpdatedToBuy: false,
                    alreadyUpdatedToSell: false
                };
                this.isActive = false;
                this.disable();
            } else if (isRemoveAutoKeys && !isEnableKeyBanking) {
                // disable Autokeys when conditions to disable Autokeys matched
                this.status = {
                    isBuyingKeys: false,
                    isBankingKeys: false,
                    checkAlertOnLowPure: false,
                    alreadyUpdatedToBank: false,
                    alreadyUpdatedToBuy: false,
                    alreadyUpdatedToSell: false
                };
                this.isActive = false;
                this.disable();
            } else if (isAlertAdmins && !isAlreadyAlert) {
                // alert admins when low pure
                this.status = {
                    isBuyingKeys: false,
                    isBankingKeys: false,
                    checkAlertOnLowPure: true,
                    alreadyUpdatedToBank: false,
                    alreadyUpdatedToBuy: false,
                    alreadyUpdatedToSell: false
                };
                this.isActive = false;
                const msg = 'I am now low on both keys and refs.';
                if (opt.sendAlert) {
                    if (opt.discordWebhook.sendAlert.enable && opt.discordWebhook.sendAlert.url !== '') {
                        sendAlert('lowPure', this.bot, msg);
                    } else {
                        this.bot.messageAdmins(msg, []);
                    }
                }
            }
        } else if (!isAlreadyRunningAutokeys) {
            // if Autokeys is not running/disabled
            if (!isKeysAlreadyExist) {
                // if Mann Co. Supply Crate Key entry does not exist in the pricelist.json
                if (isBankingKeys && isEnableKeyBanking) {
                    //create new Key entry and enable keys banking - if banking conditions to enable banking matched and banking is enabled
                    this.status = {
                        isBuyingKeys: false,
                        isBankingKeys: true,
                        checkAlertOnLowPure: false,
                        alreadyUpdatedToBank: true,
                        alreadyUpdatedToBuy: false,
                        alreadyUpdatedToSell: false
                    };
                    this.oldAmount = {
                        keysCanSell: 0,
                        keysCanBuy: 0,
                        keysCanBankMin: rKeysCanBankMin,
                        keysCanBankMax: rKeysCanBankMax,
                        ofKeys: currKeys
                    };
                    this.isActive = true;
                    createToBank(setMinKeys, setMaxKeys, this.bot);
                } else if (isBankingBuyKeysWithEnoughRefs && isEnableKeyBanking) {
                    // enable keys banking - if refs > minRefs but Keys < minKeys, will buy keys.
                    this.status = {
                        isBuyingKeys: true,
                        isBankingKeys: false,
                        checkAlertOnLowPure: false,
                        alreadyUpdatedToBank: false,
                        alreadyUpdatedToBuy: true,
                        alreadyUpdatedToSell: false
                    };
                    this.oldAmount = {
                        keysCanSell: 0,
                        keysCanBuy: rKeysCanBankMax,
                        keysCanBankMin: 0,
                        keysCanBankMax: 0,
                        ofKeys: currKeys
                    };
                    this.isActive = true;
                    createToBuy(setMinKeys, setMaxKeys, this.bot);
                } else if (isBuyingKeys) {
                    // create new Key entry and enable Autokeys - Buying - if buying keys conditions matched
                    this.status = {
                        isBuyingKeys: true,
                        isBankingKeys: false,
                        checkAlertOnLowPure: false,
                        alreadyUpdatedToBank: false,
                        alreadyUpdatedToBuy: true,
                        alreadyUpdatedToSell: false
                    };
                    this.oldAmount = {
                        keysCanSell: 0,
                        keysCanBuy: rKeysCanBuy,
                        keysCanBankMin: 0,
                        keysCanBankMax: 0,
                        ofKeys: currKeys
                    };
                    this.isActive = true;
                    createToBuy(setMinKeys, setMaxKeys, this.bot);
                } else if (isSellingKeys) {
                    // create new Key entry and enable Autokeys - Selling - if selling keys conditions matched
                    this.status = {
                        isBuyingKeys: false,
                        isBankingKeys: false,
                        checkAlertOnLowPure: false,
                        alreadyUpdatedToBank: false,
                        alreadyUpdatedToBuy: false,
                        alreadyUpdatedToSell: true
                    };
                    this.oldAmount = {
                        keysCanSell: rKeysCanSell,
                        keysCanBuy: 0,
                        keysCanBankMin: 0,
                        keysCanBankMax: 0,
                        ofKeys: currKeys
                    };
                    this.isActive = true;
                    createToSell(setMinKeys, setMaxKeys, this.bot);
                } else if (isAlertAdmins && !isAlreadyAlert) {
                    // alert admins when low pure
                    this.status = {
                        isBuyingKeys: false,
                        isBankingKeys: false,
                        checkAlertOnLowPure: true,
                        alreadyUpdatedToBank: false,
                        alreadyUpdatedToBuy: false,
                        alreadyUpdatedToSell: false
                    };
                    this.isActive = false;
                    const msg = 'I am now low on both keys and refs.';
                    if (opt.sendAlert) {
                        if (opt.discordWebhook.sendAlert.enable && opt.discordWebhook.sendAlert.url !== '') {
                            sendAlert('lowPure', this.bot, msg);
                        } else {
                            this.bot.messageAdmins(msg, []);
                        }
                    }
                }
            } else {
                // if Mann Co. Supply Crate Key entry already in the pricelist.json
                if (
                    isBankingKeys &&
                    isEnableKeyBanking &&
                    (!isAlreadyUpdatedToBank ||
                        rKeysCanBankMin !== this.oldAmount.keysCanBankMin ||
                        rKeysCanBankMax !== this.oldAmount.keysCanBankMax ||
                        currKeys !== this.oldAmount.ofKeys)
                ) {
                    // enable keys banking - if banking conditions to enable banking matched and banking is enabled
                    this.status = {
                        isBuyingKeys: false,
                        isBankingKeys: true,
                        checkAlertOnLowPure: false,
                        alreadyUpdatedToBank: true,
                        alreadyUpdatedToBuy: false,
                        alreadyUpdatedToSell: false
                    };
                    this.oldAmount = {
                        keysCanSell: 0,
                        keysCanBuy: 0,
                        keysCanBankMin: rKeysCanBankMin,
                        keysCanBankMax: rKeysCanBankMax,
                        ofKeys: currKeys
                    };
                    this.isActive = true;
                    updateToBank(setMinKeys, setMaxKeys, this.bot);
                } else if (
                    isBankingBuyKeysWithEnoughRefs &&
                    isEnableKeyBanking &&
                    (!isAlreadyUpdatedToBuy ||
                        rKeysCanBankMax !== this.oldAmount.keysCanBuy ||
                        currKeys !== this.oldAmount.ofKeys)
                ) {
                    // enable keys banking - if refs > minRefs but Keys < minKeys, will buy keys.
                    this.status = {
                        isBuyingKeys: true,
                        isBankingKeys: false,
                        checkAlertOnLowPure: false,
                        alreadyUpdatedToBank: false,
                        alreadyUpdatedToBuy: true,
                        alreadyUpdatedToSell: false
                    };
                    this.oldAmount = {
                        keysCanSell: 0,
                        keysCanBuy: rKeysCanBankMax,
                        keysCanBankMin: 0,
                        keysCanBankMax: 0,
                        ofKeys: currKeys
                    };
                    this.isActive = true;
                    updateToBuy(setMinKeys, setMaxKeys, this.bot);
                } else if (
                    isBuyingKeys &&
                    (!isAlreadyUpdatedToBuy ||
                        rKeysCanBuy !== this.oldAmount.keysCanBuy ||
                        currKeys !== this.oldAmount.ofKeys)
                ) {
                    // enable Autokeys - Buying - if buying keys conditions matched
                    this.status = {
                        isBuyingKeys: true,
                        isBankingKeys: false,
                        checkAlertOnLowPure: false,
                        alreadyUpdatedToBank: false,
                        alreadyUpdatedToBuy: true,
                        alreadyUpdatedToSell: false
                    };
                    this.oldAmount = {
                        keysCanSell: 0,
                        keysCanBuy: rKeysCanBuy,
                        keysCanBankMin: 0,
                        keysCanBankMax: 0,
                        ofKeys: currKeys
                    };
                    this.isActive = true;
                    updateToBuy(setMinKeys, setMaxKeys, this.bot);
                } else if (
                    isSellingKeys &&
                    (!isAlreadyUpdatedToSell ||
                        rKeysCanSell !== this.oldAmount.keysCanSell ||
                        currKeys !== this.oldAmount.ofKeys)
                ) {
                    // enable Autokeys - Selling - if selling keys conditions matched
                    this.status = {
                        isBuyingKeys: false,
                        isBankingKeys: false,
                        checkAlertOnLowPure: false,
                        alreadyUpdatedToBank: false,
                        alreadyUpdatedToBuy: false,
                        alreadyUpdatedToSell: true
                    };
                    this.oldAmount = {
                        keysCanSell: rKeysCanSell,
                        keysCanBuy: 0,
                        keysCanBankMin: 0,
                        keysCanBankMax: 0,
                        ofKeys: currKeys
                    };
                    this.isActive = true;
                    updateToSell(setMinKeys, setMaxKeys, this.bot);
                } else if (isAlertAdmins && !isAlreadyAlert) {
                    // alert admins when low pure
                    this.status = {
                        isBuyingKeys: false,
                        isBankingKeys: false,
                        checkAlertOnLowPure: true,
                        alreadyUpdatedToBank: false,
                        alreadyUpdatedToBuy: false,
                        alreadyUpdatedToSell: false
                    };
                    this.isActive = false;
                    const msg = 'I am now low on both keys and refs.';
                    if (opt.sendAlert) {
                        if (opt.discordWebhook.sendAlert.enable && opt.discordWebhook.sendAlert.url !== '') {
                            sendAlert('lowPure', this.bot, msg);
                        } else {
                            this.bot.messageAdmins(msg, []);
                        }
                    }
                }
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

        this.bot.listings.checkBySKU('5021;6');
    }

    disable(): void {
        const keyPrices = this.bot.pricelist.getKeyPrices();
        const opt = this.bot.options;
        let entry;
        if (keyPrices.src !== 'manual') {
            entry = {
                sku: '5021;6',
                enabled: false,
                autoprice: true,
                min: 0,
                max: 1,
                intent: 2,
                note: {
                    buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + opt.details.buy,
                    sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + opt.details.sell
                }
            } as EntryData;
        } else {
            entry = {
                sku: '5021;6',
                enabled: false,
                autoprice: false,
                sell: {
                    keys: 0,
                    metal: keyPrices.sell.metal
                },
                buy: {
                    keys: 0,
                    metal: keyPrices.buy.metal
                },
                min: 0,
                max: 1,
                intent: 2,
                note: {
                    buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + opt.details.buy,
                    sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + opt.details.sell
                }
            } as EntryData;
        }
        this.bot.pricelist
            .updatePrice(entry, true, PricelistChangedSource.Autokeys)
            .then(() => {
                log.debug('✅ Automatically disabled Autokeys.');
            })
            .catch((err: Error) => {
                log.warn(`❌ Failed to disable Autokeys: ${err.message}`);
                this.isActive = true;
            });
    }

    refresh(): void {
        this.status = {
            isBuyingKeys: false,
            isBankingKeys: false,
            checkAlertOnLowPure: false,
            alreadyUpdatedToBank: false,
            alreadyUpdatedToBuy: false,
            alreadyUpdatedToSell: false
        };
        this.isActive = false;
        this.check();
    }
}
