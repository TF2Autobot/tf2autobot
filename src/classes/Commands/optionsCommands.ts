import SteamID from 'steamid';
import * as fs from 'fs';
import * as path from 'path';

import Bot from '../Bot';
import CommandParser from '../CommandParser';
import { JsonOptions } from '../Options';
// import BotManager from '../BotManager';

import { deepMerge } from '../../lib/tools/deep-merge';
import validator from '../../lib/validator';

export function optionsCommand(steamID: SteamID, bot: Bot): void {
    const optionsPath = path.join(__dirname, `../../../files/${bot.options.steamAccountName}/options.json`);

    fs.readFile(optionsPath, { encoding: 'utf8' }, (err, data) => {
        if (err) {
            bot.sendMessage(steamID, '❌ Error reading options.json file from disk: ' + err);
            return;
        }
        const options = JSON.parse(data);

        // remove Discord Webhook URLs
        delete options.discordWebhook.tradeSummary.url;
        delete options.discordWebhook.offerReview.url;
        delete options.discordWebhook.messages.url;
        delete options.discordWebhook.priceUpdate.url;
        delete options.discordWebhook.sendAlert.url;

        bot.sendMessage(steamID, `/code ${JSON.stringify(options, null, 4)}`);
    });
}

export function updateOptionsCommand(steamID: SteamID, message: string, bot: Bot): void {
    const optionsPath = path.join(__dirname, `../../../files/${bot.options.steamAccountName}/options.json`);
    const params = CommandParser.parseParams(CommandParser.removeCommand(message));

    fs.readFile(optionsPath, { encoding: 'utf8' }, (err, data) => {
        if (err) {
            bot.sendMessage(steamID, '❌ Error reading options.json file from disk: ' + err);
            return;
        }

        const optionsJson = JSON.parse(data) as JsonOptions;

        if (typeof params.highValue === 'object') {
            if (params.highValue.sheens !== undefined) {
                params.highValue.sheens = new Array(optionsJson.highValue.sheens.push(params.highValue.sheens));
            }
            if (params.highValue.killstreakers !== undefined) {
                params.highValue.killstreakers = new Array(
                    optionsJson.highValue.killstreakers.push(params.highValue.killstreakers)
                );
                optionsJson.highValue.killstreakers.length = 0;
            }
        }

        if (typeof params.manualReview === 'object') {
            if (params.manualReview.invalidValue.exceptionValue.skus !== undefined) {
                params.manualReview.invalidValue.exceptionValue.skus = new Array(
                    optionsJson.manualReview.invalidValue.exceptionValue.skus.push(
                        params.manualReview.invalidValue.exceptionValue.skus
                    )
                );
                optionsJson.manualReview.invalidValue.exceptionValue.skus.length = 0;
            }
        }

        if (typeof params.discordWebhook === 'object') {
            if (params.discordWebhook.tradeSummary.url !== undefined) {
                params.discordWebhook.tradeSummary.url = new Array(
                    optionsJson.discordWebhook.tradeSummary.url.push(params.discordWebhook.tradeSummary.url)
                );
                optionsJson.discordWebhook.tradeSummary.url.length = 0;
            }

            if (params.discordWebhook.tradeSummary.mentionOwner.itemSkus !== undefined) {
                params.discordWebhook.tradeSummary.mentionOwner.itemSkus = new Array(
                    optionsJson.discordWebhook.tradeSummary.mentionOwner.itemSkus.push(
                        params.discordWebhook.tradeSummary.mentionOwner.itemSkus
                    )
                );
                optionsJson.discordWebhook.tradeSummary.mentionOwner.itemSkus.length = 0;
            }
        }

        if (Object.keys(params).length === 0) {
            bot.sendMessage(steamID, '⚠️ Missing properties to update.');
            return;
        }

        const result: JsonOptions = deepMerge(optionsJson, params as JsonOptions);

        const errors = validator(result, 'options');
        if (errors !== null) {
            bot.sendMessage(steamID, '❌ Error updating options: ' + errors.join(', '));
            return;
        }

        fs.writeFile(optionsPath, JSON.stringify(result, null, 4), { encoding: 'utf8' }, err => {
            if (err) {
                bot.sendMessage(steamID, '❌ Error saving options file to disk: ' + err);
                return;
            }

            // now refresh Options and I don't know how. Right now it will successfully modified the file,
            // but the bot still use the old Options.

            // const botManager = new BotManager();
            // botManager.reloadOptions(result);
            // ^ This crashed the bot:

            /* TypeError: BotManager_1.default is not a constructor
             *      at Object.updateOptionsCommand (D:\Github\tf2autobot\dist\classes\Commands\optionsCommands.js:85:24)
             *      at Commands.processMessage (D:\Github\tf2autobot\dist\classes\Commands\Commands.js:203:30)
             *      at MyHandler.onMessage (D:\Github\tf2autobot\dist\classes\MyHandler\MyHandler.js:284:23)
             *      at Bot.onMessage (D:\Github\tf2autobot\dist\classes\Bot.js:528:22)
             *      at Immediate.<anonymous> (D:\Github\tf2autobot\dist\classes\Bot.js:143:21)
             *      at processImmediate (internal/timers.js:456:21)
             */

            bot.sendMessage(steamID, '✅ Updated options!');
        });
    });
}
