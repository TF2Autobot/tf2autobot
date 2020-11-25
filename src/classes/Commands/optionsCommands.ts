import SteamID from 'steamid';
import * as fs from 'fs';
import * as path from 'path';

import Bot from '../Bot';
// import CommandParser from '../CommandParser';

export function optionsCommand(steamID: SteamID, bot: Bot): void {
    const optionsPath = path.join(__dirname, `../../../files/${bot.options.steamAccountName}/options.json`);
    try {
        const optionJson = fs.readFileSync(optionsPath, { encoding: 'utf8' });

        const data = JSON.parse(optionJson);

        // remove Discord Webhook URLs
        delete data.discordWebhook.tradeSummary.url;
        delete data.discordWebhook.offerReview.url;
        delete data.discordWebhook.messages.url;
        delete data.discordWebhook.priceUpdate.url;
        delete data.discordWebhook.sendAlert.url;

        bot.sendMessage(steamID, `/code ${JSON.stringify(data, null, 4)}`);
    } catch (err) {
        bot.sendMessage(steamID, '❌ Error reading options.json file from disk. Please try again.');
    }
}

// export function updateOptionsCommand(steamID: SteamID, message: string, bot: Bot): void {
//     const optionsPath = path.join(__dirname, `../../../files/${bot.options.steamAccountName}/options.json`);
//     const optionJson = fs.readFileSync(optionsPath, { encoding: 'utf8' });
//     const params = CommandParser.parseParams(CommandParser.removeCommand(message));
// }
