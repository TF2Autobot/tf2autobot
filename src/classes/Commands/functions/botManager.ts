import SteamID from 'steamid';
import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';
import Currencies from 'tf2-currencies';
import validUrl from 'valid-url';
import child from 'child_process';
import fs from 'graceful-fs';
import path from 'path';

import { utils } from '../functions/export';
import Bot from '../../Bot';
import CommandParser from '../../CommandParser';

import MyHandler from '../../MyHandler/MyHandler';
import Autokeys from '../../Autokeys/Autokeys';
import CartQueue from '../../Carts/CartQueue';

import log from '../../../lib/logger';

import { pure } from '../../../lib/tools/export';

// Bot manager commands

export function expandCommand(steamID: SteamID, message: string, bot: Bot): void {
    const params = CommandParser.parseParams(CommandParser.removeCommand(message));

    if (typeof params.craftable !== 'boolean') {
        bot.sendMessage(steamID, '⚠️ Missing `craftable=true|false`');
        return;
    }

    const item = SKU.fromString('5050;6');

    if (params.craftable === false) {
        item.craftable = false;
    }

    const assetids = bot.inventoryManager.getInventory().findBySKU(SKU.fromObject(item), false);

    const name = bot.schema.getName(item);

    if (assetids.length === 0) {
        // No backpack expanders
        bot.sendMessage(steamID, `❌ I couldn't find any ${pluralize(name, 0)}`);
        return;
    }

    bot.tf2gc.useItem(assetids[0], err => {
        if (err) {
            log.warn('Error trying to expand inventory: ', err);
            bot.sendMessage(steamID, `❌ Failed to expand inventory: ${err.message}`);
            return;
        }

        bot.sendMessage(steamID, `✅ Used ${name}!`);
    });
}

export function useCommand(steamID: SteamID, message: string, bot: Bot): void {
    const params = CommandParser.parseParams(CommandParser.removeCommand(message));

    if (params.sku !== undefined && !utils.testSKU(params.sku as string)) {
        bot.sendMessage(steamID, `❌ "sku" should not be empty or wrong format.`);
        return;
    }

    if (params.assetid !== undefined && params.sku === undefined) {
        const ourInventory = bot.inventoryManager.getInventory();

        const targetedAssetId = params.assetid as string;
        const sku = ourInventory.findByAssetid(targetedAssetId);

        if (sku === null) {
            if (params.i_am_sure !== 'yes_i_am') {
                bot.sendMessage(
                    steamID,
                    `⚠️ Are you sure that you want to use the item with asset ID ${targetedAssetId}?` +
                        `\n- This process is irreversible and will use the item from your bot's backpack!` +
                        `\n- If you are sure, try again with i_am_sure=yes_i_am as a parameter`
                );
                return;
            }

            bot.tf2gc.useItem(targetedAssetId, err => {
                if (err) {
                    log.warn(`Error trying to use ${targetedAssetId}: `, err);
                    bot.sendMessage(steamID, `❌ Failed to use ${targetedAssetId}: ${err.message}`);
                    return;
                }
                bot.sendMessage(steamID, `✅ Used ${targetedAssetId}!`);
            });
            return;
        } else {
            const item = SKU.fromString(sku);
            const name = bot.schema.getName(item, false);

            if (params.i_am_sure !== 'yes_i_am') {
                bot.sendMessage(
                    steamID,
                    `⚠️ Are you sure that you want to use ${name}?` +
                        `\n- This process is irreversible and will use the item from your bot's backpack!` +
                        `\n- If you are sure, try again with i_am_sure=yes_i_am as a parameter`
                );
                return;
            }

            bot.tf2gc.useItem(targetedAssetId, err => {
                if (err) {
                    log.warn(`Error trying to use ${name}: `, err);
                    bot.sendMessage(steamID, `❌ Failed to use ${name}(${targetedAssetId}): ${err.message}`);
                    return;
                }
                bot.sendMessage(steamID, `✅ Used ${name}(${targetedAssetId})!`);
            });
            return;
        }
    }

    if (params.name !== undefined || params.item !== undefined) {
        bot.sendMessage(
            steamID,
            '⚠️ Please only use sku property.' +
                '\n\nBelow are some common items to use:' +
                '\n• Gift-Stuffed Stocking 2013: 5718;6;untradable' +
                '\n• Gift-Stuffed Stocking 2017: 5886;6;untradable' +
                '\n• Gift-Stuffed Stocking 2018: 5900;6;untradable' +
                '\n• Gift-Stuffed Stocking 2019: 5910;6;untradable' +
                '\n• Gift-Stuffed Stocking 2020: 5923;6;untradable'
        );
        return;
    }

    if (params.sku === undefined) {
        bot.sendMessage(steamID, '⚠️ Missing sku property. Example: "!use sku=5923;6;untradable"');
        return;
    }

    const targetedSKU = params.sku as string;

    const uncraft = targetedSKU.includes(';uncraftable');
    const untrade = targetedSKU.includes(';untradable');

    params.sku = targetedSKU.replace(';uncraftable', '');
    params.sku = targetedSKU.replace(';untradable', '');
    const item = SKU.fromString(targetedSKU);

    if (uncraft) {
        item.craftable = !uncraft;
    }

    if (untrade) {
        item.tradable = !untrade;
    }

    const assetids = bot.inventoryManager.getInventory().findBySKU(SKU.fromObject(item), false);

    const name = bot.schema.getName(item, false);

    if (assetids.length === 0) {
        // Item not found
        bot.sendMessage(steamID, `❌ I couldn't find any ${pluralize(name, 0)}`);
        return;
    }

    let assetid: string;
    if (params.assetid !== undefined) {
        const targetedAssetId = params.assetid as string;

        if (assetids.includes(targetedAssetId)) {
            assetid = targetedAssetId;
        } else {
            bot.sendMessage(
                steamID,
                `❌ Looks like an assetid ${targetedAssetId} did not match any assetids associated with ${name}(${targetedSKU}) in my inventory. Try using the sku to use a random assetid.`
            );
            return;
        }
    } else {
        assetid = assetids[0];
    }

    if (params.i_am_sure !== 'yes_i_am') {
        bot.sendMessage(
            steamID,
            `/pre ⚠️ Are you sure that you want to use ${name}?` +
                `\n- This process is irreversible and will use the item from your bot's backpack!` +
                `\n- If you are sure, try again with i_am_sure=yes_i_am as a parameter`
        );
        return;
    }

    bot.tf2gc.useItem(assetid, err => {
        if (err) {
            log.warn(`Error trying to use ${name}: `, err);
            bot.sendMessage(steamID, `❌ Failed to use ${name}(${assetid}): ${err.message}`);
            return;
        }

        bot.sendMessage(steamID, `✅ Used ${name}(${assetid})!`);
    });
}

