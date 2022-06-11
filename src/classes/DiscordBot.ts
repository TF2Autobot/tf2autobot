/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */

import { Client, Intents, Message, DiscordAPIError } from 'discord.js';
import log from '../lib/logger';
import Options from './Options';
import Bot from './Bot';
import SteamID from 'steamid';

export default class DiscordBot {
    readonly client: Client;

    constructor(private options: Options, private bot: Bot) {
        this.client = new Client({
            intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES]
        });

        // 'ready' binding should be executed BEFORE the login() is complete
        this.client.on('ready', this.onClientReady.bind(this));
        this.client.on('messageCreate', async message => this.onMessage(message));
    }

    public async start(): Promise<void> {
        if (!this.bot.isAdmin(this.admin)) {
            const problem = 'SteamID of Discord admin is not in ADMINS, aborting...';
            log.error(problem);
            throw Error(problem);
        }

        try {
            await this.client.login(this.options.discordApiToken);
        } catch (err) {
            const error = err as DiscordAPIError;

            if (error.code.toString() === 'TOKEN_INVALID') {
                log.error('Failed to login to Discord: bot token is invalid.');
                throw error; // only "incorrect token" error should crash the bot, so "throw" is only here
            } else {
                log.error('Failed to login to Discord, please use Steam chat for now. Error summary:', error);
                const adminID = this.admin;
                this.bot.sendMessage(
                    adminID,
                    'Failed to log in to Discord. You can still use commands in here.\n' +
                        `If https://discordstat.us doesn't indicate any problems right now, you can try to restart.\n` +
                        `If restarting didn't fix the problem - please ask for help on TF2Autobot Discord server: https://discord.gg/4k5tmMkXjB`
                );
            }
        }
    }

    public stop(): void {
        log.info('Logging out from Discord...');
        this.client.destroy();
    }

    public async onMessage(message: Message): Promise<void> {
        if (message.author === this.client.user) {
            return; // don't talk to myself
        }

        log.info(
            `Got new message ${String(message.content)} from ${message.author.tag} (${String(message.author.id)})`
        );
        if (message.author.id !== this.options.discordAdmin) {
            return; // obey only admin
        }

        if (!this.bot.isReady) {
            this.sendAnswer(message, '🛑 The bot is still booting up, please wait');
            return;
        }

        const adminID = this.admin;
        adminID.redirectAnswerTo = message;
        await this.bot.handler.onMessage(adminID, message.content);
    }

    private static reformat(message: string): string {
        if (message.startsWith('/code')) {
            return '```\n' + message.slice(6) + '\n```';
        } else if (message.startsWith('/pre')) {
            return '>>> ' + message.slice(5);
        } else {
            return message;
        }
    }

    public sendAnswer(origMessage: Message, message: string): void {
        const formattedMessage = DiscordBot.reformat(message);
        origMessage.channel
            .send(formattedMessage)
            .then(() =>
                log.info(`Message sent to ${origMessage.author.tag} (${origMessage.author.id}): ${formattedMessage}`)
            )
            .catch(err => log.error('Failed to send message to Discord:', err));
    }

    private onClientReady() {
        log.info(`Logged in as ` + String(this.client.user.tag));

        // DM chats are not giving messageCreate until first usage. This line fetches the required DM chat.
        this.client.users.createDM(this.options.discordAdmin).catch(err => {
            log.error('Failed to fetch DM channel with admin:', err);
        });
    }

    private get admin(): SteamID {
        return new SteamID(this.options.steamOfDiscordAdmin);
    }
}
