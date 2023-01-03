import SteamID from 'steamid';
import * as timersPromises from 'timers/promises';
import Bot from '../../Bot';

export default class HelpCommands {
    constructor(private readonly bot: Bot) {
        this.bot = bot;
    }

    async helpCommand(steamID: SteamID): Promise<void> {
        const isAdmin = this.bot.isAdmin(steamID);
        const isCustomPricer = this.bot.pricelist.isUseCustomPricer;
        const prefix = this.bot.getPrefix(steamID);

        if (steamID instanceof SteamID && steamID.redirectAnswerTo && steamID.type === 0) {
            return this.bot.sendMessage(
                steamID,
                `\nDo not include characters <> nor [ ] - <> means required and [] means optional.` +
                    "\n\n📜 Here's a list of my commands:" +
                    '\n- ' +
                    [
                        `${prefix}help - Get a list of commands.`,
                        `${prefix}how2trade - Guide on how to trade with the bot.`,
                        `${prefix}links - Links to the bot's Steam, Backpack.tf, and Rep.tf.`,
                        `${prefix}price [amount] <name> - Get the price and stock of an item.`,
                        `${prefix}sku <Full Item Name|Item's sku> - Get the sku of an item.`,
                        `${prefix}owner - Get the owner's Steam profile and Backpack.tf links.`,
                        `${prefix}discord - Get a link to join TF2Autobot and/or the owner's discord server.`,
                        `${prefix}more - Show more available commands list.`
                    ].join('\n- ')
            );
        }

        this.bot.sendMessage(
            steamID,
            `📌 Note 📌${
                isAdmin
                    ? '\n• a = Directly add "a"' +
                      '\n• [a] = Optionally add "a"' +
                      '\n• (a|b) = Directly input "a" OR "b"' +
                      '\n• <a> = Replace "a" with relevant content' +
                      '\n\nDo not include characters <>, ( | ) nor [ ] when typing it. For more info, please refer' +
                      ' to the wiki: https://github.com/TF2Autobot/tf2autobot/wiki/What-is-the-pricelist#table-of-contents'
                    : `\nDo not include characters <> nor [ ] - <> means required and [] means optional.`
            }\n\n📜 Here's a list of my commands:${
                isAdmin
                    ? ''
                    : '\n- ' +
                      [
                          `${prefix}help - Get a list of commands`,
                          `${prefix}how2trade - Guide on how to trade with the bot`,
                          `${prefix}price [amount] <name> - Get the price and stock of an item 💲📦\n\n✨=== Instant item trade ===✨`,
                          `${prefix}buy [amount] <name> - Instantly buy an item 💲`,
                          `${prefix}sell [amount] <name> - Instantly sell an item 💲\n\n✨=== Multiple items trade ===✨`,
                          `${prefix}buycart [amount] <name> - Add an item you want to buy to your cart 🛒`,
                          `${prefix}sellcart [amount] <name> - Add an item you want to sell to your cart 🛒`,
                          `${prefix}cart - View your cart 🛒`,
                          `${prefix}clearcart - Clear your cart ❎🛒`,
                          `${prefix}checkout - Have the bot send an offer with the items in your cart ✅🛒\n\n✨=== Trade actions ===✨`,
                          `${prefix}cancel - Cancel the trade offer ❌`,
                          `${prefix}queue - Check your position in the queue\n\n✨=== Contact Owner ===✨`,
                          `${prefix}owner - Get the owner's Steam profile and Backpack.tf links`,
                          `${prefix}message <your message> - Send a message to the owner of the bot 💬`,
                          `${prefix}discord - Get a link to join TF2Autobot and/or the owner's discord server\n\n✨=== Other Commands ===✨`,
                          `${prefix}more - Show the advanced commands list`
                      ].join('\n- ')
            }`
        );

        if (isAdmin) {
            await timersPromises.setTimeout(2000);
            this.bot.sendMessage(
                steamID,
                '.\n✨=== Pricelist manager ===✨\n- ' +
                    [
                        `${prefix}sku <Full Item Name|Item's sku> - Get the sku of an item.`,
                        `${prefix}add (sku|name|defindex|item|id)=<a>&[Listing-parameters] - Add a pricelist entry ➕`,
                        `${prefix}addbulk (sku|item)=<a>&[Listing-parameters]<Enter (new line)><second and so on>... - Bulk add pricelist entries ➕➕➕`,
                        `${prefix}autoadd [Listing-parameters] - Perform automatic adding items to the pricelist based on items that are currently` +
                            ` available in your bot inventory (about 2 seconds every item) 🤖`,
                        `${prefix}stopautoadd - Stop automatic add items operation 🛑`,
                        `${prefix}update (sku|name|defindex|item|id)=<a>&[Listing-parameters] - Update a pricelist entry 🔄`,
                        `${prefix}updatebulk (sku|item)=<a>&[Listing-parameters]<Enter (new line)><second and so on>... - Bulk update pricelist entries 🔄🔄🔄`,
                        `${prefix}remove (sku|name|defindex|item|id)=<a> - Remove a pricelist entry 🔥`,
                        `${prefix}removebulk (sku|item)=<a><Enter (new line)><second and so on>... - Bulk remove pricelist entries 🔥🔥🔥`,
                        `${prefix}get (sku|name|defindex|item|id)=<a> - Get raw information about a pricelist entry`,
                        `${prefix}getAll [limit=<number>] - Get a list of all items exist in your pricelist. Set limit=-1 to show all`,
                        `${prefix}find <Listing-parameters>=<value>[&limit=<value>] - Get the list of filtered items detail based on the parameters 🔍`,
                        `${prefix}ppu [limit=<number>] - Get a list of items that is currently has Partial Price Update enabled`,
                        `${prefix}getSlots or ${prefix}listings - Get current used listings slot per cap count.`,
                        `${prefix}getSlots or !listings - Get current used listings slot per cap count.`,
                        `${prefix}groups - Get a list of groups in your pricelist 📜`
                    ].join('\n- ')
            );

            await timersPromises.setTimeout(2000);
            this.bot.sendMessage(
                steamID,
                '.\n✨=== Bot manager ===✨\n- ' +
                    [
                        `${prefix}deposit (sku|name|defindex)=<a>&amount=<number> - Deposit items.`,
                        `${prefix}withdraw (sku|name|defindex)=<a>&amount=<number> - Withdraw items.`,
                        `${prefix}withdrawMptf [max=<number>] - [Exclusive Marketplace.tf Sellers] Withdraw items that does not exist on Marketplace.tf Dashboard items.`,
                        `${prefix}expand craftable=(true|false) - Use Backpack Expanders to increase the bot's inventory limit.`,
                        `${prefix}use (sku|assetid)=<a> - Use an item (such as Gift-Stuffed Stocking 2020 - sku: 5923;6;untradable).`,
                        `${prefix}delete (sku|assetid)=<a> - Delete an item from the bot's inventory (SKU input only) 🚮`,
                        `${prefix}message <steamid> <your message> - Send a message to a specific user 💬`,
                        `${prefix}block <steamid> [reason] - Block a specific user, reason will be saved for future reference.`,
                        `${prefix}unblock <steamid> - Unblock a specific user.`,
                        `${prefix}blockedList - Get a list of blocked SteamIDs (with reason if any).`,
                        `${prefix}clearfriends - Clear friendlist (will keep admins and friendsToKeep) 👋`,
                        `${prefix}stop - Stop the bot 🔴`,
                        `${prefix}restart - Restart the bot 🔄`,
                        `${prefix}updaterepo - Update your bot to the latest version (only if cloned and running with PM2)`,
                        `${prefix}halt - Pause the trading ⏸ (disables listings, commands, most of trades). Admins are immune. Do not spam this.`,
                        `${prefix}unhalt - Unpause the trading ▶ (enables listings, commands, trades). Do not spam this.`,
                        `${prefix}haltstatus - Get the info whether the bot is paused or not ⏯`,
                        `${prefix}refreshautokeys - Refresh the bot's autokeys settings  `,
                        `${prefix}refreshlist - Refresh sell listings 🔄`,
                        `${prefix}name <new_name> - Change the bot's name    `,
                        `${prefix}avatar <image_URL> - Change the bot's avatar   `,
                        `${prefix}donatebptf (sku|name|defindex)=<a>&amount=<integer> - Donate to backpack.tf (https://backpack.tf/donate) 💰`,
                        `${prefix}premium months=<integer> - Purchase backpack.tf premium using keys (https://backpack.tf/premium/subscribe) 👑`,
                        `${prefix}refreshSchema - Force refresh TF2 Schema when new update arrived (do not spam this).`
                    ].join('\n- ')
            );

            await timersPromises.setTimeout(2000);
            this.bot.sendMessage(
                steamID,
                '.\n✨=== Crafting ===✨\n- ' +
                    [
                        `${prefix}craftToken <info|check> - Check the availability to craft tokens ℹ️🔨`,
                        `${prefix}craftToken <tokenType> <subTokenType> <amount> - Craft Class or Slot Tokens 🔨`
                    ].join('\n- ')
            );

            await timersPromises.setTimeout(2000);
            this.bot.sendMessage(
                steamID,
                '.\n✨=== Bot status ===✨\n- ' +
                    [
                        `${prefix}stats - Get statistics for accepted trades 📊`,
                        `${prefix}itemstats <item name|sku> - Get statistics for specific item (keys/weapons not supported) 📊`,
                        `${prefix}wipestats - Wipe statistics for accepted trades 🔥`,
                        `${prefix}statsdw - Send statistics to Discord Webhook 📊`,
                        `${prefix}inventory - Get the bot's current inventory spaces     `,
                        `${prefix}version - Get the TF2Autobot version that the bot is running`
                    ].join('\n- ')
            );

            await timersPromises.setTimeout(2000);
            this.bot.sendMessage(
                steamID,
                '.\n✨=== Manual review ===✨\n- ' +
                    [
                        `${prefix}trades - Get a list of trade offers pending for manual review 🔍`,
                        `${prefix}trade <offerID> - Get information about a trade`,
                        `${prefix}offerinfo <offerID> - Get information about the offer from polldata 🔍`,
                        `${prefix}accept <offerID> [Your Message] - Manually accept an active offer ✅🔍`,
                        `${prefix}decline <offerID> [Your Message] - Manually decline an active offer ❌🔍`,
                        `${prefix}faccept <offerID> [Your Message] - Force accept any failed to accept offer ✅🔂`,
                        `${prefix}fdecline <offerID> [Your Message] - Force decline any failed to decline offer`
                    ].join('\n- ')
            );

            await timersPromises.setTimeout(2000);
            this.bot.sendMessage(
                steamID,
                '.\n✨=== Request ===✨\n- ' +
                    [
                        `${prefix}check (sku|name|defindex)=<a> - Request the current price for an item from ${
                            isCustomPricer ? 'Custom Pricer' : 'Prices.TF'
                        }`,
                        `${prefix}pricecheck (sku|name|defindex|item)=<a> - Request an item to be price checked by ${
                            isCustomPricer ? 'Custom Pricer' : 'Prices.TF'
                        }`,
                        `${prefix}pricecheckall - Request all items in the bot's pricelist to be price checked by ${
                            isCustomPricer ? 'Custom Pricer' : 'Prices.TF'
                        }`
                    ].join('\n- ')
            );

            await timersPromises.setTimeout(2000);
            this.bot.sendMessage(
                steamID,
                '.\n✨=== Configuration manager (options.json) ===✨\n- ' +
                    [
                        `${prefix}backup - Backup your pricelist.json file 🔧`,
                        `${prefix}options <OptionsKey> - Get options.json content (current bot option settings) 🔧`,
                        `${prefix}config <OptionsKey>=<value>[&OtherOptions] - Update the current options (example: ${prefix}config game.customName=Selling Tools${prefix}) 🔧`,
                        `${prefix}clearArray <OptionsKey>=[] - Clear any array options (example: ${prefix}clearArray highValue.sheens=[]&highValue.painted=[]) 🔥📃`
                    ].join('\n- ')
            );

            await timersPromises.setTimeout(2000);
            this.bot.sendMessage(
                steamID,
                '.\n✨=== Misc ===✨\n- ' +
                    [
                        `${prefix}autokeys - Get info on the bot's current autokeys settings 🔑`,
                        `${prefix}time - Show the owner's current time 🕥`,
                        `${prefix}uptime - Show the bot uptime 🔌`,
                        `${prefix}pure - Get the bot's current pure stock 💰`,
                        `${prefix}rate - Get the bot's current key rates 🔑`,
                        `${prefix}stock [sku|item name] - Get a list of items that the bot owns`,
                        `${prefix}craftweapon - Get a list of the bot's craftable weapon stock 🔫`,
                        `${prefix}uncraftweapon - Get a list of the bot's uncraftable weapon stock 🔫`,
                        `${prefix}paints - Get a list of paints partial sku 🎨`
                    ].join('\n- ')
            );
        }
    }

    moreCommand(steamID: SteamID): void {
        const opt = this.bot.options.commands.more;
        const prefix = this.bot.getPrefix(steamID);

        if (!opt.enable) {
            if (!this.bot.isAdmin(steamID)) {
                const custom = opt.customReply.disabled;
                return this.bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            }
        }

        this.bot.sendMessage(
            steamID,
            `Misc commands list:\n- ${[
                `${prefix}autokeys - Get info on the bot's current autokeys settings 🔑`,
                `${prefix}time - Show the owner's current time 🕥`,
                `${prefix}uptime - Show the bot uptime 🔌`,
                `${prefix}pure - Get the bot's current pure stock 💰`,
                `${prefix}rate - Get the bot's current key rates 🔑`,
                `${prefix}stock [sku|item name] - Get a list of items that the bot owns`,
                `${prefix}craftweapon - Get a list of the bot's craftable weapon stock 🔫`,
                `${prefix}uncraftweapon - Get a list of the bot's uncraftable weapon stock 🔫`
            ].join('\n- ')}`
        );
    }

    howToTradeCommand(steamID: SteamID): void {
        const custom = this.bot.options.commands.how2trade.customReply.reply;

        this.bot.sendMessage(
            steamID,
            custom
                ? custom
                : '/quote You can either send me an offer yourself, or use one of my commands to request a trade. ' +
                      'Say you want to buy a Team Captain, just type "${prefix}buy Team Captain", if want to buy more, ' +
                      'just add the [amount] - "${prefix}buy 2 Team Captain". Type "${prefix}help" for all the commands.' +
                      '\nYou can also buy or sell multiple items by using the "${prefix}buycart [amount] <item name>" or ' +
                      '"${prefix}sellcart [amount] <item name>" commands.'
        );
    }
}
