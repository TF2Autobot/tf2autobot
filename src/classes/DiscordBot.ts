/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */

import { Client, Intents, Message } from 'discord.js';
import log from '../lib/logger';
import Options from './Options';
import Bot from './Bot';
import SteamID from 'steamid';
//import Commands from './Commands';

export default class DiscordBot {
    readonly client: Client;

    //readonly commands: Commands;

    constructor(private options: Options, private bot: Bot) {
        this.client = new Client({
            intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
        });
        //this.client.login(process.env.TOKEN);
        void this.client.login(this.options.discordApiToken);
        //this.commands = new Commands();
    }

    public start(): void {
        this.client.on('ready', this.ClientReady.bind(this));
        this.client.on('messageCreate', async message => this.handleMessage(message));
    }

    public stop(): void {
        //this.commands.stop();
        log.info('Logging out from Discord...');
        this.client.destroy();
    }

    public async handleMessage(message: Message): Promise<void> {
        if (message.author === this.client.user) {
            return; // don't talk to myself
        }

        log.info(`Got new message ${String(message.content)} from ${String(message.author.id)}`);
        if (message.author.id !== this.options.discordAdmin) {
            return; // obey only admin
        }

        if (!this.bot.isReady) {
            void message.reply('The bot is still booting up, please wait');
            return;
        }

        const adminID = new SteamID(this.options.steamOfDiscordAdmin);
        adminID.redirectAnswerTo = message;
        await this.bot.handler.onMessage(adminID, message.content);
    }

    private ClientReady() {
        log.info(`Logged in as ` + String(this.client.user.tag));
    }
}
