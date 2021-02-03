# Table of Contents

- [Steam Desktop Authenticator](#steam-desktop-authenticator)
     - [Where are my account secrets?](#where-are-my-account-secrets)
     - [Decrypting and Encrypting](#decrypting-and-encrypting)
- [Trading](#trading)
     - [I set my items to bank, my bot bought one but never put it to sell. Why?](#trading)
     - [Why are my bot buy/sell orders just suddenly disappearing over time?](#trading)
     - [How much does bot count a Craftable weapon as? 0.05 or 0.11 ref?](#trading)
     - [Why my bot don't accept/decline the trade automatically?](#why-my-bot-dont-acceptdecline-the-trade-automatically)
     - [Why my bot doesn't list some of the items that I have recently added?](#why-my-bot-doesnt-list-some-of-the-items-that-i-have-recently-added)
- [Custom settings](#custom-settings)
     - [How to set custom welcome/success messages?](#how-to-set-custom-welcomesuccess-messages)

# Steam Desktop Authenticator
Steam Desktop Authenticator is a desktop implementation of Steam's mobile authenticator app. Which you can use if you for example do not have a phone, or if you need easy access to your account secrets for a bot account.  
You can download it [here](https://github.com/Jessecar96/SteamDesktopAuthenticator)  

## Where are my account secrets?
You can find your `shared_secret` and `identity_secret` by going to your Steam Desktop Authenticator folder, then into the `maFiles` folder. Here you will find account files. Find the one with your steamID and open it.  
If you are unable to read anything, your file is likely encrypted. Check out [Decrypting and Encrypting](#decryptingandencrypting) below.  
If it is not encrypted, simply copy and paste the `shared_secret` and `identity_secret` into your bots `ecosystem.json` or `.env` file. Depends on which one you are using.  

## Decrypting and Encrypting
If your file is encrypted, meaning the contents probably look something like `AJHSASJLDHASKLJHD87ASDASLNJ3S...`, you can decrypt it by opening Steam Desktop Authenticator, clicking `Setup Encryption` on the top right, enter your passkey and then click `Accept` 2 more times, without entering in a new passkey.  
Now re-open your maFile. You should be able to get your secrets now.

# Trading

## I set my items to bank, my bot bought one but never put it to sell. Why?
For your information, every time the bot bought/sold any items, it will run a check on the price list whether a listing for that item already been created or removed. When your bot did not put an item that it bought to sell, it's probably because Backpack.tf still did not fully load your items in their item server. If you see your bot backpack and the item already appeared, make sure it's not in **Using Fallback** status, or you can try to send `!refreshlist` to your bot, which your bot will execute checks on all items that it has and create sell orders for the missing items. If it's still not working, then try restarting your bot.

## Why are my bot buy or sell orders just suddenly disappearing or not being listed over time?
We don't have enough information regarding this issue. It could be a rate-limit with backpack.tf when your bot updating prices on a lot of items. The only way to solve this issue is by restarting your bot, or just let it recover by itself.

<details><summary>UPDATE:</summary>
<p>
An experiment conducted by <a href="https://github.com/SkiLEXx">@SkiLEXx</a> that show the effect of Backpack.tf listings count on time. The timezone is CET (GMT +01:00).
<div align="center"><img src="https://cdn.discordapp.com/attachments/666909760666468377/773688443569700904/unknown.png" alt="Bot1" style="display: block; margin-left: auto; margin-right: auto;"></div>

<div align="center"><img src="https://cdn.discordapp.com/attachments/666909760666468377/773688421943083018/unknown.png" alt="Bot2" style="display: block; margin-left: auto; margin-right: auto;"></div>

Based on the results above, you're about to expect that this will happen sometimes. Most autoprice=true items will be affected by this kind of listings disappearing, because at some point prices.tf burst to update multiple items prices and maybe got rate-limited on backpack.tf.
</p>
</details>

## How much does bot count a Craftable weapon as? 0.05 or 0.11 ref?
All craft weapons listed [here](https://github.com/idinium96/tf2autobot/blob/master/src/lib/data.ts#L171-L454) and uncraft weapons [here](https://github.com/idinium96/tf2autobot/blob/master/src/lib/data.ts#L316-L454) (if you set `miscSettings.weaponsAsCurrency.withUncraft` to `true`) are counted as 0.05 ref **IF** you set `miscSettings.weaponsAsCurrency.enable` as `true` and you did not add that particular item in your price list.

If you set `miscSettings.weaponsAsCurrency.enable` to `true` AND you manually add and set the price, it will not count as 0.05 ref, instead will follow your manually set prices.

If you set `miscSettings.weaponsAsCurrency.enable` to `false`, then all of that craft/uncraft weapons will not be priced if you not manually set the prices.

## Why my bot don't accept/decline the trade automatically?
If someone sent an offer with wrong values, any items that are not in the pricelist, items that already reached maximum stock and etc, and `manualReview.enable` is set to `true`, then you should expect this to happen.

Some descriptions of each reason:
<details><summary>🟥_INVALID_VALUE</summary>
<p>
The value of your side (Asked) and the trade partner side (Offered) and not equal or more. If you want to automatically decline any offer that <b>ONLY</b> has this reason, you need to set <code>offerReceived.invalidValue.autoDecline.enable</code> to <code>true</code>. You can also set an exceptional value for an offer with this reason to be accepted by filling the item sku(s) in the <code>offerReceived.invalidValue.exceptionValue.skus</code> array and set the <code>offerReceived.invalidValue.exceptionValue.valueInRef</code> value. Find more about it <a href="https://github.com/idinium96/tf2autobot/wiki/Configuring-the-bot-#--on-offer-with-`🟥_invalid_value`">here</a>.
</p>
</details>

<details><summary>🟦_OVERSTOCKED</summary>
<p>
Some of their items might already in your bot inventory and will reach or have already reached maximum stock if you accept the trade. The bot will automatically accept overstocked offers by default if the trade partner is overpaying. If you don't want this, simply set <code>offerReceived.overstocked.autoAcceptOverpay</code> to <code>false</code>. If you want your bot to automatically decline any offer that <b>ONLY</b> has this reason, you'll need to set <code>offerReceived.overstocked.autoDecline.enable</code> to <code>true</code>.
</p>
</details>

<details><summary>🟩_UNDERSTOCKED</summary>
<p>
Some of our items will be less than the minimum stock if you accept the trade (if you set the item minimum to other than 0). Your bot will automatically accept understocked offers by default if the trade partner is overpaying. If you don't want this, simply set <code>offerReceived.understocked.autoAcceptOverpay</code> to <code>false</code>. If you want your bot to automatically decline any offer that <b>ONLY</b> has this reason, you'll need to set <code>offerReceived.understocked.autoDecline.enable</code> to <code>true</code>.
</p>
</details>

<details><summary>🟨_INVALID_ITEMS</summary>
<p>
Some of the items are not in your bot price list. If you have used <code>tf2-automatic</code> before, any <code>🟨_INVALID_ITEMS</code> items will not be priced (0 keys, 0 ref value), but <code>TF2Autobot</code> will get the price of that particular item from prices.tf and price it by default. You can disable this feature by changing the <code>offerReceived.invalidItems.givePrice</code> default value to <code>false</code>. Your bot will also accept invalid items offers by default if the trade partner is overpaying (set <code>offerReceived.invalidItems.autoAcceptOverpay</code> to <code>false</code> if you want to disable it).

Don't worry, if your bot has accepted any <code>🟨_INVALID_ITEMS</code>, your bot will mention you (if you enable Discord Webhook for trade summary), AND your bot will automatically add that particular item(s) to the pricelist with <code>intent=sell</code> (if and only if the items are priced with prices.tf).
</p>
</details>

<details><summary>🟫_DUPED_ITEMS</summary>
<p>
The setting for this can be found <a href="https://github.com/idinium96/tf2autobot/wiki/Configuring-the-bot#--on-offer-with-`🟫_duped_items`">here</a>. <code>offerReceived.duped.enableCheck</code> is set to <code>true</code> by default. If some items the trade partner is/are offering more than <code>offerReceived.duped.minKeys</code> value, then your bot will run a duped check on that particular item. If it's found that it's duped, then you should expect your bot to send this to you. If you want to decline duped items that are more than the <code>manualReview.duped.minKeys</code> value, simply set the <code>offerReceived.duped.autoDecline.enable</code> to <code>true</code>.
</p>
</details>

<details><summary>🟪_DUPE_CHECK_FAILED</summary>
<p>
This might occur if the item is not fully loaded by backpack.tf, which the history page of that particular item is not available.
</p>
</details>

<details><summary>⬜_ESCROW_CHECK_FAILED</summary>
<p>
This can occur when the Steam Client is down. It's temporary but if the trade partner keeps on sending it, you might just manually accept it. Escrow means trade holds, in which your and their items will be held to the Steam items server for some period of time. If you don't care about Escrow, simply set <code>bypass.escrow.allow</code> to <code>true</code>. 
</p>
</details>

<details><summary>⬜_BANNED_CHECK_FAILED</summary>
<p>
This can occur when Steamrep.com or backpack.tf is down. This is temporary and will be back in operation when Steamrep.com or backpack.tf is online. You will need to manually browse the trade partner backpack.tf page to see if that person is banned on Steamrep or not. If you just blindly accept the trade, your bot has the potential of getting banned from using backpack.tf services.
</p>
</details>

## Why my bot doesn't list some of the items that I have recently added?
If you add your items using [tf2-automatic-gui](https://github.com/ZeusJunior/tf2-automatic-gui/) while your bot is running, then this might be the cause of the problem. Adding items while your bot is still running will cause the items added will not be priced correctly (see [this](https://cdn.discordapp.com/attachments/666909760666468377/769802385526226974/unknown.png)) and will not list it on backpack.tf. One way of fixing this issue is to send `!update all=true&autoprice=false` and then send `!update all=true&autoprice=true` to your bot and it will fix the prices.

Please make sure to stop your bot when you're replacing your `pricelist.json` from the tf2-automatic-gui config folder to your bot files folder, or if you change the path of the tf2-automatic-gui, make sure your bot is not running when you're using it.

# Custom settings

## How to set custom welcome/success messages?
All settings for custom messages can be found [here](https://github.com/idinium96/tf2autobot/wiki/Configuring-the-bot#💬-custom-message/reply).

When you're applying your custom messages, make sure to always obey the JSON format. You can not add a new line with `ENTER`, but instead you'll need to add `\n` for the new line. The `\` symbol is called escape characters. Another important escape characters are:

> `\n` - new line

> `\"` - double quote

> `\\` - backslash

<details><summary>Click here to see some example.</summary>
<p>
<div align="center"><img src="https://cdn.discordapp.com/attachments/666909760666468377/769613063980318750/unknown.png" alt="accept-message" style="display:block;margin-left:auto;margin-right:auto;"></div>

What it looks like in your options.json file:

<b>options.json</b>
<code>"customMessage.success": "/quote ✅Success! The offer went through successfully. Want a bot like this? Visit: https://github.com/idinium96/tf2autobot and join our Discord Server: https://discord.gg/ZrVT7mc\n\nFeel free to leave +rep!\nSteam: https://steamcommunity.com/id/IdiNium-Fumino/\nThanks!",</code>

</p>
</details>