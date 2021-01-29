import SteamID from 'steamid';
import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';
import Currencies from 'tf2-currencies';
import validUrl from 'valid-url';
import child from 'child_process';
import fs from 'graceful-fs';
import path from 'path';
import { EPersonaState } from 'steam-user';
import { utils } from './export';
import Bot from '../../Bot';
import CommandParser from '../../CommandParser';
import log from '../../../lib/logger';
import { pure } from '../../../lib/tools/export';
import sysInfo from 'systeminformation';

// Bot manager commands

type TF2GC = 'expand' | 'use' | 'delete';

export function TF2GCCommand(steamID: SteamID, message: string, bot: Bot, command: TF2GC): void {
    const params = CommandParser.parseParams(CommandParser.removeCommand(message));

    if (command === 'expand') {
        // Expand command
        if (typeof params.craftable !== 'boolean') {
            return bot.sendMessage(steamID, '⚠️ Missing `craftable=true|false`');
        }

        const item = SKU.fromString('5050;6');
        if (params.craftable === false) {
            item.craftable = false;
        }

        const assetids = bot.inventoryManager.getInventory.findBySKU(SKU.fromObject(item), false);
        if (assetids.length === 0) {
            // No backpack expanders
            return bot.sendMessage(
                steamID,
                `❌ I couldn't find any ${!item.craftable ? 'Non-Craftable' : ''} Backpack Expander`
            );
        }

        bot.tf2gc.useItem(assetids[0], err => {
            if (err) {
                log.warn('Error trying to expand inventory: ', err);
                return bot.sendMessage(steamID, `❌ Failed to expand inventory: ${err.message}`);
            }

            bot.sendMessage(steamID, `✅ Used ${!item.craftable ? 'Non-Craftable' : ''} Backpack Expander!`);
        });
    } else {
        // For use and delete commands
        if (params.sku !== undefined && !utils.testSKU(params.sku as string)) {
            return bot.sendMessage(steamID, `❌ "sku" should not be empty or wrong format.`);
        }

        if (params.assetid !== undefined && params.sku === undefined) {
            const targetedAssetId = params.assetid as string;
            const sku = bot.inventoryManager.getInventory.findByAssetid(targetedAssetId);

            if (sku === null) {
                if (params.i_am_sure !== 'yes_i_am') {
                    return bot.sendMessage(
                        steamID,
                        `⚠️ Are you sure that you want to ${command} the item with asset ID ${targetedAssetId}?` +
                            `\n- This process is irreversible and will ${command} the item from your bot's backpack!` +
                            `\n- If you are sure, try again with i_am_sure=yes_i_am as a parameter`
                    );
                }

                return bot.tf2gc[command === 'use' ? 'useItem' : 'deleteItem'](targetedAssetId, err => {
                    if (err) {
                        log.warn(`Error trying to ${command} ${targetedAssetId}: `, err);
                        return bot.sendMessage(steamID, `❌ Failed to ${command} ${targetedAssetId}: ${err.message}`);
                    }
                    bot.sendMessage(steamID, `✅ Used ${targetedAssetId}!`);
                });
            } else {
                const name = bot.schema.getName(SKU.fromString(sku), false);

                if (params.i_am_sure !== 'yes_i_am') {
                    return bot.sendMessage(
                        steamID,
                        `⚠️ Are you sure that you want to ${command} ${name}?` +
                            `\n- This process is irreversible and will ${command} the item from your bot's backpack!` +
                            `\n- If you are sure, try again with i_am_sure=yes_i_am as a parameter`
                    );
                }

                bot.tf2gc[command === 'use' ? 'useItem' : 'deleteItem'](targetedAssetId, err => {
                    if (err) {
                        log.warn(`Error trying to ${command} ${name}: `, err);
                        return bot.sendMessage(
                            steamID,
                            `❌ Failed to ${command} ${name} (${targetedAssetId}): ${err.message}`
                        );
                    }

                    bot.sendMessage(
                        steamID,
                        `✅ ${command === 'use' ? 'Used' : 'Deleted'} ${name} (${targetedAssetId})!`
                    );
                });
            }
        }

        if (params.name !== undefined || params.item !== undefined) {
            return bot.sendMessage(
                steamID,
                command === 'use'
                    ? '⚠️ Please only use sku property.' +
                          '\n\nBelow are some common items to use:' +
                          '\n• Gift-Stuffed Stocking 2013: 5718;6;untradable' +
                          '\n• Gift-Stuffed Stocking 2017: 5886;6;untradable' +
                          '\n• Gift-Stuffed Stocking 2018: 5900;6;untradable' +
                          '\n• Gift-Stuffed Stocking 2019: 5910;6;untradable' +
                          '\n• Gift-Stuffed Stocking 2020: 5923;6;untradable'
                    : '⚠️ Please only use sku property.' +
                          '\n\nBelow are some common items to delete:' +
                          '\n• Smissmas Sweater: 16391;15;untradable;w1;pk391' +
                          '\n• Soul Gargoyle: 5826;6;uncraftable;untradable' +
                          '\n• Noise Maker - TF Birthday: 536;6;untradable' +
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
        }

        if (params.sku === undefined) {
            return bot.sendMessage(steamID, `⚠️ Missing sku property. Example: "!${command} sku=5923;6;untradable"`);
        }

        const targetedSKU = params.sku as string;
        const [uncraft, untrade] = [targetedSKU.includes(';uncraftable'), targetedSKU.includes(';untradable')];

        const item = SKU.fromString(targetedSKU.replace(';uncraftable', '').replace(';untradable', ''));

        if (uncraft) {
            item.craftable = !uncraft;
        }
        if (untrade) {
            item.tradable = !untrade;
        }

        const assetids = bot.inventoryManager.getInventory.findBySKU(SKU.fromObject(item), false);
        const name = bot.schema.getName(item, false);

        if (assetids.length === 0) {
            // Item not found
            return bot.sendMessage(steamID, `❌ I couldn't find any ${pluralize(name, 0)}`);
        }

        let assetid: string;
        if (params.assetid !== undefined) {
            const targetedAssetId = params.assetid as string;

            if (assetids.includes(targetedAssetId)) assetid = targetedAssetId;
            else {
                return bot.sendMessage(
                    steamID,
                    `❌ Looks like an assetid ${targetedAssetId} did not match any assetids associated with ${name}(${targetedSKU})` +
                        ` in my inventory. Try using the sku to use a random assetid.`
                );
            }
            //
        } else assetid = assetids[0];

        if (params.i_am_sure !== 'yes_i_am') {
            return bot.sendMessage(
                steamID,
                `/pre ⚠️ Are you sure that you want to ${command} ${name}?` +
                    `\n- This process is irreversible and will ${command} the item from your bot's backpack!` +
                    `\n- If you are sure, try again with i_am_sure=yes_i_am as a parameter`
            );
        }

        bot.tf2gc[command === 'use' ? 'useItem' : 'deleteItem'](assetid, err => {
            if (err) {
                log.warn(`Error trying to ${command} ${name}: `, err);
                return bot.sendMessage(steamID, `❌ Failed to ${command} ${name} (${assetid}): ${err.message}`);
            }

            bot.sendMessage(steamID, `✅ ${command === 'use' ? 'Used' : 'Deleted'} ${name} (${assetid})!`);
        });
    }
}

type NameAvatar = 'name' | 'avatar';

export function nameAvatarCommand(steamID: SteamID, message: string, bot: Bot, command: NameAvatar): void {
    const example =
        'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/f5/f57685d33224e32436f366d1acb4a1769bdfa60f_full.jpg';
    const extract = CommandParser.removeCommand(message);
    if (!extract || extract === `!${command}`) {
        return bot.sendMessage(
            steamID,
            `❌ You forgot to add ${command === 'name' ? 'a name' : 'an image url'}. Example: "!${
                command === 'name' ? 'name IdiNium' : `avatar ${example}`
            } "`
        );
    }

    if (command === 'name') {
        bot.community.editProfile(
            {
                name: extract
            },
            err => {
                if (err) {
                    log.warn('Error while changing name: ', err);
                    return bot.sendMessage(steamID, `❌ Error while changing name: ${err.message}`);
                }

                bot.sendMessage(steamID, '✅ Successfully changed name.');
            }
        );
    } else {
        if (!validUrl.isUri(extract)) {
            return bot.sendMessage(steamID, `❌ Your url is not valid. Example: "!avatar ${example}"`);
        }

        bot.community.uploadAvatar(extract, err => {
            if (err) {
                log.warn('Error while uploading new avatar: ', err);
                return bot.sendMessage(steamID, `❌ Error while uploading a new avatar: ${err.message}`);
            }

            bot.sendMessage(steamID, '✅ Successfully uploaded a new avatar.');
        });
    }
}

type BlockUnblock = 'block' | 'unblock';

export function blockUnblockCommand(steamID: SteamID, message: string, bot: Bot, command: BlockUnblock): void {
    const steamid = CommandParser.removeCommand(message);
    if (!steamid || steamid === `!${command}`) {
        return bot.sendMessage(
            steamID,
            `❌ You forgot to add their SteamID64. Example: "!${command} 76561198798404909"`
        );
    }

    const targetSteamID64 = new SteamID(steamid);
    if (!targetSteamID64.isValid()) {
        return bot.sendMessage(steamID, `❌ SteamID is not valid. Example: "!${command} 76561198798404909"`);
    }

    bot.client[command === 'block' ? 'blockUser' : 'unblockUser'](targetSteamID64, err => {
        if (err) {
            log.warn(`Failed to ${command} user ${targetSteamID64.getSteamID64()}: `, err);
            return bot.sendMessage(
                steamID,
                `❌ Failed to ${command} user ${targetSteamID64.getSteamID64()}: ${err.message}`
            );
        }
        bot.sendMessage(
            steamID,
            `✅ Successfully ${command === 'block' ? 'blocked' : 'unblocked'} user ${targetSteamID64.getSteamID64()}`
        );
    });
}

export function clearFriendsCommand(steamID: SteamID, bot: Bot): void {
    const friendsToRemove = bot.friends.getFriends.filter(steamid => !bot.handler.friendsToKeep.includes(steamid));

    friendsToRemove.forEach(steamid => {
        bot.sendMessage(
            steamid,
            `/quote Hey ${
                bot.friends.getFriend(steamid).player_name
            }! My owner has performed friend list clearance. Please feel free to add me again if you want to trade at a later time!`
        );
        bot.client.removeFriend(steamid);
    });

    bot.sendMessage(steamID, `✅ Friendlist clearance success! Removed ${friendsToRemove.length} friends.`);
}

export function stopCommand(steamID: SteamID, bot: Bot): void {
    bot.sendMessage(steamID, '⌛ Stopping...');

    bot.botManager.stopProcess().catch(err => {
        log.warn('Error occurred while trying to stop: ', err);
        bot.sendMessage(steamID, `❌ An error occurred while trying to stop: ${JSON.stringify(err)}`);
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
                    '❌ You are not running the bot with PM2! Get a VPS and run ' +
                        'your bot with PM2: https://github.com/idinium96/tf2autobot/wiki/Getting-a-VPS'
                );
            }
        })
        .catch(err => {
            log.warn('Error occurred while trying to restart: ', err);
            bot.sendMessage(steamID, `❌ An error occurred while trying to restart: ${JSON.stringify(err)}`);
        });
}

