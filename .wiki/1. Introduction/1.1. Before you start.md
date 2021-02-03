# Before you start
There are a few things you need to take care of before you can start setting up your own bot.

## 1. Creating a new unrestricted Steam account
To run your bot account you will need to make a **new Steam account.** Otherwise you won't be able to play any games while your bot is running.

You will also want to remove the restrictions from your account so your bot can add people and send trade offers.
To remove those restrictions you need to have **deposited at least the equivalent of $5 USD to the steam wallet of your new steam account**.

You can read more about the requirements [here.](https://support.steampowered.com/kb_article.php?ref=3330-iagk-7663)

On your [steam profile privacy settings](https://steamcommunity.com/my/edit/settings) make sure that everything is public.

## 2. Upgrade your new Steam account to Premium status in Team Fortress 2
If your Team Fortress 2 is not Premium, then your backpack will only have a size of 50 slots and any crafting outputs (mainly metals) will be untradeable until you upgrade to Premium. You shouldn't use Upgrade to Premium for this because it's not cost effective.
Just **buy something on Mann Co. Store (Team Fortress 2 in-game store) or Mann Co. Store Online.**

To buy something on Mann Co. Store Online, open a browser, login into your new account on Steam, and go to one of the links below:
- Backpack Expander: http://store.steampowered.com/buyitem/440/5050/1
- Mann Co. Supply Crate Key: http://store.steampowered.com/buyitem/440/5021/1
- Tour of Duty Ticket: http://store.steampowered.com/buyitem/440/725/1

*Note: You can change the amount that you want to buy by changing the number of the last path `/[Amount]`.

## 3. Steam Desktop Authenticator
Your bot needs to have 2FA enabled. The best and easiest way is to use [Steam Desktop Authenticator (SDA).](https://github.com/Jessecar96/SteamDesktopAuthenticator) 
It also allows us to easily export the steam secrets which we will need in the future.

Setup instructions for installing SDA can be found on the [github page.](https://github.com/Jessecar96/SteamDesktopAuthenticator)

Make sure you write down your `shared_secret` and `identity_secret` in a notepad.

Steps on how to obtain them: 
1. Open up the folder in which you installed Steam Desktop Authenticator.
2. Go to the `maFiles` folder.
3. The `.maFile` you will want to open with notepad is named after the SteamID64 of the new account (example: `my_bot_SteamID64.maFile`).
4. Once you have opened that file search for `"shared_secret":` and copy the string that comes after it (example: searching for `"shared_secret"` gives us this result `"shared_secret": "agdgwegdgawfagxafagfkagusbuigiuefh=="` so what we copy is only this `agdgwegdgawfagxafagfkagusbuigiuefh==`)
5. Now search for `"identity_secret":` and repeat what you did in step 4.

If you open your `.maFile` in notepad and all you see is gibberish, it means your file is encrypted. For you to be able to obtain and write down the secrets you will have to decrypt your file and once you got both of them you can feel free to encrypt them again.

To decrypt your files:
- Open up Steam Desktop Authenticator.
- Click on `Manage Encryption`.
- Enter your current passkey.
- It will ask to enter a new passkey. Leave it blank and click **Accept** in order to temporarily decrypt the .maFile file.

After that follow the steps above on how to obtain your secrets and then you can encrypt your .maFile again.

## 4. Settings on backpack.tf
You need to provide backpack.tf your trade offer link if you want people to send you trades without having to add you.

To accomplish this you will want to:

1. Login in with your future bot account on [backpack.tf.](https://backpack.tf/)
2. Input your trade offer link on the [backpack.tf settings page.](https://backpack.tf/settings)

After this, you will want to get and write down your **Backpack.tf API Key** (`apiKey`) and **Backpack.tf Access Token** (`accessToken`).

To get both values, follow the instructions:

Login in with your future bot account on [backpack.tf](https://backpack.tf/).
1. Go to https://backpack.tf/connections and click on `Show token` under “User Token”.
2. Write down your token in notepad so that you can use it for configuring your bot later on.
3. Go to https://backpack.tf/developer/apikey/view and fill in site URL as `http://localhost:4566/tasks` and comment as `Check if a user is banned on backpack.tf`.
4. Write down the API key in the same location and make sure you know which one is which.

# To sum up
You made a new steam account on which you removed the restrictions and upgraded your TF2 status to Premium.
You also set up Steam Desktop Authenticator and wrote down your `identity_secret` and `shared_secret`.
You added your trade offer link to backpack.tf and wrote down both your Backpack.tf `apiKey` and `accessToken`.

# Everything taken care of?
Then decide if you need to follow the [Installation on Windows](https://github.com/idinium96/tf2autobot/wiki/Downloading-the-bot-on-Windows) or the [Installation on Linux.](https://github.com/idinium96/tf2autobot/wiki/Downloading-the-bot-on-Linux)
