import SteamID from 'steamid';
import Bot from '../../Bot';

const COMMANDS: string[] = [
    '!help - Get a list of commands',
    '!how2trade - Guide on how to trade with the bot',
    '!price [amount] <name> - Get the price and stock of an item 💲📦\n\n✨=== Instant item trade ===✨',
    '!buy [amount] <name> - Instantly buy an item 💲',
    '!sell [amount] <name> - Instantly sell an item 💲\n\n✨=== Multiple items trade ===✨',
    '!buycart [amount] <name> - Add an item you want to buy to your cart 🛒',
    '!sellcart [amount] <name> - Add an item you want to sell to your cart 🛒',
    '!cart - View your cart 🛒',
    '!clearcart - Clear your cart ❎🛒',
    '!checkout - Have the bot send an offer with the items in your cart ✅🛒\n\n✨=== Trade actions ===✨',
    '!cancel - Cancel the trade offer ❌',
    '!queue - Check your position in the queue\n\n✨=== Contact Owner ===✨',
    "!owner - Get the owner's Steam profile and Backpack.tf links",
    '!message <your message> - Send a message to the owner of the bot 💬',
    "!discord - Get a link to join TF2Autobot and/or the owner's discord server\n\n✨=== Other Commands ===✨",
    '!more - Show the advanced commands list'
];

const MORE: string[] = [
    "!autokeys - Get info on the bot's current autokeys settings 🔑",
    "!time - Show the owner's current time 🕥",
    '!uptime - Show the bot uptime 🔌',
    "!pure - Get the bot's current pure stock 💰",
    "!rate - Get the bot's current key rates 🔑",
    '!stock - Get a list of items that the bot owns',
    "!craftweapon - Get a list of the bot's craftable weapon stock 🔫",
    "!uncraftweapon - Get a list of the bot's uncraftable weapon stock 🔫"
];

const ADMIN_COMMANDS: string[] = [
    '!deposit (sku|name|defindex)=<a>&amount=<number> - Deposit items',
    '!withdraw (sku|name|defindex)=<a>&amount=<number> - Withdraw items\n\n✨=== Pricelist manager ===✨',
    '!add (sku|name|defindex)=<a>&[Listing-parameters] - Add a pricelist entry ➕',
    '!update (sku|name|defindex|item)=<a>&[Listing-parameters] - Update a pricelist entry',
    '!remove (sku|name|defindex|item)=<a> - Remove a pricelist entry ➖',
    '!shuffle - Shuffle pricelist entries.',
    '!get (sku|name|defindex|item)=<a> - Get raw information about a pricelist entry\n\n✨=== Bot manager ===✨',
    "!expand craftable=(true|false) - Use Backpack Expanders to increase the bot's inventory limit",
    '!use (sku|assetid)=<a> - Use an item (such as Gift-Stuffed Stocking 2020 - sku: 5923;6;untradable)',
    "!delete (sku|assetid)=<a> - Delete an item from the bot's inventory (SKU input only) 🚮",
    '!message <steamid> <your message> - Send a message to a specific user 💬',
    '!block <steamid> - Block a specific user',
    '!unblock <steamid> - Unblock a specific user',
    '!stop - Stop the bot 🔴',
    '!restart - Restart the bot 🔄',
    "!refreshautokeys - Refresh the bot's autokeys settings.",
    '!refreshlist - Refresh sell listings 🔄',
    "!name <new_name> - Change the bot's name",
    "!avatar <image_URL> - Change the bot's avatar",
    '!resetqueue - Reset the queue position to 0\n\n✨=== Bot status ===✨',
    '!stats - Get statistics for accepted trades 📊',
    "!inventory - Get the bot's current inventory spaces 🎒",
    '!version - Get the TF2Autobot version that the bot is running\n\n✨=== Manual review ===✨',
    '!trades - Get a list of trade offers pending for manual review 🔍',
    '!trade <offerID> - Get information about a trade',
    '!accept <offerID> [Your Message] - Manually accept an active offer ✅🔍',
    '!decline <offerID> [Your Message] - Manually decline an active offer ❌🔍\n\n✨=== Request ===✨',
    '!check (sku|name|defindex)=<a> - Request the current price for an item from Prices.TF',
    '!pricecheck (sku|name|defindex|item)=<a> - Request an item to be price checked by Prices.TF',
    "!pricecheckall - Request all items in the bot's pricelist to be price checked by Prices.TF\n\n✨=== Misc ===✨",
    "!autokeys - Get info on the bot's current autokeys settings 🔑",
    "!time - Show the owner's current time 🕥",
    '!uptime - Show the bot uptime 🔌',
    "!pure - Get the bot's current pure stock 💰",
    "!rate - Get the bot's current key rates 🔑",
    '!stock - Get a list of items that the bot owns',
    "!craftweapon - Get a list of the bot's craftable weapon stock 🔫",
    "!uncraftweapon - Get a list of the bot's uncraftable weapon stock 🔫",
    '!sales (sku|name|defindex)=<a> - Get the sales history for an item 🔍',
    '!find <Listing-parameters> - Get the list of filtered items detail based on the parameters 🔍',
    '!options - Get options.json content (current bot option settings) 🔧',
    '!config <Options>=<value>[&OtherOptions] - Update the current options (example: !config game.customName=Selling Tools!) 🔧',
    '!donatebptf (sku|name|defindex)=<a>&amount=<integer> - Donate to backpack.tf (https://backpack.tf/donate) 💰',
    '!premium months=<integer> - Purchase backpack.tf premium using keys (https://backpack.tf/premium/subscribe) 👑'
];

export function helpCommand(steamID: SteamID, bot: Bot): void {
    const isAdmin = bot.isAdmin(steamID);
    bot.sendMessage(
        steamID,
        `📌 Note 📌${
            isAdmin
                ? '\n• a = Directly add "a"' +
                  '\n• [a] = Optionally add "a"' +
                  '\n• (a|b) = Directly input "a" OR "b"' +
                  '\n• <a> = Replace "a" with relevant content' +
                  '\n\nDo not include characters <>, ( | ) nor [ ] when typing it. For more info, please refer to the wiki: https://github.com/idinium96/tf2autobot/wiki/What-is-the-pricelist%3F#table-of-contents'
                : `\nDo not include characters <> nor [ ] - <> means required and [] means optional.`
        }\n\n📜 Here's a list of my commands:\n- ${isAdmin ? ADMIN_COMMANDS.join('\n- ') : COMMANDS.join('\n- ')}`
    );
}

export function moreCommand(steamID: SteamID, bot: Bot): void {
    bot.sendMessage(steamID, `Advanced commands list:\n- ${MORE.join('\n- ')}`);
}

export function howToTradeCommand(steamID: SteamID, bot: Bot): void {
    bot.sendMessage(
        steamID,
        bot.options.customMessage.how2trade
            ? bot.options.customMessage.how2trade
            : '/quote You can either send me an offer yourself, or use one of my commands to request a trade. Say you want to buy a Team Captain, just type "!buy Team Captain", if want to buy more, just add the [amount] - "!buy 2 Team Captain". Type "!help" for all the commands.' +
                  '\nYou can also buy or sell multiple items by using the "!buycart [amount] <item name>" or "!sellcart [amount] <item name>" commands.'
    );
}
