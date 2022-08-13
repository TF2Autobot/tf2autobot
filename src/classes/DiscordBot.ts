/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */

import { Client, GatewayIntentBits, Message, DiscordAPIError, Snowflake, ActivityType } from 'discord.js';
import log from '../lib/logger';
import Options from './Options';
import Bot from './Bot';
import SteamID from 'steamid';

export default class DiscordBot {
    readonly client: Client;

    constructor(private options: Options, private bot: Bot) {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.MessageContent
            ]
        });

        // 'ready' binding should be executed BEFORE the login() is complete
        this.client.on('ready', this.onClientReady.bind(this));
        this.client.on('messageCreate', async message => this.onMessage(message));
    }

    public async start(): Promise<void> {
        // TODO: check for discord IDs not being repeated in ADMINS

        try {
            await this.client.login(this.options.discordBotToken);
        } catch (err) {
            const error = err as DiscordAPIError;

            if (error.code.toString() === 'TOKEN_INVALID') {
                log.error('Failed to login to Discord: bot token is invalid.');
                throw error; // only "incorrect token" error should crash the bot, so "throw" is only here
            } else {
                log.error('Failed to login to Discord, please use Steam chat for now. Error summary:', error);
                this.admins.forEach(admin => {
                    this.bot.sendMessage(
                        admin,
                        'Failed to log in to Discord. You can still use commands in here.\n' +
                            `If https://discordstat.us doesn't indicate any problems right now, you can try to restart.\n` +
                            `If restarting didn't fix the problem - please ask for help on TF2Autobot Discord server: https://discord.gg/4k5tmMkXjB`
                    );
                });
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

        if (message.webhookId) {
            return; // Ignore webhook messages
        }

        if (!message.content.startsWith('!')) {
            return; // Ignore message that not start with !
        }

        log.info(
            `Got new message ${String(message.content)} from ${message.author.tag} (${String(message.author.id)})`
        );

        if (!this.bot.isReady) {
            this.sendAnswer(message, '🛑 The bot is still booting up, please wait');
            return;
        }

        try {
            if (!this.isDiscordAdmin(message.author.id)) {
                // Will return default invalid value
                const dummySteamID = new SteamID(null);
                dummySteamID.redirectAnswerTo = message;
                return await this.bot.handler.onMessage(dummySteamID, message.content);
            }

            const adminID = this.getAdminBy(message.author.id);
            adminID.redirectAnswerTo = message;
            await this.bot.handler.onMessage(adminID, message.content);
        } catch (err) {
            log.error(err);
            message.channel
                .send(`❌ Error:\n${JSON.stringify(err)}`)
                .catch(err => log.error('Failed to send error message to Discord:', err));
        }
    }

    private static reformat(message: string): string {
        if (message.startsWith('/code')) {
            return '```json\n' + message.slice(6) + '\n```';
        } else if (message.startsWith('/pre2')) {
            return '```\n' + message.slice(5) + '\n```';
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
        // https://github.com/TF2Autobot/tf2autobot-giveawaybot/blob/master/src/events/ready.ts
        log.info(
            `Logged in to Discord as ${String(this.client.user.tag)} to serve on ${
                this.client.guilds.cache.size
            } servers.`
        );
        this.client.user.setStatus('idle');

        // DM chats are not giving messageCreate until first usage. This thing fetches required DM chats.
        this.admins.forEach(admin => {
            this.client.users.createDM(admin.discordID).catch(err => {
                log.error('Failed to fetch DM channel with admin:', err);
            });
        });
    }

    setPresence(type: 'online' | 'halt'): void {
        const opt = this.bot.options.discordChat[type];

        this.client.user.setPresence({
            activities: [
                {
                    name: opt.name,
                    type:
                        typeof opt.type === 'string'
                            ? ActivityType[capitalizeFirstLetter(opt.type.toLowerCase())]
                            : opt.type
                }
            ],
            status: opt.status
        });
    }

    halt(): void {
        this.setPresence('halt');
    }

    unhalt(): void {
        this.setPresence('online');
    }

    isDiscordAdmin(discordID: Snowflake): boolean {
        return this.bot.getAdmins.some(admin => admin.discordID === discordID);
    }

    get admins(): SteamID[] {
        return this.bot.getAdmins.filter(admin => admin.discordID);
    }

    private getAdminBy(discordID: Snowflake): SteamID {
        // Intended to use with all checks made before. Throwing errors just to be sure.

        if (!this.isDiscordAdmin) {
            throw Error(`Admin with discordID ${discordID} was not found`);
        }

        const result = this.admins.filter(admin => admin.discordID == discordID);
        if (result.length > 1) {
            throw Error(`ADMINS contains more than one entry with discordID ${discordID}`);
        }
        return result[0];
    }
}

function capitalizeFirstLetter(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
