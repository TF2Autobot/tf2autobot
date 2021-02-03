# What is polldata.json?
Your `polldata.json` located at `~/tf2autobot/files/steam_login_name/` stores all the trades your bot has made. Read more about it [here](https://github.com/DoctorMcKay/node-steam-tradeoffer-manager/wiki/Polling).

Over time this file will grow bigger and slow down your bot. You will want to maintain your `polldata.json` regularly. Depending on how many trades your bot makes this could be done weekly or monthly.

You are faced with two options. If you care about your `!stats` command being correct you will want to follow option 2, else you can follow option 1.

## Option 1: Deleting polldata.json
The easiest method to keep your bot being fast is to simply shut down your bot. If you don’t remember how, check [Running your bot on Windows](https://github.com/idinium96/tf2autobot/wiki/Running-the-bot-on-Windows) or [Running your bot on Linux.](https://github.com/idinium96/tf2autobot/wiki/Running-the-bot-on-Linux)

Once your bot is offline you can navigate to `~/tf2autobot/files/steam_login_name/` and delete your `polldata.json`. 

Keep in mind this will make the output of the `!stats` command incorrect.

## Option 2: Editing your environment file
There are two variables in your environment file (`.env`for Windows, `ecosystem.json` for Linux) that you can edit to keep track of your trade statistics.

They are called `LAST_TOTAL_TRADES` and `TRADING_STARTING_TIME_UNIX`.

Before you begin, send `!stats` to your bot and write down the total amount of trades made. You will be using this number for `LAST_TOTAL_TRADES`.

After that, shut down your bot. Once your bot is offline transfer your `polldata.json` to another location outside of your tf2autobot installation folder. Once done you can open up your transferred `polldata.json`.

In this file you will search for the first `offerData` ID. And then use that `offerData` ID to find the UNIX time. Once you find the UNIX time you can input it into `TRADING_STARTING_TIME_UNIX`. 
If you would like a visual explanation you can check out [this gif.](https://gyazo.com/622d23966b6422a66a36447dba53fb46)

Now that you have changed both `LAST_TOTAL_TRADES`  and `TRADING_STARTING_TIME_UNIX` and you have taken a backup of your `polldata.json` you can delete the `polldata.json` located at `~/tf2autobot/files/steam_login_name/`.

Last thing you need to do is restart your bot (check [Running your bot on Windows](https://github.com/idinium96/tf2autobot/wiki/Running-the-bot-on-Windows) or [Running your bot on Linux.](https://github.com/idinium96/tf2autobot/wiki/Running-the-bot-on-Linux) if you don’t remember how) and enjoy it being lightning fast again.