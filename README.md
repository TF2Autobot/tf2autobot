# TF2Autobot (pricedb.io fork)

This is a minimal fork of [TF2Autobot](https://github.com/idinium96/tf2autobot), tuned for use with [pricedb.io](https://pricedb.io) as the default pricing source after the shutdown of prices.tf.

It keeps the core behaviour and setup flow of the original project, but:

- Uses pricedb.io as the default pricer.
- Integrates the pricedb.io Store API so backpack.tf sell listings can be mirrored to pricedb.io.

If you already know how to run TF2Autobot, you can treat this as a drop‑in replacement with the extra pricedb.io integration enabled.

---

## Getting started

All general installation and configuration steps are the same as TF2Autobot. Follow the original wiki for:

- [Setup & configuration](https://github.com/idinium96/tf2autobot/wiki)
- [Environment variables](https://github.com/idinium96/tf2autobot/wiki/Configuring-the-bot)
- [`options.json` reference](https://github.com/idinium96/tf2autobot/wiki/Configure-your-options.json-file)

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

After these two changes, rebuild (if needed) and fully restart the bot so the new environment variable is picked up.

---

## Support, FAQ and common errors

For general documentation, troubleshooting and FAQs, keep using the original TF2Autobot wiki:

- [Wiki home](https://github.com/idinium96/tf2autobot/wiki)
- [Common errors](https://github.com/idinium96/tf2autobot/wiki/Common-Errors)
- [FAQ](https://github.com/idinium96/tf2autobot/wiki/FAQ)

For issues or questions specific to this pricedb.io fork (or to my services), please join our Discord:

- [Discord](https://discord.com/invite/7H2bceTgQK)

---

## Credits

- Original project: [TF2Autobot by IdiNium](https://github.com/idinium96/tf2autobot)
- Based on [tf2-automatic by Nicklason](https://github.com/Nicklason/tf2-automatic)

This fork simply adapts TF2Autobot for pricedb.io as the default pricing backend.
