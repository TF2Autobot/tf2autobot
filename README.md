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
-   automatically add any accepted `INVALID_ITEMS` (except skins) to sell (if and only if it's priced at prices.tf and not from ADMINS).

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

## Environmental Variables summary

You can know more about each variable found in the `.env` and `ecosystem.json` file [here](https://github.com/idinium96/tf2autobot/wiki/b.-Configuration#more-description-of-each-variable).