export async function updaterepoCommand(steamID: SteamID, bot: Bot, message: string): Promise<void> {
    if (!fs.existsSync(path.resolve(__dirname, '..', '..', '..', '..', '.git'))) {
        return bot.sendMessage(steamID, '❌ You did not clone the bot from Github.');
    }

    if (process.env.pm_id === undefined) {
        return bot.sendMessage(steamID, '❌ You did not start the bot with pm2!');
    }

    const params = CommandParser.parseParams(CommandParser.removeCommand(message));
    if (params.i_am_sure !== 'yes_i_am') {
        bot.sendMessage(
            steamID,
            `Currently running TF2Autobot@v${process.env.BOT_VERSION}. Checking for a new version...`
        );

        bot.checkForUpdates
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
            .catch(err => bot.sendMessage(steamID, `❌ Failed to check for updates: ${JSON.stringify(err)}`));
    } else {
        bot.sendMessage(steamID, '⌛ Updating...');
        // Make the bot snooze on Steam, that way people will know it is not running
        bot.client.setPersona(EPersonaState.Snooze);

        // Set isUpdating status, so any command will not be processed
        bot.handler.isUpdatingStatus = true;

        // Stop polling offers
        bot.manager.pollInterval = -1;

        // TODO: change back to master (in package.json) once ready to release

        const onFailed = (err: any, type: 'command' | 'restarting' | 'any') => {
            log.warn(
                type === 'restarting'
                    ? 'Error occurred while trying to restart: '
                    : '❌ Failed to update bot repository:',
                err
            );
            bot.sendMessage(
                steamID,
                (type === 'restarting'
                    ? '❌ An error occurred while trying to restart: '
                    : '❌ Failed to update bot repository: ') + JSON.stringify(err)
            );

            bot.client.setPersona(EPersonaState.Online);
            bot.client.gamesPlayed(bot.options.miscSettings.game.playOnlyTF2 ? 440 : [bot.handler.customGameName, 440]);
            bot.manager.pollInterval = 1000;
            bot.handler.isUpdatingStatus = false;
        };

        try {
            const systemInformation = await sysInfo.osInfo();
            const osUsed = systemInformation.platform;

            child.exec(
                osUsed === 'win32' ? 'npm run update-windows' : 'npm run update-linux',
                { cwd: path.resolve(__dirname, '..', '..', '..', '..') },
                err => {
                    if (err) {
                        onFailed(err, 'command');
                    }
                    bot.sendMessage(steamID, '⌛ Restarting...');

                    bot.botManager.restartProcess().catch(err => {
                        onFailed(err, 'restarting');
                    });
                }
            );
        } catch (err) {
            onFailed(err, 'any');
        }
    }
}