export function deleteCommand(steamID: SteamID, message: string, bot: Bot): void {
    const params = CommandParser.parseParams(CommandParser.removeCommand(message));

    if (params.sku !== undefined && !utils.testSKU(params.sku as string)) {
        bot.sendMessage(steamID, `❌ "sku" should not be empty or wrong format.`);
        return;
    }

    if (params.assetid !== undefined && params.sku === undefined) {
        // This most likely not working with Non-Tradable items.
        const ourInventory = bot.inventoryManager.getInventory();

        const targetedAssetId = params.assetid as string;
        const sku = ourInventory.findByAssetid(targetedAssetId);

        if (sku === null) {
            if (params.i_am_sure !== 'yes_i_am') {
                bot.sendMessage(
                    steamID,
                    `/pre ⚠️ Are you sure that you want to delete the item with asset ID ${targetedAssetId}?` +
                        `\n- This process is irreversible and will delete the item from your bot's backpack!` +
                        `\n- If you are sure, try again with i_am_sure=yes_i_am as a parameter`
                );
                return;
            }

            bot.tf2gc.deleteItem(targetedAssetId, err => {
                if (err) {
                    log.warn(`Error trying to delete ${targetedAssetId}: `, err);
                    bot.sendMessage(steamID, `❌ Failed to delete ${targetedAssetId}: ${err.message}`);
                    return;
                }
                bot.sendMessage(steamID, `✅ Deleted ${targetedAssetId}!`);
            });
            return;
        } else {
            const item = SKU.fromString(sku);
            const name = bot.schema.getName(item, false);

            if (params.i_am_sure !== 'yes_i_am') {
                bot.sendMessage(
                    steamID,
                    `/pre ⚠️ Are you sure that you want to delete ${name}?` +
                        `\n- This process is irreversible and will delete the item from your bot's backpack!` +
                        `\n- If you are sure, try again with i_am_sure=yes_i_am as a parameter`
                );
                return;
            }

            bot.tf2gc.deleteItem(targetedAssetId, err => {
                if (err) {
                    log.warn(`Error trying to delete ${name}: `, err);
                    bot.sendMessage(steamID, `❌ Failed to delete ${name}(${targetedAssetId}): ${err.message}`);
                    return;
                }
                bot.sendMessage(steamID, `✅ Deleted ${name}(${targetedAssetId})!`);
            });
            return;
        }
    }

    if (params.name !== undefined || params.item !== undefined) {
        bot.sendMessage(
            steamID,
            '⚠️ Please only use sku property.' +
                '\n\nBelow are some common items to delete:' +
                '\n• Smissamas Sweater: 16391;15;untradable;w1;pk391' +
                '\n• Soul Gargoyle: 5826;6;uncraftable;untradable' +
                '\n• Noice Maker - TF Birthday: 536;6;untradable' +
                '\n• Bronze Dueling Badge: 242;6;untradable' +
                '\n• Silver Dueling Badge: 243;6;untradable' +
                '\n• Gold Dueling Badge: 244;6;untradable' +
                '\n• Platinum Dueling Badge: 245;6;untradable' +
                '\n• Mercenary: 166;6;untradable' +
                '\n• Soldier of Fortune: 165;6;untradable' +
                '\n• Grizzled Veteran: 164;6;untradable' +
                '\n• Primeval Warrior: 170;6;untradable' +
                '\n• Professor Speks: 343;6;untradable' +
                '\n• Mann Co. Cap: 261;6;untradable' +
                '\n• Mann Co. Online Cap: 994;6;untradable' +
                '\n• Proof of Purchase: 471;6;untradable' +
                '\n• Mildly Disturbing Halloween Mask: 115;6;untradable' +
                '\n• Seal Mask: 582;6;untradable' +
                '\n• Pyrovision Goggles: 743;6;untradable' +
                '\n• Giftapult: 5083;6;untradable' +
                '\n• Spirit Of Giving: 655;11;untradable' +
                '\n• Party Hat: 537;6;untradable' +
                '\n• Name Tag: 5020;6;untradable' +
                '\n• Description Tag: 5044;6;untradable' +
                '\n• Ghastly Gibus: 584;6;untradable' +
                '\n• Ghastlier Gibus: 279;6;untradable' +
                '\n• Power Up Canteen: 489;6;untradable' +
                '\n• Bombinomicon: 583;6;untradable' +
                '\n• Skull Island Topper: 941;6;untradable' +
                '\n• Spellbook Page: 8935;6;untradable' +
                '\n• Gun Mettle Campaign Coin: 5809;6;untradable' +
                '\n• MONOCULUS!: 581;6;untradable'
        );
        return;
    }

    if (params.sku === undefined) {
        bot.sendMessage(steamID, '⚠️ Missing sku property. Example: "!delete sku=536;6;untradable"');
        return;
    }

    const targetedSKU = params.sku as string;

    const uncraft = targetedSKU.includes(';uncraftable');
    const untrade = targetedSKU.includes(';untradable');

    params.sku = targetedSKU.replace(';uncraftable', '');
    params.sku = targetedSKU.replace(';untradable', '');
    const item = SKU.fromString(targetedSKU);

    if (uncraft) {
        item.craftable = !uncraft;
    }

    if (untrade) {
        item.tradable = !untrade;
    }

    const assetids = bot.inventoryManager.getInventory().findBySKU(SKU.fromObject(item), false);

    const name = bot.schema.getName(item, false);

    if (assetids.length === 0) {
        // Item not found
        bot.sendMessage(steamID, `❌ I couldn't find any ${pluralize(name, 0)}`);
        return;
    }

    let assetid: string;
    if (params.assetid !== undefined) {
        const targetedAssetId = params.assetid as string;

        if (assetids.includes(targetedAssetId)) {
            assetid = targetedAssetId;
        } else {
            bot.sendMessage(
                steamID,
                `❌ Looks like an assetid ${targetedAssetId} did not match any assetids associated with ${name}(${targetedSKU}) in my inventory. Try using the sku to delete a random assetid.`
            );
            return;
        }
    } else {
        assetid = assetids[0];
    }

    if (params.i_am_sure !== 'yes_i_am') {
        bot.sendMessage(
            steamID,
            `/pre ⚠️ Are you sure that you want to delete ${name}?` +
                `\n- This process is irreversible and will delete the item from your bot's backpack!` +
                `\n- If you are sure, try again with i_am_sure=yes_i_am as a parameter`
        );
        return;
    }

    bot.tf2gc.deleteItem(assetid, err => {
        if (err) {
            log.warn(`Error trying to delete ${name}: `, err);
            bot.sendMessage(steamID, `❌ Failed to delete ${name}(${assetid}): ${err.message}`);
            return;
        }

        bot.sendMessage(steamID, `✅ Deleted ${name}(${assetid})!`);
    });
}

