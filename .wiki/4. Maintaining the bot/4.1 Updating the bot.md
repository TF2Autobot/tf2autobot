# Join Discord server to get notified
Make sure you've joined the [TF2Autobot Discord server](https://discord.gg/ZrVT7mc) and head over to [`#🆚roles`](https://discordapp.com/channels/664971400678998016/719391430669500447/721533052890644511) channel and react to the first message to get notified whenever an update has been released!

<div align="center"><img src="https://user-images.githubusercontent.com/47635037/88795539-c8c65580-d1d2-11ea-993e-4161083b3e36.PNG" alt="update-noti" style="display:block;margin-left:auto;margin-right:auto;width:400px;height:250px;"></div>

# Updating the bot
## Downloading & installing the newest version
Updating the bot is the same for both Windows and Linux.

Open up a command prompt or terminal/ssh window and navigate to your `tf2autobot` folder

`cd path/to/tf2autobot` OR just `cd tf2autobot` if you follow the instructions in [Downloading the bot on Linux](https://github.com/idinium96/tf2autobot/wiki/Downloading-the-bot-on-Linux).

If your bot is installed on the Desktop you will use

`cd Desktop/tf2autobot`.

It is recommended to firstly delete the `node_modules` folder.
On Windows simply right-click and delete it.
On Linux use `rm -rf node_modules` while inside your tf2autobot directory.

After that, you will download and install the newest version by typing

`git checkout master && git stash && git pull && npm install && npm run build`

## Updating the environment file - ecosystem.json

Some updates introduce new variables to your environment file which add new and improved features to your bot.
You must update your environment file with the newly added variables for everything to function properly. 

To do that you should check out the updated environment files for [Windows](https://github.com/idinium96/tf2autobot/blob/master/template.env) or [Linux](https://github.com/idinium96/tf2autobot/blob/master/template.ecosystem.json) depending on which OS you use to run your bot.

Once you have the respective file open, it's usually recommended to copy-paste it into your existing environment file and fill everything out. 
If you know the exact variables that were changed/added since the last time you updated the bot and your environment file, you can feel free to only copy-paste those into your existing environment file.

## Updating the configuration file - options.json
Some updates also introduce new variables to your options.json file located in `~/tf2autobot/files/<STEAM_ACCOUNT_NAME>/`.
You must update your configuration file with the newly added variables mentioned in the release notes. Sometimes it's also necessary to remove old variables.

Please make sure to read the release notes carefully. Otherwise your bot might not function properly.

## You are all set!
Now all you have to do is restart your bot and you will be running the newest version including all the new variables.

# Possible errors
You have unstaged changes, meaning that you have modified a file in the repository. To get rid of these changes, use `git reset HEAD --hard`. 
Please note that this will delete all changes, if you have code you wish to keep, create a fork/copy of the repository on GitHub, and commit your changes to it.