export function autoKeysCommand(steamID: SteamID, bot: Bot): void {
    const opt = bot.options.commands.autokeys;
    if (!opt.enable) {
        if (!bot.isAdmin(steamID)) {
            const custom = opt.customReply.disabled;
            return bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
        }
    }

    bot.sendMessage(steamID, '/pre ' + generateAutokeysReply(steamID, bot));
}

function generateAutokeysReply(steamID: SteamID, bot: Bot): string {
    const pureNow = pure.currPure(bot);
    const currKey = pureNow.key;
    const currRef = pureNow.refTotalInScrap;

    const keyPrices = bot.pricelist.getKeyPrices;

    const autokeys = bot.handler.autokeys;
    const userPure = autokeys.userPure;
    const status = autokeys.getOverallStatus;

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

    let reply =
        (bot.isAdmin(steamID) ? 'Your ' : 'My ') +
        `current Autokeys settings:\n${summary}\n\nDiagram:\n${keysPosition}\n${keysLine}\n${refsPosition}\n${refsLine}\n${xAxisRef}\n`;
    reply += `\n      Key prices: ${keyPrices.buy.toString()}/${keyPrices.sell.toString()} (${
        keyPrices.src === 'manual' ? 'manual' : 'prices.tf'
    })`;

    const scrapAdjustmentEnabled = autokeys.isEnableScrapAdjustment;
    const scrapAdjustmentValue = autokeys.scrapAdjustmentValue;
    const keyBankingEnabled = autokeys.isKeyBankingEnabled;

    reply += `\nScrap Adjustment: ${scrapAdjustmentEnabled ? 'Enabled ✅' : 'Disabled ❌'}`;
    reply += `\n    Auto-banking: ${keyBankingEnabled ? 'Enabled ✅' : 'Disabled ❌'}`;
    reply += `\n Autokeys status: ${
        autokeys.getActiveStatus
            ? status.isBankingKeys
                ? 'Banking' + (scrapAdjustmentEnabled ? ' (default price)' : '')
                : status.isBuyingKeys
                ? 'Buying for ' +
                  Currencies.toRefined(
                      keyPrices.buy.toValue() + (scrapAdjustmentEnabled ? scrapAdjustmentValue : 0)
                  ).toString() +
                  ' ref' +
                  (scrapAdjustmentEnabled ? ` (+${scrapAdjustmentValue} scrap)` : '')
                : 'Selling for ' +
                  Currencies.toRefined(
                      keyPrices.sell.toValue() - (scrapAdjustmentEnabled ? scrapAdjustmentValue : 0)
                  ).toString() +
                  ' ref' +
                  (scrapAdjustmentEnabled ? ` (-${scrapAdjustmentValue} scrap)` : '')
            : 'Not active'
    }`;
    /*
    //        X
    // Keys ————|—————————|————▶
    //                       X
    // Refs ————|—————————|————▶
    //         min       max
    */

    return reply;
}

