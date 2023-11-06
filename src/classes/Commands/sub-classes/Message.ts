import SteamID from 'steamid';
import Bot from '../../Bot';
import CommandParser from '../../CommandParser';
import log from '../../../lib/logger';
import { generateLinks, timeNow } from '../../../lib/tools/export';
import { sendPartnerMessage, sendAdminMessage } from '../../DiscordWebhook/export';

export default class MessageCommand {
    constructor(private readonly bot: Bot) {
        this.bot = bot;
    }

    message(steamID: SteamID, message: string, prefix: string): void {
        const isAdmin = this.bot.isAdmin(steamID);
        const optComm = this.bot.options.commands.message;
        const custom = optComm.customReply;

        if (!optComm.enable) {
            if (isAdmin) {
                this.bot.sendMessage(
                    steamID,
                    '❌ The message command is disabled. Enable it by sending `!config commands.message.enable=true`.'
                );
            } else {
                this.bot.sendMessage(
                    steamID,
                    custom.disabled ? custom.disabled : '❌ The owner has disabled messages.'
                );
            }
            return;
        }

        const senderDetails = this.bot.friends.getFriend(steamID);
        const optDW = this.bot.options.discordWebhook.messages;

        if (isAdmin) {
            const steamIdAndMessage = CommandParser.removeCommand(message);
            const parts = steamIdAndMessage.split(' ');
            let recipientSteamID: SteamID;

            try {
                recipientSteamID = new SteamID(parts[0]);
            } catch (err) {
                log.error('Wrong input (SteamID): ', err);
                return this.bot.sendMessage(
                    steamID,
                    `❌ Your syntax is wrong or the SteamID is incorrectly formatted. Here's an example: "${prefix}message 76561198120070906 Hi"` +
                        "\n\nHow to get the targeted user's SteamID?" +
                        '\n1. Go to his/her profile page.' +
                        '\n2. Go to https://steamrep.com/' +
                        '\n3. View this gif: https://user-images.githubusercontent.com/47635037/96715154-be80b580-13d5-11eb-9bd5-39613f600f6d.gif'
                );
            }

            const steamIDString = recipientSteamID.getSteamID64();

            if (!recipientSteamID.isValid()) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ "${steamIDString}" is not a valid SteamID.` +
                        "\n\nHow to get the targeted user's SteamID?" +
                        '\n1. Go to his/her profile page.' +
                        '\n2. Go to https://steamrep.com/' +
                        '\n3. View this gif: https://user-images.githubusercontent.com/47635037/96715154-be80b580-13d5-11eb-9bd5-39613f600f6d.gif'
                );
            } else if (!this.bot.friends.isFriend(recipientSteamID)) {
                return this.bot.sendMessage(steamID, `❌ I am not friends with the user.`);
            }

            const recipientDetails = this.bot.friends.getFriend(recipientSteamID);
            const adminDetails = this.bot.friends.getFriend(steamID);
            const reply = steamIdAndMessage.substring(steamIDString.length).trim();
            const isShowOwner = optComm.showOwnerName;

            // Send message to recipient
            this.bot.sendMessage(
                recipientSteamID,
                custom.fromOwner
                    ? custom.fromOwner.replace(/%reply%/g, reply)
                    : `/quote 💬 Message from ${
                          isShowOwner && adminDetails ? adminDetails.player_name : 'the owner'
                      }: ${reply}` +
                          '\n\n❔ Hint: You can use the !message command to respond to the owner of this bot.' +
                          '\nExample: !message Hi Thanks!'
            );

            // Send a notification to the admin with message contents & details
            if (optDW.enable && optDW.url !== '') {
                sendAdminMessage(
                    recipientSteamID.toString(),
                    reply,
                    recipientDetails,
                    generateLinks(recipientSteamID.toString()),
                    timeNow(this.bot.options).time,
                    this.bot
                );
            } else {
                const customInitializer = this.bot.options.steamChat.customInitializer.message.toOtherAdmins;
                this.bot.messageAdmins(
                    `${
                        customInitializer ? customInitializer : '/quote'
                    } 💬 Message sent to #${recipientSteamID.toString()}${
                        recipientDetails ? ` (${recipientDetails.player_name})` : ''
                    }: "${reply}". `,
                    []
                );
            }

            this.bot.sendMessage(steamID, custom.success ? custom.success : '✅ Your message has been sent.');

            // Send message to all other admins that an admin replied
            return this.bot.messageAdmins(
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
            const admins = this.bot.getAdmins;
            if (!admins || admins.length === 0) {
                // Just default to same message as if it was disabled
                return this.bot.sendMessage(
                    steamID,
                    custom.disabled ? custom.disabled : '❌ The owner has disabled messages.'
                );
            }

            const msg = message.substring(8).trim(); // "message"
            if (!msg) {
                return this.bot.sendMessage(
                    steamID,
                    custom.wrongSyntax
                        ? custom.wrongSyntax
                        : `❌ Please include a message. Here's an example: "${prefix}message Hi"`
                );
            }

            const links = generateLinks(steamID.toString());
            if (optDW.enable && optDW.url !== '') {
                sendPartnerMessage(
                    steamID.toString(),
                    msg,
                    senderDetails,
                    links,
                    timeNow(this.bot.options).time,
                    this.bot
                );
            } else {
                const customInitializer = this.bot.options.steamChat.customInitializer.message.onReceive;
                this.bot.messageAdmins(
                    `${
                        customInitializer ? customInitializer : '/quote'
                    } 💬 You've got a message from #${steamID.toString()}${
                        senderDetails ? ` (${senderDetails.player_name})` : ''
                    }:` +
                        `"${msg}". ` +
                        `\nSteam: ${links.steam}` +
                        `\nBackpack.tf: ${links.bptf}` +
                        `\nSteamREP: ${links.steamrep}`,
                    []
                );
            }

            this.bot.sendMessage(steamID, custom.success ? custom.success : '✅ Your message has been sent.');
        }
    }
}
