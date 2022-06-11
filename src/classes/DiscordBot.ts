/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */

import { Client, Intents, Message } from 'discord.js';
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
    }

    public start(): void {
        this.client.login(this.options.discordApiToken).catch(err => {
            log.error('Failed to login to Discord:', err);
        });
        this.client.on('ready', this.onClientReady.bind(this));
        this.client.on('messageCreate', async message => this.onMessage(message));
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

        const adminID = new SteamID(this.options.steamOfDiscordAdmin);
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
}