export function refreshAutokeysCommand(steamID: SteamID, bot: Bot): void {
    if (bot.handler.autokeys.isEnabled === false) {
        return bot.sendMessage(steamID, `This feature is disabled.`);
    }

    bot.handler.autokeys.refresh();
    bot.sendMessage(steamID, '✅ Successfully refreshed Autokeys.');
}

export function refreshListingsCommand(steamID: SteamID, bot: Bot): void {
    const listingsSKUs: string[] = [];
    bot.listingManager.getListings(async err => {
        if (err) {
            return bot.sendMessage(
                steamID,
                '❌ Unable to refresh listings, please try again later: ' + JSON.stringify(err)
            );
        }
        bot.listingManager.listings.forEach(listing => {
            let listingSKU = listing.getSKU();
            if (listing.intent === 1) {
                if (bot.options.normalize.painted.our && /;[p][0-9]+/.test(listingSKU)) {
                    listingSKU = listingSKU.replace(/;[p][0-9]+/, '');
                }

                if (bot.options.normalize.festivized.our && listingSKU.includes(';festive')) {
                    listingSKU = listingSKU.replace(';festive', '');
                }

                if (bot.options.normalize.strangeAsSecondQuality.our && listingSKU.includes(';strange')) {
                    listingSKU = listingSKU.replace(';strange', '');
                }
            }

            listingsSKUs.push(listingSKU);
        });

        // Remove duplicate elements
        const newlistingsSKUs: string[] = [];
        listingsSKUs.forEach(sku => {
            if (!newlistingsSKUs.includes(sku)) {
                newlistingsSKUs.push(sku);
            }
        });

        const pricelist = bot.pricelist.getPrices.filter(
            entry => entry.enabled && !newlistingsSKUs.includes(entry.sku)
            // Filter our pricelist to only the items that are missing.
        );

        if (pricelist.length > 0) {
            log.debug('Checking listings for ' + pluralize('item', pricelist.length, true) + '...');
            bot.sendMessage(steamID, 'Refreshing listings for ' + pluralize('item', pricelist.length, true) + '...');

            await bot.listings.recursiveCheckPricelist(pricelist, true);

            log.debug('Done checking ' + pluralize('item', pricelist.length, true));
            bot.sendMessage(steamID, '✅ Done refreshing ' + pluralize('item', pricelist.length, true));
        } else {
            bot.sendMessage(steamID, '❌ Nothing to refresh.');
        }
    });
}
