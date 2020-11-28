/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import SteamID from 'steamid';
import { promises as fsp } from 'fs';
import * as path from 'path';

import Bot from '../Bot';
import CommandParser from '../CommandParser';
import { JsonOptions, removeCliOptions } from '../Options';

import { deepMerge } from '../../lib/tools/deep-merge';
import validator from '../../lib/validator';

export function optionsCommand(steamID: SteamID, bot: Bot): void {
    const liveOptions = deepMerge({}, bot.options) as JsonOptions;
    // remove any CLI stuff
    removeCliOptions(liveOptions);
    // remove Discord Webhook URLs
    delete liveOptions.discordWebhook.tradeSummary.url;
    delete liveOptions.discordWebhook.offerReview.url;
    delete liveOptions.discordWebhook.messages.url;
    delete liveOptions.discordWebhook.priceUpdate.url;
    delete liveOptions.discordWebhook.sendAlert.url;
    bot.sendMessage(steamID, `/code ${JSON.stringify(liveOptions, null, 4)}`);
}

export function updateOptionsCommand(steamID: SteamID, message: string, bot: Bot): void {
    const opt = bot.options;

    const params = CommandParser.parseParams(CommandParser.removeCommand(message));

    const optionsPath = path.join(__dirname, `../../../files/${opt.steamAccountName}/options.json`);
    const saveOptions = deepMerge({}, opt) as JsonOptions;
    removeCliOptions(saveOptions);

    if (typeof params.game === 'object') {
        if (params.game.playOnlyTF2 !== undefined && params.game.playOnlyTF2 === true) {
            bot.client.gamesPlayed([]);
            bot.client.gamesPlayed(440);
        }

        if (params.game.customName !== undefined && typeof params.game.customName === 'string') {
            bot.client.gamesPlayed([]);
            bot.client.gamesPlayed(
                (params.game.playOnlyTF2 !== undefined ? params.game.playOnlyTF2 : opt.game.playOnlyTF2)
                    ? 440
                    : [params.game.customName, 440]
            );
        }
    }

    if (params.autobump !== undefined) {
        if (params.autobump === true) {
            bot.listings.setupAutorelist();
        } else {
            bot.listings.disableAutorelist();
        }
    }

    let newValue: string;
    let current: string[];

    if (typeof params.highValue === 'object') {
        const hvNew = params.highValue;
        const hvCurrent = saveOptions.highValue;

        if (hvNew.sheens !== undefined) {
            newValue = hvNew.sheens;
            current = hvCurrent.sheens;

            params.highValue.sheens = current.concat([newValue]);
            saveOptions.highValue.sheens.length = 0;
        }
        if (params.highValue.killstreakers !== undefined) {
            newValue = hvNew.killstreakers;
            current = hvCurrent.killstreakers;

            params.highValue.killstreakers = current.concat([newValue]);
            saveOptions.highValue.killstreakers.length = 0;
        }
        if (params.highValue.strangeParts !== undefined) {
            newValue = hvNew.strangeParts;
            current = hvCurrent.strangeParts;

            params.highValue.strangeParts = current.concat([newValue]);
            saveOptions.highValue.strangeParts.length = 0;
        }
    }

    if (typeof params.manualReview === 'object') {
        if (params.manualReview.invalidValue.exceptionValue.skus !== undefined) {
            newValue = params.manualReview.invalidValue.exceptionValue.skus;
            current = saveOptions.manualReview.invalidValue.exceptionValue.skus;

            params.manualReview.invalidValue.exceptionValue.skus = current.concat([newValue]);
            saveOptions.manualReview.invalidValue.exceptionValue.skus.length = 0;
        }
    }

    if (typeof params.discordWebhook === 'object') {
        const webhookNew = params.discordWebhook.tradeSummary;
        const webhookCurrent = saveOptions.discordWebhook.tradeSummary;

        if (webhookNew.url !== undefined) {
            newValue = webhookNew.url;
            current = webhookCurrent.url;

            params.discordWebhook.tradeSummary.url = current.concat([newValue]);
            saveOptions.discordWebhook.tradeSummary.url.length = 0;
        }

        if (webhookNew.mentionOwner.itemSkus !== undefined) {
            newValue = webhookNew.mentionOwner.itemSkus;
            current = webhookCurrent.mentionOwner.itemSkus;

            params.discordWebhook.tradeSummary.mentionOwner.itemSkus = current.concat([newValue]);
            saveOptions.discordWebhook.tradeSummary.mentionOwner.itemSkus.length = 0;
        }
    }

    if (Object.keys(params).length === 0) {
        bot.sendMessage(steamID, '⚠️ Missing properties to update.');
        return;
    }

    const result: JsonOptions = deepMerge(saveOptions, params);

    const errors = validator(result, 'options');
    if (errors !== null) {
        bot.sendMessage(steamID, '❌ Error updating options: ' + errors.join(', '));
        return;
    }
    fsp.writeFile(optionsPath, JSON.stringify(saveOptions, null, 4), { encoding: 'utf8' })
        .then(() => {
            deepMerge(opt, saveOptions);
            return bot.sendMessage(steamID, '✅ Updated options!');
        })
        .catch(err => {
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            bot.sendMessage(steamID, `❌ Error saving options file to disk: ${err}`);
            return;
        });
}
