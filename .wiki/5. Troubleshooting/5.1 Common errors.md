This page contains common errors and ways to fix them.

# Table of Contents

- [Startup errors](#startup-errors)
   - [Missing required enviroment variable](#missing-required-enviroment-variable)
      - [ecosystem.json](#ecosystemjson)
      - [.env](#env)
   - [Unknown SteamID input format](#unknown-steamid-input-format)
   - [Access denied](#access-denied)
   - [Ratelimit exceeded](#ratelimit-exceeded)
   - [Could not get account limitations](#could-not-get-account-limitations)
- [Other errors](#other-errors)
   - [Unexpected token in JSON](#unexpected-token-in-json)
   - [Reason: Failed to accept mobile confirmation.](#reason-failed-to-accept-mobile-confirmation)

# Startup errors
## Missing required environment variable
When updating your environmental variables, almost make sure you restart the bot with the `--update-env` option if you are using PM2. As explained [here](https://github.com/idinium96/tf2autobot/wiki/Updating-the-bot#updating-the-environment-file) 
#### ecosystem.json
You need to make sure your file is **NOT** called `ecosystem.template.json`. It needs to be `ecosystem.json`.  

#### .env
Before trying to fix this error, you should [enable viewing file extensions](https://fileinfo.com/help/windows_10_show_file_extensions).  
MAKE SURE THE FILE IS NOT CALLED `config.env` OR `bot.env` OR ANYTHING. JUST `.env`.  
If your computer does not allow you to name it `.env`, simply call it `.env.` (with the extra `.`).

## Unknown SteamID input format
In your `.env` or `ecosystem.json`, the `ADMINS` and `KEEP` options need to have valid SteamID64's in them. For example: `76561198144346135` is a valid SteamID64.  
You can find this on [SteamRep](https://steamrep.com/) or on your [Backpack.tf profile](https://backpack.tf/my)

## Access denied
Your Steam account(s) needs to be [unlimited](https://support.steampowered.com/kb_article.php?ref=3330-IAGK-7663). To make your Steam account(s) unlimited you need to add $5 or more to the Steam account(s) [here](https://store.steampowered.com/steamaccount/addfunds) (remember to be logged into the bot(s)' account). If you're using another currency than USD, you might need to add more than $5 due to conversion rates.

## Ratelimit Exceeded
You have logged in too many times (possibly due to it crashing and restarting too often). Stop the bot for an hour and then start it again.

## Could not get account limitations
As it says in the console with the message about the error, set `SKIP_ACCOUNT_LIMITATIONS` to `true` in your `.env` or `ecosystem.json`.

# Other errors

## Unexpected token in JSON
There are multiple cases where this may happen. If your error looks somewhat like this: ![https://i.imgur.com/mKMp3i5.png](https://i.imgur.com/mKMp3i5.png "error")  
Then something went wrong with your `polldata.json` file. This is located in the `tf2autobot/files/{your steamid}/` folder. Simply deleting it will fix the issue.

If this issue is not solved by deleting your `polldata.json` file, check your `pricelist.json` file for corruption. Making a regular backup of your `pricelist.json` file is always recommended.

If the error is bigger, and starts with 
```cmd
SyntaxError: Unexpected token o in JSON at position 1
    at JSON.parse (<anonymous>)
    at new Bot (C:\Users\Name\Desktop\Edited\dist\classes\Bot.js:74:72)
```
Or something similar, then you did not set your `ALERTS` properly in your `.env` or `ecosystem.json`.  
It is supposed to look like `["trade"]` or `["none"]`. This error usually happens if you forget the `[]` brackets.

## Reason Failed to accept mobile confirmation
The bot may produce this error when a user attempts to trade using the !buy or !sell commands.  
This issue occurs when SDA is left open. Please close SDA.