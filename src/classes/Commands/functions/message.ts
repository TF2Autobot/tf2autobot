import SteamID from 'steamid';
import Bot from '../../Bot';
import CommandParser from '../../CommandParser';
import { generateLinks, timeNow } from '../../../lib/tools/export';
import { sendPartnerMessage, sendAdminMessage } from '../../../lib/DiscordWebhook/export';

export default function message(steamID: SteamID, message: string, bot: Bot): void {
    const isAdmin = bot.isAdmin(steamID);
    const custom = bot.options.commands.message.customReply;
    if (!bot.options.commands.enable) {
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
    const optDW = bot.options.discordWebhook.messages;

    if (isAdmin) {
        const steamIdAndMessage = CommandParser.removeCommand(message);
        const parts = steamIdAndMessage.split(' ');
        let recipientSteamID: SteamID;

        try {
            recipientSteamID = new SteamID(parts[0]);
        } catch (err) {
            return bot.sendMessage(
                steamID,
                '❌ Your syntax is wrong or the SteamID is incorrectly formatted. Here\'s an example: "!message 76561198120070906 Hi"' +
                    "\n\nHow to get the targeted user's SteamID?" +
                    '\n1. Go to his/her profile page.' +
                    '\n2. Go to https://steamrep.com/' +
                    '\n3. View this gif: https://user-images.githubusercontent.com/47635037/96715154-be80b580-13d5-11eb-9bd5-39613f600f6d.gif'
            );
        }

        const steamIDString = recipientSteamID.getSteamID64();

        if (!recipientSteamID.isValid()) {
            return bot.sendMessage(
                steamID,
                `❌ "${steamIDString}" is not a valid SteamID.` +
                    "\n\nHow to get the targeted user's SteamID?" +
                    '\n1. Go to his/her profile page.' +
                    '\n2. Go to https://steamrep.com/' +
                    '\n3. View this gif: https://user-images.githubusercontent.com/47635037/96715154-be80b580-13d5-11eb-9bd5-39613f600f6d.gif'
            );
        } else if (!bot.friends.isFriend(recipientSteamID)) {
            return bot.sendMessage(steamID, `❌ I am not friends with the user.`);
        }

        const recipientDetails = bot.friends.getFriend(recipientSteamID);
        const reply = steamIdAndMessage.substr(steamIDString.length);
        // Send message to recipient
        bot.sendMessage(
            recipientSteamID,
            custom.fromOwner
                ? custom.fromOwner.replace(/%reply%/g, reply)
                : `/quote 💬 Message from the owner: ${reply}` +
                      '\n\n❔ Hint: You can use the !message command to respond to the owner of this bot.' +
                      '\nExample: !message Hi Thanks!'
        );

        // Send a notification to the admin with message contents & details
        if (optDW.enable && optDW.url !== '') {
            sendAdminMessage(
                recipientSteamID.toString(),
                reply,
                recipientDetails,
                generateLinks(steamID.toString()),
                timeNow(bot.options).time,
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

        bot.sendMessage(steamID, custom.success ? custom.success : '✅ Your message has been sent.');

        // Send message to all other admins that an admin replied
        return bot.messageAdmins(
            `${
                senderDetails ? `${senderDetails.player_name} (${steamID.toString()})` : steamID.toString()
            } sent a message to ${
                recipientDetails
                    ? recipientDetails.player_name + ` (${recipientSteamID.toString()})`
                    : recipientSteamID.toString()
            } with "${reply}".`,
            [steamID]
        );
    } else {
        const admins = bot.getAdmins;
        if (!admins || admins.length === 0) {
            // Just default to same message as if it was disabled
            return bot.sendMessage(steamID, custom.disabled ? custom.disabled : '❌ The owner has disabled messages.');
        }

        const msg = message.substr(message.toLowerCase().indexOf('message') + 8);
        if (!msg) {
            return bot.sendMessage(
                steamID,
                custom.wrongSyntax
                    ? custom.wrongSyntax
                    : '❌ Please include a message. Here\'s an example: "!message Hi"'
            );
        }

        const links = generateLinks(steamID.toString());
        if (optDW.enable && optDW.url !== '') {
            sendPartnerMessage(steamID.toString(), msg, senderDetails, links, timeNow(bot.options).time, bot);
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
