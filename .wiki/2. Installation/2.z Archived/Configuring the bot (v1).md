Now that you have downloaded and installed the bot you can start configuring your bot.

First, we will setup the environment file, which you will use to configure the bot to your needs.

# Environment File and Environment Variables
## Windows Setup
For Windows, the bot is configured through environment variables that can be set using a file (`.env`) that the bot reads when it starts.

**Please ensure that you have file extension viewing enabled in your Windows settings prior to continuing (click [here](https://www.howtogeek.com/205086/beginner-how-to-make-windows-show-file-extensions/) for more information).**

Modify the [template.env](https://github.com/idinium96/tf2autobot/blob/master/template.env) file found in your `tf2autobot/` folder, renaming it to `.env` (yes, only a dot (`.`) and a word `env`). This file will be the file you edit when you want to configure your bot, using the below variables.

## Linux Setup
For Linux, the bot is configured through environment variables that can be set using a file (`ecosystem.json`) that the bot reads when it starts.

Modify the [template.ecosystem.json](https://github.com/idinium96/tf2autobot/blob/master/template.ecosystem.json) file found in your `tf2autobot/` folder, renaming it to `ecosystem.json`. This file will be the file you edit when you want to configure your bot, using the below variables.


***


# Required Variables

To be able to start the bot, you need to set a few compulsory variables. **All of the variables in this section must be set or your bot will not run!**

If you have followed the [Before You Start](https://github.com/idinium96/tf2autobot/wiki/Before-you-start) section of the guide, you should already have your `STEAM_SHARED_SECRET` and `STEAM_IDENTITY_SECRET` on-hand.

## Bot Credentials

|        Variable       |   Type   | Description |
| :-------------------: | :------: | ----------- |
| `STEAM_ACCOUNT_NAME`  | `string` | The Steam account username of your bot account                                                                                                                                                     
| `STEAM_PASSWORD`      | `string` | The Steam account password of your bot account                                                                                                                                                                                                                                                                        
| `STEAM_SHARED_SECRET` | `string` | You can find this in the `<yourBotSteamID>.maFile` file inside the `/SDA/maFiles/` folder. Open the file using notepad and search for your `shared_secret`. An example of what that may look like is `"shared_secret": "agdgwegdgawfagxafagfkagusbuigiuefh=="` . |
| `STEAM_IDENTITY_SECRET` | `string` | Same as above (but now search for `identity_secret`). |                                                                                                                    

**Question: Where can I obtain the above secrets?**

Answer: You need to activate Steam Guard for your bot account using [Steam Desktop Authenticator](https://github.com/Jessecar96/SteamDesktopAuthenticator). This application can be setup on your desktop, and does not need to be setup on the system running the bot. Once SDA is fully setup, all you will need to do is transfer the secrets as described above.

## Backpack.tf User Token and API Key

If you have followed the [Before You Start](https://github.com/idinium96/tf2autobot/wiki/Before-you-start) section of the guide, you should already have your `BPTF_ACCESS_TOKEN` and `BPTF_API_KEY` on-hand.

You are able to run your bot without the User Token and API Key initially. On the first run, your bot will print out your backpack.tf User Token and API Key. You'll need to copy and paste these into your `ecosystem.json` (on Linux) or `.env` file (on Windows). Please [see this image](https://cdn.discordapp.com/attachments/697415702637838366/697820077248086126/bptf-api-token.png) for more information. 

After obtaining your backpack.tf User Token and API Key, update the following variables in your configuration file:

|      Variable       |   Type   | Description |                                                                                                                                      
| :-----------------: | :------: | ----------- |
| `BPTF_ACCESS_TOKEN` | `string` | Your bot's backpack.tf User Token |                                                        
| `BPTF_API_KEY`      | `string` | Your bot's backpack.tf API Key |

**Question: Where can I obtain the above token/key if I am obtaining them manually from backpack.tf?**

Answer:
* User Token: While logged into backpack.tf as your bot account go to https://backpack.tf/connections and click `Show Token` under "User Token".
* API Key: While still logged into backpack.tf as your bot account go to https://backpack.tf/developer/apikey/view - fill in the following for the "site URL" `http://localhost:4566/tasks` and the following for "comments" `Check if a user is banned on backpack.tf`.

## Owners' Details and Other Required Variables
| Variable | Type | Default | Description |                                                                                                                                                                                                                            
| :------: | :--: | :-----: | ----------- |
| `ADMINS` | `string[]` | `[""]` | The SteamID64 of your primary account (not your bot). Example: `["76561198013127982"]`. If you would like to have multiple admins, you can do the following: `["76561198013127982", "76561198077208792"]`. Any accounts in this list are designated as an admin/owner.                                                                                            
|  `KEEP`  | `string[]` | `[""]` | The **same list** as `ADMINS`, **you must fill in BOTH**. Any accounts in this will not be removed from the bot's friends list in the event that its friends list is full.
| `GROUPS` | `string[]` | `["103582791464047777", "103582791462300957"]` | Default groups are [tf2-automatic](https://steamcommunity.com/groups/tf2automatic) and [IdiNium's Trading Bot](https://steamcommunity.com/groups/IdiNiumNetwork) groups. If you have a Steam group, [find your group ID](https://user-images.githubusercontent.com/47635037/97783524-53a05d00-1bd3-11eb-9778-e92545f2de1e.gif) and paste it here. The bot will automatically invite new trade partners to all groups in this list (by group ID). |
| `ALERTS` | `string[]` | `["trade"]` | By default your bot will send a message/discord webhook every time a successful trade is made. Another option is `["none"]`. |

**Please ensure you fill in all of the above variables.** In the templates, you can see the value for `ADMINS` and `KEEP` are `["<your steamid 64>"]` and `["<steamid of person to keep in friendslist>"]`, respectively. Ensure that `<your steamid 64>` contains **YOUR STEAMID64**, and that `<steamid of person to keep in friendslist>` contains the SteamID64 of anyone you don't want removed from the bot's friendslist.

**Question: Where can I obtain a player's SteamID64?**

Answer: You can find your SteamID64 by pasting your Steam Profile URL link to [SteamRep.com](https://steamrep.com/). Please view the gif below for more information.

![How to get SteamID64](https://user-images.githubusercontent.com/47635037/96715154-be80b580-13d5-11eb-9bd5-39613f600f6d.gif)

# Other Environment Variables (Optional)

**Table of Contents**
- [Metal Crafting Settings](#metal-crafting-settings)
- [Autokeys Settings](#autokeys-settings)
- [Miscellaneous Settings](#miscellaneous-settings)
- [High Value Item Settings](#high-value-item-settings)
- [Normalization Settings](#normalization-settings)
- [Trade Statistic Settings](#trade-statistic-settings)
- [Duplicated Unusual Settings](#duplicated-unusual-settings)
- [Bot Profile Settings](#bot-profile-settings)
- [Timezone Settings](#timezone-settings)
- [Trade Bypass Settings](#trade-bypass-settings)
- [Auto-Price Update Settings](#auto-price-update-settings)
- [Custom Offer Message Settings](#custom-offer-message-settings)
- [Escrow, Metal Overpay, Banned Check](#set-to-true-if-want-to-allow)
- [Debug Mode](#set-to-true-if-want-to-enable-debugging-notes-in-console)
- [Backpack.tf Buy/Sell Order Listing Note](#backpacktf-sell-or-buy-order-listings-note-on-all-items-in-pricelist)
- [Discord Server Invite Link](#discord-server-invite-link)
- [Discord Webhook Configuration](#discord-webhook-configuration)
- [Manual Review Configuration](#manual-review-configuration)
- [Other Configuration Items](#other-configuration-items)

## Backpack.tf Autobump (re-list)

| Variable | Type | Default | Description |
| :------: | :--: | :-----: | ----------- |
| `AUTOBUMP` | `boolean` | `false` | If set to `true`, your bot will re-list all listings every 30 minutes. **NOTE: DEPRECATED** - Please consider donating to Backpack.tf or purchase Backpack.tf Premium to enable automatic listing bumping. More information here: https://backpack.tf/premium/subscribe |

## Metal Crafting Settings
| Variable | Type | Default | Description |
| :------: | :--: | :-----: | ----------- |
| `MINIMUM_SCRAP` | `integer` | `9` | If your bot has less scrap metal than this amount, it will smelt down reclaimed metal to maintain ample scrap metal supply. |
| `MINIMUM_RECLAIMED` | `integer` | `9` | If your bot has less reclaimed metal than this amount, it will smelt down refined metal to maintain ample reclaimed metal supply. |
| `METAL_THRESHOLD` | `integer` | `9` | If the bot's scrap/reclaimed metal count has reached the minimum amount, and scrap/metal count has reached this threshold (max), it will combine the metal into the next highest denomination. |
| `DISABLE_CRAFTING_ METAL` | `boolean` | `false` | Setting this to `true` will disable metal crafting entirely. This may cause your bot and the trade partner to not be able to trade because of missing scrap/reclaimed. **SETTING THIS TO TRUE IS NOT RECOMMENDED!** |
| `DISABLE_CRAFTING_ WEAPONS` | `boolean` | `false` | Setting this to to `true` will prevent your bot from automatically crafting any duplicated/class-matched craftable weapons into scrap. The pricelist takes priority over this config item. That is to say, if a craft weapon is in the pricelist, it will not be crafted into scrap. **SETTING THIS TO TRUE IS NOT RECOMMENDED!** |
| `ENABLE_SHOW_ONLY_METAL` | `boolean` | `true` | If this is set to `false`, the bot will show all prices in the format of `[x keys, y ref]`. Example: `(5 keys, 10 ref)`. If this is set to `true` the bot will instead show all prices in the format of `[x ref]`. Example: `(260 ref)`. |

## Autokeys Settings
| Variable | Type | Default | Description |
| :------: | :--: | :-----: | ----------- |
| `ENABLE_AUTOKEYS` | `boolean` | `false` | If set to `true`, your bot will automatically buy/sell keys based on the availability of the refined metals and keys in your bot inventory. This is done in an effort to ensure that your bot has enough pure metal to perform trades. |
|`ENABLE_AUTOKEYS_BANKING` | `boolean` | `false` | If set to `true`, your bot will bank (buy and sell) keys. If your bot's current refined supply is between `min` and `max` and `keys > min`, it will bank keys. **`ENABLE_AUTOKEYS` must be set to `true` to enable this option.** |
| `MINIMUM_KEYS` | `integer`  | `3` | When the bot's current stock of keys is **greater than** `minimum keys`, and the bot's current stock of refined metal is **less than** `minimum ref`, the bot will start selling keys in order to convert keys into metal. Otherwise, the bot will not sell keys. |
| `MAXIMUM_KEYS` | `integer` | `15` | When the bot's current stock of keys is **less than** `maximum keys`, and the bot's current stock of refined metal is **greater than** `maximum ref`, the bot will start buying keys in order to convert metal into keys. Otherwise, the bot will not buy keys. |
| `MINIMUM_REFINED_TO_START_SELL_KEYS` | `integer`  | `30` | The minimum number of refined the bot can have before it begins selling keys (to turn keys into metal). See `MINIMUM_KEYS` for more information. |
| `MAXIMUM_REFINED_TO_STOP_SELL_KEYS`  | `integer`  |  `150`  | The maximum number of refined the bot can have before it begins buying keys (to turn metal into keys). See `MAXIMUM_KEYS` for more information. |
| `DISABLE_SCRAP_ADJUSTMENT` | `boolean` | `true`  | If set to `false`, the bot will make adjustments to the price of keys when selling or buying. For example, if the current key price is "10 refined", the bot will take "10 refined" and add `SCRAP_ADJUSTMENT_VALUE` when buying, and subtract `SCRAP_ADJUSTMENT_VALUE` when selling. This is done in effort to quickly buy and sell keys using autokeys when in a pinch by paying more for keys, and selling keys for less. **This is not possible to do when key banking (`ENABLE_AUTOKEYS_BANKING`).** |
| `SCRAP_ADJUSTMENT_VALUE` | `integer` | `1` | This is the amount of scrap (.11 refined) the bot will increase the buy listing or decrease the sell listing when buying/selling keys using Autokeys (if `DISABLE_SCRAP_ADJUSTMENT` is set to `false`). For more information, see `DISABLE_SCRAP_ADJUSTMENT`  |
| `AUTOKEYS_ACCEPT_UNDERSTOCKED` | `boolean` | `false` | If set to `true`, your bot will accept trades that will lead to keys become under-stocked. |

**Note:** The Autokeys feature is meant to have your bot maintain enough pure in its inventory. Enabling "Autokeys - Banking" may cause the Autokeys feature to not perform as intended.

## Miscellaneous Settings

| Variable | Type | Default | Description |
| :------: | :--: | :-----: | ----------- |
| `DISABLE_INVENTORY_ SORT` | `boolean` | `false` | If set to `true` your bot will not automatically sort its own inventory |
| `DISABLE_LISTINGS` | `boolean` | `false` | If set to `true`, you bot will not list items for trade while it is running. |
| `DISABLE_MESSAGES` | `boolean` | `false` | If set to `true`, people that are friends with your bot will be unable to send messages to you with the "!message" command. |
| `DISABLE_SOMETHING_WRONG_ALERT` | `boolean` | `false` | If set to `true`, your bot will not notify owner(s) of queue problems, full inventories, or a low amount of pure (if Autokeys is on). |
| `DISABLE_CRAFTWEAPON_AS_CURRENCY` | `boolean` | `false` | If set to`true`, your bot will not value craft weapons as currency (0.05 refined). |
| `DISABLE_GIVE_PRICE_TO_INVALID_ITEMS` | `boolean` | `false` | If set to `true`, your bot will not price `INVALID_ITEMS` (items that are not in your price list) using prices from prices.tf. |
| `DISABLE_ADD_FRIENDS` | `boolean` | `false` | If set to `true`, your bot will not allow others to add it as a Steam friend. **SETTING THIS TO TRUE IS NOT RECOMMENDED!** |
|  `DISABLE_GROUPS_INVITE` | `boolean` | `false` | If set to `true`, your bot to will not invite people to join Steam groups. **NOTE: (You still need to have at least 1 group ID in the `GROUPS` array). See `Owners' Details and Other Required Variables` for more information.** |
| `DISABLE_CHECK_USES_DUELING_MINI_GAME` | `boolean` | `false` | If set to `true`, your bot will buy Dueling Mini-Games regardless of how many uses are left. Otherwise, it will **only accept** full Dueling Mini-Games **(5 uses left)**. |
| `DISABLE_CHECK_USES_NOISE_MAKER` | `boolean` | `false` | If set to `true`, your bot will buy Noise Makers regardless of how many uses are left. Otherwise, it will **only accept** full Noise Makers **(25 uses left)**. |
| `DISABLE_OWNER_COMMAND` | `boolean` | `false` | If set to `true`, the `!owner` command (used to contact the owner(s) of the bot will be disabled. |
| `DISABLE_AUTO_REMOVE_INTENT_SELL` | `boolean` | `false` | If set to `true`, your bot will no longer remove pricelist entries that have an `intent` of `sell` after completely selling out of that specific item. For example, if you list an item with `intent=sell` and the item sells out, the item will remain in your pricelist instead of being removed. |

## High Value Item Settings
|                Variable                 | Type | Default | Description |
| :-------------------------------------: | :--: | :-----: | ----------- |
|   `DISABLE_HIGH_VALUE_HOLD`    | `boolean` | `false` | By default, whenever your bot accepts items with high valued attachments, it will temporarily be disabled so you can decide whether to manually price it. Set this to `true` if you want to disable this feature.  |
| `HIGH_VALUE_SHEENS`                     | `string[]` | `[""]` | If the bot completes a trade that contains items with any sheen located in this list, the owner will be notified of the trade and the item(s) containing the sheen will be automatically disabled. These items will not be automatically re-listed, and the owner must manually re-list the item. For example, setting this variable to `["Team Shine"]` will cause any weapons with a `Team Shine` sheen to not be automatically re-listed, and will notify the owner if one is obtained successfully. If this variable is left blank (`[""]`), the bot will hold and notify on **all** sheens. |
| `HIGH_VALUE_KILLSTREAKERS`              | `string[]` | `[""]` | If the bot completes a trade that contains items with any killstreaker located in this list, the owner will be notified of the trade and the item(s) containing the killstreaker will be automatically disabled. These items will not be automatically re-listed, and the owner must manually re-list the item. For example, setting this variable to `["Fire Horns", "Tornado"]` will cause any weapons with a `Fire Horns` or `Tornado` killstreaker to not be automatically re-listed, and will notify the owner if one is obtained successfully. If this variable is left blank (`[""]`), the bot will hold and notify on **all** killstreakers. |

## Normalization Settings

| Variable | Type | Default | Description |
| :------: | :--: | :-----: | ----------- |
| `NORMALIZE_FESTIVIZED_ITEMS` | `boolean` | `false` | If set to `true`, your bot will recognize `Festivized` items as their `Non-Festivized` variant. For example, if your bot is selling a `Strange Australium Black Box` and someone sends an offer to your bot containing a `Festivized Strange Australium Black Box`, the bot will recognize the `Festivized Strange Australium Black Box` as `Strange Australium Black Box`. Otherwise, the bot will determine each item's price by it's specific name, quality, and unique identifiers. |
| `NORMALIZE_STRANGE_UNUSUAL`  | `boolean` | `false` | If set to `true`, Strange Unusuals (items whose SKU ends with `;strange`) will be recognized as the normal variant of said Unusuals (items whose SKU doesn't end with `;strange`). Otherwise, the bot will determine each item's price by it's specific name, quality, and unique identifiers. |

##  Trade Statistic Settings
| Variable  | Type | Default | Description |
| :-------: | :--: | :-----: | ----------- |
| `TRADES_MADE_STARTER_VALUE` | `integer` | `0` | The starting value for the number of successful trades your bot has made. Used in discord webhooks for statistical purposes. |
| `LAST_TOTAL_TRADES` | `integer` | `0` | An offset value for your bot's `TRADES_MADE_STARTER_VALUE`. If you clear out your `polldata.json` file, it will reset your total trades count back to zero. This variable can be used as an offset to ensure you never lose track of how many trades your bot has completed in total. An example would be if you bot has completed 1000 trades and you want to clear out your `polldata.json` file. If you set `LAST_TOTAL_TRADES` to `1000`, your bot will remember that it has completed 1000 trades in the past. |
| `TRADING_STARTING_TIME_UNIX` | `integer` (Unix) |   `0`   | Similar to `LAST_TOTAL_TRADES`, this variable sets the latest instance a trade was made. To read more about this variable, please read [IdiNium's Discord Message Regarding This](https://discordapp.com/channels/664971400678998016/666909518604533760/707706994932449410). |

## Duplicated Unusual Settings

| Variable | Type | Default | Description |
| :------: | :--: | :-----: | ----------- |
| `ENABLE_DUPE_CHECK` | `boolean` | `true`  | If set to `true`, the bot will perform checks on items to determine whether or not they are duplicated. |
| `DECLINE_DUPES`  | `boolean` | `false` | If set to `true`, the bot will decline any unusual items that it determines as having been duplicated. |
| `MINIMUM_KEYS_DUPE_CHECK` | `number`  |  `10`   | The minimum number of keys an item must be worth before the bot performs a check for whether or not it is duplicated. |

## Bot Profile Settings

| Variable | Type | Default | Description |
| :------: | :--: | :-----: | ----------- |
| `SKIP_BPTF_TRADEOFFERURL` | `boolean` | `true`  | If set to `false`, your bot will skip the check to set it's Steam Trade Offer URL on backpack.tf. If there are any issues setting this URL, please manually do so [here](https://backpack.tf/settings##general), and be sure to login using your bot's Steam account. If you've already set your Trade Offer URL on backpack.tf manually (as recommended in the guide), just leave this set to `true`. **SETTING THIS TO FALSE IS NOT RECOMMENDED!** |
| `SKIP_ACCOUNT_LIMITATIONS` | `boolean` | `true` | If set to `false`, your bot will check your Steam account limitations. Read more here: https://support.steampowered.com/kb_article.php?ref=3330-IAGK-7663. If your bot's Steam account is premium, just leave this set to `true`. **SETTING THIS TO FALSE IS NOT RECOMMENDED!** |
| `SKIP_UPDATE_PROFILE_SETTINGS` | `boolean` | `true`  | If set to `false`, your bot will attempt to set all of your profile settings to public. This is just so that backpack.tf can load your bot inventory correctly. If you already set everything to the public, just leave this set to `true`. **SETTING THIS TO FALSE IS NOT RECOMMENDED!** |

## Timezone Settings
The time settings listed here will be used in the `!time` command as well as in messages sent to trade partners if their offer needs to be reviewed.

| Variable | Type | Default | Description |
| :------: | :--: | :-----: | ----------- |
| `TIMEZONE` | `string` | `UTC` | The timezone that you currently reside in. Please only use these [Timezone Formats](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones). For example, if you live in Malysia, you can use the value `Asia/Kuala_Lumpur`. Or if you live in New York, you can use the value `America/New_York`.|
| `CUSTOM_TIME_FORMAT` | `string` | `MMMM Do YYYY, HH:mm:ss ZZ` |  - Please refer to [this article](https://www.tutorialspoint.com/momentjs/momentjs_format.htm) for more information on specifying a custom time format for your bot. |
| `TIME_ADDITIONAL_NOTES` | `string` | `""` | Optional additional notes when the bot shows your current time. Some examples are your active hours or who to contact if you are offline. |

## Trade Bypass Settings

| Variable | Type | Default | Description |
| :----: | :----: | :-----: | ----------- |
| `ALLOW_ESCROW`  | `boolean` | `false` | If set to `true`, your bot will allow trades to be held for up to 15 days as a result of the trade partner not having Mobile Authentication enabled. **SETTING THIS TO TRUE IS NOT RECOMMENDED!** |
| `ALLOW_OVERPAY` | `boolean` | `true`  | If set to `true`, your bot will allow trade partners to overpay with items or keys/metal. Otherwise, your bot will decline any trades in which it would receive overpay. |
| `ALLOW_GIFT_WITHOUT_NOTE` | `boolean` | `false` | If set to `true`, your bot will accept any gift without the need for the trade partner to include a gift message in the offer message. For a list of all allowed gift messages, please click [here](https://github.com/idinium96/tf2autobot/blob/1331f49d1c0217b906fff27f048c58b833bb844f/src/lib/data.ts#L601). **SETTING THIS TO TRUE IS NOT RECOMMENDED!** |
| `ALLOW_BANNED`  | `boolean` | `false` | If set to `true`, your bot will trade with users that are banned on backpack.tf or marked as a scammer on steamrep.com. **SETTING THIS TO TRUE IS NOT RECOMMENDED!** |

## Auto-Price Update Settings

| Variable | Type |     Default     | Description |
| :------: | :--: | :-------------: | ----------- |
| `MAX_PRICE_AGE` | `integer` | `28800` ms (8 hrs) | If an item in the pricelist's last price update exceeds this value, the bot will automatically request a pricecheck for the item from prices.tf. |

## Debug Settings

| Variable | Type | Default | Description |
| :------: | :--: | :-----: | ----------- |
|   `DEBUG`    | `boolean` | `true`  | If set to `true`, the bot will log any errors that occur into the console. |
| `DEBUG_FILE` | `boolean` | `true`  | If set to `true`, the bot will log any errors that occur to a file. This file can be later be used to create a GitHub [issue](https://github.com/idinium96/tf2autobot/issues/new/choose) to report any issues to the developers. |

## Listing Note Settings
| Variable | Type | Default | Description |
| :------: | :--: | :-----: | ----------- |
| `BPTF_DETAILS_BUY`  | `string` | `"I am buying your %name% for %price%, I have %current_stock% / %max_stock%, so I am buying %amount_trade%."` | This is the note that will be included with each buy order placed on backpack.tf  |
| `BPTF_DETAILS_SELL` | `string` | `"I am selling my %name% for %price%, I am selling %amount_trade%."` | This is the note that will be included with each sell order placed on backpack.tf |

**Parameters:**
-   `%name%` -  An item's name
-   `%price%` - An item's buying/selling price
-   `%current_stock%` - An item's current stock (by default this is used in `BPTF_DETAILS_BUY`)
-   `%max_stock%` - An item's maximum stock (by default this is used in `BPTF_DETAILS_BUY`)
-   `%amount_trade%` - How much of an item can be traded (between the minimum and maximum stock, used in `BPTF_DETAILS_SELL`)
-   `%keyPrice%` - The current key rate (selling price). If the item's selling price is above one key, this parameter will be displayed as `Key rate: x ref/key`. Otherwise, this parameter will not be shown on listings
-   `%uses%` - Display `(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟱x 𝗨𝗦𝗘𝗦)` on Dueling Mini-Game listings if `DISABLE_CHECK_USES_DUELING_MINI_GAME` is set to `false`, and `(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟐𝟱x 𝗨𝗦𝗘𝗦)` on Noise Maker listings  if `DISABLE_CHECK_USES_NOISE_MAKER` is set to `false`. It is recommended to only place this on buy listings (`BPTF_DETAILS_BUY`). On other items, this parameter will not be shown

**Usage example:**

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/98710377-878f3580-23be-11eb-9ed5-e0f6ec4e26af.png" alt="listings" style="display: block; margin-left: auto; margin-right: auto;"></div>

## Custom Offer Message Settings

| Variable | Type | Default | Description |
| :------: | :--: | :-----: | ----------- |
| `OFFER_MESSAGE` | `string` | `""` | This message will appear when the bot sends an offer to a trade partner. If left empty `("")`, it will print _**`Powered by TF2Autobot`**_ by default. |

## Discord Server Invite Settings
| Variable | Type | Default | Description |
| :------: | :--: | :-----: | ----------- |
| `DISCORD_SERVER_INVITE_LINK` | `string` | `""` | You can place a Discord server invite link here, which would be shown when a trade partner enters the `!discord` command. You can leave this empty if you don't have one, as it will be replaced with the [tf2Autobot Discord Server](https://discord.gg/ZrVT7mc) invite link by default.

## Discord Webhook Configuration
### General Configuration Items
| Variable | Type | Default | Description |
| :------: | :--: | :-----: | ----------- |
| `DISCORD_OWNER_ID` | `string` | `""` | Your Discord ID. To obtain this, right-click on yourself on Discord and click `Copy ID`. Be sure to enable Developer Mode on Discord by navigating to `Settings > Appearance > Advanced`. |
| `DISCORD_WEBHOOK_USERNAME` | `string` | `""` | The name you'd like to give your bot when when it sends a message on Discord. |
| `DISCORD_WEBHOOK_AVATAR_URL` | `string` | `""` | A URL to the image you'd like your bot to have when it sends a discord message. **This must be in URL form.** An example of how to obtain your bot's avatar from Steam: https://gyazo.com/421792b5ea817c36054c7991fb18cdbc |
| `DISCORD_WEBHOOK_EMBED_COLOR_IN_DECIMAL_INDEX` | `string` | `""` | The color you'd like associated with your bot's discord messages. You can view the different colors at [spycolor.com](https://www.spycolor.com/). Copy the `Decimal value`. An example of this would be `16769280` for the color `#ffe100` |

#### Note on how to obtain your Discord Webhook URL

Please view this [image](https://gyazo.com/90e9b16d7c54f1b4a96f95b9fae93187) for instructions on how to obtain your Discord Webhook URL. These settings would be set in your own personal Discord channel.

### Trade Alert Configuration Items
| Variable | Type | Default | Description |
| :------: | :--: | :-----: | ----------- |
| `DISABLE_DISCORD_WEBHOOK_SOMETHING_WRONG_ALERT` | `boolean` | `false` |  If set to `true`, the bot will notify you through Steam chat if there is something wrong. Otherwise, the bot will notify you through Discord. |
| `DISCORD_WEBHOOK_SOMETHING_WRONG_ALERT_URL` | `string` | `""` | The Discord Webhook URL you'd like `SOMETHING_WRONG_ALERT`'s to be sent to. |

### Pricelist Update Alert Configuration Items
| Variable | Type | Default | Description |
| :------: | :--: | :-----: | ----------- |
| `DISABLE_DISCORD_WEBHOOK_PRICE_UPDATE` | `boolean` | `false` |  If set to `true`, the bot will notify you through Steam chat if there is a price update for an item on your price-list. Otherwise, the bot will notify you through Discord. |
| `DISCORD_WEBHOOK_PRICE_UPDATE_URL` | `string` | `""` | The Discord Webhook URL you'd like price update alerts to be sent to. |
| `DISCORD_WEBHOOK_PRICE_UPDATE_ADDITIONAL_DESCRIPTION_NOTE` | `string` | `""` | Any additional notes you'd like included with price update alerts |

### Trade Summary Alert Configuration Items
| Variable | Type | Default | Description |
| :------: | :--: | :-----: | ----------- |
| `DISABLE_DISCORD_WEBHOOK_TRADE_SUMMARY` | `boolean`  | `false` | Display each successful trade summary on your trade summary/live-trades channel via Discord Webhook. If set to `true`, it will send to your Steam Chat. |
| `DISCORD_WEBHOOK_TRADE_SUMMARY_URL` | `string[]` | `[""]`  | An array of Discord Webhook URLs for `TRADE_SUMMARY`. You will need to format it like so: `["yourDiscordWebhookLink"]`, or if you want to add more than one, you format them like so: `["link1", "link2"]` (separate each link with a comma, make sure `link1` is your **own** Discord Webhook URL). |
| `DISCORD_WEBHOOK_TRADE_SUMMARY_SHOW_QUICK_LINKS` | `boolean`  | `true`  | Show the trade partner's quick links to their Steam profile, backpack.tf, and SteamREP pages. |
| `DISCORD_WEBHOOK_TRADE_SUMMARY_SHOW_KEY_RATE` | `boolean`  | `true`  | Show your bot's key rate |
| `DISCORD_WEBHOOK_TRADE_SUMMARY_SHOW_PURE_STOCK` | `boolean` | `true` | Show your bot's pure stock |
| `DISCORD_WEBHOOK_TRADE_SUMMARY_SHOW_INVENTORY` | `boolean` | `true`  | Show the total amount of items in your bot's inventory. |
| `DISCORD_WEBHOOK_TRADE_SUMMARY_ADDITIONAL_DESCRIPTION_NOTE` | `string` | `""` | Any additional notes you'd like included with trade summaries. Notes must be in the following format: `[YourText](Link)` |
| `DISCORD_WEBHOOK_TRADE_SUMMARY_MENTION_OWNER` | `boolean`  | `false` | If set to `true`, your bot will mention you on each successful trade. |
| `DISCORD_WEBHOOK_TRADE_SUMMARY_MENTION_OWNER_ONLY_ITEMS_SKU` | `string[]` | `[""]`  | Your bot will mention you whenever a trade contains an SKU in this list. Supports multiple item SKUs. For example, let say you just want to be mentioned on every unusual and australium trade. You would input `[";5;u", ";11;australium"]`. If you want to be mentioned on specific items, just fill in the full item SKU, like so: `["725;6;uncraftable"]`. To add more, just separate new items with a comma between each SKU `string`. |

**Note**: Want to feature your bots trades on the tf2autobot Discord server? Contact IdiNium for a Webhook URL!

#### A visual breakdown of each Discord Webhook Trade Alert setting
<div align="center"><img src="https://user-images.githubusercontent.com/47635037/86468435-ffdb4f80-bd69-11ea-9ab6-a7f5be2c22f0.PNG" alt="trade-summary-full" style="display: block; margin-left: auto; margin-right: auto;"></div>

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/86468438-0073e600-bd6a-11ea-8bc0-040229c997d5.PNG" alt="trade-summary-full2" style="display: block; margin-left: auto; margin-right: auto;"></div>

### Trade Offer Review Alert Configuration Items
| Variable | Type | Default | Description |
| :------: | :--: | :-----: | ----------- |
| `DISABLE_DISCORD_WEBHOOK_REVIEW_OFFER` | `boolean` | `false` | If set to `true`, messages regarding trade offers that require manual review will be sent to your Steam Chat. Otherwise, these messages will be sent on Discord. |
| `DISCORD_WEBHOOK_REVIEW_OFFER_URL` | `string`  | `""` | Discord Webhook URL for `REVIEW_OFFER`. |
| `DISCORD_WEBHOOK_REVIEW_OFFER_DISABLE_MENTION_ INVALID_VALUE` | `boolean` | `false` | If set to `true`, your bot only mention you for `INVALID_VALUE` offers. |
| `DISCORD_WEBHOOK_REVIEW_OFFER_SHOW_QUICK_LINKS` | `boolean` | `true`  | Show the trade partner's quick links to their Steam profile, backpack.tf, and SteamREP pages. |
| `DISCORD_WEBHOOK_REVIEW_OFFER_SHOW_KEY_RATE` | `boolean` | `true`  | Show your bot's key rate. |
| `DISCORD_WEBHOOK_REVIEW_OFFER_SHOW_PURE_STOCK` | `boolean` | `true`  | Show your bot's pure stock. |

#### A visual breakdown of each Discord Webhook Review Alert setting
<div align="center"><img src="https://user-images.githubusercontent.com/47635037/86468430-feaa2280-bd69-11ea-8f25-26a7a430b2e1.PNG" alt="only non-invalid-value2" style="display:block;margin-left:auto;margin-right:auto;"></div>

### Trade Partner Message Alert Configuration Items
| Variable | Type | Default | Description |
| :------: | :--: | :-----: | ----------- |
| `DISABLE_DISCORD_WEBHOOK_MESSAGE_FROM_PARTNER` | `boolean` | `false` | Used to alert you on any messages sent from the trade partner via Discord Webhook. If set to `true`, it will send to your Steam Chat. |
| `DISCORD_WEBHOOK_MESSAGE_FROM_PARTNER_URL` | `string` | `""` | Discord Webhook URL for `MESSAGE_FROM_PARTNER`. |
| `DISCORD_WEBHOOK_MESSAGE_FROM_PARTNER_SHOW_ QUICK_LINKS` | `boolean` | `true`  | Show the trade partner's quick links to their Steam profile, backpack.tf, and SteamREP pages. |

## Manual Review Configuration
| Variable | Type | Default | Description |
| :------: | :--: | :-----: | ----------- |
| `ENABLE_MANUAL_REVIEW` | `boolean`  | `true`  | By default, offers with `INVALID_VALUE`/ `INVALID_ITEMS`/ `OVERSTOCKED`/ `UNDERSTOCKED`/ `DUPED_ITEMS`/ `DUPE_CHECK_FAILED` will require manual review by you. |
| `DISABLE_SHOW_REVIEW_OFFER_SUMMARY` | `boolean` | `false` | If set to `true`, your bot will show the trade offer summary to the trade partner. Otherwise, it will only notify the trade partner that their offer is being held for review. |
| `DISABLE_REVIEW_OFFER_NOTE` | `boolean` | `false` | By default, your bot will show notes on for each [manual review reason](https://github.com/idinium96/tf2autobot/wiki/FAQ#why-my-bot-dont-acceptdecline-the-trade-automatically) |
| `DISABLE_SHOW_CURRENT_TIME` | `boolean`  | `false` | By default, your bot will show the owner's time when sending your trade partner any manual offer review notifications. |
| `DISABLE_ACCEPT_INVALID_ITEMS_OVERPAY` | `boolean`  | `false` | If set to `true`, your bot will not accept trades with `INVALID_ITEMS` where the value of their side is greater than or equal to the value of your bot's side. |
| `DISABLE_ACCEPT_OVERSTOCKED_OVERPAY` | `boolean` | `true` | Set this to `false` if you want your bot to accept trades with `OVERSTOCKED` items, where the value of their side is greater than or equal to the value of your bot's side. |
| `DISABLE_ACCEPT_UNDERSTOCKED_OVERPAY`  | `boolean` | `true` | Set this to `false` if you want your bot to accept trades with `UNDERSTOCKED` items, where the value of their side is greater than or equal to the value of your bot's side. |
| `DISABLE_AUTO_DECLINE_OVERSTOCKED` | `boolean` | `true` | Set this to `false` if you want your bot to decline an offer with `OVERSTOCKED` as the **ONLY** manual review reason (manual review must be enabled). |
| `DISABLE_AUTO_DECLINE_UNDERSTOCKED` | `boolean` | `true` | Set this to `false` if you want your bot to decline an offer with **ONLY** `UNDERSTOCKED` reason (manual review must be enabled). |
| `DISABLE_AUTO_DECLINE_INVALID_VALUE` | `boolean` | `false` | Set this to `true` if you do not want your bot to automatically decline trades with `INVALID_VALUE` as the **ONLY** manual review reason where items do not match `INVALID_VALUE_EXCEPTION_SKUS` and `INVALID_VALUE_ EXCEPTION_VALUE_IN_REF` |
| `AUTO_DECLINE_INVALID_VALUE_NOTE` | `string` | `""` | Your custom note on why the trade got declined. The default is nothing. |
| `INVALID_VALUE_EXCEPTION_SKUS` | `string[]` | `[""]` | An array of SKUs that will bypass the `INVALID_VALUE` manual review reason if the difference between the bot's value and their value is not more than `INVALID_VALUE_EXCEPTION_VALUE_IN_REF`. Let's say your bot is selling an Unusual and someone sent an offer with 0.11 ref less, and you want your bot to accept it anyway. By default, it will check only for Unusuals and Australiums: `[";5;u", ";11;australium"]`. You can also leave it empty (`[""]`) so that all items with `INVALID_VALUE` create notifications. |
| `INVALID_VALUE_EXCEPTION_VALUE_IN_REF` | `integer` |   `0`   | Exception value for the SKUs that you set above. The default is `0` (no exception). |
| `INVALID_VALUE_NOTE` | `string` | `""` | Your custom `INVALID_VALUE` note. |
| `INVALID_ITEMS_NOTE` | `string` | `""` | Your custom `INVALID_ITEMS` note. |
| `OVERSTOCKED_NOTE` | `string` | `""` | Your custom `OVERSTOCKED` note. |
| `UNDERSTOCKED_NOTE` | `string` | `""` | Your custom `UNDERSTOCKED` note. |
| `DUPE_ITEMS_NOTE` | `string` | `""` | Your custom `DUPE_ITEMS` note. |
| `DUPE_CHECK_FAILED_NOTE` | `string` | `""` | Your custom `DUPE_CHECK_FAILED` note. |
| `ADDITIONAL_NOTE` | `string` | `""` | Your custom `ADDITIONAL` note. |

---

**Notes:**
On each reason **except** `INVALID_VALUE`, you can put `%name%` to list all the items that are on that reason, and `%isName%` for the plural of "is" - where if `%name%` is just 1 item, it will use "is", else if more then one item, it will use "are".

Example:
Let say the trade contains items with `INVALID_ITEMS`. The items are Dueling Mini-Game, Secret Saxton.

-   You use custom `INVALID_ITEMS` note as: `"%name% %isName% not in my pricelist. Please wait for my owner to check it."`

-   What the trade partner will receive: `"Dueling Mini-Game, Secret Saxton is not in my pricelist. Please wait for my owner to check it."`

For `OVERSTOCKED` and `UNDERSTOCKED`, parameter `%name%` will print out a list of `amountCanTrade - item_name` (example, `1 - Secret Saxton, 0 - Jag`).

**Default Notes:**

-   `INVALID_VALUE`: `You're taking too much in value.`
-   `INVALID_ITEMS`: `%name% is|are not in my pricelist.`
-   `OVERSTOCKED`: `I can only buy %name% right now.`
-   `UNDERSTOCKED`: `I can only sell %amountCanTrade% - %name% right now.`
-   `DUPED_ITEMS`: `%name% is|are appeared to be duped.`
-   `DUPE_CHECK_FAILED`: `I failed to check for duped on %name%.`

---

## Other Configuration Items
| Variable | Type | Default | Description |
| :------: | :--: | :-----: | ----------- |
| `ENABLE_ONLY_PLAY_TF2` | `boolean`| `false` | Set to `true` if you want your bot to only play Team Fortress 2. Setting this to `true` will ignore the below variable. |
| `CUSTOM_PLAYING_GAME_NAME` | `string` | `""` | Name of the custom game you'd like your bot to play. Limited to only 60 characters. Example: https://gyazo.com/308e4e05bf4c49929520df4e0064864c |
| `CUSTOM_WELCOME_MESSAGE` | `string` | `""` | Your custom `WELCOME_MESSAGE` note. Two parameters: `%name%` (display trade partner's name) and `%admin%` (if admin, it will use "!help", else "!how2trade"). |
| `CUSTOM_I_DONT_KNOW_WHAT_YOU_MEAN` | `string` | `""` | Your custom note when people send the wrong command. |
| `CUSTOM_HOW2TRADE_MESSAGE` | `string` | `""` | Your custom `HOW2TRADE` note. |
| `CUSTOM_SUCCESS_MESSAGE` | `string` | `""` | Your custom `SUCCESS` note. |
| `CUSTOM_DECLINED_MESSAGE` | `string` | `""` | Your custom `DECLINED` note. Two parameters can be used - `%reason%` and `%invalid_value_summary%`. |
| `CUSTOM_TRADED_AWAY_MESSAGE` | `string` | `""` | Your custom note when the bot fails to trade because the item is traded away. |
| `CUSTOM_CLEARING_FRIENDS_MESSAGE` | `string` | `""` | Your custom note when the bot is removing friends to add someone else Usable parameter - `%name%` (display trade partner's name).
