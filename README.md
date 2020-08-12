# tf2autobot

A free and open source fully automated TF2 trading bot advertising on www.backpack.tf using prices from www.prices.tf.
**tf2autobot** is an improved and feature rich version of the original **tf2-automatic** made by [Nicklason](https://github.com/Nicklason). You can find out more about the original repository [here](https://github.com/Nicklason/tf2-automatic).

![GitHub package version](https://img.shields.io/github/package-json/v/idinium96/tf2autobot.svg)
[![Build Status](https://img.shields.io/github/workflow/status/idinium96/tf2autobot/CI/development)](https://github.com/idinium96/tf2autobot/actions)
[![GitHub issues](https://img.shields.io/github/issues/idinium96/tf2autobot)](https://github.com/idinium96/tf2autobot/issues)
[![GitHub forks](https://img.shields.io/github/forks/idinium96/tf2autobot)](https://github.com/idinium96/tf2autobot/network/members)
[![GitHub stars](https://img.shields.io/github/stars/idinium96/tf2autobot)](https://github.com/idinium96/tf2autobot/stargazers)
[![Discord](https://img.shields.io/discord/664971400678998016.svg)](https://discord.gg/ZrVT7mc)
![License](https://img.shields.io/github/license/idinium96/tf2autobot)
[![IdiNium-paypal](https://img.shields.io/badge/IdiNium-Paypal-blue)](https://www.paypal.me/idinium)
[![IdiNium-Steam](<https://img.shields.io/badge/IdiNium(donate)-Steam-lightgrey>)](https://bit.ly/3gbldTM)
[![Nicklason-Steam](<https://img.shields.io/badge/Nicklason(donate)-Steam-lightgrey>)](https://steamcommunity.com/tradeoffer/new/?partner=159805178&token=_Eq1Y3An)

**tf2autobot made by IdiNium**
[![profile-Steam](https://img.shields.io/badge/Steam-profile-blue)](https://steamcommunity.com/profiles/76561198013127982/)
[![profile-bptf](https://img.shields.io/badge/Backpack.tf-profile-blue)](https://backpack.tf/profiles/76561198013127982)
[![profile](https://user-images.githubusercontent.com/47635037/88795331-708f5380-d1d2-11ea-8adf-92d94be581e9.PNG)](https://backpack.tf/profiles/76561198013127982)

Before you install the bot, there are a few things you need to have taken care off before you will be able to run the bot.

-   You need a separate [Unlimited](https://support.steampowered.com/kb_article.php?ref=3330-IAGK-7663) Steam account with a mobile authenticator. I suggest using the [Steam Desktop Authenticator](https://github.com/Jessecar96/SteamDesktopAuthenticator) to authenticate the account and get the secret keys used to automate generating 2FA codes and managing mobile confirmations.
-   NodeJS version 8 or more
-   Typescript 3.7 or above

Please refer to the [wiki](https://github.com/idinium96/tf2autobot/wiki) for setting up the bot. For additional help and questions, please ask in the tf2autobot-IdiNium [Discord server](https://discord.gg/ZrVT7mc) or create an [issue](https://github.com/idinium96/tf2autobot/issues/new/choose).

## Download and installation

You can clone or download the bot by clicking on the green button in the top right, follow the [installation guide](https://github.com/idinium96/tf2autobot/wiki/a.-Installation) for more instructions.

## Configuration

Once you have downloaded the source and installed the necessary packages, you can move on to configuring the bot. Follow the [configuration guide](https://github.com/idinium96/tf2autobot/wiki/b.-Configuration).

## Join our Discord server!

Join **tf2autobot-IdiNium** Discord server [![Discord](https://img.shields.io/discord/664971400678998016.svg)](https://discord.gg/ZrVT7mc) and go to `#🆚roles` channel and react on the first message to get yourself mentioned when an update has been released!

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/88795539-c8c65580-d1d2-11ea-993e-4161083b3e36.PNG" alt="update-noti" style="display:block;margin-left:auto;margin-right:auto;width:400px;height:250px;"></div>

\*\*There is also a giveaway that will be held on every Thursday, 8 AM - 8 PM (12 hours) Malaysia time!

## Difference between tf2autobot and tf2-automatic

The original tf2-automatic repository already have a lot of features, but some features in this version have their own advantages. Let me list out what features that worth mentioning, which already exist and what features that have been added into this version:

### Original tf2-automatic

-   free autoprice (use prices from [prices.tf](https://prices.tf/)) and unlimited listings (depends on your backpack.tf listings cap)
-   automatically craft/smelt pure metals (for currency changes)
-   offer review (on invalid value/item or overstocked or duped items)
-   dupe check on items that are more than minimum keys (you set it yourself)

### tf2autobot version

**Added an option to:**

-   use Discord Webhook for your bot to send accepted trade summary/ offer review/ messages.
-   disable show only metal in trade summary (it will show x keys, y ref, it will show only x ref on original version)
-   enable Autokeys (to keep your refined metal stock) and key banking ([jump](https://github.com/idinium96/tf2autobot#autokeys-auto-buy-or-sell-keys-feature))
-   set your own custom greeting/success/failed messages and offer review notes
-   set all craft weapons as currency (0.05 ref) and automatically craft duplicate craftable weapons
-   send to the trade partner a summary of their offer if need to be reviewed ([jump](https://github.com/idinium96/tf2autobot#offer-review-summary-on-trade-partner-side))
-   automatically accept trade with `INVALID_VALUE exception`.
-   automatically decline (skip manual review) **ONLY `INVALID_VALUE`** trade, if not within INVALID_VALUE exception sku and value range.
-   automatically accept (skip manual review) `INVALID_ITEMS` or `OVERSTOCKED` trades if the trade partner offer more than what they're taking (overpay).
-   make `INVALID_ITEMS` to be priced using price from Prices.TF.
-   NOT mention (Discord Webhook) on an `INVALID_VALUE` offer
-   check Dueling Mini-Game to only accept 5 Uses!
-   check Noise Maker to only accept 25 Uses!
-   disable acceptting friend request and inviting people to join groups.
-   alert admins when there's something wrong, like queue problem (which the original one is still not fixed yet, and I have no idea why) and when your bot is out of space or if your bot has less than minimum pure (must enable Autokeys feature)

**Others:**

-   automatically restart your bot on queue problem, and automatically relist if backpack.tf does not synchronized with your bot listings on Autokeys (sometimes it's set to automatically buy keys, but at backpack.tf, it's listed to sell.)
-   use emojis on almost all messages
-   list out every items on each offer review reasons
-   New added commands: "!pure", "!time", "!delete", "!check", "!block", "!unblock", "!autokeys", "!refreshautokeys", "!inventory", "!relist", "!pricecheckall", "!craftweapon" and "!uncraftweapon" commands
-   and more to come!

## Added features

### Discord Webhook feature

Instead of the bot sending trade summary, review offer and messages to you via Steam Chat, this version will let your bot to send it to a different channels in your discord server.
If you want to use Offer Review and Messages as Discord Webhook, you can not reply to the message sent by your Discord Webhook bot, unless you have [tf2-autocord](https://github.com/idinium96/tf2-autocord) installed.

Screenshots:

-   Trade summary (or live-trades) -

    <div align="center"><img src="https://user-images.githubusercontent.com/47635037/89725250-1434fb00-da40-11ea-8ccc-8755b1af89c6.PNG" alt="trade-summary" style="display:block;margin-left:auto;margin-right:auto;"></div>

-   Offer review (when trade partner sent wrong value/overstocked/etc) -

    <div align="center"><img src="https://user-images.githubusercontent.com/47635037/85020166-80168800-b1a2-11ea-99f2-04766677fdf7.PNG" alt="Offer-review" style="display:block;margin-left:auto;margin-right:auto;"></div>

-   Messages (when trade partner send "!message" command -

    <div align="center"><img src="https://user-images.githubusercontent.com/47635037/84581313-9cb56780-ae12-11ea-9dcf-2d660d8ae184.PNG" alt="Messages" style="display:block;margin-left:auto;margin-right:auto;"></div>

-   Price update (Discord Only) - Show price change for every items that are on your pricelist -

    <div align="center"><img src="https://user-images.githubusercontent.com/47635037/83712639-cc1ce500-a658-11ea-855d-5de43b39ff2f.png" alt="price-update" style="display:block;margin-left:auto;margin-right:auto;"></div>

You can also only set it to send only trade summary, but the others like Offer review and Messages will be sent to you via Steam Chat.

Note that, it's an option to show key rate/ pure stock/ quick links on each feature.

If you want to use this feature, you must use [ecosystem.template.json](https://github.com/idinium96/tf2autobot/blob/master/template.ecosystem.json) from this version, which contains much more variables for you to fill in.

### Autokeys (auto buy or sell keys) feature

This feature when enabled, your bot will automatically buy or sell keys based on your bot pure availability and your settings on this feature. You'll need to set your minimum/maximum keys and minimum/maximum refined metals in your ecosystem.json - more explaination can be found [here](https://github.com/idinium96/tf2autobot#autokeys-feature).

```
.____________________________________________________________.  ._______________________________.
|       **Buying Keys**       |       **Selling Keys**       |  |       **Banking Keys**        |
|       ***************       |       ****************       |  |       ****************        |
|        <———————————○        |            ○————————————>    |  |            ○————————————>     |
| Keys -----|--------|----->  |  Keys -----|--------|----->  |  |  Keys -----|--------|----->   |_______________________________.
|                    ○———>    |         <——○                 |  |            ○————————○         |          **Disabled**         |
| Refs -----|--------|----->  |  Refs -----|--------|----->  |  |  Refs -----|--------|----->   |          ************         |
|          min      max       |           min      max       |  |           min      max        |         <——●                  |
|_____________________________|______________________________|  |______________________________.|  Keys -----|--------|----->   |
                |         **Disabled**        |                 |    **Buying when more ref**   |         <———————————●         |
                |         ************        |                 |          ************         |  Refs -----|--------|----->   |
                |        <——●————————●···>    |                 |         <——●                  |           min      max        |
                | Keys -----|--------|----->  |                 |  Keys -----|--------|----->   |_______________________________|
                |           ●————————●···>    |                 |            ○————————————>     |
                | Refs -----|--------|----->  |                 |  Refs -----|--------|----->   |
                |          min      max       |                 |           min      max        |
                |_____________________________|                 |_______________________________|
```

Some screenshots:

-   When your bot have enough key to sell to get more ref (if your ref is less than minimum) OR enough ref to buy more keys (when your ref > maximum and keys < max)

    <div align="center"><img src="https://user-images.githubusercontent.com/47635037/84581306-9a530d80-ae12-11ea-9bd5-3a988ac447d9.png" alt="autokeys1" style="display:block;margin-left:auto;margin-right:auto;"></div>

    <div align="center"><img src="https://user-images.githubusercontent.com/47635037/84581309-9b843a80-ae12-11ea-8374-0f7d3c631fa6.png" alt="autokeys2" style="display:block;margin-left:auto;margin-right:auto;"></div>

-   When your bot don't have enough of what I've said before:

    <div align="center"><img src="https://user-images.githubusercontent.com/47635037/84581310-9c1cd100-ae12-11ea-80fa-085ad8bff73e.png" alt="autokeys3" style="display:block;margin-left:auto;margin-right:auto;"></div>

You can see codes on how this feature works [here](https://github.com/idinium96/tf2autobot/blob/master/src/classes/Autokeys.ts).

### Emojis and more commands added

#### Admin

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/89725438-22841680-da42-11ea-87a2-c0749c0d451e.png" alt="newlook-command-admin" style="display:block;margin-left:auto;margin-right:auto;"></div>

#### Trade partner

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/89725439-244dda00-da42-11ea-9ea8-f3e159c19cea.png" alt="newlook-command-partner" style="display:block;margin-left:auto;margin-right:auto;"></div>

### Offer review summary on trade partner side

![review-note-trade-partner](https://user-images.githubusercontent.com/47635037/85020170-8147b500-b1a2-11ea-96b5-1805ad8cc31c.PNG)

### INVALID_VALUE exception

Let say you want to trade an unusual OR an australium, which the value as we know is huge (more than 5 keys), and then someone sent a trade offer with 0.11 ref less, your bot will skip this offer and send you notification to do review on this offer. With this exception, your bot will accept the trade as long as it's less than the exception value in ref that you've set. To use this feature, you'll need to set it on both `INVALID_VALUE_EXCEPTION_SKUS` and `INVALID_VALUE_EXCEPTION_VALUE_IN_REF`. See [here](https://github.com/idinium96/tf2autobot#manual-review-settings).

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/84966884-38adde80-b145-11ea-9aac-d28daf9a74e6.PNG" alt="Invalid_value_exception2" style="display:block;margin-left:auto;margin-right:auto;width:540px;height:450px;"></div>

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/84966887-39df0b80-b145-11ea-9d81-021d302e7cf0.PNG" alt="Invalid_value_exception2" style="display:block;margin-left:auto;margin-right:auto;"></div>

## Variables in ecosystem.json summary

### Your bot credentials

-   `STEAM_ACCOUNT_NAME`: username that is used to login (preferably your bot/alt Steam account).
-   `STEAM_PASSWORD`: your bot Steam account password.
-   `STEAM_SHARED_SECRET`: you can found this in `<Your Bot SteamID64>.maFile` file inside ~/SDA/maFiles folder. Open the file using notepad and search for `"shared_secret": "agdgwegdgawfagxafagfkagusbuigiuefh=="` <-- take only this one (which is `agdgwegdgawfagxafagfkagusbuigiuefh==` in this example. Do not use this one).
-   `STEAM_IDENTITY_SECRET`: same as above (but now search for `identity_secret`).

### Prices.TF token

-   `PRICESTF_API_TOKEN`: You can leave this empty. No need at all.

### Backpack.tf token and API Key

You can run your bot without this first, which then on the first run, it will print out your bot backpack.tf access token and apiKey. You'll need to copy and paste it into your ecosystem.json or .env file, [see this image](https://cdn.discordapp.com/attachments/697415702637838366/697820077248086126/bptf-api-token.png), BUT if you want to find it yourself, then,

-   `BPTF_ACCESS_TOKEN`: https://backpack.tf/connections and click on `Show Token` under User Token.
-   `BPTF_API_KEY`: https://backpack.tf/developer/apikey/view - fill in site URL (`http://localhost:4566/tasks`) and comments (`Check if a user is banned on backpack.tf`).

### Your bot settings

-   `AUTOBUMP`: Default is `true`. If you don't have backpack.tf premium, then your bot will re-list all listings every 30 minutes.

-   `MINIMUM_SCRAP`: Default is 9 scraps. If it has less, it will smelt reclaimed metal so your bot will have more than minimum scraps.
-   `MINIMUM_RECLAIMED`: Default is 9 Reclaimed. Explained above.
-   `METAL_THRESHOLD`: Default is 9, if scraps/reclaimed metal reached minimum + threshold (max), it will combine the metal.

#### Autokeys feature

-   `ENABLE_AUTOKEYS`: Default is `false`. If you set to `true`, the bot will automatically sell/buy keys based on the availability of the refined metals and keys in your bot inventory. Set it to false if you want to custom price your key.
-   `ENABLE_AUTOKEYS_BANKING`: Default is `false`. If set to `true`, it will do key banking (must also set **ENABLE_AUTO_SELL_AND_BUY_KEYS** to `true` and for banking, meaning if current ref is in between min and max and keys > min, it will do key banking).
-   `MINIMUM_KEYS`: When current keys > minimum keys, it will start selling keys (with when current ref < minimum ref), else it will stop selling keys.
-   `MAXIMUM_KEYS`: When current keys < maximum keys, it will start buying keys (with when current ref > maximum ref), else it will stop buying keys.
-   `MINIMUM_REFINED_TO_START_SELL_KEYS`: - Already explained.
-   `MAXIMUM_REFINED_TO_STOP_SELL_KEYS`: - Already explained.
-   `DISABLE_SCRAP_ADJUSTMENT`: Default is `true` (disabled). Set to `false` to make an adjustment on the key price (only when sell or buy, it is not possible while banking).
-   `SCRAP_ADJUSTMENT_VALUE`: Default is `1` (1 scrap or 0.11 ref). Please only put an integer (0, 1, 2, 3, ...).

\*\*This feature is meant to make your bot to have enough pure in their inventory. Enabling Autokeys - Banking might cause your bot to not function as intended.

#### Set to true if want to disable

-   `DISABLE_INVENTORY_SORT`: Default: `false`. Sort your bot inventory.
-   `DISABLE_LISTINGS`: Default: `false`. This is used if you want to temporarily disable trading while your bot is alive.
-   `DISABLE_CRAFTING_METAL`: Default: `false`. **NOT RECOMMENDED** to set is as `true`, as it cause bot and trade partner to not be able to trade because of missing pure changes.
-   `DISABLE_CRAFTING_WEAPONS`: Default: `false`. Set to **`true` if you DO NOT** want your bot to automatically craft any duplicated craftable weapons.
-   `DISABLE_MESSAGES`: Default: `false`. When `true`, people (that are friend with your bot) will be unable send messages to you with "!message" command.
-   `DISABLE_SOMETHING_WRONG_ALERT`: - Default: `false`. My custom - Used to notify owner if your bot has a queue problem/full inventory/low in pure (if Autokeys is on).
-   `DISABLE_CRAFTWEAPON_AS_CURRENCY`: - Default: `false`. Set it as `true` if you don't want to set craft weapons as currency (0.05 ref).
-   `DISABLE_GIVE_PRICE_TO_INVALID_ITEMS`: - Default: `false`. Set to `true` if you don't want `INVALID_ITEMS` (items that are not in your pricelist) to be priced using price from prices.TF.
-   `DISABLE_ADD_FRIENDS`: - Default: `false`. Set to `true` if you don't want people to add your bot (not recommended).
-   `DISABLE_GROUPS_INVITE`: - Default: `false`. Set to `true` if you don't want your bot to invite people to join groups **(You still need to have at least 1 group ID in the `GROUPS` array)**.
-   `DISABLE_CHECK_USES_DUELING_MINI_GAME`: - Default: `false`. Set to `true` if you want your bot to buy Dueling Mini-Game of regardless of how many uses left.
-   `DISABLE_CHECK_USES_NOISE_MAKER`: - Default: `false`. Set to `true` if you want your bot to accept Noise Maker that is not 25 Uses.

#### Set to true if want to enable

-   `NORMALIZE_FESTIVIZED_ITEMS`: Default: `false`. Set to `true` if you want your bot to recognize `Festivized` item as a `Non-Festivized` item. For example you're listing to bank `Strange Australium Black Box`, but someone sent to your bot a Festivized version with the name `Festivized Strange Australium Black Box`, the bot by default will either decline or skip (if you enable manual review) the offer becuase it's not matched. Thus, set to `true` if you want your bot to recognize `Festivized Strange Australium Black Box` as `Strange Australium Black Box`.
-   `NORMALIZE_STRANGE_UNUSUAL`: Default: `false`. Set to `true` if you want Strange Unusual (with sku ends with `;strange`) to be recognized as normal Unusual (no ends with `;strange` on the sku).

#### Misc feature

-   `TRADES_MADE_STARTER_VALUE`: - Used mainly for displaying your bot total trades made, found in your bot Steam Profile page (leave it 0 if you don't care about it, used for discord webhook).
-   `LAST_TOTAL_TRADES`: - Used if your polldata.json is getting bigger which consumed a lot of RAM, but you want to keep total successful trades that your bot has made (leave it 0 if you don't care about it).
-   `TRADING_STARTING_TIME_UNIX`: [Number - Unix format] - Also same as LAST_TOTAL_TRADES, but this one is the latest time (leave it 0 if you don't care about it). You can read more on my [Discord server post](https://discordapp.com/channels/664971400678998016/666909518604533760/707706994932449410).

#### Duped unusual check feature

-   `ENABLE_SHOW_ONLY_METAL`: - Default: `true`. My custom - If set to `false`, it will show [x keys, y ref].
-   `ENABLE_DUPE_CHECK`: - Default: `true`. Used to enable/disable check on duped unusuals
-   `DECLINE_DUPES`: - Default: `false`. Explained itself.
-   `MINIMUM_KEYS_DUPE_CHECK`: - Default: 10. Explained itself.

#### Set to true if want to skip

-   `SKIP_BPTF_TRADEOFFERURL`: - Default: `true`. Not sure why this thing might not work. Please add trade offer URL by yourself [here](https://backpack.tf/settings##general) (login as your bot Steam account).
-   `SKIP_ACCOUNT_LIMITATIONS`: - Default: `false`. Used to check your account limitation. It's better to set to `true` if your bot Steam account already a [premium account](https://support.steampowered.com/kb_article.php?ref=3330-IAGK-7663).
-   `SKIP_UPDATE_PROFILE_SETTINGS`: - Default: `false`. This is just set your bot profile to public, so backpack.tf can load your bot inventory and etc correctly. If you already set all to public, just set this to `true`.

#### Your time

Time will be use in "!time" command and

-   `TIMEZONE` - Please only use these [Timezone Format](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones), for example "Asia/Kuala_Lumpur".
-   `CUSTOM_TIME_FORMAT` - Please refer [this article](https://www.tutorialspoint.com/momentjs/momentjs_format.htm). Default is `MMMM Do YYYY, HH:mm:ss ZZ`.
-   `TIME_ADDITIONAL_NOTES` - Your additional note when the bot show your current time, such as your active hours, etc.

#### Set to true if want to allow

-   `ALLOW_ESCROW`: - Default: `false`. Escrow = trade hold
-   `ALLOW_OVERPAY`: - Default: `true`. If people give an overpay, your bot will accept. Set it to `false` if you don't want.
-   `ALLOW_BANNED`: - Default: `false`. I think it's better to set as `false`.

#### Set time for price to be updated in seconds

-   `MAX_PRICE_AGE`: [Number - in seconds] - Default: 28800 - If the time recorded in your pricelist reach/more than this, it will triggered to check with prices.tf.

#### Compulsory variables

-   `ADMINS`: - Put your main SteamID64. Example - `["76561198013127982"]`, if you have multiple, `["76561198013127982", "76561198077208792"]`
-   `KEEP`: - Same as ADMINS, you must fill in BOTH.
-   `GROUPS`: - If you have Steam group, find your group ID and paste it here.
-   `ALERTS`: - If you set to `["trade"]`, your bot will send message/discord webhook every time a successful trades were made, other option is `["none"]`.

#### Set to true if want to enable debugging notes in console

-   `DEBUG`: - Used to debug if any problem occured.
-   `DEBUG_FILE`: - Same as above, but this will create a file which can be sent to [issue](https://github.com/idinium96/tf2autobot/issues/new/choose).

#### Backpack.tf sell or buy order listings note on all items in pricelist

-   `BPTF_DETAILS_BUY`: - Your buy order message.
-   `BPTF_DETAILS_SELL`: - Your sell order message.

**Parameters:**

-   `%name%` - display an item name
-   `%price%` - display item's buying/selling price
-   `%current_stock%` - display item's current stock (by default this is used in `BPTF_DETAILS_BUY`)
-   `%max_stock%` - display item's maximum stock (by default this is used in `BPTF_DETAILS_BUY`)
-   `%amount_trade%` - display amount that can be traded (between minimum and maximum stock, use it on `BPTF_DETAILS_SELL`)
-   `%amount_can_buy%` - display the amount that the bot can buy (use it on `BPTF_DETAILS_BUY`)
-   `%keyPrice%` - display current key rate (selling price), it will show as `Key rate: x ref/key` only if the item price include x key, otherwise, it will show as ✨
-   `%dueling%` - will display `(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟱x 𝗨𝗦𝗘𝗦)` on only Dueling Mini-Game listing - prefer to only place this on `BPTF_DETAILS_BUY`, on other item will show as ✨

**Usage example:**

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/85929261-f3787200-b8e5-11ea-9ba8-b1acb12a5aad.PNG" alt="listings" style="display: block; margin-left: auto; margin-right: auto;"></div>

#### Custom offer message

-   `OFFER_MESSAGE`: - Message that will appear when bot sends offer to trade partner. If leave empty (""), it will print _Powered by tf2-automatic_ by default.

### Discord Webhook Configuration

#### Basic configuration on your embed preferences/appearances

-   `DISCORD_OWNER_ID` - Right click on yourself and click `Copy ID` and paste here. Make sure to enable developer mode on your Discord settings > Appearance > Advanced.
-   `DISCORD_WEBHOOK_USERNAME` - Your Discord Webhook name, example: ※Fumino⚡
-   `DISCORD_WEBHOOK_AVATAR_URL` - Your Discord Webhook Avatar, must be in URL form. Example: https://gyazo.com/421792b5ea817c36054c7991fb18cdbc
-   `DISCORD_WEBHOOK_EMBED_COLOR_IN_DECIMAL_INDEX` - Embed color, you can found yours at [spycolor.com](https://www.spycolor.com/) and copy the one that said "has decimal index of: `take the value here`". Example: "9171753" for #8bf329 color.

**Note on How to get DISCORD_WEBHOOK_X_URL** - See this: https://gyazo.com/539739f0bab50636e20a0fb76e9f1720 (settings in your respective channels)

#### Queue alert

-   `DISABLE_DISCORD_WEBHOOK_SOMETHING_WRONG_ALERT`: - Same as `DISABLE_SOMETHING_WROMG_ALERT`, but if set to `true`, it will send to your Steam Chat.
-   `DISCORD_WEBHOOK_SOMETHING_WRONG_ALERT_URL` - Discord Webhook URL for SOMETHING_WROMG_ALERT.

#### Pricelist update

-   `DISABLE_DISCORD_WEBHOOK_PRICE_UPDATE`: - Display price updates on the items that are in your pricelist.
-   `DISCORD_WEBHOOK_PRICE_UPDATE_URL` - Discord Webhook URL for PRICE_UPDATE.
-   `DISCORD_WEBHOOK_PRICE_UPDATE_ADDITIONAL_DESCRIPTION_NOTE` - You can add note there, or just leave it empty.

#### Successful trade summary

-   `DISABLE_DISCORD_WEBHOOK_TRADE_SUMMARY`: - Display every successful trade summary on your trade summary/live-trades channel. If set to `true`, it will send to your Steam Chat.
-   `DISCORD_WEBHOOK_TRADE_SUMMARY_URL` - Discord Webhook URL for TRADE_SUMMARY.
-   `DISCORD_WEBHOOK_TRADE_SUMMARY_SHOW_QUICK_LINKS`: - Show trade partner quick links to their Steam profile, backpack.tf and SteamREP pages.
-   `DISCORD_WEBHOOK_TRADE_SUMMARY_SHOW_KEY_RATE`: - self explained.
-   `DISCORD_WEBHOOK_TRADE_SUMMARY_SHOW_PURE_STOCK`: - self explained.
-   `DISCORD_WEBHOOK_TRADE_SUMMARY_SHOW_INVENTORY`: - Show total current items in your bot inventory.
-   `DISCORD_WEBHOOK_TRADE_SUMMARY_ADDITIONAL_DESCRIPTION_NOTE` - Notes.
-   `DISCORD_WEBHOOK_TRADE_SUMMARY_MENTION_OWNER` - Set it to `true` if you want your bot to mention on every successful trades.
-   `DISCORD_WEBHOOK_TRADE_SUMMARY_MENTION_OWNER_ONLY_ITEMS_SKU` - Support multiple items sku, let say you want to be mentioned on every unusual and australium trades, just do `[";5;u", ";11;australium"]`, or if you want to mention on specific item, just fill in the full item sku like `["725;6;uncraftable"]`, then to add more, just separate it with a comma between each sku string.

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/86468435-ffdb4f80-bd69-11ea-9ab6-a7f5be2c22f0.PNG" alt="trade-summary-full" style="display: block; margin-left: auto; margin-right: auto;"></div>

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/86468438-0073e600-bd6a-11ea-8bc0-040229c997d5.PNG" alt="trade-summary-full2" style="display: block; margin-left: auto; margin-right: auto;"></div>

#### Offer review summary

-   `DISABLE_DISCORD_WEBHOOK_OFFER_REVIEW`: - Used to alert you on the trade that needs for offer review via Discord Webhook. If set to `true`, it will send to your Steam Chat.
-   `DISCORD_WEBHOOK_REVIEW_OFFER_URL` - Discord Webhook URL for REVIEW_OFFER.
-   `DISCORD_WEBHOOK_REVIEW_OFFER_SHOW_QUICK_LINKS`: - Show trade partner quick links to their Steam profile, backpack.tf and SteamREP pages.
-   `DISCORD_WEBHOOK_REVIEW_OFFER_DISABLE_MENTION_INVALID_VALUE`: - Set to `true` if you want your bot to not mention on only INVALID_VALUE offer.
-   `DISCORD_WEBHOOK_REVIEW_OFFER_SHOW_KEY_RATE`: - self explained.
-   `DISCORD_WEBHOOK_REVIEW_OFFER_SHOW_PURE_STOCK`: - self explained.

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/86468430-feaa2280-bd69-11ea-8f25-26a7a430b2e1.PNG" alt="only non-invalid-value2" style="display:block;margin-left:auto;margin-right:auto;"></div>

#### Messages

-   `DISABLE_DISCORD_WEBHOOK_MESSAGE_FROM_PARTNER`: - Used to alert you on any messages sent from trade partner. If set to `true`, it will send to your Steam Chat.
-   `DISCORD_WEBHOOK_MESSAGE_FROM_PARTNER_URL` - Discord Webhook URL for MESSAGE_FROM_PARTNER.
-   `DISCORD_WEBHOOK_MESSAGE_FROM_PARTNER_SHOW_QUICK_LINKS`: - Show trade partner quick links to their Steam profile, backpack.tf and SteamREP pages.

### Manual Review settings

-   `ENABLE_MANUAL_REVIEW`: - Set to `true` if you want any INVALID_VALUE/INVALID_ITEMS/OVERSTOCKED/DUPED_ITEMS/DUPE_CHECK_FAILED trades to be reviewed by you.
-   `DISABLE_SHOW_REVIEW_OFFER_SUMMARY`: - set to `true` if you do not want your bot to show offer summary to trade partner, but it will only notify trade partner that their offer is being hold for a review.
-   `DISABLE_REVIEW_OFFER_NOTE`: - If set to `false`, it will show note on [each error](https://github.com/idinium96/tf2autobot/blob/master/src/classes/MyHandler.ts#L1355-L1575)
-   `DISABLE_SHOW_CURRENT_TIME`: - If set to `false`, it will show owner time on offer review notification that trade partner will received.

-   `DISABLE_ACCEPT_INVALID_ITEMS_OVERPAY`: - Default: `false`. Set to `true` if you do not want your bot to accept a trade with INVALID_ITEMS but with their value more or equal to our value.
-   `DISABLE_ACCEPT_OVERSTOCKED_OVERPAY`: - Default: `true`. Set to `false` if you want your bot to accept a trade with OVERSTOCKED but with their value more or equal to our value.
-   `DISABLE_AUTO_DECLINE_INVALID_VALUE`: - Default: `false`. Set to `true` if you do not want to automatically decline trade with **ONLY** `INVALID_VALUE` and did not match the exception sku(s) and exception value.
-   `AUTO_DECLINE_INVALID_VALUE_NOTE`: - Your custom note on why the trade got declined. Default is nothing.

-   `INVALID_VALUE_EXCEPTION_SKUS` - An array of sku that will skip Invalid value if the difference between our and their value is not more than exception value in ref. Let say you want to trade an unusual, but then someone sent an offer with 0.11 ref less, but you want your bot to accept it anyway if it's less than 10 ref, so the trade will be accepted. By default, it will check only for any unusual and australium: `[";5;u", ";11;australium"]`, you can also leave it empty (`[""]`) so all with invalid value will be notified.
-   `INVALID_VALUE_EXCEPTION_VALUE_IN_REF` - Exception value for the sku(s) that you set above. Default is `0` (no exception).

-   `INVALID_VALUE_NOTE` - Your custom INVALID_VALUE note.
-   \*`INVALID_ITEMS_NOTE` - Your custom INVALID_ITEMS note.
-   \*`OVERSTOCKED_NOTE` - Your custom OVERSTOCKED note.
-   \*`DUPE_ITEMS_NOTE` - Your custom DUPE_ITEMS note.
-   \*`DUPE_CHECK_FAILED_NOTE` - Your custom DUPE_CHECK_FAILED note.
-   `ADDITIONAL_NOTE` - Your custom ADDITIONAL note.

**Notes:**
On each reasons **except INVALID_VALUE**, you can put `%name%` to list all the items that are on that reason, and `%isName%` for plural of "is", where if %name% is just 1 item, it will use "is", else if more then one item, it will use "are".

Example:
Let say the trade contains items with `INVALID_ITEMS`. The items are: Dueling Mini-Game, Secret Saxton.

You use custom `INVALID_ITEMS` note as: "%name% %isName% not in my pricelist. Please wait for my owner to check it."
What the trade partner will received: "Dueling Mini-Game, Secret Saxton are not in my pricelist. Please wait for my owner to check it."

### Others

-   `CUSTOM_PLAYING_GAME_NAME` - Custom name of the game your bot is playing. Limited to only 45 characters. Example: https://gyazo.com/308e4e05bf4c49929520df4e0064864c (you do not need to include that `- tf2-automatic`, just your custom game name but not more than 45 characters.)

-   `CUSTOM_WELCOME_MESSAGE` - Your custom WELCOME_MESSAGE note. Two parameters: `%name%` (display trade partner name) and `%admin%` (if admin, it will use "!help", else "!how2trade").
-   `CUSTOM_I_DONT_KNOW_WHAT_YOU_MEAN` - Your custom note when people sends wrong command.
-   `CUSTOM_HOW2TRADE_MESSAGE` - Your custom HOW2TRADE note.

-   `CUSTOM_SUCCESS_MESSAGE` - Your custom SUCCESS note.
-   `CUSTOM_DECLINED_MESSAGE` - Your custom DECLINED note.
-   `CUSTOM_TRADED_AWAY_MESSAGE` - Your custom note when the bot failed to trade because the item is traded away.
-   `CUSTOM_CLEARING_FRIENDS_MESSAGE` - Your custom note when the bot is removing friend to add someone else.
