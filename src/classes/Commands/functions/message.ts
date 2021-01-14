import SteamID from 'steamid';

import Bot from '../../Bot';
import CommandParser from '../../CommandParser';

import { generateLinks, timeNow } from '../../../lib/tools/export';
import { sendPartnerMessage } from '../../../lib/DiscordWebhook/export';
import sendAdminMessage from '../../../lib/DiscordWebhook/sendAdminMessage';

export default function message(steamID: SteamID, message: string, bot: Bot): void {
    const opt = bot.options;
    const opt2 = opt.commands.message;
    const isAdmin = bot.isAdmin(steamID);

    const custom = opt2.customReply;

    if (!opt2.enable) {
        if (isAdmin) {
            bot.sendMessage(
                steamID,
                '❌ The message command is disabled. Enable it by sending `!config commands.message.enable=true`.'
            );
        } else {
            bot.sendMessage(steamID, custom.disabled ? custom.disabled : '❌ The owner has disabled messages.');
        }
        return;
    }

    const senderDetails = bot.friends.getFriend(steamID);

    if (isAdmin) {
        const parts = message.split(' ');
        const steamIdAndMessage = CommandParser.removeCommand(message);
        // Use regex
        const steamIDReg = /^(\d+)|(STEAM_([0-5]):([0-1]):([0-9]+))|(\[([a-zA-Z]):([0-5]):([0-9]+)(:[0-9]+)?])$/;

        let steamIDString: string;

        if (!steamIDReg.test(steamIdAndMessage) || !steamIDReg || parts.length < 3) {
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
            steamIDString = steamIDReg.exec(steamIdAndMessage)[0];
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
        } else if (!bot.friends.isFriend(recipientSteamID)) {
            bot.sendMessage(steamID, `❌ I am not friends with the user.`);
            return;
        }

        const recipientDetails = bot.friends.getFriend(recipientSteamID);

        const reply = steamIdAndMessage.substr(steamIDString.length);

        // Send message to recipient
        bot.sendMessage(
            recipient,
            custom.fromOwner
                ? custom.fromOwner.replace(/%reply%/g, reply)
                : `/quote 💬 Message from the owner: ${reply}` +
                      '\n\n❔ Hint: You can use the !message command to respond to the owner of this bot.' +
                      '\nExample: !message Hi Thanks!'
        );

        // Send a notification to the admin with message contents & details
        if (opt.discordWebhook.messages.enable && opt.discordWebhook.messages.url !== '') {
            sendAdminMessage(
                recipientSteamID.toString(),
                reply,
                recipientDetails,
                generateLinks(steamID.toString()),
                timeNow(bot).time,
                bot
            );
        } else {
            bot.messageAdmins(
                `/quote 💬 Message sent to #${recipientSteamID.toString()} (${
                    recipientDetails.player_name
                }): "${reply}". `,
                []
            );
        }

        // Send message to all other admins that an admin replied
        bot.messageAdmins(
            `${
                senderDetails ? `${senderDetails.player_name} (${steamID.toString()})` : steamID.toString()
            } sent a message to ${
                recipientDetails
                    ? recipientDetails.player_name + ` (${recipientSteamID.toString()})`
                    : recipientSteamID.toString()
            } with "${reply}".`,
            [steamID]
        );
        return;
    } else {
        const admins = bot.getAdmins;
        if (!admins || admins.length === 0) {
            // Just default to same message as if it was disabled
            bot.sendMessage(steamID, custom.disabled ? custom.disabled : '❌ The owner has disabled messages.');
            return;
        }

        const msg = message.substr(message.toLowerCase().indexOf('message') + 8);
        if (!msg) {
            bot.sendMessage(
                steamID,
                custom.wrongSyntax
                    ? custom.wrongSyntax
                    : '❌ Please include a message. Here\'s an example: "!message Hi"'
            );
            return;
        }

        const links = generateLinks(steamID.toString());

        if (opt.discordWebhook.messages.enable && opt.discordWebhook.messages.url !== '') {
            sendPartnerMessage(steamID.toString(), msg, senderDetails, links, timeNow(bot).time, bot);
        } else {
            bot.messageAdmins(
                `/quote 💬 You've got a message from #${steamID.toString()} (${senderDetails.player_name}):` +
                    `"${msg}". ` +
                    `\nSteam: ${links.steam}` +
                    `\nBackpack.tf: ${links.bptf}` +
                    `\nSteamREP: ${links.steamrep}`,
                []
            );
        }
        bot.sendMessage(steamID, custom.success ? custom.success : '✅ Your message has been sent.');
    }
}
