# TF2Autobot (pricedb.io fork)

This is a minimal fork of [TF2Autobot](https://github.com/idinium96/tf2autobot), tuned for use with [pricedb.io](https://pricedb.io) as the default pricing source after the shutdown of prices.tf.

It keeps the core behaviour and setup flow of the original project, but:

-   Uses pricedb.io as the default pricer.
-   Integrates the pricedb.io Store API so backpack.tf sell listings can be mirrored to pricedb.io.

If you already know how to run TF2Autobot, you can treat this as a drop‑in replacement with the extra pricedb.io integration enabled.

---

## Getting started

All general installation and configuration steps are the same as TF2Autobot. Follow the original wiki for:

-   [Setup & configuration](https://github.com/idinium96/tf2autobot/wiki)
-   [Environment variables](https://github.com/idinium96/tf2autobot/wiki/Configuring-the-bot)
-   [`options.json` reference](https://github.com/idinium96/tf2autobot/wiki/Configure-your-options.json-file)

When the wiki tells you to clone the TF2Autobot repository, use this fork instead:

```bash
git clone https://github.com/TF2-Price-DB/tf2autobot-pricedb.git
```

Then apply the additional pricedb.io settings below.

### Required pricedb.io configuration

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

    You can include your pricedb.io store URL in your backpack.tf listing notes by using the `%pricedb_store%` template variable. The bot will automatically replace it with your friendly store URL (e.g., `https://store.pricedb.io/sf/your-slug`).

    Example in your listing note:

    ```
    Visit my store: %pricedb_store%
    ```

After these changes, rebuild (if needed) and fully restart the bot so the new environment variable is picked up.

---

## Counter Offer Key Pricing Configuration

The bot supports configurable key pricing behavior when calculating trade values to ensure accurate valuations.

### Configuration Option

In your `options.json`, under `miscSettings.counterOffer`, you can control how key prices are used:

```json
"counterOffer": {
  "enable": true,
  "useSeparateKeyRates": true
}
```

### Behavior

**When `useSeparateKeyRates: true`:**

- Uses **sell price** when calculating the value of keys the bot is giving
- Uses **buy price** when calculating the value of keys the bot is receiving
- This ensures bot-favorable pricing in all trade calculations

**When `useSeparateKeyRates: false` (default):**

- Uses **sell price** for keys on both sides of the trade
- Maintains the original bot behavior

### Why This Matters

When processing offers, the bot needs to calculate the total value of items on each side of the trade. Keys are valued differently depending on whether the bot is buying or selling them. 

With `useSeparateKeyRates: true`, the bot will:

- Value keys in "our items" (bot is giving) at the **sell price**
- Value keys in "their items" (bot is receiving) at the **buy price**

This prevents value calculation errors and ensures the bot maintains proper profit margins when keys are involved in trades. The setting affects both initial offer processing and counter offer generation.

**Example:**
If key buy price is 60 ref and sell price is 61 ref:
- `useSeparateKeyRates: true`: When bot gives 1 key, it's valued at 61 ref; when bot receives 1 key, it's valued at 60 ref
- `useSeparateKeyRates: false`: All keys valued at 61 ref (sell price) regardless of direction

---

## Support, FAQ and common errors

For general documentation, troubleshooting and FAQs, keep using the original TF2Autobot wiki:

-   [Wiki home](https://github.com/idinium96/tf2autobot/wiki)
-   [Common errors](https://github.com/idinium96/tf2autobot/wiki/Common-Errors)
-   [FAQ](https://github.com/idinium96/tf2autobot/wiki/FAQ)

For issues or questions specific to this pricedb.io fork (or to my services), please join our Discord:

-   [Discord](https://discord.com/invite/7H2bceTgQK)

---

## Credits

-   Original project: [TF2Autobot by IdiNium](https://github.com/idinium96/tf2autobot)
-   Based on [tf2-automatic by Nicklason](https://github.com/Nicklason/tf2-automatic)

This fork simply adapts TF2Autobot for pricedb.io as the default pricing backend.
