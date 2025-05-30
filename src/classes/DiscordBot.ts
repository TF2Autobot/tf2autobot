/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */

import {
    Client,
    GatewayIntentBits,
    Message,
    DiscordAPIError,
    Snowflake,
    ActivityType,
    ApplicationCommandType,
    TextChannel
} from 'discord.js';
import log from '../lib/logger';
import Options from './Options';
import Bot from './Bot';
import SteamID from 'steamid';
import { uptime } from '../lib/tools/time';

export default class DiscordBot {
    readonly client: Client;

    private prefix = '!';

    private MAX_MESSAGE_LENGTH = 2000 - 2; // some characters are reserved

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
        /* eslint-disable */
        this.client.on('ready', this.onClientReady.bind(this));
        this.client.on('messageCreate', async message => this.onMessage(message));
        /* eslint-enable */
        this.prefix = this.bot.options.miscSettings?.prefixes?.discord ?? this.prefix;
    }

    public async start(): Promise<void> {
        try {
            await this.client.login(this.options.discordBotToken);
            await this.client.application.commands.set([
                {
                    name: 'uptime',
                    description: 'Show bot uptime',
                    type: ApplicationCommandType.ChatInput
                }
            ]);

            /* eslint-disable */
            this.client.on('interactionCreate', async interaction => {
                if (!interaction.isChatInputCommand()) return;

                if (interaction.commandName === 'uptime') {
                    await interaction.reply({ content: uptime() });
                }
            });
            /* eslint-enable */
        } catch (err) {
            const error = err as DiscordAPIError;

            if (error.code && error.code.toString() === 'TOKEN_INVALID') {
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
        void this.client.destroy();
    }

    public async onMessage(message: Message): Promise<void> {
        if (message.author === this.client.user) {
            return; // don't talk to myself
        }

        if (message.webhookId) {
            return; // Ignore webhook messages
        }

        if (!message.content.startsWith(this.prefix)) {
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
            (message.channel as TextChannel)
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

    public sendAnswer(origMessage: Message, messageToSend: string): void {
        messageToSend = messageToSend.trim();
        const formattedMessage = DiscordBot.reformat(messageToSend);

        if (messageToSend == formattedMessage) {
            const lines = messageToSend.split('\n');
            let partialMessage = '';
            for (let i = 0; i < lines.length; i += 1) {
                const line = lines[i];
                if (partialMessage.length + 1 + line.length <= this.MAX_MESSAGE_LENGTH) {
                    if (i == 0) {
                        partialMessage += line;
                    } else {
                        partialMessage += '\n' + line;
                    }
                } else {
                    this.sendMessage(origMessage, partialMessage);
                    partialMessage = line; // Error is still possible if any line is longer than limit
                }
            }
            this.sendMessage(origMessage, partialMessage);
        } else {
            this.sendMessage(origMessage, formattedMessage); // TODO: normal parsing of markup things
        }
    }

    private sendMessage(origMessage: Message, message: string): void {
        if (message.startsWith('\n')) {
            message = '.' + message;
        }
        if (message.endsWith('\n')) {
            message = message + '.';
        }

        (origMessage.channel as TextChannel)
            .send(message)
            .then(() => log.info(`Message sent to ${origMessage.author.tag} (${origMessage.author.id}): ${message}`))
            .catch((err: any) => log.error('Failed to send message to Discord:', err));
    }

    private async onClientReady() {
        // https://github.com/TF2Autobot/tf2autobot-giveawaybot/blob/master/src/events/ready.ts
        log.info(
            `Logged in to Discord as ${String(this.client.user.tag)} to serve on ${
                this.client.guilds.cache.size
            } servers.`
        );
        this.client.user.setStatus('idle');

        // I don't use try-catch here since the bot has to crash if something went wrong
        this.validateAdmins();

        // DM chats won't emit messageCreate until the first usage. This thing fetches required DM chats.
        for (const admin of this.admins) {
            const adminUser = await this.client.users.fetch(admin.discordID).catch(err => {
                log.error('Failed to fetch admin by id:', err);
            });
            if (adminUser && !adminUser.bot) {
                this.client.users.createDM(adminUser).catch(err => {
                    log.error('Failed to fetch DM channel with admin:', err);
                });
            }
        }
    }

    setPresence(type: 'online' | 'halt'): void {
        const opt = this.bot.options.discordChat[type];

        /* eslint-disable */
        this.client?.user?.setPresence({
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
        /* eslint-enable */
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

    private validateAdmins(): void {
        const uniqueAdmins = new Set<Snowflake>();
        this.admins.forEach(admin => {
            const discordID = admin.discordID;
            if (uniqueAdmins.has(discordID)) {
                throw Error(`ADMINS contains more than one entry with discordID ${discordID}`);
            }
            uniqueAdmins.add(discordID);
        });
    }

    private getAdminBy(discordID: Snowflake): SteamID {
        // Intended to use with all checks made before. Throwing errors just to be sure.

        if (!this.isDiscordAdmin(discordID)) {
            throw Error(`Admin with discordID ${discordID} was not found`);
        }

        const result = this.admins.filter(admin => admin.discordID === discordID);
        return result[0];
    }
}

function capitalizeFirstLetter(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
