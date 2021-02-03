Now that you have downloaded and installed the bot you can start configuring your bot.

First, we will set up the environment file, which you will use to configure the bot to your needs.

# Environment File and Environment Variables

## Windows Setup

For Windows, the bot is configured through environment variables that can be set using a file (`.env`) that the bot reads when it starts.

The content of the `.env` file:

```
NODE_ENV="production"

STEAM_ACCOUNT_NAME=""
STEAM_PASSWORD=""
STEAM_SHARED_SECRET=""
STEAM_IDENTITY_SECRET=""

BPTF_ACCESS_TOKEN=""
BPTF_API_KEY=""

ADMINS=["<your steamid 64>"]
KEEP=["<steamid of person to keep in friendslist>"]
GROUPS=["103582791464047777","103582791462300957"]
ALERTS=["trade"]

PRICESTF_API_TOKEN=""

SKIP_BPTF_TRADEOFFERURL=true
SKIP_ACCOUNT_LIMITATIONS=true
SKIP_UPDATE_PROFILE_SETTINGS=true

TIMEZONE=""
CUSTOM_TIME_FORMAT=""
TIME_ADDITIONAL_NOTES=""

DEBUG=true
DEBUG_FILE=true
```

**Please ensure that you have file extension viewing enabled in your Windows settings prior to continuing (click [here](https://www.howtogeek.com/205086/beginner-how-to-make-windows-show-file-extensions/) for more information).**

Modify the [template.env](https://github.com/idinium96/tf2autobot/blob/master/template.env) file found in your `tf2autobot/` folder, renaming it to `.env` (yes, only a dot (`.`) and a word `env`). This file will be the file you edit when you want to configure your bot, using the below variables.

## Linux Setup

For Linux, the bot is configured through environment variables that can be set using a file (`ecosystem.json`) that the bot reads when it starts.

The content of `ecosystem.json` file:

```
{
    "apps": [
        {
            "name": "tf2autobot",
            "script": "dist/app.js",
            "exec_mode": "fork",
            "shutdown_with_message": false,
            "max_memory_restart": "1500M",
            "kill_retry_time": 30000,
            "kill_timeout": 60000,
            "out_file": "NULL",
            "error_file": "NULL",
            "env": {
                "NODE_ENV": "production",

                "STEAM_ACCOUNT_NAME": "",
                "STEAM_PASSWORD": "",
                "STEAM_SHARED_SECRET": "",
                "STEAM_IDENTITY_SECRET": "",

                "BPTF_ACCESS_TOKEN": "",
                "BPTF_API_KEY": "",

                "ADMINS": ["<your steamid 64>"],
                "KEEP": ["<steamid of person to keep in friendslist>"],
                "GROUPS": ["103582791464047777", "103582791462300957"],
                "ALERTS": ["trade"],

                "PRICESTF_API_TOKEN": "",

                "SKIP_BPTF_TRADEOFFERURL": true,
                "SKIP_ACCOUNT_LIMITATIONS": true,
                "SKIP_UPDATE_PROFILE_SETTINGS": true,

                "TIMEZONE": "",
                "CUSTOM_TIME_FORMAT": "",
                "TIME_ADDITIONAL_NOTES": "",

                "DEBUG": true,
                "DEBUG_FILE": true
            }
        }
    ]
}
```

Modify the [template.ecosystem.json](https://github.com/idinium96/tf2autobot/blob/master/template.ecosystem.json) file found in your `tf2autobot/` folder, renaming it to `ecosystem.json`. This file will be the file you edit when you want to configure your bot, using the below variables.

---

# Required Variables

To be able to start the bot, you need to set a few compulsory variables. **All of the variables in this section must be set or your bot will not run!**

If you have followed the [Before You Start](https://github.com/idinium96/tf2autobot/wiki/Before-you-start) section of the guide, you should already have your `STEAM_SHARED_SECRET` and `STEAM_IDENTITY_SECRET` on-hand.

## Bot Credentials

| Variable | Type | Description |
| :------: | :--: | ----------- |
| `STEAM_ACCOUNT_NAME` | `string` | The Steam account username of your bot account |
| `STEAM_PASSWORD` | `string` | The Steam account password of your bot account |
|  `STEAM_SHARED_SECRET`  | `string` | You can find this in the `<yourBotSteamID>.maFile` file inside the `/SDA/maFiles/` folder. Open the file using notepad and search for your `shared_secret`. An example of what that may look like is `"shared_secret": "agdgwegdgawfagxafagfkagusbuigiuefh=="` . |
| `STEAM_IDENTITY_SECRET` | `string` | Same as above (but now search for `identity_secret`). |

**Question: Where can I obtain the above secrets?**

Answer: You need to activate Steam Guard for your bot account using [Steam Desktop Authenticator](https://github.com/Jessecar96/SteamDesktopAuthenticator). This application can be set up on your desktop and does not need to be set up on the system running the bot. Once SDA is fully set up, all you will need to do is transfer the secrets as described above.

## Backpack.tf User Token and API Key

If you have followed the [Before You Start](https://github.com/idinium96/tf2autobot/wiki/Before-you-start) section of the guide, you should already have your `BPTF_ACCESS_TOKEN` and `BPTF_API_KEY` on-hand.

You are able to run your bot without the User Token and API Key initially. On the first run, your bot will print out your backpack.tf User Token and API Key. You'll need to copy and paste these into your `ecosystem.json` (on Linux) or `.env` file (on Windows). Please [see this image](https://cdn.discordapp.com/attachments/697415702637838366/697820077248086126/bptf-api-token.png) for more information.

After obtaining your backpack.tf User Token and API Key, update the following variables in your configuration file:

|      Variable       |   Type   | Description                       |
| :-----------------: | :------: | --------------------------------- |
| `BPTF_ACCESS_TOKEN` | `string` | Your bot's backpack.tf User Token |
|   `BPTF_API_KEY`    | `string` | Your bot's backpack.tf API Key    |

**Question: Where can I obtain the above token/key if I am obtaining them manually from the backpack.tf?**

Answer:

-   User Token: While logged into backpack.tf as your bot account go to https://backpack.tf/connections and click `Show Token` under "User Token".
-   API Key: While still logged into backpack.tf as your bot account go to https://backpack.tf/developer/apikey/view - fill in the following for the "site URL" `http://localhost:4566/tasks` and the following for "comments" `Check if a user is banned on backpack.tf`.

## Owners' Details and Other Required Variables

| Variable | Type | Default | Description |
| :------: | :--: | :-----: | ----------- |
| `ADMINS` | `string[]` | `[""]` | The SteamID64 of your primary account (not your bot). Example: `["76561198013127982"]`. If you would like to have multiple admins, you can do the following: `["76561198013127982", "76561198077208792"]`. Any accounts in this list are designated as an admin/owner. |
|  `KEEP`  | `string[]` | `[""]` | The **same list** as `ADMINS`, **you must fill in BOTH**. Any accounts in this will not be removed from the bot's friends list in the event that its friend's list is full. |
| `GROUPS` | `string[]` | `["103582791464047777", "103582791462300957"]` | Default groups are [tf2-automatic](https://steamcommunity.com/groups/tf2automatic) and [IdiNium's Trading Bot](https://steamcommunity.com/groups/IdiNiumNetwork) groups. If you have a Steam group, [find your group ID](https://user-images.githubusercontent.com/47635037/97783524-53a05d00-1bd3-11eb-9778-e92545f2de1e.gif) and paste it here. The bot will automatically invite new trade partners to all groups in this list (by group ID). |
| `ALERTS` | `string[]` |  `["trade"]` | By default your bot will send a message/discord webhook every time a successful trade is made. Another option is `["none"]`. |

**Please ensure you fill in all of the above Options.** In the templates, you can see the value for `ADMINS` and `KEEP` are `["<your steamid 64>"]` and `["<steamid of person to keep in friendslist>"]`, respectively. Ensure that `<your steamid 64>` contains **YOUR STEAMID64**, and that `<steamid of person to keep in friendslist>` contains the SteamID64 of anyone you don't want to be removed from the bot's friendslist.

**Question: Where can I obtain a player's SteamID64?**

Answer: You can find your SteamID64 by pasting your Steam Profile URL link to [SteamRep.com](https://steamrep.com/). Please view the gif below for more information.

![How to get SteamID64](https://user-images.githubusercontent.com/47635037/96715154-be80b580-13d5-11eb-9bd5-39613f600f6d.gif)

# Optional Variables

## Bot Profile Settings

| Variable | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
|   `SKIP_BPTF_TRADEOFFERURL`    | `boolean` | `true`  | If set to `false`, your bot will skip the check to set it's Steam Trade Offer URL on backpack.tf. If there are any issues setting this URL, please manually do so [here](https://backpack.tf/settings##general), and be sure to login using your bot's Steam account. If you've already set your Trade Offer URL on backpack.tf manually (as recommended in the guide), just leave this set to `true`. **SETTING THIS TO FALSE IS NOT RECOMMENDED!** |
|   `SKIP_ACCOUNT_LIMITATIONS`   | `boolean` | `true`  | If set to `false`, your bot will check your Steam account limitations. Read more here: https://support.steampowered.com/kb_article.php?ref=3330-IAGK-7663. If your bot's Steam account is premium, just leave this set to `true`. **SETTING THIS TO FALSE IS NOT RECOMMENDED!** |
| `SKIP_UPDATE_PROFILE_SETTINGS` | `boolean` | `true`  | If set to `false`, your bot will attempt to set all of your profile settings to public. This is just so that backpack.tf can load your bot inventory correctly. If you already set everything to the public, just leave this set to `true`. **SETTING THIS TO FALSE IS NOT RECOMMENDED!** |

## Timezone Settings

The time settings listed here will be used in the `!time` command as well as in messages sent to trade partners if their offer needs to be reviewed.

| Variable | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
|       `TIMEZONE`        | `string` |            `Europe/London`            | The timezone that you currently reside in. Please only use these [Timezone Formats](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones). For example, if you live in Malaysia, you can use the value `Asia/Kuala_Lumpur`. Or if you live in New York, you can use the value `America/New_York`. |
|  `CUSTOM_TIME_FORMAT`   | `string` | `MMMM DD YYYY, HH:mm:ss ZZ` | - Please refer to [this article](https://www.tutorialspoint.com/momentjs/momentjs_format.htm) for more information on specifying a custom time format for your bot. |
| `TIME_ADDITIONAL_NOTES` | `string` |            `""`             | Optional additional notes when the bot shows your current time. Some examples are your active hours or who to contact if you are offline. |

## Debug Settings

| Variable | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
|   `DEBUG`    | `boolean` | `true`  | If set to `true`, the bot will log any errors that occur into the console.                                                                                                                                                       |
| `DEBUG_FILE` | `boolean` | `true`  | If set to `true`, the bot will log any errors that occur to a file. This file can be later be used to create a GitHub [issue](https://github.com/idinium96/tf2autobot/issues/new/choose) to report any issues to the developers. |

---

# Configure options.json file (Optional)

This file will be generated once you run your bot for the first time. The file can be found in `~/tf2autobot/files/<STEAM_ACCOUNT_NAME>/` folder.

The content of the `options.json` file is as follow:

```
{
    "showOnlyMetal": true,
    "sortInventory": true,
    "createListings": true,
    "enableMessages": true,
    "sendAlert": true,
    "enableAddFriends": true,
    "enableGroupInvites": true,
    "enableOwnerCommand": true,
    "autoRemoveIntentSell": false,
    "allowEscrow": false,
    "allowOverpay": true,
    "allowGiftNoMessage": false,
    "allowBanned": false,
    "sendOfferMessage": "",
    "autobump": false,
    "skipItemsInTrade": true,
    "weaponsAsCurrency": {
        "enable": true,
        "withUncraft": true
    },
    "tradeSummary": {
        "showStockChanges": false,
        "showTimeTakenInMS": true
    },
    "highValue": {
        "enableHold": true,
        "sheens": [],
        "killstreakers": [],
        "strangeParts": [],
        "painted": []
    },
    "checkUses": {
        "duel": true,
        "noiseMaker": true
    },
    "game": {
        "playOnlyTF2": false,
        "customName": ""
    },
    "normalize": {
        "festivized": false,
        "strangeUnusual": false
    },
    "details": {
        "buy": "I am buying your %name% for %price%, I have %current_stock% / %max_stock%.",
        "sell": "I am selling my %name% for %price%, I am selling %amount_trade%.",
        "highValue": {
            "showSpells": true,
            "showStrangeParts": false,
            "showKillstreaker": true,
            "showSheen": true,
            "showPainted": true
        }
    },
    "customMessage": {
        "welcome": "",
        "iDontKnowWhatYouMean": "",
        "how2trade": "",
        "success": "",
        "decline": "",
        "tradedAway": "",
        "clearFriends": ""
    },
    "statistics": {
        "starter": 0,
        "lastTotalTrades": 0,
        "startingTimeInUnix": 0
    },
    "autokeys": {
        "enable": false,
        "minKeys": 3,
        "maxKeys": 15,
        "minRefined": 30,
        "maxRefined": 150,
        "banking": {
            "enable": false
        },
        "scrapAdjustment": {
            "enable": false,
            "value": 1
        },
        "accept": {
            "understock": false
        }
    },
    "crafting": {
        "weapons": {
            "enable": true
        },
        "metals": {
            "enable": true,
            "minScrap": 9,
            "minRec": 9,
            "threshold": 9
        }
    },
    "manualReview": {
        "enable": true,
        "showOfferSummary": true,
        "showReviewOfferNote": true,
        "showOwnerCurrentTime": true,
        "invalidValue": {
            "note": "",
            "autoDecline": {
                "enable": true,
                "note": ""
            },
            "exceptionValue": {
                "skus": [],
                "valueInRef": 0
            }
        },
        "invalidItems": {
            "note": "",
            "givePrice": true,
            "autoAcceptOverpay": true
        },
        "overstocked": {
            "note": "",
            "autoAcceptOverpay": false,
            "autoDecline": false
        },
        "understocked": {
            "note": "",
            "autoAcceptOverpay": false,
            "autoDecline": false
        },
        "duped": {
            "enable": true,
            "declineDuped": false,
            "minKeys": 10,
            "note": ""
        },
        "dupedCheckFailed": {
            "note": ""
        },
        "additionalNotes": ""
    },
    "discordInviteLink": "",
    "discordWebhook": {
        "ownerID": "",
        "displayName": "",
        "avatarURL": "",
        "embedColor": "9171753",
        "tradeSummary": {
            "enable": true,
            "url": [],
            "misc": {
                "showQuickLinks": true,
                "showKeyRate": true,
                "showPureStock": true,
                "showInventory": true,
                "note": ""
            },
            "mentionOwner": {
                "enable": true,
                "itemSkus": []
            }
        },
        "offerReview": {
            "enable": true,
            "url": "",
            "mentionInvalidValue": false,
            "misc": {
                "showQuickLinks": true,
                "showKeyRate": true,
                "showPureStock": true,
                "showInventory": true
            }
        },
        "messages": {
            "enable": true,
            "url": "",
            "showQuickLinks": true
        },
        "priceUpdate": {
            "enable": true,
            "url": "",
            "note": ""
        },
        "sendAlert": {
            "enable": true,
            "url": ""
        }
    },
    "maxPriceAge": 28800
}
```

## How to read?

```
{
	"object1": "valueObj1",
	"object2": "valueObj2",
	"object3": {
    	"property1_Obj3": "valueProperty1_Obj3",
        "property2_Obj3": {
        	"property1_Prop2_Obj3": "valueProperty1_Prop2_Obj3"
        	}
	}
}
```

#### To access value of

-   `object1`, it's simply just `object1`
-   `property1_Obj3`, it will be `object3.property1_Obj3`
-   `property1_Prop2_Obj3`, it will be `object3.property1_Obj3.property1_Prop2_Obj3`

### Example:

```
{
	"autokeys": {
        "enable": false, 		// autokeys.enable = false
        "minKeys": 3,			// autokeys.minKeys = 3
        "maxKeys": 15,			// autokeys.maxKeys = 15
        "minRefined": 30, 		// autokeys.minRefined = 30
        "maxRefined": 150,		// autokeys.maxRefined = 150
        "banking": {
            "enable": false		// autokeys.banking.enable = false
        },
        "scrapAdjustment": {
            "enable": false, 	// autokeys.scrapAdjustment.enable = false
            "value": 1			// autokeys.scrapAdjustment.value = 1
        },
        "accept": {
            "understock": false	// autokeys.accept.understock = false
        }
    }
}
```

#### Later in the following documentation, the Option column will be the last property of an object (or an object itself).

---

# Description of each object property

<!-- **Table of Contents**

-   [Miscellaneous Settings](#miscellaneous-settings)
-   [Trade Bypass Settings](#trade-bypass-settings)
-   [Custom Offer Message Settings](#custom-offer-message-settings)
-   [Backpack.tf Autobump (re-list)](#backpacktf-autobump-re-list)
-   [High Value Item Settings](#high-value-item-settings)
-   [Check Dueling Mini-Game or Noise Maker uses](#check-dueling-mini-game-or-noise-maker-uses)
-   [Bot playing game](#bot-playing-game)
-   [Items normalization Settings](#items-normalization-settings)
-   [Backpack.tf Buy/Sell Order Listing Note](#listing-note-settings)
-   [Custom bot reply](#custom-bot-reply)
-   [Trade Statistic Settings](#trade-statistic-settings)
-   [Autokeys Settings](#autokeys-settings)
-   [Metal Crafting Settings](#metal-crafting-settings)

*   [Duplicated Unusual Settings](#duplicated-unusual-settings)
*   [Bot Profile Settings](#bot-profile-settings)
*   [Timezone Settings](#timezone-settings)

*   [Auto-Price Update Settings](#auto-price-update-settings)

*   [Escrow, Metal Overpay, Banned Check](#set-to-true-if-want-to-allow)
*   [Debug Mode](#set-to-true-if-want-to-enable-debugging-notes-in-console)

*   [Discord Server Invite Link](#discord-server-invite-link)
*   [Discord Webhook Configuration](#discord-webhook-configuration)
*   [Manual Review Configuration](#manual-review-configuration)
*   [Other Configuration Items](#other-configuration-items) -->

## Miscellaneous Settings

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
|        `showOnlyMetal`        | `boolean` | `true`  | If this is set to `false`, the bot will show all prices in the format of `[x keys, y ref]`. Example: `(5 keys, 10 ref)`. If this is set to `true` the bot will instead show all prices in the format of `[x ref]`. Example: `(260 ref)`. |
|        `sortInventory`        | `boolean` | `true`  | If set to `false` your bot will not automatically sort its own inventory. |
|       `createListings`        | `boolean` | `true`  | If set to `false`, your bot will not list items for trade while it is running. |
|       `enableMessages`        | `boolean` | `true`  | If set to `false`, people that are friends with your bot will be unable to send messages to you with the "!message" command. |
|          `sendAlert`          | `boolean` | `true`  | If set to `false`, your bot will not notify the owner(s) of queue problems, full inventories, or a low amount of pure (if Autokeys is on). |
|      `enableAddFriends`       | `boolean` | `true`  | If set to `false`, your bot will not allow others to add it as a Steam friend. **FALSE IS NOT RECOMMENDED!** |
|     `enableGroupInvites`      | `boolean` | `true`  | If set to `false`, your bot will not invite people to join Steam groups. **NOTE: (You still need to have at least 1 group ID in the `GROUPS` array). See `Owners' Details and Other Required Variables` for more information.** |
|     `enableOwnerCommand`      | `boolean` | `true`  | If set to `false`, the `!owner` command (used to contact the owner(s) of the bot will be disabled. |
|    `autoRemoveIntentSell`     | `boolean` | `false` | If set to `false`, your bot will no longer remove pricelist entries that have an `intent` of `sell` after completely selling out of that specific item. For example, if you list an item with `intent=sell` and the item sells out, the item will remain in your pricelist instead of being removed. |

## Trade Bypass Settings

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
|    `allowEscrow`     | `boolean` | `false` | If set to `true`, your bot will allow trades to be held for up to 15 days as a result of the trade partner not having Mobile Authentication enabled. |
|    `allowOverpay`    | `boolean` | `true`  | If set to `true`, your bot will allow trade partners to overpay with items or keys/metal. Otherwise, your bot will decline any trades in which it would receive overpay. |
| `allowGiftNoMessage` | `boolean` | `false` | If set to `true`, your bot will accept any gift without the need for the trade partner to include a gift message in the offer message. For a list of all allowed gift messages, please click [here](https://github.com/idinium96/tf2autobot/blob/1331f49d1c0217b906fff27f048c58b833bb844f/src/lib/data.ts#L601). **SETTING THIS TO TRUE IS NOT RECOMMENDED!** |
|    `allowBanned`     | `boolean` | `false` | If set to `true`, your bot will trade with users that are banned on backpack.tf or marked as a scammer on steamrep.com. **SETTING THIS TO TRUE IS NOT RECOMMENDED!** |

## Custom Offer Message Settings

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `sendOfferMessage` | `string` |  `""`   | This message will appear when the bot sends an offer to a trade partner. If left empty `("")`, it will print _**`Powered by TF2Autobot`**_ by default. |

## Backpack.tf Autobump or re-list

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `autobump` | `boolean` | `false` | If set to `true`, your bot will re-list all listings every 30 minutes. **NOTE: DEPRECATED** - Please consider donating to Backpack.tf or purchase Backpack.tf Premium to enable automatic listing bumping. More information here: https://backpack.tf/premium/subscribe |

## Skip items that are currently in another active trades

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `skipItemsInTrade` | `boolean` | `true` | By default, when your bot is constructing an offer (trade partner buy/sell through command), your bot will skip any items that are currently in another active trades. Set this to `false` if you want to disable this feature. |

## Weapons as currency (0.05 ref)
Object: `weaponsAsCurrency`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `true`  | If set to `false`, your bot will not value craft/uncraft weapons as currency (0.05 refined). |
| `.withUncraft` | `boolean` | `true`  | If set to `false`, your bot will exclude uncraft weapons as currency (0.05 refined). |

## Trade Summary Settings
Object: `tradeSummary`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
|  `.showStockChanges`   | `boolean`  | `false`  | Refer below images. |
|  `.showTimeTakenInMS`   | `boolean`  | `true`  | Set this to `false` if you don't want the time taken display time in milliseconds in bracket. |

- `false`:

![Disabled](https://user-images.githubusercontent.com/47635037/100530206-fdeabf00-3229-11eb-8026-674f5543ff38.png)

- `true`:

![Enabled](https://user-images.githubusercontent.com/47635037/100530193-ca0f9980-3229-11eb-8b44-576d1ff37c21.png)

## High-Value Item Settings
Object: `highValue`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
|  `.enableHold`   | `boolean`  | `true`  | By default, whenever your bot accepts items with high valued attachments, it will temporarily be disabled so you can decide whether to manually price it. Set this to `false` if you want to disable this feature. |
|    `.sheens`     | `string[]` |  `[]`   | If the bot completes a trade that contains items with any sheen located in this list, the owner will be notified of the trade and the item(s) containing the sheen will be automatically disabled. These items will not be automatically re-listed, and the owner must manually re-list the item. For example, setting this Option to `["Team Shine"]` will cause any weapons with a `Team Shine` sheen to not be automatically re-listed, and will notify the owner if one is obtained successfully. If this Option is left blank (`[""]`), the bot will hold and notify on **all** sheens. See [Valid Sheens](https://github.com/idinium96/tf2autobot/blob/master/src/lib/data.ts#L556-L564). |
| `.killstreakers` | `string[]` |  `[]`   | If the bot completes a trade that contains items with any killstreaker located in this list, the owner will be notified of the trade and the item(s) containing the killstreaker will be automatically disabled. These items will not be automatically re-listed, and the owner must manually re-list the item. For example, setting this Option to `["Fire Horns", "Tornado"]` will cause any weapons with a `Fire Horns` or `Tornado` killstreaker to not be automatically re-listed, and will notify the owner if one is obtained successfully. If this Option is left blank (`[""]`), the bot will hold and notify on **all** killstreakers. See [Valid Killstreakers](https://github.com/idinium96/tf2autobot/blob/master/src/lib/data.ts#L566-L574). |
| `.strangeParts` | `string[]` | `[]` | Let the bot mention/disable items with filled strange parts. See [Valid Strange Parts](https://github.com/idinium96/tf2autobot/blob/master/src/lib/data.ts#L500-L554) (only take the name, not defindex). |
| `.painted` | `string[]` | `[]` | Let the bot mention/disable items with filled painted. See [Valid Painted](https://github.com/idinium96/tf2autobot/blob/master/src/lib/data.ts#L576-L606). |
**Note: All must be the exact match. Please refer to the valid names.


## Check Dueling Mini-Game or Noise Maker uses
Object: `checkUses`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.duel` | `boolean` | `true` | If set to `false`, your bot will buy Dueling Mini-Games regardless of how many uses are left. Otherwise, it will **only accept** full Dueling Mini-Games **(5 uses left)**. |
| `.noiseMaker` | `boolean` | `true` | If set to `false`, your bot will buy Noise Makers regardless of how many uses are left. Otherwise, it will **only accept** full Noise Makers **(25 uses left)**. |

## Bot playing game
Object: `game`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.playOnlyTF2` | `boolean` | `false` | Set to `true` if you want your bot to only play Team Fortress 2. Setting this to `true` will ignore the below Option. |
| `.customName` | `string` | `""` | Name of the custom game you'd like your bot to play. Limited to only 60 characters. Example: [Click here](https://gyazo.com/308e4e05bf4c49929520df4e0064864c) |

## Items normalization Settings
Object: `normalize`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.festivized` | `boolean` | `false` | If set to `true`, your bot will recognize `Festivized` items as their `Non-Festivized` variant. For example, if your bot is selling a `Strange Australium Black Box` and someone sends an offer to your bot containing a `Festivized Strange Australium Black Box`, the bot will recognize the `Festivized Strange Australium Black Box` as `Strange Australium Black Box`. Otherwise, the bot will determine each item's price by its specific name, quality, and unique identifiers. |
| `.strangeUnusual` | `boolean` | `false` | If set to `true`, Strange Unusuals (items whose SKU ends with `;strange`) will be recognized as the normal variant of said Unusuals (items whose SKU doesn't end with `;strange`). Otherwise, the bot will determine each item's price by its specific name, quality, and unique identifiers. |

## Listing Note Settings
Object: `details`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.buy` | `string` | `"I am buying your %name% for %price%, I have %current_stock% / %max_stock%, so I am buying %amount_trade%."` | This is the note that will be included with each buy order placed on backpack.tf |
| `.sell` | `string` | `"I am selling my %name% for %price%, I am selling %amount_trade%."` | This is the note that will be included with each sell order placed on backpack.tf |

**Parameters:**

-   `%name%` - An item's name
-   `%price%` - An item's buying/selling price
-   `%current_stock%` - An item's current stock (by default this is used in `BPTF_DETAILS_BUY`)
-   `%max_stock%` - An item's maximum stock (by default this is used in `BPTF_DETAILS_BUY`)
-   `%amount_trade%` - How much of an item can be traded (between the minimum and maximum stock, used in `BPTF_DETAILS_SELL`)
-   `%keyPrice%` - The current key rate (selling price). If the item's selling price is above one key, this parameter will be displayed as `Key rate: x ref/key`. Otherwise, this parameter will not be shown on listings
-   `%uses%` - Display `(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟱x 𝗨𝗦𝗘𝗦)` on Dueling Mini-Game listings if `DISABLE_CHECK_USES_DUELING_MINI_GAME` is set to `false`, and `(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟐𝟱x 𝗨𝗦𝗘𝗦)` on Noise Maker listings if `DISABLE_CHECK_USES_NOISE_MAKER` is set to `false`. It is recommended to only place this on buy listings (`BPTF_DETAILS_BUY`). On other items, this parameter will not be shown

**Usage example:**

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/98710377-878f3580-23be-11eb-9ed5-e0f6ec4e26af.png" alt="listings" style="display: block; margin-left: auto; margin-right: auto;"></div>

### High-value in listings note
Object: `details.highValue`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.showSpells` | `boolean` | `true` | Show spell(s) in the listings note. [See Example](https://user-images.githubusercontent.com/47635037/101237085-0f900300-3711-11eb-877e-cc3b5c904682.png). |
| `.showStrangeParts` | `boolean` | `false` | Show Strange parts (only the one you specified in `highValue.strangeParts`) |
| `.showKillstreaker` | `boolean` | `true` | Show killstreaker in the listings note. [See Example](https://user-images.githubusercontent.com/47635037/101237131-4a923680-3711-11eb-84f8-6e1384868111.png) |
| `.showSheen` | `boolean` | `true` | Show Sheen in the listings note. |
| `.showPainted` | `boolean` | `true` | Show painted color in the listings note. [See Example](https://user-images.githubusercontent.com/47635037/101237099-27678700-3711-11eb-994c-4291f6196645.png) |
\*Note: Only for sell orders.

## Custom bot reply
Object: `customMessage`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.welcome`| `string` | `""` | Your custom greeting note. Two parameters: `%name%` (display trade partner's name) and `%admin%` (if admin, it will use "!help", else "!how2trade"). **_Default message:_** **Hi %name%! If you don't know how things work, please type "!%admin%"**|
| `.iDontKnowWhatYouMean` | `string` | `""` | Your custom note when people send the wrong command. **_Default message:_** **❌ I don't know what you mean, please type "!help" for all of my commands!** |
|      `.how2trade`       | `string` |  `""`   | `!how2trade` command reply. **_Default message:_** **/quote You can either send me an offer yourself, or use one of my commands to request a trade. Say you want to buy a Team Captain, just type "!buy Team Captain", if want to buy more, just add the [amount] - "!buy 2 Team Captain". Type "!help" for all the commands.\nYou can also buy or sell multiple items by using the "!buycart [amount] \<item name>`" or "!sellcart [amount] \<item name>" commands.** |
|       `.success`        | `string` |  `""`   | Bot message when a trade has been sucessfully made. **_Default message:_** **/pre ✅ Success! The offer went through successfully.** |
|       `.decline`        | `string` |  `""`   | Bot message when a trade has been decline. Two parameters can be used - `%reason%` and `%invalid_value_summary%`. **_Default message:_** **/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined %reason% %invalid_value_summary%`** |
|      `.tradedAway`      | `string` |  `""`   | Your custom note when the bot fails to trade because the item is traded away. **_Default message:_** **/pre ❌ Ohh nooooes! Your offer is no longer available. Reason: Items not available (traded away in a different trade).** |
|     `.clearFriends`     | `string` |  `""`   | Your custom note when the bot is removing friends to add someone else Usable parameter - `%name%` (display trade partner's name). **_Default message:_** **/quote I am cleaning up my friend list and you have randomly been selected to be removed. Please feel free to add me again if you want to trade at a later** |

## Trade Statistic Settings
Object: `statistics`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.starter` | `integer` | `0` | The starting value for the number of successful trades your bot has made. Used in discord webhooks for statistical purposes. |
| `.lastTotalTrades` | `integer` | `0` | An offset value for your bot's `.starter`. If you clear out your `polldata.json` file, it will reset your total trades count back to zero. This Option can be used as an offset to ensure you never lose track of how many trades your bot has completed in total. An example would be if you bot has completed 1000 trades and you want to clear out your `polldata.json` file. If you set `.lastTotalTrades` to `1000`, your bot will remember that it has completed 1000 trades in the past. |
| `.startingTimeInUnix` | `integer` (Unix) | `0` | Similar to `.lastTotalTrades`, this Option sets the latest instance a trade was made. To read more about this Option, please read [IdiNium's Discord Message Regarding This](https://discordapp.com/channels/664971400678998016/666909518604533760/707706994932449410). |

## Autokeys Settings
Object: `autokeys`

### General settings

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
|             `.enable`             | `boolean` | `false` | If set to `true`, your bot will automatically buy/sell keys based on the availability of the refined metals and keys in your bot inventory. This is done in an effort to ensure that your bot has enough pure metal to perform trades. |
|            `.minKeys`             | `integer` |   `3`   | When the bot's current stock of keys is **greater than** `minimum keys`, and the bot's current stock of refined metal is **less than** `minimum ref`, the bot will start selling keys in order to convert keys into metal. Otherwise, the bot will not sell keys. |
|            `.maxKeys`             | `integer` |  `15`   | When the bot's current stock of keys is **less than** `maximum keys`, and the bot's current stock of refined metal is **greater than** `maximum ref`, the bot will start buying keys in order to convert metal into keys. Otherwise, the bot will not buy keys. |
|           `.minRefined`           | `integer` |  `30`   | The minimum number of refined the bot can have before it begins selling keys (to turn keys into metal). See `.minKeys` for more information. |
|           `.maxRefined`           | `integer` |  `150`  | The maximum number of refined the bot can have before it begins buying keys (to turn metal into keys). See `.maxKeys` for more information. |

### Autokeys - banking
Object: `autokeys.banking`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
|         `.enable`         | `boolean` | `false` | If set to `true`, your bot will bank (buy and sell) keys. If your bot's current refined supply is between `min` and `max` and `keys > min`, it will bank keys. **`autokeys.enable` must be set to `true` to enable this option.** |

### Autokeys - Scrap adjustment
Object: `autokeys.scrapAdjustment`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `false`  | If set to `true`, the bot will make adjustments to the price of keys when selling or buying. For example, if the current key price is "10 refined", the bot will take "10 refined" and add `.value` when buying, and subtract `.value` when selling. This is done in an effort to quickly buy and sell keys using Autokeys when in a pinch by paying more for keys and selling keys for less. **This is not possible to do when key banking (`autokeys.banking.enable` set to `true`).** |
| `.value`  | `integer` |   `1`   | This is the amount of scrap (.11 refined) the bot will increase the buy listing or decrease the sell listing when buying/selling keys using Autokeys (if `.enable` is set to `true`). |

### Autokeys - Accept understocked
Object: `autokeys.accept`

| Option | Type | Default | Description |
| :-: | :-: | :-: | :-- |
|   `.understock`    | `boolean` | `false` | If set to `true`, your bot will accept trades that will lead to keys become under-stocked.  |

**Note:** The Autokeys feature is meant to have your bot maintain enough pure in its inventory. Enabling "Autokeys - Banking" may cause the Autokeys feature to not perform as intended.

## Weapon Crafting Settings
Object: `crafting.weapons`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
|  `.enable`  | `boolean` | `true` | Setting this to to `false` will prevent your bot from automatically crafting any duplicated/class-matched craftable weapons into scrap. The pricelist takes priority over this config item. That is to say, if a craft weapon is in the pricelist, it will not be crafted into scrap. **SETTING THIS TO FALSE IS NOT RECOMMENDED!** |

## Metal Crafting Settings
Object: `crafting.metals`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
|  `.enable`   | `boolean` | `true` | Setting this to `false` will disable metal crafting entirely. This may cause your bot and the trade partner to not be able to trade because of missing scrap/reclaimed. **SETTING THIS TO FALSE IS NOT RECOMMENDED!** |
| `.minScrap`  | `integer` |   `9`   | If your bot has less scrap metal than this amount, it will smelt down reclaimed metal to maintain ample scrap metal supply. |
|  `.minRec`   | `integer` |   `9`   | If your bot has less reclaimed metal than this amount, it will smelt down refined metal to maintain ample reclaimed metal supply. |
| `.threshold` | `integer` |   `9`   | If the bot's scrap/reclaimed metal count has reached the minimum amount, and scrap/metal count has reached this threshold (max), it will combine the metal into the next highest denomination. |

## Manual Review Configuration

Object: `manualReview`

### General
| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
|        `.enable`        | `boolean` | `true`  | By default, offers with `INVALID_VALUE`/ `INVALID_ITEMS`/ `OVERSTOCKED`/ `UNDERSTOCKED`/ `DUPED_ITEMS`/ `DUPE_CHECK_FAILED` will require manual review by you. |
|   `.showOfferSummary`   | `boolean` | `true`  | If set to `true`, your bot will show the trade offer summary to the trade partner. Otherwise, it will only notify the trade partner that their offer is being held for review. |
| `.showReviewOfferNote`  | `boolean` | `true`  | By default, your bot will show notes on for each [manual review reason](https://github.com/idinium96/tf2autobot/wiki/FAQ#why-my-bot-dont-acceptdecline-the-trade-automatically) |
| `.showOwnerCurrentTime` | `boolean` | `true`  | By default, your bot will show the owner's time when sending your trade partner any manual offer review notifications. |

### Manual review reasons
#### 🟥_INVALID_VALUE
Object: `manualReview.invalidValue`

#### • Custom note
| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.note`  | `string` |  `""`   | Your custom `INVALID_VALUE` note. [[Default](https://github.com/idinium96/tf2autobot/blob/v2/src/classes/MyHandler/offer/review/reasons/invalidValue.ts)] |

#### • Auto-decline
Object: `manualReview.invalidValue.autoDecline`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `true`  | Set this to `false` if you do not want your bot to automatically decline trades with `INVALID_VALUE` as the **ONLY** manual review reason where items do not match `exceptionValue.skus` and `exceptionValue.valueInRef` |
|  `.note`  | `string`  |  `""`   | Your custom note on why the trade got declined. The default is nothing. |

#### Invalid-value Exceptions
Object: `manualReview.invalidValue.exceptionValue`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
|    `.skus`    | `string[]` |  `[]`   | An array of SKUs that will bypass the `INVALID_VALUE` manual review reason if the difference between the bot's value and their value is not more than `.valueInRef`. Let's say your bot is selling an Unusual and someone sent an offer with 0.11 ref less, and you want your bot to accept it anyway. By default, it will check only for Unusuals and Australiums: `[";5;u", ";11;australium"]`. You can also leave it empty (`[""]`) so that all items with `INVALID_VALUE` create notifications. |
| `.valueInRef` | `integer`  |   `0`   | Exception value for the SKUs that you set above. The default is `0` (no exception). |

- Example when the bot accepts a trade that contains `.skus` and the difference in value not exceed `.valueInRef` (was set to 10 ref):

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/100343933-04efb280-301b-11eb-95de-bd3b53456d34.png" alt="trade-summary-full2" style="display: block; margin-left: auto; margin-right: auto;"></div>

---

#### 🟨_INVALID_ITEMS
- Object: `manualReview.invalidItems`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.note` | `string` | `""` | Your custom `INVALID_ITEMS` note. [[Default](https://github.com/idinium96/tf2autobot/blob/v2/src/classes/MyHandler/offer/review/reasons/invalidItems.ts)] |
| `.givePrice` | `boolean` | `true` | If set to `false`, your bot will not price `INVALID_ITEMS` (items that are not in your price list) using prices from prices.tf. |
| `.autoAcceptOverpay` | `boolean` | `true` | If set to `false`, your bot will not accept trades with `INVALID_ITEMS` where the value of their side is greater than or equal to the value of your bot's side. |

- Example if `.givePrice` and `.autoAcceptOverpay` are both set to `true`:

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/100343085-e0dfa180-3019-11eb-80ec-dafaaeb5296f.png" alt="trade-summary-full2" style="display: block; margin-left: auto; margin-right: auto;"></div>

---

#### 🟦_OVERSTOCKED
- Object: `manualReview.overstocked`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.note` | `string` | `""` | Your custom `OVERSTOCKED` note. [[Default](https://github.com/idinium96/tf2autobot/blob/v2/src/classes/MyHandler/offer/review/reasons/overstocked.ts)] |
|  `.autoAcceptOverpay`  | `boolean` | `false`  | Set this to `true` if you want your bot to accept trades with `OVERSTOCKED` items, where the value of their side is greater than or equal to the value of your bot's side.  |
|   `.autoDecline`   | `boolean` | `false`  | Set this to `true` if you want your bot to decline an offer with `OVERSTOCKED` as the **ONLY** manual review reason (manual review must be enabled). |

- Example if `.autoAcceptOverpay` is set to `true`:

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/100344377-ad057b80-301b-11eb-913f-3932e839c27c.png" alt="trade-summary-full2" style="display: block; margin-left: auto; margin-right: auto;"></div>

---

#### 🟩_UNDERSTOCKED
- Object: `manualReview.understocked`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.note` | `string` | `""` | Your custom `UNDERSTOCKED` note. [[Default](https://github.com/idinium96/tf2autobot/blob/v2/src/classes/MyHandler/offer/review/reasons/understocked.ts)] |
| `.autoAcceptOverpay`  | `boolean` | `false`  | Set this to `true` if you want your bot to accept trades with `UNDERSTOCKED` items, where the value of their side is greater than or equal to the value of your bot's side. |
|  `.autoDecline`   | `boolean` | `false`  | Set this to `true` if you want your bot to decline an offer with **ONLY** `UNDERSTOCKED` reason (manual review must be enabled). |

- Example if `.autoAcceptOverpay` is set to `true`:

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/100344507-dfaf7400-301b-11eb-9d0b-90b353bf5b9f.png" alt="trade-summary-full2" style="display: block; margin-left: auto; margin-right: auto;"></div>

---

#### 🟫_DUPED_ITEMS
- Object: `manualReview.duped`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
|    `.enable`    | `boolean` | `true`  | If set to `true`, the bot will perform checks on items to determine whether or not they are duplicated. |
|      `.declineDuped`      | `boolean` | `false` | If set to `true`, the bot will decline any unusual items that it determines as having been duplicated. |
| `.minKeys` | `number`  |  `10`   | The minimum number of keys an item must be worth before the bot performs a check for whether or not it is duplicated. |
| `.note` | `string` | `""` | Your custom `DUPE_ITEMS` note. [[Default](https://github.com/idinium96/tf2autobot/blob/v2/src/classes/MyHandler/offer/review/reasons/duped.ts)] |


#### 🟪_DUPE_CHECK_FAILED
- Object: `manualReview.dupedCheckFailed`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.note` | `string` | `""` | Your custom `DUPE_CHECK_FAILED` note. [[Default](https://github.com/idinium96/tf2autobot/blob/v2/src/classes/MyHandler/offer/review/reasons/dupedCheckFailed.ts)] |


### Manual review additional notes
- Object: `manualReview`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.additionalNotes` | `string` | `""` | Custom additional notes for offer that need to be reviewed. |

---

**Notes:**
On each reason **except** `INVALID_VALUE`, you can put `%name%` to list all the items that are on that reason, and `%isName%` for the plural of "is" - where if `%name%` is just 1 item, it will use "is", else if more then one item, it will use "are".

Example:
Let say the trade contains items with `INVALID_ITEMS`. The items are Dueling Mini-Game, Secret Saxton.

-   You use custom `INVALID_ITEMS` note as: `"%name% %isName% not in my pricelist. Please wait for my owner to check it."`

-   What the trade partner will receive: `"Dueling Mini-Game, Secret Saxton is not in my pricelist. Please wait for my owner to check it."`

For `OVERSTOCKED` and `UNDERSTOCKED`, parameter `%name%` will print out a list of `amountCanTrade - item_name` (example, `1 - Secret Saxton, 0 - Jag`).

---

## Discord Server Invite Settings

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `discordInviteLink` | `string` |  `""`   | You can place a Discord server invite link here, which would be shown when a trade partner enters the `!discord` command. You can leave this empty if you don't have one, as it will be replaced with the [TF2Autobot Discord Server](https://discord.gg/D2GNnp7tv8) invite link by default. |

## Discord Webhook

### General Configuration
Object: `discordWebhook`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.ownerID` | `string` (number) | `""` | Your Discord ID. To obtain this, right-click on yourself on Discord and click `Copy ID`. Be sure to enable Developer Mode on Discord by navigating to `Settings > Appearance > Advanced`. **It must be a number** in string like `527868979600031765` not `IdiNium#8965`. |
| `.displayName` | `string` | `""` | The name you'd like to give your bot when it sends a message on Discord. |
| `.avatarURL` | `string` | `""` | A URL to the image you'd like your bot to have when it sends a discord message. **This must be in URL form.** An example of how to obtain your bot's avatar from Steam: [Click here](https://gyazo.com/421792b5ea817c36054c7991fb18cdbc). |
| `.embedColor` | `string` (number) | `""` | The color you'd like associated with your bot's discord messages. You can view the different colors at [spycolor.com](https://www.spycolor.com/). Copy the `Decimal value`. An example of this would be `16769280` for the color `#ffe100` |

#### Note on how to obtain your Discord Webhook URL

Please view this [image](https://gyazo.com/90e9b16d7c54f1b4a96f95b9fae93187) for instructions on how to obtain your Discord Webhook URL. These settings would be set in your own personal Discord channel.

### Trade Summary Configuration
Object: `discordWebhook.tradeSummary`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean`  | `true` | Display each successful trade summary on your trade summary/live-trades channel via Discord Webhook. If set to `false`, it will send to your Steam Chat. |
| `.url` | `string[]` | `[]`  | An array of Discord Webhook URLs for `TRADE_SUMMARY`. You will need to format it like so: `["yourDiscordWebhookLink"]`, or if you want to add more than one, you format them like so: `["link1", "link2"]` (separate each link with a comma, make sure `link1` is your **own** Discord Webhook URL - Mention owner and show stock changes will only be shown in link1). |

#### Misc
Object: `discordWebhook.tradeSummary.misc`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.showQuickLinks` | `boolean`  | `true` | Show the trade partner's quick links to their Steam profile, backpack.tf, and SteamREP pages. |
| `.showKeyRate` | `boolean`  | `true` | Show your bot's key rate |
| `.showPureStock` | `boolean`  | `true`  | Show your bot's pure stock |
| `.showInventory` | `boolean`  | `true`  | Show the total amount of items in your bot's inventory. |
| `.note`  |  `string`  |  `""`   | Any additional notes you'd like included with trade summaries. Notes must be in the following format: `[YourText](Link)` |

#### Mention on specific items (using sku)
Object: `discordWebhook.tradeSummary.mentionOwner`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean`  | `true` | If set to `false`, your bot will never mention you on each successful trade (except for accepted `INVALID_ITEMS` or `HIGH_VALUE_ITEMS`) |
| `.itemSkus` | `string[]` | `[]`  | Your bot will mention you whenever a trade contains an SKU in this list. Supports multiple item SKUs. For example, let say you just want to be mentioned on every unusual and australium trade. You would input `[";5;u", ";11;australium"]`. If you want to be mentioned on specific items, just fill in the full item SKU, like so: `["725;6;uncraftable"]`. To add more, just separate new items with a comma between each SKU `string`. |

**Note**: Want to feature your bots trades on the tf2autobot Discord server? Contact IdiNium for a Webhook URL!

#### A visual breakdown of each Discord Webhook Trade setting

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/100342811-7dee0a80-3019-11eb-84af-24f2862ba1a1.png" alt="trade-summary-full" style="display: block; margin-left: auto; margin-right: auto;"></div>

---

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/86468438-0073e600-bd6a-11ea-8bc0-040229c997d5.PNG" alt="trade-summary-full2" style="display: block; margin-left: auto; margin-right: auto;"></div>

---

### Trade Offer Review Configuration (mentioned)
Object: `discordWebhook.offerReview`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `true` | If set to `false`, messages regarding trade offers that require manual review will be sent to your Steam Chat. Otherwise, these messages will be sent on Discord. |
| `.url` | `string`  |  `""` | Discord Webhook URL for `REVIEW_OFFER`. |
| `.mentionInvalidValue` | `boolean` | `false` | If set to `true`, your bot only mention you for `INVALID_VALUE` offers. |

#### Misc
Object: `discordWebhook.offerReview.misc`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.showQuickLinks` | `boolean` | `true` | Show the trade partner's quick links to their Steam profile, backpack.tf, and SteamREP pages. |
| `.showKeyRate` | `boolean` | `true` | Show your bot's key rate. |
| `.showPureStock` | `boolean` | `true`  | Show your bot's pure stock. |
| `.showInventory` | `boolean`  | `true`  | Show the total amount of items in your bot's inventory. |

#### A visual breakdown of each Discord Webhook Review setting

- An example if `.mentionInvalidValue` is set to `false`:
<div align="center"><img src="https://user-images.githubusercontent.com/47635037/100344876-75e39a00-301c-11eb-968e-2a780cac73da.png" alt="only non-invalid-value2" style="display:block;margin-left:auto;margin-right:auto;"></div>

---

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/100345246-00c49480-301d-11eb-8b2f-a11cf0ac11b9.png" alt="only non-invalid-value2" style="display:block;margin-left:auto;margin-right:auto;"></div>

---

### Trade Partner Message Configuration (mentioned)
Object: `discordWebhook.messages`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `true` | Used to alert you on any messages sent from the trade partner via Discord Webhook. If set to `false`, it will send to your Steam Chat. |
| `.url` | `string`  |  `""`   | Discord Webhook URL. |
| `.showQuickLinks` | `boolean` | `true`  | Show the trade partner's quick links to their Steam profile, backpack.tf, and SteamREP pages. |

---

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/100345359-2c477f00-301d-11eb-89ae-1b6ec8391106.png" alt="only non-invalid-value2" style="display:block;margin-left:auto;margin-right:auto;"></div>

---

### Pricelist Update Configuration

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `true` | Set to `false` to disable this feature. |
| `.url` | `string` | `""` | The Discord Webhook URL you'd like price update webhook to be sent to. |
| `.note` | `string` | `""` | Any additional notes you'd like included with price update webhook. |

---

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/100345689-a415a980-301d-11eb-9f49-bd3e560bcb5b.png" alt="only non-invalid-value2" style="display:block;margin-left:auto;margin-right:auto;"></div>

---


### Alert on Something Wrong Configuration
Object: `discordWebhook.sendAlert`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `true` | If set to `false`, the bot will notify you through Steam chat if there is something wrong. Otherwise, the bot will notify you through Discord (`sendAlert` must be `true`). |
|   `.url`   | `string`  | `""` | The Discord Webhook URL you'd for the alert to be sent to. |

---

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/100345555-716bb100-301d-11eb-89ab-b9124eb4ed56.png" alt="only non-invalid-value2" style="display:block;margin-left:auto;margin-right:auto;"></div>

---

## Auto-Price Update Settings

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `maxPriceAge` | `integer` | `28800` ms | (8 hrs) If an item in the pricelist's last price update exceeds this value, the bot will automatically request a price check for the item from prices.tf. |
