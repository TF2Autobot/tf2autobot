import { Client, ApplicationCommandType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { uptime } from '../lib/tools/time';
import Bot from './Bot';

export async function initSlashCommands(discordClient: Client, bot: Bot): Promise<void> {
    await discordClient.application.commands.set([
        {
            name: 'uptime',
            description: 'Show bot uptime',
            type: ApplicationCommandType.ChatInput
        },
        {
            name: 'links',
            description: "Get links to the bot's Steam, Backpack.tf, Rep.tf, and Trade offer URL",
            type: ApplicationCommandType.ChatInput
        }
    ]);

    discordClient.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.commandName.toLowerCase();

        if (command === 'uptime') {
            await interaction.reply({ content: uptime() });
        } else if (command === 'links') {
            const botSteamID = bot.client.steamID.getSteamID64();
            // https://discordjs.guide/interactions/buttons.html#building-and-sending-buttons
            const steam = new ButtonBuilder()
                .setLabel('Steam')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://steamcommunity.com/profiles/${botSteamID}`);

            const bptf = new ButtonBuilder()
                .setLabel('Backpack.tf')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://backpack.tf/u/${botSteamID}`);

            const reptf = new ButtonBuilder()
                .setLabel('Rep.tf')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://rep.tf/${botSteamID}`);

            const tradeOffer = new ButtonBuilder()
                .setLabel('Trade Offer')
                .setStyle(ButtonStyle.Link)
                .setURL(bot.tradeOfferUrl);

            const row = new ActionRowBuilder().addComponents([steam, bptf, reptf, tradeOffer]);

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            await interaction.reply({ content: '', components: [row] });
        }
    });
}
