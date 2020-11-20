import Bot from './Bot';
import { EntryData, PricelistChangedSource } from './Pricelist';
// import moment from 'moment-timezone';

import Currencies from 'tf2-currencies';
import MyHandler from './MyHandler';

import log from '../lib/logger';
import DiscordWebhookClass from './DiscordWebhook';

export = class Autokeys {
    private readonly bot: Bot;

    private readonly discord: DiscordWebhookClass;

    isEnabled = false;

    isKeyBankingEnabled = false;

    isActive = false;

    userPure: {
        minKeys: number;
        maxKeys: number;
        minRefs: number;
        maxRefs: number;
    };

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

    isEnableScrapAdjustment = false;

    scrapAdjustmentValue = 0;

    constructor(bot: Bot) {
        this.bot = bot;
        this.discord = new DiscordWebhookClass(bot);

        this.userPure = {
            minKeys: bot.options.minimumKeys,
            maxKeys: bot.options.maximumKeys,
            minRefs: Currencies.toScrap(bot.options.minimumRefinedToStartSellKeys),
            maxRefs: Currencies.toScrap(bot.options.maximumRefinedToStopSellKeys)
        };

        const scrapValue = bot.options.scrapAdjustmentValue;

        if (!scrapValue || isNaN(scrapValue)) {
            log.warn('Scrap adjustment not set or not a number, resetting to 0.');
            this.scrapAdjustmentValue = 0;
        } else {
            this.scrapAdjustmentValue = scrapValue;
        }

        if (bot.options.disableScrapAdjustment) {
            this.isEnableScrapAdjustment = true;
        }

        if (bot.options.enableAutoKeys) {
            this.isEnabled = true;
        }

        if (bot.options.enableAutoKeysBanking) {
            this.isKeyBankingEnabled = true;
        }
    }

    check(): void {
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

        const pure = (this.bot.handler as MyHandler).currPure();
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
        const roundedKeysCanBuy = Math.round((currRef - userMaxRef) / currKeyPrice.buy.toValue());
        const roundedKeysCanSell = Math.round((userMinRef - currRef) / currKeyPrice.sell.toValue());
        const roundedKeysCanBankMin = Math.round((userMaxRef - currRef) / currKeyPrice.sell.toValue());
        const roundedKeysCanBankMax = Math.round((currRef - userMinRef) / currKeyPrice.buy.toValue());
        const fixedKeysCanBuy = roundedKeysCanBuy === 0 ? 1 : roundedKeysCanBuy;
        const fixedKeysCanSell = roundedKeysCanSell === 0 ? 1 : roundedKeysCanSell;
        const fixedKeysCanBankMin = roundedKeysCanBankMin === 0 ? 1 : roundedKeysCanBankMin;
        const fixedKeysCanBankMax = roundedKeysCanBankMax === 0 ? 1 : roundedKeysCanBankMax;

        // Check and set new min and max
        if (isBuyingKeys) {
            // If buying - we need to set min = currKeys and max = currKeys + CanBuy
            setMinKeys = currKeys <= userMinKeys ? userMinKeys : currKeys;
            setMaxKeys = currKeys + fixedKeysCanBuy >= userMaxKeys ? userMaxKeys : currKeys + fixedKeysCanBuy;
        } else if (isBankingBuyKeysWithEnoughRefs && isEnableKeyBanking) {
            // If buying - we need to set min = currKeys and max = currKeys + CanBuy
            setMinKeys = currKeys <= userMinKeys ? userMinKeys : currKeys;
            setMaxKeys =
                currKeys + roundedKeysCanBankMax >= userMaxKeys ? userMaxKeys : currKeys + roundedKeysCanBankMax;
        } else if (isSellingKeys) {
            // If selling - we need to set min = currKeys - CanSell and max = currKeys
            setMinKeys = currKeys - fixedKeysCanSell <= userMinKeys ? userMinKeys : currKeys - fixedKeysCanSell;
            setMaxKeys = currKeys >= userMaxKeys ? userMaxKeys : currKeys;
        } else if (isBankingKeys && isEnableKeyBanking) {
            // If banking - we need to set min = currKeys - CanBankMin and max = currKeys + CanBankMax
            setMinKeys = currKeys - fixedKeysCanBankMin <= userMinKeys ? userMinKeys : currKeys - fixedKeysCanBankMin;
            setMaxKeys = currKeys + fixedKeysCanBankMax >= userMaxKeys ? userMaxKeys : currKeys + fixedKeysCanBankMax;
        }

        log.debug(
            `Autokeys status:-\n   Ref: minRef(${Currencies.toRefined(userMinRef)})` +
                ` < currRef(${Currencies.toRefined(currRef)})` +
                ` < maxRef(${Currencies.toRefined(userMaxRef)})` +
                `\n   Key: minKeys(${userMinKeys}) ≤ currKeys(${currKeys}) ≤ maxKeys(${userMaxKeys})` +
                `\nStatus: ${
                    isBankingKeys && isEnableKeyBanking
                        ? `Banking (Min: ${setMinKeys}, Max: ${setMaxKeys})`
                        : isBuyingKeys
                        ? `Buying (Min: ${setMinKeys}, Max: ${setMaxKeys})`
                        : isSellingKeys
                        ? `Selling (Min: ${setMinKeys}, Max: ${setMaxKeys})`
                        : 'Not active'
                }`
        );

        const isAlreadyRunningAutokeys = this.isActive;
        const isKeysAlreadyExist = keyEntry !== null;

        if (isAlreadyRunningAutokeys) {
            // if Autokeys already running
            if (
                isBankingKeys &&
                isEnableKeyBanking &&
                (!isAlreadyUpdatedToBank ||
                    roundedKeysCanBankMin !== this.oldAmount.keysCanBankMin ||
                    roundedKeysCanBankMax !== this.oldAmount.keysCanBankMax ||
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
                    keysCanBankMin: roundedKeysCanBankMin,
                    keysCanBankMax: roundedKeysCanBankMax,
                    ofKeys: currKeys
                };
                this.isActive = true;
                this.updateToBank(setMinKeys, setMaxKeys);
            } else if (
                isBankingBuyKeysWithEnoughRefs &&
                isEnableKeyBanking &&
                (!isAlreadyUpdatedToBuy ||
                    roundedKeysCanBankMax !== this.oldAmount.keysCanBuy ||
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
                    keysCanBuy: roundedKeysCanBankMax,
                    keysCanBankMin: 0,
                    keysCanBankMax: 0,
                    ofKeys: currKeys
                };
                this.isActive = true;
                this.updateToBuy(setMinKeys, setMaxKeys);
            } else if (
                isBuyingKeys &&
                (!isAlreadyUpdatedToBuy ||
                    roundedKeysCanBuy !== this.oldAmount.keysCanBuy ||
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
                    keysCanBuy: roundedKeysCanBuy,
                    keysCanBankMin: 0,
                    keysCanBankMax: 0,
                    ofKeys: currKeys
                };
                this.isActive = true;
                this.updateToBuy(setMinKeys, setMaxKeys);
            } else if (
                isSellingKeys &&
                (!isAlreadyUpdatedToSell ||
                    roundedKeysCanSell !== this.oldAmount.keysCanSell ||
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
                    keysCanSell: roundedKeysCanSell,
                    keysCanBuy: 0,
                    keysCanBankMin: 0,
                    keysCanBankMax: 0,
                    ofKeys: currKeys
                };
                this.isActive = true;
                this.updateToSell(setMinKeys, setMaxKeys);
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
                if (this.bot.options.disableSomethingWrongAlert) {
                    if (
                        !this.bot.options.disableSomethingWrongAlert &&
                        this.bot.options.discordWebhookSomethingWrongAlertURL
                    ) {
                        this.discord.sendAlert('lowPure', msg, null, null, null);
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
                        keysCanBankMin: roundedKeysCanBankMin,
                        keysCanBankMax: roundedKeysCanBankMax,
                        ofKeys: currKeys
                    };
                    this.isActive = true;
                    this.createToBank(setMinKeys, setMaxKeys);
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
                        keysCanBuy: roundedKeysCanBankMax,
                        keysCanBankMin: 0,
                        keysCanBankMax: 0,
                        ofKeys: currKeys
                    };
                    this.isActive = true;
                    this.createToBuy(setMinKeys, setMaxKeys);
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
                        keysCanBuy: roundedKeysCanBuy,
                        keysCanBankMin: 0,
                        keysCanBankMax: 0,
                        ofKeys: currKeys
                    };
                    this.isActive = true;
                    this.createToBuy(setMinKeys, setMaxKeys);
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
                        keysCanSell: roundedKeysCanSell,
                        keysCanBuy: 0,
                        keysCanBankMin: 0,
                        keysCanBankMax: 0,
                        ofKeys: currKeys
                    };
                    this.isActive = true;
                    this.createToSell(setMinKeys, setMaxKeys);
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
                    if (!this.bot.options.disableSomethingWrongAlert) {
                        if (
                            !this.bot.options.disableDiscordWebhookSomethingWrongAlert &&
                            this.bot.options.discordWebhookSomethingWrongAlertURL
                        ) {
                            this.discord.sendAlert('lowPure', msg, null, null, null);
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
                        roundedKeysCanBankMin !== this.oldAmount.keysCanBankMin ||
                        roundedKeysCanBankMax !== this.oldAmount.keysCanBankMax ||
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
                        keysCanBankMin: roundedKeysCanBankMin,
                        keysCanBankMax: roundedKeysCanBankMax,
                        ofKeys: currKeys
                    };
                    this.isActive = true;
                    this.updateToBank(setMinKeys, setMaxKeys);
                } else if (
                    isBankingBuyKeysWithEnoughRefs &&
                    isEnableKeyBanking &&
                    (!isAlreadyUpdatedToBuy ||
                        roundedKeysCanBankMax !== this.oldAmount.keysCanBuy ||
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
                        keysCanBuy: roundedKeysCanBankMax,
                        keysCanBankMin: 0,
                        keysCanBankMax: 0,
                        ofKeys: currKeys
                    };
                    this.isActive = true;
                    this.updateToBuy(setMinKeys, setMaxKeys);
                } else if (
                    isBuyingKeys &&
                    (!isAlreadyUpdatedToBuy ||
                        roundedKeysCanBuy !== this.oldAmount.keysCanBuy ||
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
                        keysCanBuy: roundedKeysCanBuy,
                        keysCanBankMin: 0,
                        keysCanBankMax: 0,
                        ofKeys: currKeys
                    };
                    this.isActive = true;
                    this.updateToBuy(setMinKeys, setMaxKeys);
                } else if (
                    isSellingKeys &&
                    (!isAlreadyUpdatedToSell ||
                        roundedKeysCanSell !== this.oldAmount.keysCanSell ||
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
                        keysCanSell: roundedKeysCanSell,
                        keysCanBuy: 0,
                        keysCanBankMin: 0,
                        keysCanBankMax: 0,
                        ofKeys: currKeys
                    };
                    this.isActive = true;
                    this.updateToSell(setMinKeys, setMaxKeys);
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
                    if (!this.bot.options.disableSomethingWrongAlert) {
                        if (
                            !this.bot.options.disableDiscordWebhookSomethingWrongAlert &&
                            this.bot.options.discordWebhookSomethingWrongAlertURL
                        ) {
                            this.discord.sendAlert('lowPure', msg, null, null, null);
                        } else {
                            this.bot.messageAdmins(msg, []);
                        }
                    }
                }
            }
        }
        this.bot.listings.checkBySKU('5021;6');
    }

    private createToBuy(minKeys: number, maxKeys: number): void {
        const keyPrices = this.bot.pricelist.getKeyPrices();
        let entry;
        if (keyPrices.src !== 'manual' && !this.isEnableScrapAdjustment) {
            entry = {
                sku: '5021;6',
                enabled: true,
                autoprice: true,
                min: minKeys,
                max: maxKeys,
                intent: 0,
                note: {
                    buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsBuy,
                    sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsSell
                }
            } as any;
        } else if (keyPrices.src === 'manual' && !this.isEnableScrapAdjustment) {
            entry = {
                sku: '5021;6',
                enabled: true,
                autoprice: false,
                sell: {
                    keys: 0,
                    metal: keyPrices.sell.metal
                },
                buy: {
                    keys: 0,
                    metal: keyPrices.buy.metal
                },
                min: minKeys,
                max: maxKeys,
                intent: 0,
                note: {
                    buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsBuy,
                    sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsSell
                }
            } as any;
        } else if (this.isEnableScrapAdjustment) {
            entry = {
                sku: '5021;6',
                enabled: true,
                autoprice: false,
                sell: {
                    keys: 0,
                    metal: Currencies.toRefined(keyPrices.sell.toValue() + this.scrapAdjustmentValue)
                },
                buy: {
                    keys: 0,
                    metal: Currencies.toRefined(keyPrices.buy.toValue() + this.scrapAdjustmentValue)
                },
                min: minKeys,
                max: maxKeys,
                intent: 0,
                note: {
                    buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsBuy,
                    sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsSell
                }
            } as any;
        }
        this.bot.pricelist
            .addPrice(entry as EntryData, false, PricelistChangedSource.Autokeys)
            .then(data => {
                log.debug(`✅ Automatically added Mann Co. Supply Crate Key to buy.`);
                this.bot.listings.checkBySKU(data.sku, data);
            })
            .catch(err => {
                log.warn(`❌ Failed to add Mann Co. Supply Crate Key to buy automatically: ${err.message}`);
                this.isActive = false;
            });
    }

    private createToSell(minKeys: number, maxKeys: number): void {
        const keyPrices = this.bot.pricelist.getKeyPrices();
        let entry;
        if (keyPrices.src !== 'manual' && !this.isEnableScrapAdjustment) {
            entry = {
                sku: '5021;6',
                enabled: true,
                autoprice: true,
                min: minKeys,
                max: maxKeys,
                intent: 1,
                note: {
                    buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsBuy,
                    sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsSell
                }
            } as any;
        } else if (keyPrices.src === 'manual' && !this.isEnableScrapAdjustment) {
            entry = {
                sku: '5021;6',
                enabled: true,
                autoprice: false,
                sell: {
                    keys: 0,
                    metal: keyPrices.sell.metal
                },
                buy: {
                    keys: 0,
                    metal: keyPrices.buy.metal
                },
                min: minKeys,
                max: maxKeys,
                intent: 1,
                note: {
                    buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsBuy,
                    sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsSell
                }
            } as any;
        } else if (this.isEnableScrapAdjustment) {
            entry = {
                sku: '5021;6',
                enabled: true,
                autoprice: false,
                sell: {
                    keys: 0,
                    metal: Currencies.toRefined(keyPrices.sell.toValue() - this.scrapAdjustmentValue)
                },
                buy: {
                    keys: 0,
                    metal: Currencies.toRefined(keyPrices.buy.toValue() - this.scrapAdjustmentValue)
                },
                min: minKeys,
                max: maxKeys,
                intent: 1,
                note: {
                    buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsBuy,
                    sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsSell
                }
            } as any;
        }
        this.bot.pricelist
            .addPrice(entry as EntryData, false, PricelistChangedSource.Autokeys)
            .then(data => {
                log.debug(`✅ Automatically added Mann Co. Supply Crate Key to sell.`);
                this.bot.listings.checkBySKU(data.sku, data);
            })
            .catch(err => {
                log.warn(`❌ Failed to add Mann Co. Supply Crate Key to sell automatically: ${err.message}`);
                this.isActive = false;
            });
    }

    private createToBank(minKeys: number, maxKeys: number): void {
        const keyPrices = this.bot.pricelist.getKeyPrices();
        let entry;
        if (keyPrices.src !== 'manual') {
            entry = {
                sku: '5021;6',
                enabled: true,
                autoprice: true,
                min: minKeys,
                max: maxKeys,
                intent: 2,
                note: {
                    buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsBuy,
                    sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsSell
                }
            } as any;
        } else {
            entry = {
                sku: '5021;6',
                enabled: true,
                autoprice: false,
                sell: {
                    keys: 0,
                    metal: keyPrices.sell.metal
                },
                buy: {
                    keys: 0,
                    metal: keyPrices.buy.metal
                },
                min: minKeys,
                max: maxKeys,
                intent: 2,
                note: {
                    buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsBuy,
                    sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsSell
                }
            } as any;
        }
        this.bot.pricelist
            .addPrice(entry as EntryData, false, PricelistChangedSource.Autokeys)
            .then(data => {
                log.debug(`✅ Automatically added Mann Co. Supply Crate Key to bank.`);
                this.bot.listings.checkBySKU(data.sku, data);
            })
            .catch(err => {
                log.warn(`❌ Failed to add Mann Co. Supply Crate Key to bank automatically: ${err.message}`);
                this.isActive = false;
            });
    }

    private updateToBuy(minKeys: number, maxKeys: number): void {
        const keyPrices = this.bot.pricelist.getKeyPrices();
        let entry;
        if (keyPrices.src !== 'manual' && !this.isEnableScrapAdjustment) {
            entry = {
                sku: '5021;6',
                enabled: true,
                autoprice: true,
                min: minKeys,
                max: maxKeys,
                intent: 0,
                note: {
                    buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsBuy,
                    sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsSell
                }
            } as any;
        } else if (keyPrices.src === 'manual' && !this.isEnableScrapAdjustment) {
            entry = {
                sku: '5021;6',
                enabled: true,
                autoprice: false,
                sell: {
                    keys: 0,
                    metal: keyPrices.sell.metal
                },
                buy: {
                    keys: 0,
                    metal: keyPrices.buy.metal
                },
                min: minKeys,
                max: maxKeys,
                intent: 0,
                note: {
                    buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsBuy,
                    sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsSell
                }
            } as any;
        } else if (this.isEnableScrapAdjustment) {
            entry = {
                sku: '5021;6',
                enabled: true,
                autoprice: false,
                sell: {
                    keys: 0,
                    metal: Currencies.toRefined(keyPrices.sell.toValue() + this.scrapAdjustmentValue)
                },
                buy: {
                    keys: 0,
                    metal: Currencies.toRefined(keyPrices.buy.toValue() + this.scrapAdjustmentValue)
                },
                min: minKeys,
                max: maxKeys,
                intent: 0,
                note: {
                    buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsBuy,
                    sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsSell
                }
            } as any;
        }
        this.bot.pricelist
            .updatePrice(entry as EntryData, false, PricelistChangedSource.Autokeys)
            .then(data => {
                log.debug(`✅ Automatically update Mann Co. Supply Crate Key to buy.`);
                this.bot.listings.checkBySKU(data.sku, data);
            })
            .catch(err => {
                log.warn(`❌ Failed to update Mann Co. Supply Crate Key to buy automatically: ${err.message}`);
                this.isActive = false;
            });
    }

    private updateToSell(minKeys: number, maxKeys: number): void {
        const keyPrices = this.bot.pricelist.getKeyPrices();
        let entry;
        if (keyPrices.src !== 'manual' && !this.isEnableScrapAdjustment) {
            entry = {
                sku: '5021;6',
                enabled: true,
                autoprice: true,
                min: minKeys,
                max: maxKeys,
                intent: 1,
                note: {
                    buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsBuy,
                    sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsSell
                }
            } as any;
        } else if (keyPrices.src === 'manual' && !this.isEnableScrapAdjustment) {
            entry = {
                sku: '5021;6',
                enabled: true,
                autoprice: false,
                sell: {
                    keys: 0,
                    metal: keyPrices.sell.metal
                },
                buy: {
                    keys: 0,
                    metal: keyPrices.buy.metal
                },
                min: minKeys,
                max: maxKeys,
                intent: 1,
                note: {
                    buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsBuy,
                    sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsSell
                }
            } as any;
        } else if (this.isEnableScrapAdjustment) {
            entry = {
                sku: '5021;6',
                enabled: true,
                autoprice: false,
                sell: {
                    keys: 0,
                    metal: Currencies.toRefined(keyPrices.sell.toValue() - this.scrapAdjustmentValue)
                },
                buy: {
                    keys: 0,
                    metal: Currencies.toRefined(keyPrices.buy.toValue() - this.scrapAdjustmentValue)
                },
                min: minKeys,
                max: maxKeys,
                intent: 1,
                note: {
                    buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsBuy,
                    sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsSell
                }
            } as any;
        }
        this.bot.pricelist
            .updatePrice(entry as EntryData, false, PricelistChangedSource.Autokeys)
            .then(data => {
                log.debug(`✅ Automatically updated Mann Co. Supply Crate Key to sell.`);
                this.bot.listings.checkBySKU(data.sku, data);
            })
            .catch(err => {
                log.warn(`❌ Failed to update Mann Co. Supply Crate Key to sell automatically: ${err.message}`);
                this.isActive = false;
            });
    }

    private updateToBank(minKeys: number, maxKeys: number): void {
        const keyPrices = this.bot.pricelist.getKeyPrices();
        let entry;
        if (keyPrices.src !== 'manual') {
            entry = {
                sku: '5021;6',
                enabled: true,
                autoprice: true,
                min: minKeys,
                max: maxKeys,
                intent: 2,
                note: {
                    buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsBuy,
                    sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsSell
                }
            } as any;
        } else {
            entry = {
                sku: '5021;6',
                enabled: true,
                autoprice: false,
                sell: {
                    keys: 0,
                    metal: keyPrices.sell.metal
                },
                buy: {
                    keys: 0,
                    metal: keyPrices.buy.metal
                },
                min: minKeys,
                max: maxKeys,
                intent: 2,
                note: {
                    buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsBuy,
                    sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsSell
                }
            } as any;
        }
        this.bot.pricelist
            .updatePrice(entry as EntryData, false, PricelistChangedSource.Autokeys)
            .then(data => {
                log.debug(`✅ Automatically updated Mann Co. Supply Crate Key to bank.`);
                this.bot.listings.checkBySKU(data.sku, data);
            })
            .catch(err => {
                log.warn(`❌ Failed to update Mann Co. Supply Crate Key to bank automatically: ${err.message}`);
                this.isActive = false;
            });
    }

    disable(onShutdown = false): void {
        const keyPrices = this.bot.pricelist.getKeyPrices();
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
                    buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsBuy,
                    sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsSell
                }
            } as any;
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
                    buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsBuy,
                    sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + this.bot.options.bptfDetailsSell
                }
            } as any;
        }
        this.bot.pricelist
            .updatePrice(entry as EntryData, onShutdown, PricelistChangedSource.Autokeys)
            .then(data => {
                log.debug('✅ Automatically disabled Autokeys.', data);
                if (!onShutdown) {
                    this.bot.listings.checkBySKU(data.sku, data);
                }
            })
            .catch(err => {
                log.warn(`❌ Failed to disable Autokeys: ${err.message}`);
                this.isActive = true;
            });
    }

    private remove(): void {
        this.bot.pricelist
            .removePrice('5021;6', false)
            .then(() => {
                log.debug(`✅ Automatically remove Mann Co. Supply Crate Key.`);
                this.bot.listings.checkBySKU('5021;6');
            })
            .catch(err => {
                log.warn(`❌ Failed to remove Mann Co. Supply Crate Key automatically: ${err.message}`);
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
        // this.sleep(2 * 1000);
        this.check();
    }

    // private sleep(mili: number): void {
    //     const date = moment().valueOf();
    //     let currentDate = null;
    //     do {
    //         currentDate = moment().valueOf();
    //     } while (currentDate - date < mili);
    // }
};
