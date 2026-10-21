# TF2Autobot (pricedb.io fork)

**[Join our Discord server here!](https://pricedb.io/discord)**

This is a fork of [TF2Autobot](https://github.com/idinium96/tf2autobot), with changes made to work and use [pricedb.io](https://pricedb.io) as the default pricing source after the shutdown of prices.tf.

## Update notes

Automatic updates are disabled for the current version.

- The `!updaterepo` command is temporarily disabled for this version.
- Before updating, make sure your system and the packages installed during initial setup are current.
- Node.js v22.x is the minimum supported version; Node.js v24.x LTS is recommended. On Windows, use [Node.js](https://nodejs.org/). On Linux, use [NodeSource](https://github.com/nodesource/distributions) and select the Node.js runtime. Node.js v26.x currently has a known issue, so use v24.x or earlier.
- Update npm and TypeScript (use `sudo` on Linux or run an elevated terminal on Windows):

  ```sh
  npm install -g npm@latest
  npm install -g typescript@latest
  ```

- If you run the bot with PM2, update it and refresh the daemon:

  ```sh
  npm install -g pm2@latest
  pm2 update
  ```

  If PM2 becomes stuck, reboot the system.

- From the `tf2autobot` directory, rebuild the bot:

  ```text
  Windows: rmdir /s /q dist node_modules
  Linux:   rm -rf dist node_modules
  ```

  These commands delete the `dist` and `node_modules` directories. Then run:

  ```sh
  npm ci --no-audit && npm run build
  ```

  Restart the bot when the build completes.

## Requirements

-   Node.js 22.x or a newer LTS release

It keeps the core behaviour and setup flow of the original project, but:

-   Uses [pricedb.io](https://pricedb.io) as the default pricer.
-   Integrates the [pricedb.io](https://pricedb.io) Store API so backpack.tf sell listings can be mirrored to pricedb.io.
-   Integrates Mannco.store inventory, buy-order, and withdrawal workflows.

If you already know how to run TF2Autobot, you can treat this as a drop‑in replacement with the extra pricedb.io integration enabled.

## Getting started

All general installation and configuration steps are the same as TF2Autobot. Follow the new updated wiki below for:

-   [Setup & configuration](https://github.com/TF2-Price-DB/tf2autobot-pricedb/wiki)
-   [Environment variables](https://github.com/TF2-Price-DB/tf2autobot-pricedb/wiki/Configuring-the-bot)
-   [`options.json` reference](https://github.com/TF2-Price-DB/tf2autobot-pricedb/wiki/Configure-your-options.json-file)

### Global Disable for Chat Messages

After Valve started banning bots for sending messages it has been the recommendation that your bot doesnt send chat messages. To solve this a global block has been added which can be seen below. It is suggested to set your values to the below as a minimum however disabling commands is also suggested.

Configure in `options.json`:

```json
"globalDisable": {
    "messages": true,
    "greeting": true,
    "commands": false,
    "adminCommands": false
}
```

Look at the example [options.json](.example/options.json) for where this should go in the options file!

### Easy Copy Paste (ECP)

[Easy Copy Paste](https://github.com/TryHardDo/EasyCopyPaste) by [TryHardDo](https://github.com/TryHardDo/) has been integrated in this project. What this allows you to do is change you buy and sell commands to a much easier and user friendly format.

For example `!buy Burning Team Captain` becomes `buy_burning_team_captain` which is far easier to copy from listings. In order to add this to your listings you would update your buy and sell messages as per the below example.

```json
    "buy": "🔥 %price% 📦 Stock : %current_stock% / %max_stock%. 💬 Send %ecp_item%. 👉 Visit %pricedb_store% for my store!",
    "sell": "🔥 %price% 📦 Stock : %amount_trade% / %max_stock%. 💬 Send %ecp_item%. 👉 Visit %pricedb_store% for my store!",
```

-   `%price%` - displays the price (e.g., `14 keys`).
-   `%name%` - displays the **item name** or **itemID**.
-   `%ecp_item%` - displays the trading command (e.g., sell_Mann_Co_Supply_Crate_Key).
-   `%max_stock%` - displays the maximum capacity of the item in the bot's inventory.
-   `%current_stock%` - displays the current count of the item in the bot's inventory.
-   `%pricedb_store%` - displays the URL of the bot's PriceDB store.
-   `%pricedb_item%` - displays the URL of the item.

This results in listings like the below

![ECP](img/ecp_listings.png)

To set your ECP text to bold you would change the below in your `options.json`:

```json
"ecp": {
    "useBoldChars": true,
    "useWordSwap": true
}
```

Look at the example [options.json](.example/options.json) for where this should go in the options file!

### Pure Per Unit (PPU) Logic Updates

PPU has been reworked to handle stock counts of more than 1 item. This has been implemented through saving buys to a new queue working off FIFO (First in First out) logic. When a sale of an item is made the FIRST item in the queue dictates the lowest the sell price can fall before becoming frozen. The item will unfreeze if the sell raises above the first queued buy price again.

This results in items not being sold for a loss but can mean items are held during dips in item prices. This can be resolved by setting a timeout on top of the PPU settings to automatically revoke the PPU boundary in order to take the loss but move the item.

Configure in `options.json`:

```json
"partialPriceUpdate": {
    "enable": true,
    "thresholdInSeconds": 604800,
    "excludeSKU": [],
    "removeMaxRestriction": true,
    "maxProtectedUnits": -1,
    "minProfitScrap": 1,
    "stockGracePeriodSeconds": 3600
},
```

Look at the example [options.json](.example/options.json) for where this should go in the options file!

### Stats Command Improvements

If upgrading, rename your existing `polldata.json` to `polldata.old.json` otherwise historical data will skew !stats (optional)
The new stats system uses new logic to track profit by recording keys and metal separately to prevent point in time issues. These are used to provide estimated profit/loss with the !stats command. This change is backwards compatible with Autobot.

### crit.tf configuration

If you want to use crit.tf follow the below

1. **Environment variable**

    Set your pricedb.io Store API key in your process manager (PM2 ecosystem, Docker env, or system env):

    ```bash
    PRICEDB_STORE_API_KEY=your_pricedb_store_api_key_here
    ```

2. **`options.json` misc settings**

    In your `options.json`, under `miscSettings`, add or update:

    ```json
    "pricedbStore": {
      "enable": true,
      "enableInventoryRefresh": true
    }
    ```

    This enables the pricedb.io Store Manager and allows the bot to periodically refresh your pricedb.io inventory.

3. **Template variable for listings**

    You can include your pricedb.io store URL in your backpack.tf listing notes by using the `%pricedb_store%` template variable. The bot will automatically replace it with your friendly store URL (e.g., `https://crit.tf/sf/your-slug`).

    Example in your listing note:

    ```
    Visit my store: %pricedb_store%
    ```

After these changes, rebuild (if needed) and fully restart the bot so the new environment variable is picked up.

---

## Mannco.store configuration

Mannco.store is optional and is enabled only when both its API key and the `options.json` setting below are present. Create an API key in your [Mannco.store account settings](https://mannco.store/), then set it in your process environment:

```bash
MANNCO_STORE_API_KEY=your_mannco_store_api_key_here
```

The supplied [ecosystem template](template.ecosystem.json) already contains this variable. In `options.json`, enable the integration:

```json
"miscSettings": {
  "manncoStore": {
    "enable": true
  }
}
```

Mannco listings use USD cents from the bot pricelist: `sellUsd` is required to deposit/list an item and `buyUsd` is required to create a buy order. A value of `76` represents `$0.76`. Mannco deposits and withdrawals are matched to their Steam trades and accepted automatically.

### Mannco.store admin commands

All Mannco commands require the sender to be a bot admin and require admin commands to be enabled. Parameter values use `&`, and multiple asset IDs can be separated by commas or semicolons.

| Command                                                    | Description                                                                                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `!mcosell sku=<sku>&amount=<quantity>&confirm=true`        | Deposit and list the requested number of matching tradable bot items at the pricelist USD sell price. `amount` defaults to `1`. |
| `!mcosell assetid=<asset id>[,<asset id>]&confirm=true`    | Deposit and list one or more specific bot assets of the same SKU.                                                               |
| `!mcolistings`                                             | List the bot's current Mannco.store sale listings and asset IDs.                                                                |
| `!mcoupdate assetid=<asset id>&price=<cents>&confirm=true` | Change the price of one or more Mannco inventory assets. An eligible buy order can complete the sale immediately.               |
| `!mcowithdraw assetid=<asset id>[,<asset id>]`             | Request one or more assets back to Steam; the matching trade is accepted automatically.                                         |
| `!mcostatus`                                               | Reconcile and display tracked deposits and withdrawals, including completed/failed Mannco trade status.                         |
| `!mcoresend tradeid=<Mannco trade id>`                     | Ask Mannco.store to resend an eligible trade.                                                                                   |
| `!mcobuy sku=<sku>&quantity=<quantity>`                    | Create or update a buy order using the pricelist USD buy price. `quantity` defaults to `1`.                                     |
| `!mcobuyorders [page=<number>]`                            | List active Mannco.store buy orders; page numbering starts at `0`.                                                              |
| `!mcobuyremove itemid=<Mannco item id>`                    | Remove an active Mannco.store buy order.                                                                                        |
| `!mcobalance`                                              | Show the Mannco.store balance.                                                                                                  |
| `!mcosales`                                                | Show the last week's Mannco.store sales summary.                                                                                |

Use `!mcolistings` to find Mannco asset IDs for `!mcoupdate` and `!mcowithdraw`. `!mcosell` and `!mcoupdate` require `confirm=true` because a matching Mannco buy order can sell the item immediately. See the [Mannco.store API documentation](https://docs.mannco.store/) for platform-level trade details.

---

## Links

For general documentation, troubleshooting and FAQs, use the following wiki:

-   [Wiki home](https://github.com/TF2-Price-DB/tf2autobot-pricedb/wiki)
-   [Common errors](https://github.com/TF2-Price-DB/tf2autobot-pricedb/wiki/Common-Errors)
-   [FAQ](https://github.com/TF2-Price-DB/tf2autobot-pricedb/wiki/FAQ)

For issues or questions specific to this pricedb.io fork (or to my services), please join our Discord:

-   [Discord](https://discord.com/invite/7H2bceTgQK)

---

## Credits

-   Original project: [TF2Autobot by IdiNium](https://github.com/idinium96/tf2autobot)
-   Based on [tf2-automatic by Nicklason](https://github.com/Nicklason/tf2-automatic)

### NextCrit listings

Set `NEXT_CRIT_ENABLE=true` and `NEXT_CRIT_API_KEY` to a long-lived API key for
this bot's account on [next.crittf.tf](https://next.crittf.tf). The integration is
disabled by default. While NextCrit uses a self-signed certificate, also set
`NEXT_CRIT_ALLOW_SELF_SIGNED=true`; this disables certificate verification only
for the NextCrit client. It lists every eligible tradable inventory asset up to
each sell entry's stock limit, including assets with individual prices. Assets
reserved in active trades are skipped when skipItemsInTrade is enabled. It
updates prices, removes withdrawn or sold assets, and deletes all of the
account's NextCrit buy and sell listings when the bot halts or removes all listings.
Use a dedicated account for the bot if you also manage listings manually.

The driver exchanges the API key for a short-lived Bearer token and renews it
automatically. Prices use integer keys and half-scrap (18 half-scrap per refined).
NextCrit resolves HAT Version Z from the asset in its inventory; sell requests
send asset IDs rather than SKUs or locally generated HATs. If NextCrit cannot find
an asset, the bot requests an inventory refresh and retries publishing. Failed
publishes are retried on subsequent listing checks.

Buy listings are generated from enabled buy and bank entries, even when the bot
has no matching inventory assets. They use the buy price and remaining stock
capacity, with unlimited stock represented as 65,535. Finite quantities pass
through unchanged; NextCrit validates their integer widths. The filterCantAfford
setting also applies to buy listings. Changes to price, stock,
intent, and enabled status are synchronized on listing checks.

Buy HATs use the schema and the vendored TF2-Price-DB/the-future serializer.
Tradability, craftability, quality, killstreak tier, skin, wear, and specific
unusual effects stay explicit. Marketability, killstreaker, sheen, strange parts,
strange filters, and spells are ignored because SKU does not distinguish them.
Incoming paint and festivized normalization allow those attributes when the SKU
does not specify them. Generic unusual entries accept any effect. Secondary
Strange quality remains explicit in the market name; the API has no ignored
field for secondary quality normalization. Buy entries for specific craft numbers
are skipped because HAT Version Z cannot express them.

When NextCrit is enabled, the ready bot also listens to `/api/events/v2` for
instant buy and sell checkout. It validates the requester's Steam trade URL.
Sell checkout queues a normal UserCart for the exact asset IDs requested. The cart verifies advertised
prices, stock limits (including pending outgoing sales), and asset availability
before construction and again after the usual reputation and escrow checks.
Requests that would change the quantity, substitute assets, or use changed
prices are rejected. Payment, change, and mobile confirmations use the existing
trade queue.

Buy checkout resolves the requested listing ID to an enabled buy entry and
selects matching items from the seller's inventory through the normal UserCart.
The cart requires the full requested quantity at the advertised buy price,
accounts for pending incoming purchases against the stock limit, and rechecks
payment reservations before sending. Everyday currently requests one item per
buy checkout and does not send seller asset IDs.

The SSE connection reconnects after disconnects, renewing expired listener
tokens during authentication. A healthy stream stays open across token expiry,
which NextCrit checks only when establishing a connection.
It stops when the bot halts or shuts down and resumes on unhalt. NextCrit's
current event stream does not replay requests missed while disconnected; the
buyer can retry checkout after the bot reconnects.