export function nameCommand(steamID: SteamID, message: string, bot: Bot): void {
    const newName = CommandParser.removeCommand(message);

    if (!newName || newName === '!name') {
        bot.sendMessage(steamID, '❌ You forgot to add a name. Example: "!name IdiNium"');
        return;
    }

    bot.community.editProfile(
        {
            name: newName
        },
        err => {
            if (err) {
                log.warn('Error while changing name: ', err);
                bot.sendMessage(steamID, `❌ Error while changing name: ${err.message}`);
                return;
            }

            bot.sendMessage(steamID, '✅ Successfully changed name.');
        }
    );
}

export function avatarCommand(steamID: SteamID, message: string, bot: Bot): void {
    const imageUrl = CommandParser.removeCommand(message);

    if (!imageUrl || imageUrl === '!avatar') {
        bot.sendMessage(
            steamID,
            '❌ You forgot to add an image url. Example: "!avatar https://steamuserimages-a.akamaihd.net/ugc/949595415286366323/8FECE47652C9D77501035833E937584E30D0F5E7/"'
        );
        return;
    }

    if (!validUrl.isUri(imageUrl)) {
        bot.sendMessage(
            steamID,
            '❌ Your url is not valid. Example: "!avatar https://steamuserimages-a.akamaihd.net/ugc/949595415286366323/8FECE47652C9D77501035833E937584E30D0F5E7/"'
        );
        return;
    }

    bot.community.uploadAvatar(imageUrl, err => {
        if (err) {
            log.warn('Error while uploading new avatar: ', err);
            bot.sendMessage(steamID, `❌ Error while uploading a new avatar: ${err.message}`);
            return;
        }

        bot.sendMessage(steamID, '✅ Successfully uploaded a new avatar.');
    });
}

