import SteamID from 'steamid';

import Bot from '../Bot';
import CommandParser from '../CommandParser';

import { generateLinks, timeNow } from '../../lib/tools/export';
import { sendPartnerMessage } from '../../lib/DiscordWebhook/export';

export default function message(steamID: SteamID, message: string, bot: Bot): void {
    const opt = bot.options;
    const isAdmin = bot.isAdmin(steamID);

    if (!opt.enableMessages) {
        if (isAdmin) {
            bot.sendMessage(
                steamID,
                '❌ The message command is disabled. Enable it in the config with `DISABLE_MESSAGES=false`.'
            );
        } else {
            bot.sendMessage(steamID, '❌ The owner has disabled messages.');
        }
        return;
    }

    const adminDetails = bot.friends.getFriend(steamID);

    if (isAdmin) {
        const parts = message.split(' ');
        const steamIdAndMessage = CommandParser.removeCommand(message);
        // Use regex
        const steamIDreg = new RegExp(
            /^(\d+)|(STEAM_([0-5]):([0-1]):([0-9]+))|(\[([a-zA-Z]):([0-5]):([0-9]+)(:[0-9]+)?])$/
        );

        let steamIDString: string;

        if (!steamIDreg.test(steamIdAndMessage) || !steamIDreg || parts.length < 3) {
            bot.sendMessage(
                steamID,
                '❌ Your syntax is wrong or the SteamID is incorrectly formatted. Here\'s an example: "!message 76561198120070906 Hi"' +
                    "\n\nHow to get the targeted user's SteamID?" +
                    '\n1. Go to his/her profile page.' +
                    '\n2. Go to https://steamrep.com/' +
                    '\n3. Watch this gif: https://user-images.githubusercontent.com/47635037/96715154-be80b580-13d5-11eb-9bd5-39613f600f6d.gif'
            );
            return;
        } else {
            steamIDString = steamIDreg.exec(steamIdAndMessage)[0];
        }

        const recipient = steamIDString;
        const recipientSteamID = new SteamID(recipient);

        if (!recipientSteamID.isValid()) {
            bot.sendMessage(
                steamID,
                `❌ "${recipient}" is not a valid SteamID.` +
                    "\n\nHow to get the targeted user's SteamID?" +
                    '\n1. Go to his/her profile page.' +
                    '\n2. Go to https://steamrep.com/' +
                    '\n3. Watch this gif: https://user-images.githubusercontent.com/47635037/96715154-be80b580-13d5-11eb-9bd5-39613f600f6d.gif'
            );
            return;
        }

        const recipentDetails = bot.friends.getFriend(recipientSteamID);

        const reply = steamIdAndMessage.substr(steamIDString.length);

        // Send message to recipient
        bot.sendMessage(recipient, `/quote 💬 Message from the owner: ${reply}`);

        // Send confirmation message to admin
        bot.sendMessage(steamID, '✅ Your message has been sent.');

        // Send message to all other admins that an admin replied
        bot.messageAdmins(
            (adminDetails ? adminDetails.player_name + ` (${steamID})` : steamID) +
                ' sent a message to ' +
                (recipentDetails ? recipentDetails.player_name + ` (${recipientSteamID})` : recipientSteamID) +
                ` with "${reply}".`,
            [steamID]
        );
        return;
    } else {
        const admins = bot.getAdmins();
        if (!admins || admins.length === 0) {
            // Just default to same message as if it was disabled
            bot.sendMessage(steamID, '❌ The owner has disabled messages.');
            return;
        }

        const msg = message.substr(message.toLowerCase().indexOf('message') + 8);
        if (!msg) {
            bot.sendMessage(steamID, '❌ Please include a message. Here\'s an example: "!message Hi"');
            return;
        }

        const links = generateLinks(steamID.toString());
        const time = timeNow(opt.timezone, opt.customTimeFormat, opt.timeAdditionalNotes);

        if (opt.discordWebhook.messages.enable && opt.discordWebhook.messages.url !== '') {
            sendPartnerMessage(steamID.toString(), msg, adminDetails, links, time.time, bot);
        } else {
            bot.messageAdmins(
                `/quote 💬 You've got a message from #${steamID} (${adminDetails.player_name}):` +
                    `"${msg}". ` +
                    `\nSteam: ${links.steam}` +
                    `\nBackpack.tf: ${links.bptf}` +
                    `\nSteamREP: ${links.steamrep}`,
                []
            );
        }
        bot.sendMessage(steamID, '✅ Your message has been sent.');
    }
}
