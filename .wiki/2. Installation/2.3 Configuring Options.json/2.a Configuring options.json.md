# Configure options.json file (Optional)

This file will be generated once you run your bot for the first time. The file can be found in `~/tf2autobot/files/<STEAM_ACCOUNT_NAME>/` folder.

Click [`here`](https://github.com/TF2Autobot/tf2autobot/wiki/Library#optionsjson-content-) to view the content.

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

## Options.json structure

*   [`miscSettings`](#-miscellaneous-settings-)
    -   [`.showOnlyMetal`](#--show-only-metal-%EF%B8%8F-)
    -   [`.sortInventory`](#--sort-inventory--)
    -   [`.createListings`](#--creating-listings-on-backpacktf-%EF%B8%8F-)
    -   [`.addFriends`](#--add-as-friend-%EF%B8%8F-)
    -   [`.sendGroupInvite`](#--send-group-invite-%EF%B8%8F-)
    -   [`.autobump`](#--autobump-auto-relist--)
    -   [`.skipItemsInTrade`](#--skip-items-in-trade--)
    -   [`.weaponsAsCurrency`](#--weapons-as-currency--)
    -   [`.checkUses`](#--full-uses-check-%EF%B8%8F-)
    -   [`.game`](#--bot-playing-game--)
*   [`sendAlert`](#-send-alert-to-owner--)
    -   [`.autokeys`](#--autokeys-alert--)
    -   [`.backpackFull`](#--backpack-fullalmost-full-alert--)
    -   [`.highValue`](#--high-value-items-alert--)
    -   [`.autoRemoveIntentSellFailed`](#--automatic-remove-intentsell-failed--)
    -   [`.autoAddPaintedItems`](#--automatic-add-painted-items--)
*   [`pricelist`](#-pricelist-manager-)
    -   [`.autoRemoveIntentSell`](#--automatic-remove-intentsell--)
    -   [`.autoAddInvalidItems`](#--automatic-add-_invalid_items--)
    -   [`.autoAddPaintedItems`](#--automatic-add-painted-items---)
    -   [`.priceAge`](#--price-age-%EF%B8%8F-)
*   [`bypass`](#-trade-bypass-settings-)
    -   [`.escrow`](#--allow-trade-with-escrow-trade-hold--)
    -   [`.overpay`](#--allow-overpay--)
    -   [`.giftWithoutMessage`](#--allow-receiving-free-items-without-message--)
    -   [`.bannedPeople`](#--allow-trade-with-banned-account--)
*   [`tradeSummary`](#-trade-summary-settings-)
*   [`highValue`](#-high-value-items-settings-)
*   [`normalize`](#-items-normalization-settings-)
    -   [`.festivized`](#--festivized-items--)
    -   [`.strangeAsSecondQuality`](#--strange-as-second-quality-elevated-quality--)
    -   [`.painted`](#--painted-items--)
*   [`details`](#-listing-note-settings-)
    -   `...`
    -   [`.highValue`](#--high-value-in-listings-note-decoration--)
    -   [`.uses`](#--custom-uses-parameter-output--)
*   [`statistics`](#-trade-statistic-settings--)
    -   `...`
    -   [`.sendStats`](#--automatic-sending-stats--)
*   [`autokeys`](#-autokeys-settings-)
    -   `...`
    -   [`.banking`](#--banking--)
    -   [`.scrapAdjustment`](#--scrap-adjustment--)
    -   [`.accept`](#--accepting-_understocked-)
*   [`crafting`](#-craftingsmelting-settings-)
    -   [`.weapons`](#--weapons--)
    -   [`.metals`](#--pure-metals-%EF%B8%8F-)
*   [`offerReceived`](#-offer-received-filter-settings-)
    -   [`.invalidValue`](#--on-offer-with-_invalid_value-)
    -   [`.invalidItems`](#--on-offer-with-_invalid_items-)
    -   [`.disabledItems`](#--on-offer-with-_disabled_items-)
    -   [`.overstocked`](#--on-offer-with-_overstocked-)
    -   [`.understocked`](#--on-offer-with-_understocked-)
    -   [`.duped`](#--on-offer-with-_duped_items-)
    -   [`.escrowCheckFailed`](#--_escrow_check_failed-)
    -   [`.bannedCheckFailed`](#--_banned_check_failed-)
*   [`manualReview`](#-manual-review-configuration-)
    -   `...`
*   [`discordWebhook`](#%EF%B8%8F-discord-webhook-)
    -   `...`
    -   [`.tradeSummary`](#--trade-summary-configuration-)
    -   [`.offerReview`](#--trade-offer-review-configuration-)
    -   [`.messages`](#--trade-partner-message-configuration-)
    -   [`.priceUpdate`](#--pricelist-update-configuration-)
    -   [`.sendAlert`](#--send-alert-configuration--)
    -   [`.sendStats`](#--send-statistic-configuration--)
*   [`customMessage`](#-custom-messagereply-)
    -   `...`
*   [`commands`](#-command-settings-)
    -   `...`
*   [`detailsExtra`](#extra-)
    -   `...`

## 🔰 Miscellaneous Settings [^](#optionsjson-structure)
Parent property key: `miscSettings`

### - Show only metal ⚙️ [^](#optionsjson-structure)
Property: `.showOnlyMetal`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `true`  | If this is set to `false`, the bot will show all prices in the format of `[x keys, y ref]`. Example: `(5 keys, 10 ref)`. If this is set to `true` the bot will instead show all prices in the format of `[x ref]`. Example: `(260 ref)`. |

### - Sort inventory 🎒 [^](#optionsjson-structure)
Property: `.sortInventory`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable`| `boolean` | `true`  | If set to `false` your bot will not automatically sort its own inventory. |
| `.type`| `number` | `3`  | By default, your bot will sort inventory by `rarity`. Other options are `1` - by name, `2` - by defindex, `3` - by rarity, `4` - by type, `5` - by date, `101` - by class, `102` - by slot. |

### - Creating listings on backpack.tf 🏷️ [^](#optionsjson-structure)
Property: `.createListings`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `true`  | If set to `false`, your bot will not list items for trade while it is running (if changed while your bot is running, this wont work unless restarted). |

### - Add as friend 🙋‍♂️ [^](#optionsjson-structure)
Property: `.addFriends`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `true`  | If set to `false`, your bot will not allow others to add it as a Steam friend (except admins). **FALSE IS NOT RECOMMENDED!** |


### - Send group invite 👯‍♂️ [^](#optionsjson-structure)
Property: `.sendGroupInvite`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `true`  | If set to `false`, your bot will not invite people to join Steam groups. |

### - Autobump (auto-relist) 🔄 [^](#optionsjson-structure)
Property: `.autobump`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `true` | If set to `true`, your bot will re-list all listings every 30 minutes. **NOTE: DEPRECATED** - The bot will fail to re-list items if Backpack.tf website is down for maintenance or experiencing major outage. Please consider [donating to Backpack.tf](https://backpack.tf/donate) or [purchase Backpack.tf Premium](https://backpack.tf/premium/subscribe) to enable automatic listing bumping. |


### - Skip items in trade ⭕ [^](#optionsjson-structure)
Property: `.skipItemsInTrade`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `true` | By default, when your bot is constructing an offer (trade partner buy/sell through command), your bot will skip any items that are currently in another active trades. Set this to `false` if you want to disable this feature. |

### - Weapons as currency 🏹 [^](#optionsjson-structure)
Property: `.weaponsAsCurrency`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `true`  | If set to `false`, your bot will not value craft/uncraft weapons as currency (0.05 refined). |
| `.withUncraft` | `boolean` | `true`  | If set to `false`, your bot will exclude uncraft weapons as currency (0.05 refined). |

### - Full uses check ⚔️🔍 [^](#optionsjson-structure)
Property: `.checkUses`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.duel` | `boolean` | `true` | If set to `false`, your bot will buy Dueling Mini-Games regardless of how many uses are left. Otherwise, it will **only accept** full Dueling Mini-Games **(5 uses left)**. |
| `.noiseMaker` | `boolean` | `true` | If set to `false`, your bot will buy Noise Makers regardless of how many uses are left. Otherwise, it will **only accept** full Noise Makers **(25 uses left)**. |

### - Bot playing game 🎮 [^](#optionsjson-structure)
Property: `.game`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.playOnlyTF2` | `boolean` | `false` | Set to `true` if you want your bot to only play Team Fortress 2. Setting this to `true` will ignore the below Option. |
| `.customName` | `string` | `""` | Name of the custom game you'd like your bot to play. Limited to only 60 characters. Example: [Click here](https://gyazo.com/308e4e05bf4c49929520df4e0064864c) |

---

## 🔊 Send Alert to owner [^](#optionsjson-structure) [↓](#--send-alert-configuration--)
Parent property key: `sendAlert`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `true`  | Set to `false` to never send any alerts. |

### - Autokeys alert 🔑 [^](#optionsjson-structure)
Property: `.autokeys`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.lowPure` | `boolean` | `true`  | (Discord Webhook not mentioned) Send an alert when the bot is low in keys and ref (less than minimum for both). |
| `.failedToAdd` | `boolean` | `true`  | (Discord Webhook mentioned) Send an alert when the bot failed to add key (when Autokeys is enabled). |
| `.failedToUpdate` | `boolean` | `true`  | (Discord Webhook mentioned) Send an alert when the bot failed to update key (when Autokeys is enabled). |
| `.failedToDisable` | `boolean` | `true`  | (Discord Webhook mentioned) Send an alert when the bot failed to disable key (when Autokeys is enabled). |


### - Backpack full/almost full alert 🎒💯 [^](#optionsjson-structure)

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.backpackFull` | `boolean` | `true`  | (Discord Webhook not mentioned) Send an alert when the bot failed to send an offer due to full backpack problem. |

### - High-value items alert 🥇 [^](#optionsjson-structure)
Property: `.highValue`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.gotDisabled` | `boolean` | `true`  | (Discord Webhook mentioned) Send an alert when the bot successfully bought an item with high-value attachment(s) and it got disabled (only if highValue.enableHold is true). |
| `.receivedNotIn Pricelist` | `boolean` | `true`  | (Discord Webhook mentioned) Send an alert when the bot successfully bought an item (INVALID_ITEMS) with high-value attachment(s) - this will not automatically added to the pricelist. |
| `.tryingToTake` | `boolean` | `true`  | (Discord Webhook mentioned) Send an alert when the trade partner is trying to take an item with high-value attachment(s) that is still not in the bot pricelist. |

### - Automatic remove intent=sell (failed) 🚮❌ [^](#optionsjson-structure)

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.autoRemoveIntent SellFailed` | `boolean` | `true`  | (Discord Webhook mentioned) Send an alert when an item is sold with intent sell, and `pricelist.autoRemoveIntentSell.enable` is `true` but the bot failed to remove it. |

### - Automatic add painted items 🎀 [^](#optionsjson-structure)

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.autoAddPaintedItems` | `boolean` | `true`  | (Discord Webhook mentioned if failed) Send an alert when painted items has been successfully added to sell |

---

## 📑 Pricelist manager [^](#optionsjson-structure)
Parent property key: `pricelist`

### - Automatic remove intent=sell 🚮 [^](#optionsjson-structure)
property: `.autoRemoveIntentSell`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `true`  | By default, any item with intent sell in the pricelist will be automatically removed when the bot no longer have that item. Set to `false` to disable this feature. |


### - Automatic add 🟨_INVALID_ITEMS ➕ [^](#optionsjson-structure)
property: `.autoAddInvalidItems`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `true`  | If set to `false`, any accepted `🟨_INVALID_ITEMS` will **NOT** be automatically added to the pricelist. |

### - Automatic add painted items 🎀➕ [^](#optionsjson-structure) [↓](#-custom-painted-text-on-listing-note)
property: `.autoAddPaintedItems`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `true`  | If set to `false`, any accepted items with painted will not be automatically added to the pricelist (to sell only). This feature only available if your [`normalize.painted.our`](#--painted-items--) is `true` and [`normalize.painted.their`](#--painted-items--) is `false`. **The bot will set the price to sell by adding the item's base autoprice selling price and additional price for paint**, in which you should also set your preferred additional price for each paint in `detailExtra.painted[paintName].price`. |

### - Price age 🕰️ [^](#optionsjson-structure)
property: `.priceAge`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.maxInSeconds` | `integer` | `28800`  | (8 hrs) If an item in the pricelist's last price update exceeds this value, the bot will automatically request a price check for the item from prices.tf (only apply on boot). |

---

## ✅ Trade Bypass Settings [^](#optionsjson-structure)
Parent property: `bypass`

### - Allow trade with Escrow (Trade hold) 🛅 [^](#optionsjson-structure)
property: `.escrow`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
|    `.allow`     | `boolean` | `false` | If set to `true`, your bot will allow trades to be held for up to 15 days as a result of the trade partner not having Mobile Authentication enabled. |

### - Allow Overpay 💰 [^](#optionsjson-structure)
property: `.overpay`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
|    `.allow`    | `boolean` | `true`  | By default, your bot will allow trade partners to overpay with items or keys/metal (our value more than their value). Set this to `false` if you want your bot to decline any trades in which it would receive overpay. |

### - Allow receiving free items without message 🎁💌❌ [^](#optionsjson-structure)
property: `.giftWithoutMessage`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.allow` | `boolean` | `false` | If set to `true` (Not recommended), your bot will accept any gift without the need for the trade partner to include a gift message in the offer message. For a list of all allowed gift messages, please click [here](https://github.com/TF2Autobot/tf2autobot/wiki/Library#gift-words-). |

### - Allow trade with banned account ⛔✅ [^](#optionsjson-structure)
property: `.bannedPeople`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
|    `.allow`     | `boolean` | `false` | If set to `true` (Not recommended), your bot will trade with users that are banned on backpack.tf or marked as a scammer on steamrep.com. |

---

## 📜 Trade Summary settings [^](#optionsjson-structure)
Parent property: `tradeSummary`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.showStockChanges` | `boolean` | `false`  | By default the summary will **NOT** include to show stock changes, example: B.M.O.C (0 → 1/1). Set to `true` to enable it. |
| `.showTimeTakenInMS` | `boolean` | `false`  | Set to `true` if you want to include time taken to complete the trade in milliseconds. |
| `.showItemPrices` | `boolean` | `true`  | Set to `false` if you don't want to include item prices (buying/selling prices). |

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/106510028-56c82380-6509-11eb-9038-228ceb459af2.png" alt="listings" style="display: block; margin-left: auto; margin-right: auto;"></div>

---

## 🥇 High-value Items settings [^](#optionsjson-structure)
Parent property key: `highValue`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enableHold` | `boolean` | `true`  | By default, whenever your bot accepts items with high valued attachments, it will **temporarily be disabled** so you can decide whether to manually price it. Set this to `false` if you want to disable this feature. |
| `.sheens` | `string[]` | `[]`  | An array of sheens. Must be the sheens **full name** in each element (Refer: [Sheen](https://github.com/TF2Autobot/tf2autobot/wiki/Library#sheens-)). If leave empty (`[]`) will mention/disable on all sheens. Example: `["Team Shine"]`. |
| `.killstreakers` | `string[]` | `[]`  | Refer: [Killstreaker](https://github.com/TF2Autobot/tf2autobot/wiki/Library#killstreakers-). Example: `["Fire Horns", "Tornado"]`. |
| `.strangeParts` | `string[]` | `[]`  | Refer: [Strange Parts](https://github.com/TF2Autobot/tf2autobot/wiki/Library#strange-parts-excluding-built-in-parts-). Example: `["Headshot Kills", "Kills"]`. |
| `.painted` | `string[]` | `[]`  | Refer: [Paints](https://github.com/TF2Autobot/tf2autobot/wiki/Library#paints-). Example: `["After Eight"]`. |


**Note: All must be the exact match. Please refer to the valid names (not the partial sku listed in the references).**

---

## 🔲 Items Normalization settings [^](#optionsjson-structure)
Parent property key: `normalize`

### - Festivized Items 🎄 [^](#optionsjson-structure)
property: `.festivized`

ℹ️ If set to `true`, your bot will recognize Festivized items as Non-Festivized variant.

> For example, your bot is **buying** a **Strange Australium Black Box** and someone sends an offer to your bot containing a ***Festivized Strange Australium Black Box*** (their side), the bot will recognize the ***Festivized Strange Australium Black Box*** as **Strange Australium Black Box** if your set `normalize.festivized.their` as `true`. Now that item is in your bot inventory, if you set `normalize.festivized.our` to `false`, then the bot will recognize it as ***Festivized Strange Australium Black Box***.

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.our` | `boolean` | `false`  | Our side (Bot) |
| `.their` | `boolean` | `false`  | Trade partner's side |

### - Strange as Second Quality (elevated quality) 🎰 [^](#optionsjson-structure)
property: `.strangeAsSecondQuality`

ℹ️ If set to `true`, your bot will recognize any Strange Unique, Strange Haunted or Strange Unusual as Unique, Haunted and Unusual only (ignore `;strange` part on item's sku).

> The example is pretty much the same as in [Festivized item normalization](#--festivized-items--).

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.our` | `boolean` | `false`  | Our side (Bot) |
| `.their` | `boolean` | `false`  | Trade partner's side |


### - Painted items 🎨 [^](#optionsjson-structure)
property: `.painted`

ℹ️ If set to `false`, your bot will assign painted partial sku on any painted items.

> Meaning that you'll be able to create a separate listing (sell order only) for the painted items. Note that only paint(s) listed in [`highValue.painted`](#-high-value-items-settings-) will have painted partial sku assigned on that particular item (if you leave it as an empty array (`[]`), then all painted items will have painted partial sku assigned).

**Important**

- Creating listings for painted items on backpack.tf is currently **NOT SUPPORTED** for **BUY ORDERS** (unless you manually create it).
- Also note that, if your `.our` is `false` and `.their` is `true`, if you created a buy order for an item (without partial painted sku of course, max set to 1), then someone sent an offer containing painted item and that paint is listed in [`highValue.painted`](#-high-value-items-settings-), the trade summary will show stock changes like this: `-1 → 0`. Meaning your buy order will not get removed because your bot has an item with partial painted sku on it (treated as a different item). It will be removed once your bot received a non-painted version (or painted that not in [`highValue.painted`](#-high-value-items-settings-)) of that particular item.

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.our` | `boolean` | `true`  | Our side (Bot) |
| `.their` | `boolean` | `true`  | Trade partner's side (`false` is not recommended) |


<div align="center"><img src="https://cdn.discordapp.com/attachments/715362558256873492/800094187180916766/unknown.png" alt="listings" style="display: block; margin-left: auto; margin-right: auto;"></div>

<div align="center"><img src="https://cdn.discordapp.com/attachments/715362558256873492/800094304713441331/unknown.png" alt="listings" style="display: block; margin-left: auto; margin-right: auto;"></div>

---

## 🔖 Listing Note Settings [^](#optionsjson-structure)
Parent property key: `details`

### - Templates 📝 [^](#optionsjson-structure)

| Option | Type | Default | Description |
| :----: | :--: | :----- | :---------- |
| `.buy` | `string` | `"I am buying your %name% for %price%, I have %current_stock% / %max_stock%."` | This is the note that will be included with each buy order placed on backpack.tf |
| `.sell` | `string` | `"I am selling my %name% for %price%, I am selling %amount_trade%."` | This is the note that will be included with each sell order placed on backpack.tf |

**Parameters:**

-   `%name%` - An item's name.
-   `%price%` - An item's buying/selling price.
-   `%current_stock%` - An item's current stock.
-   `%max_stock%` - An item's maximum stock.
-   `%amount_trade%` - How much of an item can be traded.
-   `%keyPrice%` - The current key rate (selling price). If the item's selling price is above one key, this parameter will be displayed as `Key rate: x ref/key`. Otherwise, this parameter will not be shown on listings
-   `%uses%` - Display `(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟱x 𝗨𝗦𝗘𝗦)` on Dueling Mini-Game listings if [`miscSettings.checkUses.duel`](#--full-uses-check-%EF%B8%8F-) is set to `true`, and `(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟐𝟱x 𝗨𝗦𝗘𝗦)` on Noise Maker listings if [`miscSettings.checkUses.noiseMaker`](#--full-uses-check-%EF%B8%8F-) is set to `true`. It is recommended to only place this on buy listings (`details.buy`). On other items, this parameter output will be an empty string (show nothing).

**Usage example:**

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/98710377-878f3580-23be-11eb-9ed5-e0f6ec4e26af.png" alt="listings" style="display: block; margin-left: auto; margin-right: auto;"></div>

### - High-value in listings note (decoration) ✨ [^](#optionsjson-structure)
Property: `.highValue`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.showSpells` | `boolean` | `true` | Show spell(s) in the listings note. [See Example](https://user-images.githubusercontent.com/47635037/101237085-0f900300-3711-11eb-877e-cc3b5c904682.png). |
| `.showStrangeParts` | `boolean` | `false` | Show Strange parts (only the one you specified in [`highValue.strangeParts`](#-high-value-items-settings-)) |
| `.showKillstreaker` | `boolean` | `true` | Show killstreaker in the listings note. [See Example](https://user-images.githubusercontent.com/47635037/101237131-4a923680-3711-11eb-84f8-6e1384868111.png) |
| `.showSheen` | `boolean` | `true` | Show Sheen in the listings note. |
| `.showPainted` | `boolean` | `true` | Show painted color in the listings note. [See Example](https://user-images.githubusercontent.com/47635037/101237099-27678700-3711-11eb-994c-4291f6196645.png) |
\*Note: Only for sell orders.

### - Custom `%uses%` parameter output 💯 [^](#optionsjson-structure)
Property: `.uses`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.duel` | `string` | `(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟱x 𝗨𝗦𝗘𝗦)` | Custom `%uses%` parameter. |
| `.noiseMaker` | `string` | `(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟐𝟱x 𝗨𝗦𝗘𝗦)` | Custom `%uses%` parameter. |

---

## 📊 Trade Statistic settings [^](#optionsjson-structure) [↓](#--send-statistic-configuration--)
Parent property key: `statistics`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.lastTotalTrades` | `integer` | `0` | If you clear out (delete) your `polldata.json` file, it will reset your total trades count back to zero. This option can be used as an offset to ensure you never lose track of how many trades your bot has completed in total. An example would be if you bot has completed 1000 trades and you want to clear out your `polldata.json` file. If you set this to 1000, your bot will remember that it has completed 1000 trades in the past. |
| `.startingTimeInUnix` | `integer` (Unix) | `0` | Similar to `.lastTotalTrades`, this option sets the latest **instance** a trade was made (in Unix Timestamp). To read more about this option, please read [IdiNium's Discord Message Regarding This](https://discordapp.com/channels/664971400678998016/666909518604533760/707706994932449410). |
| `.lastTotalProfit MadeInRef` | `integer` | `0` | Similar to `.lastTotalTrades`, but this is for **last profit made** (value must in refined metal, i.e. 35.44). |
| `.lastTotalProfit OverpayInRef` | `integer` | `0` | Similar to `.lastTotalProfitMadeInRef`, but this is for **last profit from overpay** (value must in refined metal, i.e. 1000.44). |
| `.profitDataSince InUnix` | `integer` (Unix) | `0` | Similar to `.startingTimeInUnix`, this option sets the latest **instance** a profit was made (in Unix Timestamp). |

### - Automatic sending stats 📊⌚ [^](#optionsjson-structure)
Property: `.sendStats`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `false` | Send the content of `!stats` command every specified hours below |
| `.time` | `string[]` | `[]` | Time (local/timezone - 24 hours) in `hour:minute` format. Example: ["T23:59"] will send at only 23:59 PM, everyday. **Please include that `"T"` in front of each time**, otherwise this wont work. If this is leave empty array (`[]`) but `.enable` is `true`, then it will use default `["T23:59", "T05:59", "T11:59", "T17:59"]`. |

---

## 🔑 Autokeys Settings [^](#optionsjson-structure)
Parent property key: `autokeys`

### - General settings 🎛️

Keywords:
- `Keys` - Mann Co. Supply Crate Key
- `Pure Metals` - includes Refined Metal, Reclaimed Metal and Scrap Metal

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `false` | If set to `true`, your bot will automatically buy/sell Keys based on the availability of the Pure Metals and Keys in your bot inventory. This is done in an effort to ensure that your bot has enough Pure Metals to perform trades. |
| `.minKeys` | `integer` |   `3`   | When the bot's current stock of Keys is **greater than this value**, and the bot's current stock of Pure Metals is **less than** `.minRefined`, the bot will **start selling Keys** in order to convert Keys into Pure Metals. Otherwise, the bot will not sell Keys. |
| `.maxKeys` | `integer` |  `15`   | When the bot's current stock of Keys is **less than this value**, and the bot's current stock of Pure Metals is **greater than** `.maxRefined`, the bot will **start buying Keys** in order to convert Pure Metals into Keys. Otherwise, the bot will not buy Keys. |
| `.minRefined` | `number` |  `30`   | The minimum number of Pure Metals the bot can have before it begins **selling** Keys (to turn `Keys` into `Pure Metals`). See `.minKeys` for more information. |
| `.maxRefined` | `number` |  `150`  | The maximum number of Pure Metals the bot can have before it begins **buying** Keys (to turn `Pure Metals` into `Keys`). See `.maxKeys` for more information. |

### - Banking 🏧 [^](#optionsjson-structure)
Property: `.banking`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
|         `.enable`         | `boolean` | `false` | If set to `true`, your bot will bank (buy and sell) Keys. If your bot's current Pure Metals supply is between `.minRefined` and `.maxRefined` and `Keys > .minKeys`, it will bank Keys. `autokeys.enable` **must be set to `true` to enable this option.** |

### - Scrap adjustment 🧮 [^](#optionsjson-structure)
Property: `.scrapAdjustment`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `false`  | If set to `true`, the bot will make adjustments to the price of Keys when selling or buying. For example, if the current Keys price is "10 refined", the bot will take "10 refined" and add `.value` when buying, and subtract `.value` when selling. This is done in an effort to quickly buy and sell Keys using Autokeys when in a pinch by paying more for Keys and selling Keys for less. **This is not possible to do when key banking** ([`autokeys.banking.enable`](#--banking--) set to `true`). |
| `.value`  | `integer` |   `1`   | This is the amount of scrap (0.11 refined) the bot will increase the buy listing or decrease the sell listing when buying/selling Keys using Autokeys (if `.enable` is set to `true`). |

### - Accepting `🟩_UNDERSTOCKED` [^](#optionsjson-structure)
Property: `.accept`

| Option | Type | Default | Description |
| :-: | :-: | :-: | :-- |
|   `.understock`    | `boolean` | `false` | If set to `true`, your bot will accept trades that will lead to keys become under-stocked.  |

**Note:** The Autokeys feature is meant to have your bot maintain enough pure in its inventory. Enabling "Autokeys - Banking" may cause the Autokeys feature to not perform as intended.

---

## 🔩 Crafting/Smelting Settings [^](#optionsjson-structure)
Parent property key: `crafting`

### - Weapons 🏹 [^](#optionsjson-structure)
Property: `.weapons`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
|  `.enable`  | `boolean` | `true` | Setting this to to `false` will prevent your bot from automatically crafting any duplicated/class-matched **craftable** weapons into scrap. The pricelist takes priority over this config item. That is to say, if a craft weapon is in the pricelist, it will not be crafted into scrap. |

### - Pure metals ⚙️ [^](#optionsjson-structure)
Property: `.metals`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
|  `.enable`   | `boolean` | `true` | Setting this to `false` **(NOT recommended)** will disable metal crafting entirely. This may cause your bot and the trade partner to not be able to trade because of missing pure. |
| `.minScrap`  | `integer` |   `9`   | If your bot has less Scrap Metal than this amount, it will smelt down Reclaimed Metal to maintain ample Scrap Metal supply. |
|  `.minRec`   | `integer` |   `9`   | If your bot has less Reclaimed Metal than this amount, it will smelt down Refined Metal to maintain ample Reclaimed Metal supply. |
| `.threshold` | `integer` |   `9`   | If the bot's Scrap/Reclaimed Metal count has reached the minimum amount, and Scrap/Reclaimed Metal count has reached this threshold *[in other words, Scrap/Reclaimed Metal count is greater than (min + threshold)]*, it will combine the metal into the next highest denomination. |

---

## 📥 Offer received filter settings [^](#optionsjson-structure)
Parent property key: `offerReceived`

### - On offer with `🟥_INVALID_VALUE` [^](#optionsjson-structure)
Property: `.invalidValue`

#### • Automatic decline settings ❌
Sub-Property: `.autoDecline`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` |   `true`   | Set this to `false` if you do not want your bot to automatically decline any trades with `🟥_INVALID_VALUE` as the ONLY manual review reason where our side value is more than their side value, or do not match `exceptionValue.skus` and value difference is more than `exceptionValue.valueInRef` |
| `.declineReply` | `string` |   `""`   | See default [declined reply](https://github.com/TF2Autobot/tf2autobot/wiki/Library#--auto-decline-reply-). |


#### • Invalid-value exception ✅
Sub-Property: `.exceptionValue`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
|    `.skus`    | `string[]` |  `[]`   | An array of SKUs that will bypass the `🟥_INVALID_VALUE` offer if the difference between the bot's value and their value is not more than `.valueInRef`. Let's say your bot is selling an Unusual and someone sent an offer with 0.11 ref less, and you want your bot to accept it anyway. |
| `.valueInRef` | `integer`  |   `0`   | Exception value for the SKUs that you set above. The default is `0` (no exception). |

- Example when the bot accepts a trade that contains `.skus` and the difference in value not exceed `.valueInRef` (was set to 10 ref):

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/100343933-04efb280-301b-11eb-95de-bd3b53456d34.png" alt="trade-summary-full2" style="display: block; margin-left: auto; margin-right: auto;"></div>

---

### - On offer with `🟨_INVALID_ITEMS` [^](#optionsjson-structure)
Property: `.invalidItems`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.givePrice` | `boolean`  |   `false`   | If set to `true`, your bot will assign price for `🟨_INVALID_ITEMS` (items that are not in your price list) using prices from prices.tf. |
| `.autoAcceptOverpay` | `boolean`  |   `true`   | If set to `false`, your bot will not accept trades with `🟨_INVALID_ITEMS` where the value of their side **is greater than or equal to** the value of your bot's side. |

- Example if `.givePrice` and `.autoAcceptOverpay` are both set to `true`:

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/100343085-e0dfa180-3019-11eb-80ec-dafaaeb5296f.png" alt="trade-summary-full2" style="display: block; margin-left: auto; margin-right: auto;"></div>

#### • Automatic decline settings ❌
Sub-Property: `.autoDecline`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` |   `true`   | Set this to `false` if you do not want your bot to automatically decline trades with `🟨_INVALID_ITEMS`. |
| `.declineReply` | `string` |   `""`   | See default [declined reply](https://github.com/TF2Autobot/tf2autobot/wiki/Library#--auto-decline-reply-). |

===

### - On offer with `🟧_DISABLED_ITEMS` [^](#optionsjson-structure)
Property: `.disabledItems`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.autoAccept Overpay` | `boolean`  |   `false`   | If set to `true`, your bot will accept trades with `🟧_DISABLED_ITEMS` where some items that exist in your price list is currently disabled but the value of their side is **greater than** to the value of your bot's side. |

#### • Automatic decline settings ❌
Sub-Property: `.autoDecline`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` |   `false`   | Set this to `true` if you do want your bot to automatically decline trades with `🟧_DISABLED_ITEMS`. |
| `.declineReply` | `string` |   `""`   | See default [declined reply](https://github.com/TF2Autobot/tf2autobot/wiki/Library#--auto-decline-reply-). |

===

### - On offer with `🟦_OVERSTOCKED` [^](#optionsjson-structure)
Property: `.overstocked`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.autoAccept Overpay` | `boolean`  |   `false`   | If set to `true`, your bot will accept trades with `🟦_OVERSTOCKED` where some items already reach maximum the bot can have but the value of their side is **greater than** to the value of your bot's side. |

- Example if `.autoAcceptOverpay` is set to `true`:

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/100344377-ad057b80-301b-11eb-913f-3932e839c27c.png" alt="trade-summary-full2" style="display: block; margin-left: auto; margin-right: auto;"></div>

#### • Automatic decline settings ❌
Sub-Property: `.autoDecline`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` |   `false`   | Set this to `true` if you do want your bot to automatically decline trades with `🟦_OVERSTOCKED` |
| `.declineReply` | `string` |   `""`   | See default [declined reply](https://github.com/TF2Autobot/tf2autobot/wiki/Library#--auto-decline-reply-). |

===

### - On offer with `🟩_UNDERSTOCKED` [^](#optionsjson-structure)
Property: `.understocked`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.autoAccept Overpay` | `boolean`  |   `false`   | If set to `true`, your bot will accept trades with `🟩_UNDERSTOCKED` where some items will reach minimum the bot can have the trade is complete but the value of their side is **greater than** to the value of your bot's side. |

- Example if `.autoAcceptOverpay` is set to `true`:

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/100344507-dfaf7400-301b-11eb-9d0b-90b353bf5b9f.png" alt="trade-summary-full2" style="display: block; margin-left: auto; margin-right: auto;"></div>

#### • Automatic decline settings ❌
Sub-Property: `.autoDecline`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` |   `false`   | Set this to `true` if you do want your bot to automatically decline trades with `🟩_UNDERSTOCKED` |
| `.declineReply` | `string` |   `""`   | See default [declined reply](https://github.com/TF2Autobot/tf2autobot/wiki/Library#--auto-decline-reply-). |

===

### - On offer with `🟫_DUPED_ITEMS` [^](#optionsjson-structure)
Property: `.duped`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enableCheck` | `boolean`  |   `false`   | If set to `true`, the bot will perform checks on items to determine whether or not they are duplicated. |
| `.minKeys` | `number`  |   `10`   | The minimum number of keys an item must be worth before the bot performs a check for whether or not it is duplicated. |

#### • Automatic decline settings ❌
Sub-Property: `.autoDecline`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` |   `false`   | If set to `true`, the bot will decline any unusual items that it determines as having been duplicated. |
| `.declineReply` | `string` |   `""`   | See default [declined reply](https://github.com/TF2Autobot/tf2autobot/wiki/Library#--auto-decline-reply-). |

===

### - `⬜_ESCROW_CHECK_FAILED` [^](#optionsjson-structure)
Property: `.escrowCheckFailed`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.ignoreFailed` | `boolean`  |   `false`   | By default, your bot will skip the trade and put to review if escrow check failed (probably because Steam is down, or some problem with your bot - restart will help). Set this to `true` if you want your bot to **ignore** trade with failed escrow check (not recommended). |

===

### - `⬜_BANNED_CHECK_FAILED` [^](#optionsjson-structure)
Property: `.bannedCheckFailed`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.ignoreFailed` | `boolean`  |   `false`   | By default, your bot will skip the trade and put to review if banned check failed (probably because Steamrep.com or backpack.tf is down). Set this to `true` if you want your bot to **ignore** trade with banned check failed (not recommended). |

---

## 🔍 Manual Review Configuration [^](#optionsjson-structure)
Parent-Property: `manualReview`

### - General 🎚️ [^](#optionsjson-structure)

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
|        `.enable`        | `boolean` | `true`  | Offers with reasons such as `🟥_INVALID_VALUE` and so on will require manual review by you. |
|   `.showOfferSummary`   | `boolean` | `true`  | If set to `true`, your bot will show the trade offer summary to the trade partner. Otherwise, it will only notify the trade partner that their offer is being held for review. |
| `.showReviewOfferNote`  | `boolean` | `true`  | By default, your bot will show notes on for each [manual review reason](https://github.com/idinium96/tf2autobot/wiki/FAQ#why-my-bot-dont-acceptdecline-the-trade-automatically) |
| `.showOwnerCurrentTime` | `boolean` | `true`  | By default, your bot will show the owner's time when sending your trade partner any manual offer review notifications. |
| `.showItemPrices` | `boolean` | `true`  | set to `true` if you want to include item prices (buying/selling prices) - only for owner. |

### - Custom manual review reply 💬 [^](#optionsjson-structure)

#### • 🟥_INVALID_VALUE
Sub-Property: `.invalidValue`

| Option | Type | Default | Default reply |
| :----: | :--: | :-----: | :---------- |
| `.note` | `string` | `""`  | `You're taking too much in value.` then followed by `[You're missing: ${value}]` (unchangeable) |

===

#### • 🟨_INVALID_ITEMS
Sub-Property: `.invalidItems`

| Option | Type | Default | Default reply |
| :----: | :--: | :-----: | :---------- |
| `.note` | `string` | `""`  | `%itemsName% %isOrAre% not in my pricelist.` |

- Parameters:
    - `%itemsName%` - `join(', ')` of `${name}` array
    - `%isOrAre%` - will use `are` if `🟨_INVALID_ITEMS` more than one.

- Example: ***"Dueling Mini-Game, Secret Saxton are not in my pricelist."***

===

#### • 🟧_DISABLED_ITEMS
Sub-Property: `.disabledItems`

| Option | Type | Default | Default reply |
| :----: | :--: | :-----: | :---------- |
| `.note` | `string` | `""`  | `%itemsName% %isOrAre% currently disabled.` |

- Parameters:
    - `%itemsName%` - `join(', ')` of `${name}` array
    - `%isOrAre%` - will use `are` if `🟧_DISABLED_ITEMS` more than one.

- Example: ***"Dueling Mini-Game, Secret Saxton are currently disabled."***

===

#### • 🟦_OVERSTOCKED
Sub-Property: `.overstocked`

| Option | Type | Default | Default reply |
| :----: | :--: | :-----: | :---------- |
| `.note` | `string` | `""`  | `I can only buy %itemsName% right now.` |

- Parameters:
   - `%itemsName%` - `join(', ')` of `${amountCanBuy} - ${name}` array.

- Example: ***"I can only buy 1 - Secret Saxton, 0 - Jag right now."***

===

#### • 🟩_UNDERSTOCKED
Sub-Property: `.understocked`

| Option | Type | Default | Default reply |
| :----: | :--: | :-----: | :---------- |
| `.note` | `string` | `""`  | `I can only sell %itemsName% right now.` |

- Parameters:
    - `%itemsName%` - `join(', ')` of `${amountCanSell} - ${name}` array.

- Example: ***"I can only sell 1 - Secret Saxton, 0 - Jag right now."***

===

#### • 🟫_DUPED_ITEMS
Sub-Property: `.duped`

| Option | Type | Default | Default reply |
| :----: | :--: | :-----: | :---------- |
| `.note` | `string` | `""`  | `%itemsName% %isOrAre% appeared to be duped.` |

- Parameters:
    - `%itemsName%` - a join of `${name}, history page: https://backpack.tf/item/${el.assetid}` array

- Example: ***"Strange Australium Black Box, history page: https://backpack.tf/item/562353463 is appeared to be duped"***

===

#### • 🟪_DUPE_CHECK_FAILED
Sub-Property: `.dupedCheckFailed`

| Option | Type | Default | Default reply |
| :----: | :--: | :-----: | :---------- |
| `.note` | `string` | `""`  | `I failed to check for duped on %itemsName%.` |

- Parameters:
    - `%itemsName%` - a string OR a join of `${name}, history page: https://backpack.tf/item/${el.assetid}` array

- Example: ***"I failed to check for duped on Strange Australium Black Box, history page: https://backpack.tf/item/562353463"***

===

#### • ⬜_ESCROW_CHECK_FAILED
Sub-Property: `.escrowCheckFailed`

| Option | Type | Default | Default reply |
| :----: | :--: | :-----: | :---------- |
| `.note` | `string` | `""`  | `Steam is down and I failed to check your Escrow (Trade holds) status, please wait for my owner to manually accept/decline your offer.` |

===

#### • ⬜_BANNED_CHECK_FAILED
Sub-Property: `.bannedCheckFailed`

| Option | Type | Default | Default reply |
| :----: | :--: | :-----: | :---------- |
| `.note` | `string` | `""`  | `Backpack.tf or steamrep.com is down and I failed to check your backpack.tf/steamrep status, please wait for my owner to manually accept/decline your offer.` |

===

### - Custom addtional reply 💬 [^](#optionsjson-structure)

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.note` | `string` | `""`  | `Custom additional notes for offer that need to be reviewed.` |

---

## 🕸️ Discord Webhook [^](#optionsjson-structure)
Parent property: `discordWebhook`

### - General Configuration ⚙️ [^](#optionsjson-structure)

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.ownerID` | `string` (number) | `""` | Your Discord ID. To obtain this, right-click on yourself on Discord and click `Copy ID`. Be sure to enable Developer Mode on Discord by navigating to `Settings > Appearance > Advanced`. **It must be a number** in string like `527868979600031765` not `IdiNium#8965`. |
| `.displayName` | `string` | `""` | The name you'd like to give your bot when it sends a message on Discord. |
| `.avatarURL` | `string` | `""` | A URL to the image you'd like your bot to have when it sends a discord message. **This must be in URL form.** An example of how to obtain your bot's avatar from Steam: [Click here](https://gyazo.com/421792b5ea817c36054c7991fb18cdbc). |
| `.embedColor` | `string` (number) | `""` | The color you'd like associated with your bot's discord messages. You can view the different colors at [spycolor.com](https://www.spycolor.com/). Copy the `Decimal value`. An example of this would be `16769280` for the color `#ffe100` |

#### Note on how to obtain your Discord Webhook URL

Please view this [image](https://gyazo.com/90e9b16d7c54f1b4a96f95b9fae93187) for instructions on how to obtain your Discord Webhook URL. These settings would be set in your own personal Discord channel.

---

### - Trade Summary Configuration [^](#optionsjson-structure)
Property: `.tradeSummary`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean`  | `true` | Display each successful trade summary on your trade summary/live-trades channel via Discord Webhook. If set to `false`, it will send to your Steam Chat. |
| `.url` | `string[]` | `[]`  | An array of Discord Webhook URLs for trade summary. You will need to format it like so: `["yourDiscordWebhookLink"]`, or if you want to add more than one, you format them like so: `["link1", "link2"]` (separate each link with a comma, make sure `link1` is your **own** Discord Webhook URL - Mention owner and show stock changes will only be shown in `link1`). |

**Note**: Want to feature your bots trades on the tf2autobot Discord server? Contact IdiNium for a Webhook URL!

#### • Misc
Sub-Property: `.misc`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.showQuickLinks` | `boolean`  | `true` | Show the trade partner's quick links to their Steam profile, backpack.tf, and SteamREP pages. |
| `.showKeyRate` | `boolean`  | `true` | Show your bot's key rate |
| `.showPureStock` | `boolean`  | `true`  | Show your bot's pure stock |
| `.showInventory` | `boolean`  | `true`  | Show the total amount of items in your bot's inventory. |
| `.note`  |  `string`  |  `""`   | Any additional notes you'd like included with trade summaries. Linked note format: `[YourText](Link)` |

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/100342811-7dee0a80-3019-11eb-84af-24f2862ba1a1.png" alt="trade-summary-full" style="display: block; margin-left: auto; margin-right: auto;"></div>

#### • Mention on specific items (using sku)
Sub-Property: `.mentionOwner`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean`  | `true` | If set to `false`, your bot will never mention you on each successful trade (except for accepted `🟨_INVALID_ITEMS` or `🔶_HIGH_VALUE_ITEMS`) |
| `.itemSkus` | `string[]` | `[]`  | Your bot will mention you whenever a trade contains an SKU in this list. Supports multiple item SKUs. For example, let say you just want to be mentioned on every unusual and australium trade. You would input `[";5;u", ";11;australium"]`. If you want to be mentioned on specific items, just fill in the full item SKU, like so: `["725;6;uncraftable"]`. To add more, just separate new items with a comma between each SKU `string`. |
| `.tradeValueInRef` | `number`  | `0` | Zero means disable. If this is set to other than 0, then any trade that's greater or equal to set value will be mentioned. |

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/86468438-0073e600-bd6a-11ea-8bc0-040229c997d5.PNG" alt="trade-summary-full2" style="display: block; margin-left: auto; margin-right: auto;"></div>

---

### - Trade Offer Review Configuration [^](#optionsjson-structure)
Property: `.offerReview`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `true` | If set to `false`, messages regarding trade offers that require manual review will be sent to your Steam Chat. Otherwise, these messages will be sent on Discord. |
| `.url` | `string`  |  `""` | Discord Webhook URL for `REVIEW_OFFER`. |
| `.mentionInvalidValue` | `boolean` | `true` | If set to `false`, your bot **NOT mention** you for **ONLY** `🟥_INVALID_VALUE` offers. |
| `.isMention` | `boolean` | `true` | If set to `false`, you will never be mentioned on any offer to be reviewed. |

- An example if `.mentionInvalidValue` is set to `false`:
<div align="center"><img src="https://user-images.githubusercontent.com/47635037/100344876-75e39a00-301c-11eb-968e-2a780cac73da.png" alt="only non-invalid-value2" style="display:block;margin-left:auto;margin-right:auto;"></div>

#### • Misc
Object: `.misc`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.showQuickLinks` | `boolean` | `true` | Show the trade partner's quick links to their Steam profile, backpack.tf, and SteamREP pages. |
| `.showKeyRate` | `boolean` | `true` | Show your bot's key rate. |
| `.showPureStock` | `boolean` | `true`  | Show your bot's pure stock. |
| `.showInventory` | `boolean`  | `true`  | Show the total amount of items in your bot's inventory. |


<div align="center"><img src="https://user-images.githubusercontent.com/47635037/100345246-00c49480-301d-11eb-8b2f-a11cf0ac11b9.png" alt="only non-invalid-value2" style="display:block;margin-left:auto;margin-right:auto;"></div>

---

### - Trade Partner Message Configuration [^](#optionsjson-structure)
Property: `.messages`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `true` | Used to alert you on any messages sent from the trade partner via Discord Webhook. If set to `false`, it will send to your Steam Chat. |
| `.isMention` | `boolean` | `true` | If set to `false`, you will never be mentioned on any new messages from trade partner. |
| `.url` | `string`  |  `""`   | [Discord Webhook URL](#note-on-how-to-obtain-your-discord-webhook-url). |
| `.showQuickLinks` | `boolean` | `true`  | Show the trade partner's quick links to their Steam profile, backpack.tf, and SteamREP pages. |

---

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/100345359-2c477f00-301d-11eb-89ae-1b6ec8391106.png" alt="only non-invalid-value2" style="display:block;margin-left:auto;margin-right:auto;"></div>

---

### - Pricelist Update Configuration [^](#optionsjson-structure)
Property: `.priceUpdate`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `true` | Set to `false` to disable this feature. |
| `.url` | `string` | `""` | The [Discord Webhook URL](#note-on-how-to-obtain-your-discord-webhook-url) you'd like price update webhook to be sent to. |
| `.note` | `string` | `""` | Any additional notes you'd like included with price update webhook. |

---

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/100345689-a415a980-301d-11eb-9f49-bd3e560bcb5b.png" alt="only non-invalid-value2" style="display:block;margin-left:auto;margin-right:auto;"></div>

---

### - Send Alert Configuration [⁇](#-send-alert-to-owner--) [^](#optionsjson-structure)
Property: `.sendAlert`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `true` | If set to `false`, the bot will notify you through Steam chat if there is something wrong. Otherwise, the bot will notify you through Discord (`sendAlert` must be `true`). |
| `.isMention` | `boolean` | `true` | If set to `false`, you will never be mentioned on any alert. |
|   `.url`   | `string`  | `""` | The [Discord Webhook URL](#note-on-how-to-obtain-your-discord-webhook-url) you'd for the alert to be sent to. |

---

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/100345555-716bb100-301d-11eb-89ab-b9124eb4ed56.png" alt="only non-invalid-value2" style="display:block;margin-left:auto;margin-right:auto;"></div>

---

### - Send Statistic Configuration [⁇](#--automatic-sending-stats--) [^](#optionsjson-structure)
Property: `.sendStats`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable` | `boolean` | `true` | If set to `false`, the bot will send stats through Steam chat. Otherwise, the bot will send stats to Discord ([`statistics.autoSendStats.enable`](#--automatic-sending-stats--) must be `true` and [`statistics.autoSendStats.time`](#--automatic-sending-stats--) is empty or filled).|
|   `.url`   | `string`  | `""` | The [Discord Webhook URL](#note-on-how-to-obtain-your-discord-webhook-url) you'd for the stats to be sent to. |

---

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/106655152-f94cd900-65d3-11eb-8fe8-3e74a7008d44.png" alt="only non-invalid-value2" style="display:block;margin-left:auto;margin-right:auto;"></div>

---

## 💬 Custom message/reply [^](#optionsjson-structure)
Parent property: `customMessage`

### - Sending offer message [^](#optionsjson-structure)
| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.sendOffer`| `string` | `""` | "Powered by TF2Autobot" (not removed)|

===

### - Welcome message [^](#optionsjson-structure)
| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.welcome`| `string` | `""` | Your custom greeting note.|

- Parameters: 
    - `%name%`  - display trade partner's name
    - `%admin%` - if admin, it will use "!help", else "!how2trade"
    
- Default message: ***Hi %name%! If you don't know how things work, please type "!%admin%"***

===

### - Invalid command reply [^](#optionsjson-structure)
| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.iDontKnowWhatYouMean`| `string` | `""` | Your custom note when people send the wrong command. |

- Default message: **❌ I don't know what you mean, please type "!help" for all of my commands!**

===

### - Message on trade completed [^](#optionsjson-structure)
| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.success`| `string` | `""` | Bot message when a trade has been sucessfully made. |

- Default message: **/pre ✅ Success! The offer went through successfully.**
- Read: [FAQ](https://github.com/TF2Autobot/tf2autobot/wiki/FAQ#how-to-set-custom-welcomesuccess-messages)

===

### - Message on accepted escrow trade [^](#optionsjson-structure)
| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.success`| `string` | `""` | Bot message when a trade has been sucessfully made. |

- Default message:
```
✅ Success! The offer has gone through successfully, but you will receive your items after several days. To prevent this from happening in the future, please enable Steam Guard Mobile Authenticator.

Read:
• Steam Guard Mobile Authenticator - https://support.steampowered.com/kb_article.php?ref=8625-WRAH-9030
• How to set up the Steam Guard Mobile Authenticator - https://support.steampowered.com/kb_article.php?ref=4440-RTUI-9218"
```

===

### - Message on declined trades [^](#optionsjson-structure)
Sub-property: `.decline`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.decline[DECLINE_REASON]`| `string` | `""` | Refer: [Default declined reply](https://github.com/TF2Autobot/tf2autobot/wiki/Library#--declined-with-other-reasons-). |

===

### - Message on accepted trades [^](#optionsjson-structure)
Sub-property: `.accepted`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.accepted[AutoOrManual][type]`| `string` | `""` | Refer: [Default accepted message](https://github.com/TF2Autobot/tf2autobot/wiki/Library#--accepted-message-). |

===

### - Traded away message [^](#optionsjson-structure)
| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.tradedAway`| `string` | `""` | Your custom note when the bot fails to trade because the item is traded away. |

- Default message: **/pre ❌ Ohh nooooes! Your offer is no longer available. Reason: Items not available (traded away in a different trade).**

===

### - Fail to perform mobile confirmation message [^](#optionsjson-structure)
| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.failedMobileConfirmation`| `string` | `""` | Your custom note when the bot fails to perform mobile confirmation. |

- Default message: **/pre ❌ Ohh nooooes! The offer is no longer available. Reason: Failed to accept mobile confirmation**

===

### - Message on trade canceled [^](#optionsjson-structure)
| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.cancelledActiveForAwhile`| `string` | `""` | Your custom note when the trade got canceled. |

- Default message: **/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been active for a while. If the offer was just created, this is likely an issue on Steam's end. Please try again**

===

### - Message on clearing friend [^](#optionsjson-structure)
| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.clearFriends`| `string` | `""` | Your custom message to trade partner when the bot removing them to replace with others. |

- Default message: **/quote I am cleaning up my friend list and you have randomly been selected to be removed. Please feel free to add me again if you want to trade at a later time!**
- Parameter:
    - `%name%` - partner's name


---

## ❗ Command settings [^](#optionsjson-structure)
Parent property: `commands`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable`| `boolean` | `true` | Set to `false` if you want to disable commands (immune to ADMINS). |
| `.customDisableReply`| `string` | `""` | Default reply: ***❌ Command function is disabled by the owner.*** |

### - `!how2trade` [^](#optionsjson-structure)
Property: `.how2trade.customReply`

| Option | Type | Default |
| :----: | :--: | :-----: |
| `.reply`| `string` | `""` |

- Default reply:
```
/quote You can either send me an offer yourself, or use one of my commands to request a trade. Say you want to buy a Team Captain, just type "!buy Team Captain", if want to buy more, just add the [amount] - "!buy 2 Team Captain". Type "!help" for all the commands.
You can also buy or sell multiple items by using the "!buycart [amount] <item name>" or "!sellcart [amount] <item name>" commands.
```

===

### - `!price` [^](#optionsjson-structure)
Property: `.price`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable`| `boolean` | `true` | Set to `false` if want to disable `!price` command. |
| `.customReply.disabled`| `string` | `""` | Default reply: ***❌ This command is disabled by the owner.*** |

===

### - `!buy / !sell / !buycart / !sellcart` [^](#optionsjson-structure)
Property: `.buy` | `.sell` | `.buycart` | `.sellcart`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable`| `boolean` | `true` | Set to `false` if want to disable any of the stated commands. |
| `.disableForSKU`| `string[]` | `""` | Set specific sku(s) to disable any of the stated commands. |

#### • Custom reply
Sub-property: `.customReply`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.disabled`| `string` | `""` | Default reply: ***❌ This command is disabled by the owner.*** |
| `.disabledForSKU`| `string` | `""` | Default reply: ***❌ [command] command is disabled for %itemName%.*** |

- Parameter (for `.disabledForSKU`): `%itemName%`
    - output: The name of an item of specified SKU

===

### - `!cart` [^](#optionsjson-structure)
Property: `.cart`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable`| `boolean` | `true` | Set to `false` if want to disable `!cart` command. |

#### • Custom reply
Sub-property: `.customReply`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.title`| `string` | `""` | Default reply: **🛒== YOUR CART ==🛒** |
| `.disabled`| `string` | `""` | Default reply: ***❌ This command is disabled by the owner.*** |

===

### - `!clearcart` [^](#optionsjson-structure)
Property: `.clearcart`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.customReply.reply`| `string` | `""` | Default reply: **🛒 Your cart has been cleared.** |

===

### - `!checkout` [^](#optionsjson-structure)
Property: `.checkout`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.customReply.empty`| `string` | `""` | Default reply: **🛒 Your cart is empty.** |

===

### - (not a command) When adding to the queue [^](#optionsjson-structure)
Property: `.addToQueue`

#### • Already have an active offer

| Option | Type | Default |
| :----: | :--: | :-----: |
| `.alreadyHaveActiveOffer`| `string` | `""` |

- Default reply: `❌ You already have an active offer! Please finish it before requesting a new one: %tradeurl%`
- Parameter:
    - `%tradeurl%` - output: `https://steamcommunity.com/tradeoffer/${activeOfferID}`

///

#### • Already in queue, processing offer

| Option | Type | Default | Default reply |
| :----: | :--: | :-----: | :------ |
| `.alreadyInQueueProcessingOffer`| `string` | `""` | `⚠️ You are already in the queue! Please wait while I process your offer.` |

///

#### • Already in queue, waiting turn

| Option | Type | Default |
| :----: | :--: | :-----: |
| `.alreadyInQueueWaitingTurn`| `string` | `""` |

- Default reply: `✅ You have been added to the queue! Please wait your turn, there %isOrAre% %position% in front of you.`
- Parameter:
    - `%isOrAre%` - more than 1 use **"are"**, else **"is"**
    - `%position%` - total queue position

///

#### • Added to queue, waiting turn

| Option | Type | Default |
| :----: | :--: | :-----: |
| `.addedToQueueWaitingTurn`| `string` | `""` |

- Default reply: `✅ You have been added to the queue! Please wait your turn, there %isOrAre% %position% in front of you.`
- Parameter:
    - `%isOrAre%` - more than 1 use **"are"**, else **"is"**
    - `%position%` - total queue position

///

#### • Altered offer

| Option | Type | Default |
| :----: | :--: | :-----: |
| `.alteredOffer`| `string` | `""` |

- Default reply: `⚠️ Your offer has been altered. Reason: %altered%.`
- Parameter:
    - `%altered%` - altered message - unchangeable

///

#### • Processing offer message
Sub-Property: `.processingOffer`

| Option | Type | Default | Default reply |
| :----: | :--: | :-----: | :------------ |
| `.donation`| `string` | `""` | `⌛ Please wait while I process your donation! %summarize%`|
| `.isBuyingPremium`| `string` | `""` | `⌛ Please wait while I process your premium purchase! %summarize%`|
| `.offer`| `string` | `""` | `⌛ Please wait while I process your offer! %summarize%`|

- Parameter:
    - `%summarize%` - summarize message - unchangeable

///

#### • Accepting Mobile confirmation message
Sub-Property: `.hasBeenMadeAcceptingMobileConfirmation`

| Option | Type | Default | Default reply |
| :----: | :--: | :-----: | :------------ |
| `.donation`| `string` | `""` | `⌛ Your donation has been made! Please wait while I accept the mobile confirmation.`|
| `.isBuyingPremium`| `string` | `""` | `⌛ Your premium purchase has been made! Please wait while I accept the mobile confirmation.`|
| `.offer`| `string` | `""` | `⌛ Your offer has been made! Please wait while I accept the mobile confirmation.`|

===

### - `!cancel` [^](#optionsjson-structure)
Property: `.cancel.customReply`

| Option | Type | Default | Default reply |
| :----: | :--: | :-----: | :---------- |
| `.isBeingSent`| `string` | `""` | **⚠️ Your offer is already being sent! Please try again when the offer is active.** |
| `.isCancelling`| `string` | `""` | **⚠️ Your offer is already being canceled. Please wait a few seconds for it to be canceled.** |
| `.isRemovedFromQueue`| `string` | `""` | **✅ You have been removed from the queue.** |
| `.noActiveOffer`| `string` | `""` | **❌ You don't have an active offer.** |
| `.successCancel`| `string` | `""` | **/pre ❌ Ohh nooooes! The offer is no longer available. Reason: Offer was canceled by user.** |

===

### - `!queue` [^](#optionsjson-structure)
Property: `.queue.customReply`

| Option | Type | Default | Default reply |
| :----: | :--: | :-----: | :---------- |
| `.notInQueue`| `string` | `""` | **❌ You are not in the queue.** |
| `.offerBeingMade`| `string` | `""` | **⌛ Your offer is being made.** |
| `.hasPosition`| `string` | `""` | **There are %position% users ahead of you.** |

- Parameter:
    - `%position%` - total position in queue

===

### - `!owner` [^](#optionsjson-structure)
Property: `.owner`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable`| `boolean` | `true` | Set to `false` if want to disable `!owner` command (ADMINS are immune). |

#### • Custom reply
Sub-Property: `.customReply`

| Option | Type | Default | Default reply |
| :----: | :--: | :-----: | :---------- |
| `.disabled`| `string` | `""` | **❌ This command is disabled by the owner.** |
| `.reply`| `string` | `""` | **• Steam: %steamurl%\n• Backpack.tf: %bptfurl%** |

- Parameters:
    - `%steamurl%` - `https://steamcommunity.com/profiles/${firstAdmin.toString()}`
    - `%bptfurl%` - `https://backpack.tf/profiles/${firstAdmin.toString()}`
    - `%steamid%` - SteamID64 of the first ADMINS element

===

### - `!discord` [^](#optionsjson-structure)
Property: `.discord`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable`| `boolean` | `true` | Set to `false` if want to disable `!discord` command (ADMINS are immune). |
| `.inviteURL`| `string` | `""` | Default: `https://discord.gg/D2GNnp7tv8`. |

#### • Custom reply
Sub-Property: `.customReply`

| Option | Type | Default | Default reply |
| :----: | :--: | :-----: | :---------- |
| `.disabled`| `string` | `""` | **❌ This command is disabled by the owner.** |
| `.reply`| `string` | `""` | Refer below |

- Default:
    - If `discord.inviteURL` is not empty:
        - `TF2Autobot Discord Server: https://discord.gg/D2GNnp7tv8\nOwner's Discord Server: ${inviteURL}`
    - If empty:
        - "TF2Autobot Discord Server: https://discord.gg/D2GNnp7tv8"
- Parameter: `%discordurl%` - your [`commands.discord.inviteURL`](#--`!discord`)

===

### - `!more` / `!autokeys` [^](#optionsjson-structure)
Property: `.more` | `.autokeys`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable`| `boolean` | `true` | Set to `false` if want to disable `!more` command (ADMINS are immune). |
| `.customReply .disabled`| `string` | `""` | Default reply: **❌ This command is disabled by the owner.**. |

===

### - `!message` [^](#optionsjson-structure)
Property: `.message`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable`| `boolean` | `true` | Set to `false` if want to disable `!message` command (ADMINS are immune). |

#### • Custom reply
Sub-Property: `.customReply`

| Option | Type | Default | Default reply |
| :----: | :--: | :-----: | :---------- |
| `.disabled`| `string` | `""` | **❌ This command is disabled by the owner.** |
| `.wrongSyntax`| `string` | `""` | **❌ Please include a message. Here\'s an example: "!message Hi"** |
| `.fromOwner`| `string` | `""` | **/quote 💬 Message from the owner: %reply%\n\n❔ Hint: You can use the !message command to respond to the owner of this bot.\nExample: !message Hi Thanks!** |
| `.success`| `string` | `""` | **✅ Your message has been sent.** |

- Parameter: `%reply%` - Your reply

===

### - `!time` / `!uptime` / `!pure` / `!rate` [^](#optionsjson-structure)
Property: `.time` | `.uptime` | `.pure` | `.rate`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable`| `boolean` | `true` | Set to `false` if want to disable any of these command (ADMINS are immune). |

#### • Custom reply
Sub-Property: `.customReply`

| Option | Type | Default | Default reply |
| :----: | :--: | :-----: | :---------- |
| `.disabled`| `string` | `""` | **❌ This command is disabled by the owner.** |
| `.reply`| `string` | `""` | Refer below |

- `!time`
    - Default reply: `It is currently the following time in my owner's timezone: %emoji% %time%\n\n%note%`
    - Parameter: 
        - `%emoji%` - clock emoji
        - `%time%` - full time format
        - `%note%` - additional notes

- `!uptime`
    - Default reply: `Bot has been up for %uptime%`
    - Parameter:
        - `%uptime%` - total uptime

- `!pure`
    - Default reply: `💰 I have %pure% in my inventory.`
    - Parameter:
        - `%pure%` - a `join('and')` of `pureStock` array
    - Example: `I have 31 keys and 17.44 refs (12 ref, 11 rec, 16 scrap) in my inventory.`


- `!rate`
    - Default reply:
```
I value 🔑 Mann Co. Supply Crate Keys at %keyprice%. This means that one key is the same as %keyprice% and %keyprice% is the same as one key.

Key rate source: %source%"
```

    - Parameters:
        - `%keyprice%` - current sell price
        - `%keyrate%` - current buy/sell price
        - `%source%` - show pricestf url if autopriced, "manual" if manually priced

===

### - `!stock` [^](#optionsjson-structure)
Property: `.stock`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable`| `boolean` | `true` | Set to `false` if want to disable `!stock` command (ADMINS are immune). |
| `.maximumItems`| `integer` | `20` | Maximum number of items to be shown. Default is 20. |

#### • Custom reply
Sub-Property: `.customReply`

| Option | Type | Default | Default reply |
| :----: | :--: | :-----: | :---------- |
| `.disabled`| `string` | `""` | **❌ This command is disabled by the owner.** |
| `.reply`| `string` | `""` | **/pre 📜 Here's a list of all the items that I have in my inventory:\n%stocklist%** |

- Parameter: 
    - `%stocklist%` - a `join(', \n')` array of the items your bot have (up to `stock.maximumItems`).

===

### - `!craftweapon` / `!uncraftweapon` [^](#optionsjson-structure)
Property: `.craftweapon` | `.uncraftweapon`

| Option | Type | Default | Description |
| :----: | :--: | :-----: | :---------- |
| `.enable`| `boolean` | `true` | Set to `false` if want to disable `!craftweapon` or `!uncraftweapon` command (ADMINS are immune). |

#### • Custom reply
Sub-Property: `.customReply`

| Option | Type | Default | Default reply |
| :----: | :--: | :-----: | :---------- |
| `.disabled`| `string` | `""` | **❌ This command is disabled by the owner.** |
| `.dontHave`| `string` | `""` | **❌ I don't have any craftable (or uncraftable) weapons in my inventory.** |
| `.have`| `string` | `""` | **📃 Here's a list of all craft (or uncraft) weapons stock in my inventory:\n\n%list%** |

- Parameter: 
    - `%list%` - a `join(', \n')` array of craftable (or uncraftable) weapons that your bot have.

---

## Extra [^](#optionsjson-structure)
Parent property: `detailsExtra`

### - Custom `spell` text on listing note
Property: `.spells[spellName]`

- Custom string to be shown in listing note if [`details.highValue.showSpells`](#--high-value-in-listings-note-decoration--) set to `true`

///

### - Custom `sheen` text on listing note
Property: `.sheens[sheenName]`

- Custom string to be shown in listing note if [`details.highValue.showSheens`](#--high-value-in-listings-note-decoration--) set to `true`

///

### - Custom `killstreakers` text on listing note
Property: `.killstreakers[killstreakerName]`

- Custom string to be shown in listing note if [`details.highValue.showKillstreakers`](#--high-value-in-listings-note-decoration--) set to `true`

///

### - Paints

#### • Custom `painted` text on listing note
Property: `.painted[paintName].stringNote`

- Custom string to be shown in listing note if [`details.highValue.showPainted`](#--high-value-in-listings-note-decoration--) set to `true`

===

#### • Custom additional price for automatic add painted items
Property: `.painted[paintName].price`

- What is this use for? [Click here](#--automatic-add-painted-items---)

///

### - Custom `Strange Part` text on listing note
Property: `.strangeParts[strangePartName]`

- Custom string to be shown in listing note if [`details.highValue.showKillstreakers`](#--high-value-in-listings-note-decoration--) set to `true`