export function blockCommand(steamID: SteamID, message: string, bot: Bot): void {
    const steamid = CommandParser.removeCommand(message);

    if (!steamid || steamid === '!block') {
        bot.sendMessage(steamID, '❌ You forgot to add their SteamID64. Example: 76561198798404909');
        return;
    }

    const targetSteamID64 = new SteamID(steamid);

    if (!targetSteamID64.isValid()) {
        bot.sendMessage(steamID, '❌ SteamID is not valid. Example: 76561198798404909');
        return;
    }

    const sendMessage = bot;

    bot.client.blockUser(targetSteamID64, err => {
        if (err) {
            log.warn(`Failed to block user ${targetSteamID64.getSteamID64()}: `, err);
            sendMessage.sendMessage(
                steamID,
                `❌ Failed to block user ${targetSteamID64.getSteamID64()}: ${err.message}`
            );
            return;
        }
        sendMessage.sendMessage(steamID, `✅ Successfully blocked user ${targetSteamID64.getSteamID64()}`);
    });
}

export function unblockCommand(steamID: SteamID, message: string, bot: Bot): void {
    const steamid = CommandParser.removeCommand(message);

    if (!steamid || steamid === '!unblock') {
        bot.sendMessage(steamID, '❌ You forgot to add their SteamID64. Example: 76561198798404909');
        return;
    }

    const targetSteamID64 = new SteamID(steamid);

    if (!targetSteamID64.isValid()) {
        bot.sendMessage(steamID, '❌ SteamID is not valid. Example: 76561198798404909');
        return;
    }

    const sendMessage = bot;

    bot.client.unblockUser(targetSteamID64, err => {
        if (err) {
            log.warn(`Failed to unblock user ${targetSteamID64.getSteamID64()}: `, err);
            sendMessage.sendMessage(
                steamID,
                `❌ Failed to unblock user ${targetSteamID64.getSteamID64()}: ${err.message}`
            );
            return;
        }
        sendMessage.sendMessage(steamID, `✅ Successfully unblocked user ${targetSteamID64.getSteamID64()}`);
    });
}

export function stopCommand(steamID: SteamID, bot: Bot): void {
    bot.sendMessage(steamID, '⌛ Stopping...');

    bot.botManager.stopProcess().catch((err: Error) => {
        log.warn('Error occurred while trying to stop: ', err);
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        bot.sendMessage(steamID, `❌ An error occurred while trying to stop: ${err.message}`);
    });
}

