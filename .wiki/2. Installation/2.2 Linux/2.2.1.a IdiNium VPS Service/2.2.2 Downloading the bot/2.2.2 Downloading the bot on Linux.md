For this guide, we will assume you are using Ubuntu distro, with a **username `ubuntu`**. If you are using a different Linux distro you will have to look up the specific commands yourself. 

You can find the short section with all the commands at the [bottom section](#short-section)

Use your favorite SSH client ([PuTTY](https://www.putty.org/) or [Termius](https://www.termius.com/) or others) to log into your VPS or use the terminal if you are running a Raspberry Pi / Virtual Machine (VM).

# Downloading and installing the compulsory programs
## Git
To install git type `sudo apt install git` into your terminal.

## NodeJS
To install NodeJS type: 
```
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## TypeScript
Install TypeScript by typing `sudo npm install typescript@latest -g` into your terminal.

# Downloading the bot
To download the bot from the GitHub repository type
`git clone https://github.com/idinium96/tf2autobot.git`

Next, navigate to the `tf2autobot` folder by typing
`cd tf2autobot`

Then, install the required NPM dependencies by typing
`npm install`

Lastly, compile the codes (to convert from TypeScript to JavaScript codes) by typing
`npm run build`

# Short section
```
sudo apt install git
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install typescript@latest -g
git clone https://github.com/TF2Autobot/tf2autobot.git
cd tf2autobot
npm install
npm run build
```
