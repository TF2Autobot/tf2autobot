This page will go through how to get and set up a Linux server which can be online 24/7 without the needing to keep your own computer or laptop running.

# Virtual Private Server (VPS)

You can get a VPS from many different providers, but I recommend getting one from DigitalOcean OR Hetzner. If you want to use DigitalOcean, you can register from [this link](https://m.do.co/c/6be9c5acd3ca) and get $100 that expires after 2 months, OR [this link](https://hetzner.cloud/?ref=68H4N0lNcT1W) for Hetzner and get free €20 for a month!

**If you don't have any Credit/Debit Card, Paypal account or you don't have an access to get one, I can help you to get one for your Team Fortress 2 pure. [Click here](https://github.com/idinium96/tf2autobot/wiki/IdiNium-VPS-Services) to see the available services.**

The next thing that you need to do once you've created an account:
- [DigitalOcean](https://m.do.co/c/6be9c5acd3ca):
	1. Click on **Create** button > **Droplets**.
	2. Select the highest Ubuntu LTS, (20.04) x64 (as of writing this).
	3. Select the Basic $5/month plan.
	4. Choose a region in which the VPS will be located.
	5. [Generate your SSH key](#generating-your-ssh-key).
	6. On **Authentication** section, select **SSH Keys** and click on **New SSH Key**.
	7. Paste your **SSH Public Key** and click **Add SSH Key**.
	8. Edit your hostname to whatever you wanted.
	9. No volume or backups is needed.
	10. Click on "Create" to create the VPS.
	11. Complete all steps in [Connecting to your VPS](https://github.com/idinium96/tf2autobot/wiki/Getting-a-VPS#connecting-to-your-vps) and [Initial Setup for your VPS](https://github.com/idinium96/tf2autobot/wiki/Getting-a-VPS#initial-setup-of-your-vps) sections.
- [Hetzner](https://hetzner.cloud/?ref=68H4N0lNcT1W):
	1. Click **+ NEW PROJECT** > Input a project name, example `tf2autobot` > Click on the `tf2autobot` project > Click on **ADD SERVER**.
	2. Choose a region in which the VPS will be located.
	3. Select the highest Ubuntu LTS, (20.04) x64 (as of writing this).
	4. Select the CX11 plan - €2.49/month (0% VAT).
	5. Ignore Volume, Network, and Additional features sections.
	6. [Generate your SSH key](#generating-your-ssh-key)
	7. Click on **+ADD SSH KEY** and paste your **SSH Public Key** and click **ADD SSH KEY**
	8. Edit your server/hostname to whatever you wanted.
	9. Click on "CREATE & BUY NOW" to create the VPS.
	10. Complete all steps in [Connecting to your VPS](https://github.com/idinium96/tf2autobot/wiki/Getting-a-VPS#connecting-to-your-vps) and [Initial Setup for your VPS](https://github.com/idinium96/tf2autobot/wiki/Getting-a-VPS#initial-setup-of-your-vps) sections.

# Generating your SSH key.

SSH, or Secure Shell, is a remote administration protocol that allows users to control and modify their remote servers over the Internet.

If you're using:
## Windows
1. Go to https://www.putty.org/ and download the installation file. Once it is downloaded, run the file and go through the installation process.
2. Search for `PuTTYgen` and open the app.
3. Click on `Generate` and move your mouse over the blank area.
4. Once the key has been generated, it's optional to change your "Key comment" and/or set your "Key passphrase" and confirm it.
5. After you've edited (if you did edit your "Key comment" and/or set "Key passphrase"), your **SSH Public Key** are in the box. Example:
```
ssh-rsa AAAAB3NzaC1yc2EAAAABJQAAAQEAwAloG4rFTBhM4/8t6OawuAKeG4MA5vImcNMr0V+X4PzKA554o8YrWX3/+sTqMeV4PHTEKL+CphpCN6XaXkp5ggPVp5vvXDAw6quNVeCBMUyjKkfRTqSXhWbHQB0y6KS0whXJkkjGizrY11RExFZbNPQfN+yl9WA5c5+7EHg+/966P+7vakx+wfvDABbK4mqk5IiEOWbDyogVaRIt/xq+1NNLdRF8VGfgIaWlnWEC4sSuGrU7+pv/0CHHVZTAqHUJBu0UzAy/J/jHDGGd/QDllmx70Eui9E9SEhD9uRJ7iyzw+WiRGeJsHdQfwMTFdbIDXnsRQrtGAUDG04GLeTA+sQ== rsa-key-20200904
```
6. Copy and paste this **SSH Public Key** into the SSH Key section when creating your DigitalOcean or Hetzner VPS.
7. Save your **SSH Private Key** somewhere safe on your computer by clicking on `Save private key`. You will need to use this private key to connect to your VPS. **DO NOT SHARE THIS SSH PRIVATE KEY WITH ANYONE INCLUDING ME.**

![SSH](https://user-images.githubusercontent.com/47635037/96667728-332f0200-138c-11eb-9ffc-382ac6beb96e.gif)

## Mac OS or Linux
1. Search for and Launch the Terminal app.
2. Enter the following code and press enter: ```ssh-keygen -t rsa```
3. Press ENTER to store the key in the default folder `/Users/Username/.ssh/id_rsa` or `/home/Username/.ssh/id_rsa`.
4. Type a passphrase (characters will not appear in Terminal).
5. Confirm your passphrase to finish SSH Keygen. You should get an output that looks something like this:
```Your identification has been saved in /Users/myname/.ssh/id_rsa.
Your public key has been saved in /Users/myname/.ssh/id_rsa.pub.
The key fingerprint is:
ae:89:72:0b:85:da:5a:f4:7c:1f:c2:43:fd:c6:44:30 myname@mymac.local
The key's randomart image is:
+--[ RSA 2048]----+
|                 |
|         .       |
|        E .      |
|   .   . o       |
|  o . . S .      |
| + + o . +       |
|. + o = o +      |
| o...o * o       |
|.  oo.o .        |
+-----------------+
```
6. Copy your Public SSH Key to your clipboard using the following code: `pbcopy < ~/.ssh/id_rsa.pub`
7. Use `Ctrl + V` or Right-Click to paste your Public SSH Key on DigitalOcean or Hetzner and you're good to go!

*Note: If you're using Ubuntu or other Linux distro and you got an error when running the code in step 6, you'll need to setup this: https://garywoodfine.com/use-pbcopy-on-ubuntu/

# Connecting to your VPS

If you're using:
## Windows
1. Open PuTTY, fill in **Host Name (or IP address)** with your VPS IP address.
2. Click on **Data** under the Connection section and fill in **Auto-login username** with `root`.
3. Expand **SSH** by clicking on the **+** on the left of SSH, and click on **Auth**, and click on Browse and select your SSH Private Key file.
4. Scroll up and click on **Sessions**, fill in the **Saved Sessions** with whatever you want with "-root", like `something-root`, click **Save** and then click **Open**.
5. There will be a warning message, but just allow it (click Yes) as it's your first time connecting to your new VPS.
6. Be sure to continue to [Initial Setup of your VPS](#initial-setup-of-your-vps) and follow the steps that are already in order.

## Mac OS or Linux
1. Download and install **Termius**: https://www.termius.com/
2. Once installed, run and create a new account (or log in if you already have one).
3. Open the terminal and run this command to copy your SSH Private Key: `pbcopy < ~/.ssh/id_rsa`
4. Click on `+ New host` and fill in:
- Label: anything
- *Address: Your VPS IP Address
- Group: You can ignore this or setup later
- Tags: anything like `tf2autobot` or leave empty
- Username: `root`
- Password: 
	1. Select `Keys →`
	2. Click on `+KEY` button
	3. Fill in **Label**, example: VPS1
	4. Fill in the **Passphrase** of your SSH Key
	5. Paste your SSH Private Key with **Ctrl + V** in the Private Key box
	6. Leave the Public Key box empty
5. Leave the other things empty/default, and then click on `Save` button.
6. Double click on the newly created Hosts. (remember, this one is on `root`, you will need to change username to another username after you've created one, follow the instructions in [Initial setup of your VPS](#initial-setup-of-your-vps).

You're now connected and sign in to the VPS.

# Initial setup of your VPS

## About `root`
The root user is the administrative user in a Linux environment that has very broad privileges. Because of the heightened privileges of the root account, you are discouraged from using it on a regular basis. This is because part of the power inherent with the root account is the ability to make very destructive changes, even by accident. (Source: [DigitalOcean](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-20-04))

The next step is to set up an alternative user account with a reduced scope of influence for day-to-day work.

## Initial setup steps
Please follow the steps below. We assume you've already connected to your VPS on a `root` username.

1. Create a new username **ubuntu**: `adduser ubuntu`
2. Grant ubuntu administrative privileges:
```
usermod -aG sudo ubuntu
chmod 0700 /home/ubuntu
```
3. Copy your SSH Public key from **root** to **ubuntu**:
```rsync --archive --chown=ubuntu:ubuntu ~/.ssh /home/ubuntu```
4. Install updates: `sudo apt-get update && sudo apt-get upgrade -y`
5. Setup Firewall:
```
sudo ufw allow ssh
sudo ufw allow 22
sudo ufw allow proto tcp from any to any port 80,443
sudo ufw enable
```
6. Reboot your system: `sudo reboot`
7. Now your VPS will reboot and you'll lose connection to your VPS. Do not panic. Close the current terminal.
8. log in as `ubuntu`:
- Windows:
	1. Open PuTTY, on the Saved Sessions (assuming you've followed step 4 [here](#windows-1)), click on the `something-root` and click on **Load**.
	2. Click on **Connection** > **Data**, change the value of **Auto-login username** from `root` to `ubuntu`.
	3. Go back to the main page by clicking on the **Session**, change the name on the **Saved Sessions** box from `something-root` to `something-ubuntu` and click on **Save**.
	4. Now click on **Open** to connect to your VPS on a new `ubuntu` username.
- Mac OS/Linux:
	1. Open Termius and right-click on the newly created Hosts (assuming you've followed step 3 [here](#mac-os-or-linux-1)) and select **Edit**.
	2. Scroll down to the **Username** box, change it from `root` to `ubuntu`.
	3. Click on **Save** and double click on that host to reconnect to your VPS on a `ubuntu` username.

Initial setup of your new VPS done. You can continue downloading the bot section.