export function restartCommand(steamID: SteamID, bot: Bot): void {
    bot.sendMessage(steamID, '⌛ Restarting...');

    bot.botManager
        .restartProcess()
        .then(restarting => {
            if (!restarting) {
                bot.sendMessage(
                    steamID,
                    '❌ You are not running the bot with PM2! Get a VPS and run your bot with PM2: https://github.com/idinium96/tf2autobot/wiki/Getting-a-VPS'
                );
            }
        })
        .catch((err: Error) => {
            log.warn('Error occurred while trying to restart: ', err);
            bot.sendMessage(steamID, `❌ An error occurred while trying to restart: ${err.message}`);
        });
}

export function updaterepoCommand(steamID: SteamID, bot: Bot, message: string): void {
    if (!fs.existsSync(path.resolve(__dirname, '..', '..', '..', '..', '.git'))) {
        bot.sendMessage(steamID, '❌ You did not cloned from Github.');
        return;
    }

    if (process.env.pm_id === undefined) {
        bot.sendMessage(steamID, '❌ You did not run with pm2!');
        return;
    }

    const params = CommandParser.parseParams(CommandParser.removeCommand(message));

    if (params.i_am_sure !== 'yes_i_am') {
        bot.sendMessage(
            steamID,
            `Currently running TF2Autobot@v${process.env.BOT_VERSION}. Checking for a new version...`
        );

        bot.checkForUpdates()
            .then(({ hasNewVersion, latestVersion }) => {
                if (!hasNewVersion) {
                    bot.sendMessage(steamID, 'You are running the latest version of TF2Autobot!');
                } else if (bot.lastNotifiedVersion === latestVersion) {
                    bot.sendMessage(
                        steamID,
                        `⚠️ Update available! Current: v${process.env.BOT_VERSION}, Latest: v${latestVersion}.` +
                            '\nSend !updaterepo i_am_sure=yes_i_am to update your repo now!' +
                            `\n\nRelease note: https://github.com/idinium96/tf2autobot/releases`
                    );
                }
            })
            .catch((err: Error) => {
                bot.sendMessage(steamID, `❌ Failed to check for updates: ${err.message}`);
            });
    } else {
        try {
            child.execSync('npm run update', { cwd: path.resolve(__dirname, '..', '..', '..', '..') });
        } catch (err) {
            bot.sendMessage(steamID, `❌ Failed to update bot repository: ${(err as Error).message}`);
        }

        bot.sendMessage(steamID, '⌛ Restarting...');

        bot.botManager.restartProcess().catch((err: Error) => {
            log.warn('Error occurred while trying to restart: ', err);
            bot.sendMessage(steamID, `❌ An error occurred while trying to restart: ${err.message}`);
        });
    }
}

