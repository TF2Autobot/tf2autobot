import SteamID from 'steamid';
import * as fs from 'fs';
import * as path from 'path';

import Bot from '../Bot';
// import CommandParser from '../CommandParser';

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

// export function updateOptionsCommand(steamID: SteamID, message: string, bot: Bot): void {
//     const optionsPath = path.join(__dirname, `../../../files/${bot.options.steamAccountName}/options.json`);
//     const optionJson = fs.readFileSync(optionsPath, { encoding: 'utf8' });
//     const params = CommandParser.parseParams(CommandParser.removeCommand(message));
// }
