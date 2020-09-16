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

Before you install the bot, there are a few things you will need:

-   You need a separate [Unlimited](https://support.steampowered.com/kb_article.php?ref=3330-IAGK-7663) Steam account with a mobile authenticator. I suggest using the [Steam Desktop Authenticator](https://github.com/Jessecar96/SteamDesktopAuthenticator) to authenticate the account and get the secret keys used to automate the generation of 2FA codes and managment of mobile confirmations.
-   NodeJS version 8 or above
-   Typescript 3.7 or above

Please refer to the [wiki](https://github.com/idinium96/tf2autobot/wiki) for guidance while setting up the bot. For additional support, please join the tf2autobot-IdiNium [Discord server](https://discord.gg/ZrVT7mc). You can also open an [issue](https://github.com/idinium96/tf2autobot/issues/new/choose).

## Download and installation

You can clone or download the bot by clicking on the green button in the top right. Follow the [installation guide](https://github.com/idinium96/tf2autobot/wiki/a.-Installation) for more instructions.

## Configuration

Once you have downloaded the source and installed the necessary packages, you can begin to configure the bot. Follow the [configuration guide](https://github.com/idinium96/tf2autobot/wiki/b.-Configuration).

## Join our Discord server!

Join the **tf2autobot-IdiNium** Discord server! [![Discord](https://img.shields.io/discord/664971400678998016.svg)](https://discord.gg/ZrVT7mc) Head over to `#🆚roles` channel and react to the first message to get notified whenever an update has been released!

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/88795539-c8c65580-d1d2-11ea-993e-4161083b3e36.PNG" alt="update-noti" style="display:block;margin-left:auto;margin-right:auto;width:400px;height:250px;"></div>

\*\*There are also giveaways held every Thursday, 8 AM - 8 PM (12 hours) Malaysia time!

## Difference between tf2autobot and tf2-automatic

tf2autobot adds advantageous features on top of the original features in the tf2-automatic repository. Let me list some notable features in the original tf2-automatic and some that have been added in tf2autobot:

### Original tf2-automatic

-   free autopricing (using prices from [prices.tf](https://prices.tf/)) and unlimited listings (only limited by your backpack.tf listings cap).
-   automatically craft/smelt pure metal (to maintain supply in all metal types).
-   dupe check on items that are more than a certain amount of keys (you decide/set the number of keys).
-   trade offer review (if you were offered an invalid value/item, the item is overstocked, or the item is duped).

### tf2autobot version

**Added an option to:**

-   use Discord Webhooks for your bot to send accepted trade summaries, pending trade offer reviews, and/or private messages to a Discord server.
-   disable "show only metal" in trade summary (it will show x keys, y ref instead of just x ref on the original version).
    -enable Autokeys (to maintain ample refined metal stock) and key banking ([jump](https://github.com/idinium96/tf2autobot#autokeys-auto-buy-or-sell-keys-feature)).
-   set your own custom greeting, success/failed messages, and/or trade offer review notes.
-   set craft weapons as currency (0.05 ref) and automatically craft duplicated craftable weapons and matched class weapons into metal.
-   send the trade partner a summary of their offer if it needs to be reviewed ([jump](https://github.com/idinium96/tf2autobot#offer-review-summary-on-trade-partner-side)).
-   automatically accept trades that underpay by a certain amount of refined with `INVALID_VALUE exception` (you decide/set the amount of refined and can be enabled only for certain item qualites).
-   automatically decline (skip manual review) **ONLY** `INVALID_VALUE` trade (if it does not meet the set requirements for `INVALID_VALUE exception`).
-   automatically accept (skip manual review) `INVALID_ITEMS` or `OVERSTOCKED` trades if the trade partner offers overpay.
-   request for `INVALID_ITEMS` to be priced by Prices.TF.
-   disable mention (Discord Webhook) on pending trade offers with `INVALID_VALUE`.
-   Dueling Mini-Game check - only accept 5 Uses!
-   Noise Maker check - only accept 25 Uses!
-   option to accept friend requests and invite people to join Steam groups.
-   option to alert admins when there's something wrong, such as a queue problem (the original one is still not fixed yet and I have no idea why), when your bot is out of space, or if your bot has less than the minimum amount of pure (must enable Autokeys feature).
-   new `UNDERSTOCKED` reason for manual review.
-   option to automatically decline `OVERSTOCKED` or `UNDERSTOCKED` reason.
-   option to recognize Strange Unusual as usual Unusual and vice versa.
-   notify owner if someone traded high valued items (spelled).
-   request pricecheck after every successful trade on each item involved in the trade (except craft weapons and pure).

**Others:**

-   automatically restart your bot if there's queue problem and automatically relist if backpack.tf is not synchronized with your bot's Autokeys listings (sometimes when it's set to automatically buy keys, on backpack.tf it's listed to sell keys).
-   emojis on almost all messages.
-   list all reasons and items for each trade offer review.
-   newly added commands: "!pure", "!time", "!delete", "!check", "!block", "!unblock", "!autokeys", "!refreshautokeys", "!refreshlist", "!find", "!inventory", and more!

## Added features

### Discord Webhook feature

Instead of your bot sending trade summaries, trade offer reviews, and messages to you via Steam Chat, your bot is able to send it to different channels in your Discord server!
If you want to intereact with the trade offer reviews and messages sent by your Discord Webhook, you must install [tf2-autocord](https://github.com/idinium96/tf2-autocord).

Screenshots:

-   Trade summary (or live-trades) -

      <div align="center"><img src="https://user-images.githubusercontent.com/47635037/89725250-1434fb00-da40-11ea-8ccc-8755b1af89c6.PNG" alt="trade-summary" style="display:block;margin-left:auto;margin-right:auto;"></div>

-   Offer review (when trade partner sent wrong value/overstocked/etc) -

      <div align="center"><img src="https://user-images.githubusercontent.com/47635037/85020166-80168800-b1a2-11ea-99f2-04766677fdf7.PNG" alt="Offer-review" style="display:block;margin-left:auto;margin-right:auto;"></div>

-   Messages (when the trade partner uses "!message" command -

      <div align="center"><img src="https://user-images.githubusercontent.com/47635037/84581313-9cb56780-ae12-11ea-9dcf-2d660d8ae184.PNG" alt="Messages" style="display:block;margin-left:auto;margin-right:auto;"></div>

-   Price update (Discord Only) - Show the price changes for each item on your pricelist -

      <div align="center"><img src="https://user-images.githubusercontent.com/47635037/83712639-cc1ce500-a658-11ea-855d-5de43b39ff2f.png" alt="price-update" style="display:block;margin-left:auto;margin-right:auto;"></div>

You can also set it to send only the trade summary via Discord and have others (like Offer review and Messages) still sent to you via Steam Chat.

Note: it's also an option to show key rate/pure stock/quick links on each Webhook message.

If you want to use this feature, you must use the [ecosystem.template.json](https://github.com/idinium96/tf2autobot/blob/master/template.ecosystem.json) from this version. It contains much more variables for you to fill in.

### Autokeys (auto buy or sell keys) feature

When this feature is enabled, your bot will automatically buy or sell keys depending on the amount of pure your bot currently has. You'll need to set your minimum/maximum keys and minimum/maximum refined metals in your ecosystem.json. Additional explaination can be found [here](https://github.com/idinium96/tf2autobot#autokeys-feature).

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

-   When your bot has enough keys to sell (when your ref < minimum) OR enough ref to buy more keys (when your ref > maximum and keys < max):

      <div align="center"><img src="https://user-images.githubusercontent.com/47635037/84581306-9a530d80-ae12-11ea-9bd5-3a988ac447d9.png" alt="autokeys1" style="display:block;margin-left:auto;margin-right:auto;"></div>

      <div align="center"><img src="https://user-images.githubusercontent.com/47635037/84581309-9b843a80-ae12-11ea-8374-0f7d3c631fa6.png" alt="autokeys2" style="display:block;margin-left:auto;margin-right:auto;"></div>

-   When your bot doesn't have enough keys to sell, Autokeys will not be active:

      <div align="center"><img src="https://user-images.githubusercontent.com/47635037/84581310-9c1cd100-ae12-11ea-80fa-085ad8bff73e.png" alt="autokeys3" style="display:block;margin-left:auto;margin-right:auto;"></div>

You can see the code of this feature [here](https://github.com/idinium96/tf2autobot/blob/master/src/classes/Autokeys.ts).

### Emojis and more commands added

#### Admin commands

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/92323077-5d409500-f068-11ea-8d44-4a6a127fbb10.png" alt="newlook-command-admin" style="display:block;margin-left:auto;margin-right:auto;"></div>

#### Trade partner commands

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/89725439-244dda00-da42-11ea-9ea8-f3e159c19cea.png" alt="newlook-command-partner" style="display:block;margin-left:auto;margin-right:auto;"></div>

### Offer review summary on trade partner side

![review-note-trade-partner](https://user-images.githubusercontent.com/47635037/85020170-8147b500-b1a2-11ea-96b5-1805ad8cc31c.PNG)

### INVALID_VALUE exception

If you're having your bot trade unusuals or australiums (which the value, as we know, is more than 5 keys), and someone sends a trade offer with 0.11 ref underpay, your bot will skip this offer and send you a notification to review this offer. With this exception, your bot will accept the trade as long as the underpay is less than the exception value that you've set. To use this feature, you'll need to set the exception value on both `INVALID_VALUE_EXCEPTION_SKUS` and `INVALID_VALUE_EXCEPTION_VALUE_IN_REF`. See [here](https://github.com/idinium96/tf2autobot#manual-review-settings).

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/84966884-38adde80-b145-11ea-9aac-d28daf9a74e6.PNG" alt="Invalid_value_exception2" style="display:block;margin-left:auto;margin-right:auto;width:540px;height:450px;"></div>

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/84966887-39df0b80-b145-11ea-9d81-021d302e7cf0.PNG" alt="Invalid_value_exception2" style="display:block;margin-left:auto;margin-right:auto;"></div>

## Variables in ecosystem.json summary

### Your bot credentials

|        Variable         |   Type   | Description                                                                                                                                                                                                                                                                                                |
| :---------------------: | :------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  `STEAM_ACCOUNT_NAME`   | `string` | Your bot's Steam account username (preferably your bot/alt Steam account)                                                                                                                                                                                                                                  |
|    `STEAM_PASSWORD`     | `string` | Your bot's Steam account password.                                                                                                                                                                                                                                                                         |
|  `STEAM_SHARED_SECRET`  | `string` | You can find this in the `<yourBotSteamID>.maFile` file inside `~/SDA/maFiles` folder. Open the file using notepad and search for `"shared_secret": "agdgwegdgawfagxafagfkagusbuigiuefh=="` <-- take only this one (which is `agdgwegdgawfagxafagfkagusbuigiuefh==` in this example. Do not use this one). |
| `STEAM_IDENTITY_SECRET` | `string` | Same as above (but now search for `identity_secret`).                                                                                                                                                                                                                                                      |

**Q: Where can I get those secrets?**

-   A: You need to activate Steam Guard for your bot account using [Steam Desktop Authenticator](https://github.com/Jessecar96/SteamDesktopAuthenticator)

### Prices.TF token

|       Variable       |   Type   | Description                                              |
| :------------------: | :------: | -------------------------------------------------------- |
| `PRICESTF_API_TOKEN` | `string` | You can leave this empty. No need to fill it out at all. |

### Backpack.tf token and API Key

You can run your bot without this initially. On the first run, your bot will print out your bot backpack.tf access token and apiKey. You'll need to copy and paste these into your ecosystem.json or .env file ([see this image](https://cdn.discordapp.com/attachments/697415702637838366/697820077248086126/bptf-api-token.png)). If you want to find it manually:

|      Variable       |   Type   | Description                                                                                                                                             |
| :-----------------: | :------: | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BPTF_ACCESS_TOKEN` | `string` | https://backpack.tf/connections - click on `Show Token` under User Token.                                                                               |
|   `BPTF_API_KEY`    | `string` | https://backpack.tf/developer/apikey/view - fill in site URL (`http://localhost:4566/tasks`) and comments (`Check if a user is banned on backpack.tf`). |

### Your bot settings

|      Variable       |   Type    | Default | Description                                                                                                                                                   |
| :-----------------: | :-------: | :-----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|     `AUTOBUMP`      | `boolean` | `false` | **DEPRECATED** - Please consider donating to backpack.tf or buy backpack.tf Premium. If you enable this, your bot will re-list all listings every 30 minutes. |
|   `MINIMUM_SCRAP`   | `integer` |   `9`   | If your bot has less, it will smelt reclaimed metal to maintain ample scrap metal supply.                                                                     |
| `MINIMUM_RECLAIMED` | `integer` |   `9`   | If your bot has less, it will smelt refined metal to maintain ample reclaimed metal supply.                                                                   |
|  `METAL_THRESHOLD`  | `integer` |   `9`   | If scrap/reclaimed metal has reached the minimum + threshold (max), it will combine the metal.                                                                |

#### Autokeys feature

|               Variable                |   Type    | Default | Description                                                                                                                                                                |
| :-----------------------------------: | :-------: | :-----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|           `ENABLE_AUTOKEYS`           | `boolean` | `false` | If you set to `true`, your bot will automatically sell/buy keys based on the availability of the refined metals and keys in your bot inventory.                            |
|      `ENABLE_AUTOKEYS_ BANKING`       | `boolean` | `false` | If set to `true`, your bot will bank keys (must also set `ENABLE_AUTOKEYS` to `true`). If current ref supply is in between min and max and keys > min, it will bank keys). |
|            `MINIMUM_KEYS`             | `number`  |   `3`   | When `current keys > minimum keys` (and if `current ref < minimum ref`), it will start selling keys, else, it will stop.                                                   |
|            `MAXIMUM_KEYS`             | `number`  |  `15`   | When `current keys < maximum keys` (and if `current ref > maximum ref`), it will start buying keys, else, it will stop.                                                    |
| `MINIMUM_REFINED_TO_ START_SELL_KEYS` | `number`  |  `30`   | Already explained in `MINIMUM_KEYS`.                                                                                                                                       |
| `MAXIMUM_REFINED_TO_ STOP_SELL_KEYS`  | `number`  |  `150`  | Already explained in `MAXIMUM_KEYS`.                                                                                                                                       |
|      `DISABLE_SCRAP_ ADJUSTMENT`      | `boolean` | `true`  | Set to `false` to make an adjustment on the key price when selling or buying. It is not possible to do for key banking.                                                    |
|       `SCRAP_ADJUSTMENT_ VALUE`       | `integer` |   `1`   | 1 scrap = 0.11 ref, 9 scrap = 1 ref                                                                                                                                        |
|    `AUTOKEYS_ACCEPT_UNDERSTOCKED`     | `boolean` | `false` | Set to `true` if you want your bot to accept trades that will lead to key become understocked.                                                                             |

\*\*This feature is meant to have your bot maintain enough pure in their inventory. Enabling "Autokeys - Banking" might cause this feature to not perform as intended.

#### Set to true if want to disable

|                Variable                 |   Type    | Default | Description                                                                                                                                            |
| :-------------------------------------: | :-------: | :-----: | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
|        `DISABLE_INVENTORY_ SORT`        | `boolean` | `false` | Sort your bot's inventory.                                                                                                                             |
|           `DISABLE_LISTINGS`            | `boolean` | `false` | Temporarily disable trading while your bot is alive.                                                                                                   |
|        `DISABLE_CRAFTING_ METAL`        | `boolean` | `false` | **NOT RECOMMENDED** to set is as `true` - it will cause your bot and the trade partner to not be able to trade because of missing scrap/reclaimed.     |
|       `DISABLE_CRAFTING_ WEAPONS`       | `boolean` | `false` | Set to `true` **if you DO NOT** want your bot to automatically craft any duplicated/matched class craftable weapons.                                   |
|           `DISABLE_MESSAGES`            | `boolean` | `false` | When `true`, people (that are friends with your bot) will be unable send messages to you with "!message" command.                                      |
|    `DISABLE_SOMETHING_ WRONG_ALERT`     | `boolean` | `false` | Used to notify owner if your bot has a queue problem/full inventory/is low in pure (if Autokeys is on).                                                |
|   `DISABLE_CRAFTWEAPON_ AS_CURRENCY`    | `boolean` | `false` | Set it as `true` if you don't want to set craft weapons as currency (0.05 ref).                                                                        |
| `DISABLE_GIVE_PRICE_ TO_INVALID_ITEMS`  | `boolean` | `false` | Set to `true` if you don't want `INVALID_ITEMS` (items that are not in your pricelist) to be priced using price from Prices.TF.                        |
|          `DISABLE_ADD_FRIENDS`          | `boolean` | `false` | Set to `true` if you don't want people to add your bot as a Steam friend (not recommended).                                                            |
|        `DISABLE_GROUPS_ INVITE`         | `boolean` | `false` | Set to `true` if you don't want your bot to invite people to join Steam groups **(You still need to have at least 1 group ID in the `GROUPS` array)**. |
| `DISABLE_CHECK_USES_ DUELING_MINI_GAME` | `boolean` | `false` | (must have 5 uses left). Set to `true` if you want your bot to buy Dueling Mini-Games regardless of how many uses are left.                            |
|    `DISABLE_CHECK_USES_ NOISE_MAKER`    | `boolean` | `false` | (must have 25 uses left). Set to `true` if you want your bot to buy Noise Makers regardless of how many uses are left.                                 |
|   `DISABLE_AUTO_REMOVE_ INTENT_SELL`    | `boolean` | `false` | By default, any pricelist entry with intent=sell will be automatically removed when the particular item is sold and no longer in the bot inventory.    |

#### Set to true if want to enable

|           Variable            |   Type    | Default | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| :---------------------------: | :-------: | :-----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NORMALIZE_ FESTIVIZED_ITEMS` | `boolean` | `false` | Set to `true` if you want your bot to recognize `Festivized` items as `Non-Festivized` items. For example, if your bot is selling a `Strange Australium Black Box`, but someone sent to your bot a Festivized version with the name `Festivized Strange Australium Black Box`, the bot by default will either decline or skip (depending on if you enable manual review) the offer becuase it's not a match. Thus, set to `true` if you want your bot to recognize `Festivized Strange Australium Black Box` as `Strange Australium Black Box`. |
| `NORMALIZE_ STRANGE_UNUSUAL`  | `boolean` | `false` | Set to `true` if you want Strange Unusuals (sku ends with `;strange`) to be recognized as normal Unusuals (sku doesn't end with `;strange`).                                                                                                                                                                                                                                                                                                                                                                                                    |

#### Misc feature

|           Variable            |       Type       | Default | Description                                                                                                                                                                                                                                        |
| :---------------------------: | :--------------: | :-----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TRADES_MADE_ STARTER_VALUE`  |    `integer`     |   `0`   | Used mainly for displaying how many total trades your bot has made found in your bot Steam Profile page (leave it 0 if you don't care about it, used for discord webhook).                                                                         |
|     `LAST_TOTAL_ TRADES`      |    `integer`     |   `0`   | Used if your polldata.json is getting bigger (which consumes a lot of RAM) but you want to keep the number of total successful trades that your bot has made (leave it 0 if you don't care about it).                                              |
| `TRADING_STARTING_ TIME_UNIX` | `integer` (Unix) |   `0`   | Also same as `LAST_TOTAL_TRADES`, but this is the latest time (leave it 0 if you don't care about it). To read more, check out my [Discord server post](https://discordapp.com/channels/664971400678998016/666909518604533760/707706994932449410). |

#### Duped unusual check feature

|          Variable          |   Type    | Default | Description                                                                                                                 |
| :------------------------: | :-------: | :-----: | --------------------------------------------------------------------------------------------------------------------------- |
| `ENABLE_SHOW_ ONLY_METAL`  | `boolean` | `true`  | If set to `false`, it will show `[x keys, y ref]`, example: `(5 keys, 10 ref)`, instead of `[x ref]`, example: `(260 ref)`. |
|    `ENABLE_DUPE_CHECK`     | `boolean` | `true`  | Enable/disable dupe check on unusuals.                                                                                      |
|      `DECLINE_DUPES`       | `boolean` | `false` | Explains itself.                                                                                                            |
| `MINIMUM_KEYS_ DUPE_CHECK` | `number`  |  `10`   | Explains itself.                                                                                                            |

#### Set to true if want to skip

|            Variable             |   Type    | Default | Description                                                                                                                                                                                         |
| :-----------------------------: | :-------: | :-----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   `SKIP_BPTF_ TRADEOFFERURL`    | `boolean` | `true`  | Not sure why this may not work. Please add trade offer URL by yourself [here](https://backpack.tf/settings##general) (login as your bot Steam account).                                             |
|   `SKIP_ACCOUNT_ LIMITATIONS`   | `boolean` | `true`  | Used to check your account limitation. It's better to set to `true` if your bot's Steam account is already a [premium account](https://support.steampowered.com/kb_article.php?ref=3330-IAGK-7663). |
| `SKIP_UPDATE_ PROFILE_SETTINGS` | `boolean` | `true`  | This is just to set your bot's Steam profile to public so backpack.tf can load your bot inventory and etc correctly. If you already set everything to public, just set this to `true`.              |

#### Your time

Time will be use in "!time" command and

|         Variable         |   Type   | Default | Description                                                                                                                              |
| :----------------------: | :------: | :-----: | ---------------------------------------------------------------------------------------------------------------------------------------- |
|        `TIMEZONE`        | `string` |  `UTC`  | Please only use these [Timezone Format](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones). For example, `Asia/Kuala_Lumpur`. |
|  `CUSTOM_TIME_ FORMAT`   | `string` |    →    | `MMMM Do YYYY, HH:mm:ss ZZ` - Please refer to [this article](https://www.tutorialspoint.com/momentjs/momentjs_format.htm)                |
| `TIME_ADDITIONAL_ NOTES` | `string` |  `""`   | Optional additional notes when the bot shows your current time - your active hours, etc.                                                 |

#### Set to true if want to allow

|    Variable     |   Type    | Default | Description                                                                                                                              |
| :-------------: | :-------: | :-----: | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `ALLOW_ESCROW`  | `boolean` | `false` | Escrow = trade hold.                                                                                                                     |
| `ALLOW_OVERPAY` | `boolean` | `true`  | If people offer overpay, your bot will accept. Set it to `false` if you want it to decline.                                              |
| `ALLOW_BANNED`  | `boolean` | `false` | I think it's best to set as `false`. If set as `true`, your bot will trade with backpack.tf banned or steamrep.com scammer marked users. |

#### Set time for price to be updated in seconds

|    Variable     |   Type   |     Default     | Description                                                                                                                    |
| :-------------: | :------: | :-------------: | ------------------------------------------------------------------------------------------------------------------------------ |
| `MAX_PRICE_AGE` | `number` | `28800` (8 hrs) | If an items price hasn't been updated in longer than this amount of time, it will triggered to check its price with Prices.tf. |

#### Compulsory variables

| Variable |    Type    |                                        Default                                         | Description                                                                                                                                                                                                                               |
| :------: | :--------: | :------------------------------------------------------------------------------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ADMINS` | `string[]` |                                         `[""]`                                         | Put your main SteamID64. Example - `["76561198013127982"]`. If you have multiple - `["76561198013127982", "76561198077208792"]`                                                                                                           |
|  `KEEP`  | `string[]` |                                         `[""]`                                         | Same as `ADMINS`, you must fill in **BOTH**.                                                                                                                                                                                              |
| `GROUPS` | `string[]` | [see](https://github.com/idinium96/tf2autobot/blob/master/template.ecosystem.json#L79) | Default groups are [tf2-automatic](https://steamcommunity.com/groups/tf2automatic) and [IdiNium's Trading Bot](https://steamcommunity.com/groups/IdiNiumNetwork) groups. If you have a Steam group, find your group ID and paste it here. |
| `ALERTS` | `string[]` |                                      `["trade"]`                                       | By default your bot will send a message/discord webhook every time a successful trade is made. Other option is `["none"]`.                                                                                                                |

#### Set to true if want to enable debugging notes in console

|   Variable   |   Type    | Default | Description                                                                                                                         |
| :----------: | :-------: | :-----: | ----------------------------------------------------------------------------------------------------------------------------------- |
|   `DEBUG`    | `boolean` | `true`  | Used to debug if any problem has occured.                                                                                           |
| `DEBUG_FILE` | `boolean` | `true`  | Same as above, but this will create a file which can be sent to [issue](https://github.com/idinium96/tf2autobot/issues/new/choose). |

#### Backpack.tf sell or buy order listings note on all items in pricelist

|      Variable       |   Type   |                                        Default                                         | Description              |
| :-----------------: | :------: | :------------------------------------------------------------------------------------: | ------------------------ |
| `BPTF_DETAILS_BUY`  | `string` | [see](https://github.com/idinium96/tf2autobot/blob/master/template.ecosystem.json#L85) | Your buy order message.  |
| `BPTF_DETAILS_SELL` | `string` | [see](https://github.com/idinium96/tf2autobot/blob/master/template.ecosystem.json#L86) | Your sell order message. |

**Parameters:**

-   `%name%` - display an items name.
-   `%price%` - display items buying/selling price.
-   `%current_stock%` - display an items current stock (by default this is used in `BPTF_DETAILS_BUY`).
-   `%max_stock%` - display an items maximum stock (by default this is used in `BPTF_DETAILS_BUY`).
-   `%amount_trade%` - display the amount that can be traded (between minimum and maximum stock, used in `BPTF_DETAILS_SELL`).
-   `%amount_can_buy%` - display the amount that the bot can buy (use it on `BPTF_DETAILS_BUY`).
-   `%keyPrice%` - display the current key rate (selling price). It will display as `Key rate: x ref/key` only if the item price includes x key. Otherwise, it will show as ✨.
-   `%dueling%` - display `(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟱x 𝗨𝗦𝗘𝗦)` on only Dueling Mini-Game listings - prefer to only place this on `BPTF_DETAILS_BUY`. On other items it will show as ✨.

**Usage example:**

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/85929261-f3787200-b8e5-11ea-9ba8-b1acb12a5aad.PNG" alt="listings" style="display: block; margin-left: auto; margin-right: auto;"></div>

#### Custom offer message

|    Variable     |   Type   | Default | Description                                                                                                                                         |
| :-------------: | :------: | :-----: | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OFFER_MESSAGE` | `string` |  `""`   | Message that will appear when bot sends an offer to the trade partner. If left empty (""), it will print _**Powered by tf2-automatic**_ by default. |

### Discord Webhook Configuration

#### Basic configuration on your embed preferences/appearances

`X = DISCORD_WEBHOOK`

|             Variable              |   Type   | Default | Description                                                                                                                                                                                |
| :-------------------------------: | :------: | :-----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|        `DISCORD_OWNER_ID`         | `string` |  `""`   | Right click on yourself, click `Copy ID`, and paste it here. Make sure to enable developer mode on your Discord settings > Appearance > Advanced.                                          |
|           `X_USERNAME`            | `string` |  `""`   | Your Discord Webhook name. Example: ※Fumino⚡                                                                                                                                              |
|          `X_AVATAR_URL`           | `string` |  `""`   | Your Discord Webhook Avatar - must be in URL form. Example: https://gyazo.com/421792b5ea817c36054c7991fb18cdbc                                                                             |
| `X_EMBED_COLOR_IN_ DECIMAL_INDEX` | `string` |  `""`   | Embed color - you can find yours at [spycolor.com](https://www.spycolor.com/). Copy the one that says "has decimal index of: `take the value here`". Example: "9171753" for #8bf329 color. |

---

### Note on How to get `DISCORD_WEBHOOK_X_URL`

`X = SOMETHING_WRONG_ALERT | PRICE_UPDATE | TRADE_SUMMARY | OFFER_REVIEW | MESSAGE_FROM_PARTNER`

See this: https://gyazo.com/539739f0bab50636e20a0fb76e9f1720 (settings in your respective channels)

---

#### Queue alert

`X = DISCORD_WEBHOOK_SOMETHING_WRONG_ALERT`

|  Variable   |   Type    | Default | Description                                                                                                                                                               |
| :---------: | :-------: | :-----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DISABLE_X` | `boolean` | `false` | Same as [`DISABLE_SOMETHING_WRONG_ALERT`](https://github.com/idinium96/tf2autobot#set-to-true-if-want-to-disable), but if set to `true`, it will send to your Steam Chat. |
|   `X_URL`   | `string`  |  `""`   | Discord Webhook URL for `SOMETHING_WRONG_ALERT`.                                                                                                                          |

#### Pricelist update

`X = DISCORD_WEBHOOK_PRICE_UPDATE`

|             Variable             |   Type    | Default | Description                                                    |
| :------------------------------: | :-------: | :-----: | -------------------------------------------------------------- |
|           `DISABLE_X`            | `boolean` | `false` | Display price updates on the items that are in your pricelist. |
|             `X_URL`              | `string`  |  `""`   | Discord Webhook URL for `PRICE_UPDATE`.                        |
| `X_ADDITIONAL_ DESCRIPTION_NOTE` | `string`  |  `""`   | You can add some notes there or just leave it empty.           |

#### Successful trade summary

`X = DISCORD_WEBHOOK_TRADE_SUMMARY`

|             Variable              |    Type    | Default | Description                                                                                                                                                                                                                                                                                                                      |
| :-------------------------------: | :--------: | :-----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|            `DISABLE_X`            | `boolean`  | `false` | Display each successful trade summary on your trade summary/live-trades channel via Discord Webhook. If set to `true`, it will send to your Steam Chat.                                                                                                                                                                          |
|              `X_URL`              | `string[]` | `[""]`  | An array of the Discord Webhook URL for `TRADE_SUMMARY`. You will need to put it like this: `["yourDiscordWebhookLink"]`, or if you want to add more than one, you can do it like this: `["link1", "link2"]` (separate each link with a comma, make sure `link1` is your **own** Discord Webhook URL).                           |
|       `X_SHOW_QUICK_LINKS`        | `boolean`  | `true`  | Show the trade partner's quick links to their Steam profile, backpack.tf, and SteamREP pages.                                                                                                                                                                                                                                    |
|         `X_SHOW_KEY_RATE`         | `boolean`  | `true`  | Refer example below.                                                                                                                                                                                                                                                                                                             |
|        `X_SHOW_PURE_STOCK`        | `boolean`  | `true`  | Refer example below.                                                                                                                                                                                                                                                                                                             |
|        `X_SHOW_INVENTORY`         | `boolean`  | `true`  | Show the total amount of items in your bot's inventory.                                                                                                                                                                                                                                                                          |
| `X_ADDITIONAL_ DESCRIPTION_NOTE`  |  `string`  |  `""`   | If you want to do like in the example below, it will be `[YourText](Link)`                                                                                                                                                                                                                                                       |
|         `X_MENTION_OWNER`         | `boolean`  | `false` | Set this to`true`if you want to be mentioned on each successful trade.                                                                                                                                                                                                                                                           |
| `X_MENTION_OWNER_ ONLY_ITEMS_SKU` | `string[]` | `[""]`  | Support multiple items sku - let say you just want to be mentioned on every unusual and australium trade - just do`[";5;u", ";11;australium"]`. If you want to be mentioned on specific items, just fill in the full item sku like`["725;6;uncraftable"]`. To add more, just separate it with a comma between each sku `string`. |

**\*Note**: Want to feature your bots trades on the tf2autobot Discord server? Sure! I will give you the link upon request.

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/86468435-ffdb4f80-bd69-11ea-9ab6-a7f5be2c22f0.PNG" alt="trade-summary-full" style="display: block; margin-left: auto; margin-right: auto;"></div>

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/86468438-0073e600-bd6a-11ea-8bc0-040229c997d5.PNG" alt="trade-summary-full2" style="display: block; margin-left: auto; margin-right: auto;"></div>

#### Offer review summary

`X = DISCORD_WEBHOOK_REVIEW_OFFER`

|              Variable              |   Type    | Default | Description                                                                                                                    |
| :--------------------------------: | :-------: | :-----: | ------------------------------------------------------------------------------------------------------------------------------ |
|            `DISABLE_X`             | `boolean` | `false` | Used to alert you on the trade that needs offer review via Discord Webhook. If set to `true`, it will send to your Steam Chat. |
|              `X_URL`               | `string`  |  `""`   | Discord Webhook URL for `REVIEW_OFFER`.                                                                                        |
| `X_DISABLE_MENTION_ INVALID_VALUE` | `boolean` | `false` | Set to`true`if you want your bot to not mention you on only `INVALID_VALUE` offers.                                            |
|        `X_SHOW_QUICK_LINKS`        | `boolean` | `true`  | Show the trade partner's quick links to their Steam profile, backpack.tf, and SteamREP pages.                                  |
|         `X_SHOW_KEY_RATE`          | `boolean` | `true`  | Refer example below.                                                                                                           |
|        `X_SHOW_PURE_STOCK`         | `boolean` | `true`  | Refer example below.                                                                                                           |

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/86468430-feaa2280-bd69-11ea-8f25-26a7a430b2e1.PNG" alt="only non-invalid-value2" style="display:block;margin-left:auto;margin-right:auto;"></div>

#### Messages

`X = DISCORD_WEBHOOK_MESSAGE_FROM_PARTNER`

|       Variable        |   Type    | Default | Description                                                                                                                           |
| :-------------------: | :-------: | :-----: | ------------------------------------------------------------------------------------------------------------------------------------- |
|      `DISABLE_X`      | `boolean` | `false` | Used to alert you on any messages sent from the trade partner via Discord Webhook. If set to `true`, it will send to your Steam Chat. |
|        `X_URL`        | `string`  |  `""`   | Discord Webhook URL for `MESSAGE_FROM_PARTNER`.                                                                                       |
| `X_SHOW_ QUICK_LINKS` | `boolean` | `true`  | Show the trade partner's quick links to their Steam profile, backpack.tf, and SteamREP pages.                                         |

### Manual Review settings

|                Variable                 |    Type    | Default | Description                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| :-------------------------------------: | :--------: | :-----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|         `ENABLE_MANUAL_REVIEW`          | `boolean`  | `true`  | By default, offer with `INVALID_VALUE`/ `INVALID_ITEMS`/ `OVERSTOCKED`/ `UNDERSTOCKED`/ `DUPED_ITEMS`/ `DUPE_CHECK_FAILED` will be manually reviewed by you.                                                                                                                                                                                                                                                                                            |
|  `DISABLE_SHOW_REVIEW_ OFFER_SUMMARY`   | `boolean`  | `false` | Set to `true` if you do not want your bot to show the trade offer summary to the trade partner - it will only notify trade partner that their offer is being held for review.                                                                                                                                                                                                                                                                           |
|      `DISABLE_REVIEW_ OFFER_NOTE`       | `boolean`  | `false` | By default, it will show notes on each [reason](https://github.com/idinium96/tf2autobot/blob/master/src/classes/MyHandler.ts#L1804-L1940)                                                                                                                                                                                                                                                                                                               |
|      `DISABLE_SHOW_ CURRENT_TIME`       | `boolean`  | `false` | By default, it will show the owner's time on offer review notification that the trade partner will receive.                                                                                                                                                                                                                                                                                                                                             |
| `DISABLE_ACCEPT_ INVALID_ITEMS_OVERPAY` | `boolean`  | `false` | Set this to `true` if you do not want your bot to accept trades with `INVALID_ITEMS` but the value of their side is greater than or equal to the value of your bot's side.                                                                                                                                                                                                                                                                              |
|  `DISABLE_ACCEPT_ OVERSTOCKED_OVERPAY`  | `boolean`  | `true`  | Set this to `false` if you want your bot to accept trades with `OVERSTOCKED` but the value of their side is greater than or equal to the value of your bot's side.                                                                                                                                                                                                                                                                                      |
| `DISABLE_ACCEPT_ UNDERSTOCKED_OVERPAY`  | `boolean`  | `true`  | Set to `false` if you want your bot to accept a trade with `UNDERSTOCKED` but with their value more or equal to our value.                                                                                                                                                                                                                                                                                                                              |
|   `DISABLE_AUTO_ DECLINE_OVERSTOCKED`   | `boolean`  | `true`  | Set this to `false` if you want your bot to decline an offer with **ONLY** `OVERSTOCKED` reason (manual review must be enabled.).                                                                                                                                                                                                                                                                                                                       |
|  `DISABLE_AUTO_ DECLINE_UNDERSTOCKED`   | `boolean`  | `true`  | Set this to `false` if you want your bot to decline an offer with **ONLY** `UNDERSTOCKED` reason (manual review must be enabled.)                                                                                                                                                                                                                                                                                                                       |
|  `DISABLE_AUTO_ DECLINE_INVALID_VALUE`  | `boolean`  | `false` | Set this to `true` if you do not want your bot to automatically decline trades with **ONLY** `INVALID_VALUE` (which did not match the exception sku(s) and exception value).                                                                                                                                                                                                                                                                            |
|   `AUTO_DECLINE_ INVALID_VALUE_NOTE`    |  `string`  |  `""`   | Your custom note on why the trade got declined. Default is nothing.                                                                                                                                                                                                                                                                                                                                                                                     |
|     `INVALID_VALUE_ EXCEPTION_SKUS`     | `string[]` | `[""]`  | An array of sku that will skip `INVALID_VALUE` if the difference between the bot's value and their value is not more than exception value. Let's say your bot is selling an Unusual and someone sent an offer with 0.11 ref less - you want your bot to accept it anyway! By default, it will check only for Unusuals and Australiums: `[";5;u", ";11;australium"]`. You can also leave it empty (`[""]`) so all with `INVALID_VALUE` will be notified. |
| `INVALID_VALUE_ EXCEPTION_VALUE_IN_REF` |  `number`  |   `0`   | - Exception value for the sku(s) that you set above. Default is `0` (no exception).                                                                                                                                                                                                                                                                                                                                                                     |
|          `INVALID_VALUE_NOTE`           |  `string`  |  `""`   | Your custom `INVALID_VALUE` note.                                                                                                                                                                                                                                                                                                                                                                                                                       |
|         \*`INVALID_ITEMS_NOTE`          |  `string`  |  `""`   | Your custom `INVALID_ITEMS` note.                                                                                                                                                                                                                                                                                                                                                                                                                       |
|          \*`OVERSTOCKED_NOTE`           |  `string`  |  `""`   | Your custom `OVERSTOCKED` note.                                                                                                                                                                                                                                                                                                                                                                                                                         |
|          \*`UNDERSTOCKED_NOTE`          |  `string`  |  `""`   | Your custom `UNDERSTOCKED` note.                                                                                                                                                                                                                                                                                                                                                                                                                        |
|           \*`DUPE_ITEMS_NOTE`           |  `string`  |  `""`   | Your custom `DUPE_ITEMS` note.                                                                                                                                                                                                                                                                                                                                                                                                                          |
|       \*`DUPE_CHECK_FAILED_NOTE`        |  `string`  |  `""`   | Your custom `DUPE_CHECK_FAILED` note.                                                                                                                                                                                                                                                                                                                                                                                                                   |
|            `ADDITIONAL_NOTE`            |  `string`  |  `""`   | Your custom `ADDITIONAL` note.                                                                                                                                                                                                                                                                                                                                                                                                                          |

---

**Notes:**
On each reason **except** `INVALID_VALUE`, you can put `%name%` to list all the items that are on that reason, and `%isName%` for plural of "is" - where if `%name%` is just 1 item, it will use "is", else if more then one item, it will use "are".

Example:
Let say the trade contains items with `INVALID_ITEMS`. The items are: Dueling Mini-Game, Secret Saxton.

-   You use custom `INVALID_ITEMS` note as: `"%name% %isName% not in my pricelist. Please wait for my owner to check it."`

-   What the trade partner will receive: `"Dueling Mini-Game, Secret Saxton are not in my pricelist. Please wait for my owner to check it."`

For `OVERSTOCKED` and `UNDERSTOCKED`, parameter `%name%` will print out a list of `amountCanTrade - item_name` (example, `1 - Secret Saxton, 0 - Jag`).

**Default Notes:**

-   `INVALID_VALUE`: `You're taking too much in value.`
-   `INVALID_ITEMS`: `%name% is|are not in my pricelist.`
-   `OVERSTOCKED`: `I can only buy %name% right now.`
-   `UNDERSTOCKED`: `I can only sell %amountCanTrade% - %name% right now.`
-   `DUPED_ITEMS`: `%name% is|are appeared to be duped.`
-   `DUPE_CHECK_FAILED`: `I failed to check for duped on %name%.`

---

### Others

|              Variable               |   Type   | Default | Description                                                                                                                                                                                                                                                                                 |
| :---------------------------------: | :------: | :-----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|     `CUSTOM_PLAYING_ GAME_NAME`     | `string` |  `""`   | Custom name of the game your bot is playing. Limited to only 45 characters. Example: https://gyazo.com/308e4e05bf4c49929520df4e0064864c (you do not need to include `- tf2-automatic`, just your custom game name.)                                                                         |
|      `CUSTOM_WELCOME_ MESSAGE`      | `string` |  `""`   | Your custom `WELCOME_MESSAGE` note. Two parameters: `%name%` (display trade partner's name) and `%admin%` (if admin, it will use "!help", else "!how2trade").                                                                                                                               |
| `CUSTOM_I_DONT_KNOW_ WHAT_YOU_MEAN` | `string` |  `""`   | Your custom note when people send the wrong command.                                                                                                                                                                                                                                        |
|     `CUSTOM_HOW2TRADE_ MESSAGE`     | `string` |  `""`   | Your custom `HOW2TRADE` note.                                                                                                                                                                                                                                                               |
|      `CUSTOM_SUCCESS_ MESSAGE`      | `string` |  `""`   | Your custom `SUCCESS` note.                                                                                                                                                                                                                                                                 |
|     `CUSTOM_DECLINED_ MESSAGE`      | `string` |  `""`   | Your custom `DECLINED` note. Two parameters can be used - [`%reason%`](https://github.com/idinium96/tf2autobot/blob/master/src/classes/MyHandler.ts#L1388-L1443) and [`%invalid_value_summary%`](https://github.com/idinium96/tf2autobot/blob/master/src/classes/MyHandler.ts#L1445-L1457). |
|    `CUSTOM_TRADED_ AWAY_MESSAGE`    | `string` |  `""`   | Your custom note when the bot fails to trade because the item is traded away.                                                                                                                                                                                                               |
| `CUSTOM_CLEARING_ FRIENDS_MESSAGE`  | `string` |  `""`   | Your custom note when the bot is removing friends to add someone else Usable parameter - `%name%` (display trade partner's name).                                                                                                                                                           |