export function autoKeysCommand(steamID: SteamID, bot: Bot, auto: Autokeys): void {
    if (auto.isEnabled === false) {
        bot.sendMessage(steamID, `This feature is disabled.`);
        return;
    }

    const autokeys = auto;

    const pureNow = pure.currPure(bot);
    const currKey = pureNow.key;
    const currRef = pureNow.refTotalInScrap;

    const keyPrices = bot.pricelist.getKeyPrices();

    const userPure = autokeys.userPure;
    const status = (bot.handler as MyHandler).getAutokeysStatus();

    const keyBlMin = `       X`;
    const keyAbMax = `                     X`;
    const keyAtBet = `              X`;
    const keyAtMin = `         X`;
    const keyAtMax = `                   X`;
    const keysLine = `Keys ————|—————————|————▶`;
    const refBlMin = `       X`;
    const refAbMax = `                     X`;
    const refAtBet = `              X`;
    const refAtMin = `         X`;
    const refAtMax = `                   X`;
    const refsLine = `Refs ————|—————————|————▶`;
    const xAxisRef = `        min       max`;
    const keysPosition =
        currKey < userPure.minKeys
            ? keyBlMin
            : currKey > userPure.maxKeys
            ? keyAbMax
            : currKey > userPure.minKeys && currKey < userPure.maxKeys
            ? keyAtBet
            : currKey === userPure.minKeys
            ? keyAtMin
            : currKey === userPure.maxKeys
            ? keyAtMax
            : '';
    const refsPosition =
        currRef < userPure.minRefs
            ? refBlMin
            : currRef > userPure.maxRefs
            ? refAbMax
            : currRef > userPure.minRefs && currRef < userPure.maxRefs
            ? refAtBet
            : currRef === userPure.minRefs
            ? refAtMin
            : currRef === userPure.maxRefs
            ? refAtMax
            : '';
    const summary = `\n• ${userPure.minKeys} ≤ ${pluralize('key', currKey)}(${currKey}) ≤ ${
        userPure.maxKeys
    }\n• ${Currencies.toRefined(userPure.minRefs)} < ${pluralize(
        'ref',
        Currencies.toRefined(currRef)
    )}(${Currencies.toRefined(currRef)}) < ${Currencies.toRefined(userPure.maxRefs)}`;

    const isAdmin = bot.isAdmin(steamID);

    let reply =
        (isAdmin ? 'Your ' : 'My ') +
        `current Autokeys settings:\n${summary}\n\nDiagram:\n${keysPosition}\n${keysLine}\n${refsPosition}\n${refsLine}\n${xAxisRef}\n`;
    reply += `\n       Key price: ${keyPrices.buy.metal}/${keyPrices.sell.toString()} (${
        keyPrices.src === 'manual' ? 'manual' : 'prices.tf'
    })`;
    reply += `\nScrap Adjustment: ${autokeys.isEnableScrapAdjustment ? 'Enabled ✅' : 'Disabled ❌'}`;
    reply += `\n    Auto-banking: ${autokeys.isKeyBankingEnabled ? 'Enabled ✅' : 'Disabled ❌'}`;
    reply += `\n Autokeys status: ${
        status.isActive
            ? status.isBanking
                ? 'Banking' + (autokeys.isEnableScrapAdjustment ? ' (default price)' : '')
                : status.isBuying
                ? 'Buying for ' +
                  Currencies.toRefined(
                      keyPrices.buy.toValue() + (autokeys.isEnableScrapAdjustment ? autokeys.scrapAdjustmentValue : 0)
                  ).toString() +
                  ' ref' +
                  (autokeys.isEnableScrapAdjustment ? ` (+${autokeys.scrapAdjustmentValue} scrap)` : '')
                : 'Selling for ' +
                  Currencies.toRefined(
                      keyPrices.sell.toValue() - (autokeys.isEnableScrapAdjustment ? autokeys.scrapAdjustmentValue : 0)
                  ).toString() +
                  ' ref' +
                  (autokeys.isEnableScrapAdjustment ? ` (-${autokeys.scrapAdjustmentValue} scrap)` : '')
            : 'Not active'
    }`;
    /*
    //        X
    // Keys ————|—————————|————▶
    //                       X
    // Refs ————|—————————|————▶
    //         min       max
    */

    bot.sendMessage(steamID, '/pre ' + reply);
}

export function refreshAutokeysCommand(steamID: SteamID, bot: Bot, auto: Autokeys): void {
    if (auto.isEnabled === false) {
        bot.sendMessage(steamID, `This feature is disabled.`);
        return;
    }

    auto.refresh();
    bot.sendMessage(steamID, '✅ Successfully refreshed Autokeys.');
}

export function resetQueueCommand(steamID: SteamID, bot: Bot, cartQueue: CartQueue): void {
    cartQueue.resetQueue();
    bot.sendMessage(steamID, '✅ Sucessfully reset queue!');
}

export function refreshListingsCommand(steamID: SteamID, bot: Bot): void {
    const listingsSKUs: string[] = [];
    bot.listingManager.getListings(err => {
        if (err) {
            bot.sendMessage(steamID, '❌ Unable to refresh listings, please try again later: ' + (err as string));
            return;
        }
        bot.listingManager.listings.forEach(listing => {
            listingsSKUs.push(listing.getSKU());
        });

        // Remove duplicate elements
        const newlistingsSKUs: string[] = [];
        listingsSKUs.forEach(sku => {
            if (!newlistingsSKUs.includes(sku)) {
                newlistingsSKUs.push(sku);
            }
        });

        const pricelist = bot.pricelist.getPrices().filter(entry => {
            // Filter our pricelist to only the items that are missing.
            return entry.enabled && !newlistingsSKUs.includes(entry.sku);
        });

        if (pricelist.length > 0) {
            log.debug('Checking listings for ' + pluralize('item', pricelist.length, true) + '...');
            bot.sendMessage(steamID, 'Refreshing listings for ' + pluralize('item', pricelist.length, true) + '...');
            void bot.listings.recursiveCheckPricelistWithDelay(pricelist).asCallback(() => {
                log.debug('Done checking ' + pluralize('item', pricelist.length, true));
                bot.sendMessage(steamID, '✅ Done refreshing ' + pluralize('item', pricelist.length, true));
            });
        } else {
            bot.sendMessage(steamID, '❌ Nothing to refresh.');
        }
    });
}
