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
    bot.sendMessage(steamID, `/code ${JSON.stringify(liveOptions, null, 4)}`);
}

export function updateOptionsCommand(steamID: SteamID, message: string, bot: Bot): void {
    const opt = bot.options;

    const params = CommandParser.parseParams(CommandParser.removeCommand(message));

    const optionsPath = path.join(__dirname, `../../../files/${opt.steamAccountName}/options.json`);
    const saveOptions = deepMerge({}, opt) as JsonOptions;
    removeCliOptions(saveOptions);

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
