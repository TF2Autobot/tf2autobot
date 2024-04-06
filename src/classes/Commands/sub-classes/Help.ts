import SteamID from 'steamid';
import * as timersPromises from 'timers/promises';
import Bot from '../../Bot';

export default class HelpCommands {
    constructor(private readonly bot: Bot) {
        this.bot = bot;
    }

    async helpCommand(steamID: SteamID, prefix: string): Promise<void> {
        const isAdmin = this.bot.isAdmin(steamID);
        const isCustomPricer = this.bot.pricelist.isUseCustomPricer;

        if (steamID instanceof SteamID && steamID.redirectAnswerTo && steamID.type === 0) {
            return this.bot.sendMessage(
                steamID,
                `\nDo not include characters <> nor [ ] - <> means required and [] means optional.` +
                    "\n\n📜 Here's a list of my commands:" +
                    '\n- ' +
                    [
                        `${prefix}help - Get a list of commands.`,
                        `how2trade - Guide on how to trade with the bot.`,
                        `links - Links to the bot's Steam, Backpack.tf, and Rep.tf.`,
                        `price [amount] <name> - Get the price and stock of an item.`,
                        `sku <Full Item Name|Item's sku> - Get the sku of an item.`,
                        `owner - Get the owner's Steam profile and Backpack.tf links.`,
                        `discord - Get a link to join TF2Autobot and/or the owner's discord server.`,
                        `more - Show more available commands list.`
                    ].join(`\n- ${prefix}`)
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
                          `how2trade - Guide on how to trade with the bot`,
                          `price [amount] <name> - Get the price and stock of an item 💲📦\n\n✨=== Instant item trade ===✨`,
                          `buy [amount] <name> - Instantly buy an item 💲`,
                          `sell [amount] <name> - Instantly sell an item 💲\n\n✨=== Multiple items trade ===✨`,
                          `buycart [amount] <name> - Add an item you want to buy to your cart 🛒`,
                          `sellcart [amount] <name> - Add an item you want to sell to your cart 🛒`,
                          `cart - View your cart 🛒`,
                          `clearcart - Clear your cart ❎🛒`,
                          `checkout - Have the bot send an offer with the items in your cart ✅🛒\n\n✨=== Trade actions ===✨`,
                          `cancel - Cancel the trade offer ❌`,
                          `queue - Check your position in the queue\n\n✨=== Contact Owner ===✨`,
                          `owner - Get the owner's Steam profile and Backpack.tf links`,
                          `message <your message> - Send a message to the owner of the bot 💬`,
                          `discord - Get a link to join TF2Autobot and/or the owner's discord server\n\n✨=== Other Commands ===✨`,
                          `more - Show the advanced commands list`
                      ].join(`\n- ${prefix}`)
            }`
        );

        if (isAdmin) {
            await timersPromises.setTimeout(2000);
            this.bot.sendMessage(
                steamID,
                '.\n✨=== Pricelist manager ===✨\n- ' +
                    [
                        `${prefix}sku <Full Item Name|Item's sku> - Get the sku of an item.`,
                        `add (sku|name|defindex|item|id)=<a>&[Listing-parameters] - Add a pricelist entry ➕`,
                        `addbulk (sku|item)=<a>&[Listing-parameters]<Enter (new line)><second and so on>... - Bulk add pricelist entries ➕➕➕`,
                        `autoadd [Listing-parameters] - Perform automatic adding items to the pricelist based on items that are currently` +
                            ` available in your bot inventory (about 2 seconds every item) 🤖`,
                        `stopautoadd - Stop automatic add items operation 🛑`,
                        `update (sku|name|defindex|item|id)=<a>&[Listing-parameters] - Update a pricelist entry 🔄`,
                        `updatebulk (sku|item)=<a>&[Listing-parameters]<Enter (new line)><second and so on>... - Bulk update pricelist entries 🔄🔄🔄`,
                        `remove (sku|name|defindex|item|id)=<a> - Remove a pricelist entry 🔥`,
                        `removebulk (sku|item)=<a><Enter (new line)><second and so on>... - Bulk remove pricelist entries 🔥🔥🔥`,
                        `get (sku|name|defindex|item|id)=<a> - Get raw information about a pricelist entry`,
                        `getAll [limit=<number>] - Get a list of all items exist in your pricelist. Set limit=-1 to show all`,
                        `find <Listing-parameters>=<value>[&limit=<value>] - Get the list of filtered items detail based on the parameters 🔍`,
                        `ppu [limit=<number>] - Get a list of items that is currently has Partial Price Update enabled`,
                        `getSlots or ${prefix}listings - Get current used listings slot per cap count.`,
                        `getSlots or !listings - Get current used listings slot per cap count.`,
                        `groups - Get a list of groups in your pricelist 📜`
                    ].join(`\n- ${prefix}`)
            );

            await timersPromises.setTimeout(2000);
            this.bot.sendMessage(
                steamID,
                '.\n✨=== Bot manager ===✨\n- ' +
                    [
                        `${prefix}deposit (sku|name|defindex)=<a>&amount=<number> - Deposit items.`,
                        `withdraw (sku|name|defindex)=<a>&amount=<number> - Withdraw items.`,
                        `withdrawAll [withgroup=<itemgroup>[&&max=<number>]] - Withdraw all items.`,
                        `withdrawMptf [max=<number>] - [Exclusive Marketplace.tf Sellers] Withdraw items that does not exist on Marketplace.tf Dashboard items.`,
                        `expand craftable=(true|false) - Use Backpack Expanders to increase the bot's inventory limit.`,
                        `use (sku|assetid)=<a> - Use an item (such as Gift-Stuffed Stocking 2020 - sku: 5923;6;untradable).`,
                        `delete (sku|assetid)=<a> - Delete an item from the bot's inventory (SKU input only) 🚮`,
                        `message <steamid> <your message> - Send a message to a specific user 💬`,
                        `block <steamid> [reason] - Block a specific user, reason will be saved for future reference.`,
                        `unblock <steamid> - Unblock a specific user.`,
                        `blockedList - Get a list of blocked SteamIDs (with reason if any).`,
                        `clearfriends - Clear friendlist (will keep admins and friendsToKeep) 👋`,
                        `stop - Stop the bot 🔴`,
                        `restart - Restart the bot 🔄`,
                        `updaterepo - Update your bot to the latest version (only if cloned and running with PM2)`,
                        `halt - Pause the trading ⏸ (disables listings, commands, most of trades). Admins are immune. Do not spam this.`,
                        `unhalt - Unpause the trading ▶ (enables listings, commands, trades). Do not spam this.`,
                        `haltstatus - Get the info whether the bot is paused or not ⏯`,
                        `refreshautokeys - Refresh the bot's autokeys settings  `,
                        `refreshlist - Refresh sell listings 🔄`,
                        `name <new_name> - Change the bot's name    `,
                        `avatar <image_URL> - Change the bot's avatar   `,
                        `donatebptf (sku|name|defindex)=<a>&amount=<integer> - Donate to backpack.tf (https://backpack.tf/donate) 💰`,
                        `premium months=<integer> - Purchase backpack.tf premium using keys (https://backpack.tf/premium/subscribe) 👑`,
                        `refreshSchema - Force refresh TF2 Schema when new update arrived (do not spam this).`
                    ].join(`\n- ${prefix}`)
            );

            await timersPromises.setTimeout(2000);
            this.bot.sendMessage(
                steamID,
                '.\n✨=== Crafting ===✨\n- ' +
                    [
                        `${prefix}craftToken <info|check> - Check the availability to craft tokens ℹ️🔨`,
                        `${prefix}craftToken <tokenName> <amount> - Craft Class or Slot Tokens 🔨`
                    ].join('\n- ')
            );

            await timersPromises.setTimeout(2000);
            this.bot.sendMessage(
                steamID,
                '.\n✨=== Bot status ===✨\n- ' +
                    [
                        `${prefix}stats - Get statistics for accepted trades 📊`,
                        `itemstats <item name|sku> - Get statistics for specific item (keys/weapons not supported) 📊`,
                        `wipestats - Wipe statistics for accepted trades 🔥`,
                        `statsdw - Send statistics to Discord Webhook 📊`,
                        `inventory - Get the bot's current inventory spaces     `,
                        `version - Get the TF2Autobot version that the bot is running`
                    ].join(`\n- ${prefix}`)
            );

            await timersPromises.setTimeout(2000);
            this.bot.sendMessage(
                steamID,
                '.\n✨=== Manual review ===✨\n- ' +
                    [
                        `${prefix}trades - Get a list of trade offers pending for manual review 🔍`,
                        `trade <offerID> - Get information about a trade`,
                        `offerinfo <offerID> - Get information about the offer from polldata 🔍`,
                        `accept <offerID> [Your Message] - Manually accept an active offer ✅🔍`,
                        `decline <offerID> [Your Message] - Manually decline an active offer ❌🔍`,
                        `faccept <offerID> [Your Message] - Force accept any failed to accept offer ✅🔂`,
                        `fdecline <offerID> [Your Message] - Force decline any failed to decline offer`
                    ].join(`\n- ${prefix}`)
            );

            await timersPromises.setTimeout(2000);
            this.bot.sendMessage(
                steamID,
                '.\n✨=== Request ===✨\n- ' +
                    [
                        `${prefix}check (sku|name|defindex)=<a> - Request the current price for an item from ${
                            isCustomPricer ? 'Custom Pricer' : 'Prices.TF'
                        }`,
                        `pricecheck (sku|name|defindex|item)=<a> - Request an item to be price checked by ${
                            isCustomPricer ? 'Custom Pricer' : 'Prices.TF'
                        }`,
                        `pricecheckall - Request all items in the bot's pricelist to be price checked by ${
                            isCustomPricer ? 'Custom Pricer' : 'Prices.TF'
                        }`
                    ].join(`\n- ${prefix}`)
            );

            await timersPromises.setTimeout(2000);
            this.bot.sendMessage(
                steamID,
                '.\n✨=== Configuration manager (options.json) ===✨\n- ' +
                    [
                        `${prefix}backup - Backup your pricelist.json file 🔧`,
                        `options <OptionsKey> - Get options.json content (current bot option settings) 🔧`,
                        `config <OptionsKey>=<value>[&OtherOptions] - Update the current options (example: ${prefix}config game.customName=Selling Tools${prefix}) 🔧`,
                        `clearArray <OptionsKey>=[] - Clear any array options (example: ${prefix}clearArray highValue.sheens=[]&highValue.painted=[]) 🔥📃`
                    ].join(`\n- ${prefix}`)
            );

            await timersPromises.setTimeout(2000);
            this.bot.sendMessage(
                steamID,
                '.\n✨=== Misc ===✨\n- ' +
                    [
                        `${prefix}autokeys - Get info on the bot's current autokeys settings 🔑`,
                        `time - Show the owner's current time 🕥`,
                        `uptime - Show the bot uptime 🔌`,
                        `pure - Get the bot's current pure stock 💰`,
                        `rate - Get the bot's current key rates 🔑`,
                        `stock [sku|item name] - Get a list of items that the bot owns`,
                        `craftweapon - Get a list of the bot's craftable weapon stock 🔫`,
                        `uncraftweapon - Get a list of the bot's uncraftable weapon stock 🔫`,
                        `paints - Get a list of paints partial sku 🎨`
                    ].join(`\n- ${prefix}`)
            );
        }
    }

    moreCommand(steamID: SteamID, prefix: string): void {
        const opt = this.bot.options.commands.more;

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
                `time - Show the owner's current time 🕥`,
                `uptime - Show the bot uptime 🔌`,
                `pure - Get the bot's current pure stock 💰`,
                `rate - Get the bot's current key rates 🔑`,
                `stock [sku|item name] - Get a list of items that the bot owns`,
                `craftweapon - Get a list of the bot's craftable weapon stock 🔫`,
                `uncraftweapon - Get a list of the bot's uncraftable weapon stock 🔫`
            ].join(`\n- ${prefix}`)}`
        );
    }

    howToTradeCommand(steamID: SteamID, prefix: string): void {
        const custom = this.bot.options.commands.how2trade.customReply.reply;
        this.bot.sendMessage(
            steamID,
            custom
                ? custom
                : '/quote You can either send me an offer yourself, or use one of my commands to request a trade. ' +
                      `Say you want to buy a Team Captain, just type "${prefix}buy Team Captain", if want to buy more, ` +
                      `just add the [amount] - "${prefix}buy 2 Team Captain". Type "${prefix}help" for all the commands.` +
                      `\nYou can also buy or sell multiple items by using the "${prefix}buycart [amount] <item name>" or ` +
                      `"${prefix}sellcart [amount] <item name>" commands.`
        );
    }
}
