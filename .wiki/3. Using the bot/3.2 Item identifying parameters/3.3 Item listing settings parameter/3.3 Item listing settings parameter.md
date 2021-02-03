## 3.3 - Item listing settings parameters

When adding/updating items with only identifying parameter, the item will be set to have the default settings for it to be listed on backpack.tf.

_Table 3.3: Listing settings parameters._

|  Parameter   | Default | Description |
| :----------: | :-----: | :---------- |
|   `intent`   | `bank`  | Other option is `buy` or `sell`. If set to `buy`, then your bot will only create a buying listing for that item, and once bought, it will be removed. |
|    `min`     |   `0`   | Minimum stock to keep. |
|    `max`     |   `1`   | Maximum stock your bot can have. |
| `autoprice`  | `true`  | If you set to `false`, then you need to include the `buy` AND `sell` (yes, AND means both) parameters to set the price of the item manually. |
|  `buy.keys`  |   `0`   | Manually set buying price in keys. |
| `buy.metal`  |   `0`   | Manually set buying price in refined metal. |
| `sell.keys`  |   `0`   | Manually set selling price in keys. |
| `sell.metal` |   `0`   | Manually set selling price in refined metal. |
|  `enabled`   | `true`  | If you want to keep the item in the pricelist but don't want to trade, then set this to `false` |
|   `group`    | `all`  | Items grouping. Example "craftHats" or "craftWeapons" so you can easily manage and update `intent`, `min`, `max`, `autoprice`, or `enabled` parameters only on the items in that particular group. Learn more in how to update pricelist section.          |
|  `note.buy`   | `null`  | Custom buy order listing note on backpack.tf. All parameters found [here](https://github.com/idinium96/tf2autobot/wiki/Configuring-the-bot-using-the-environment-file#backpacktf-sell-or-buy-order-listings-note-on-all-items-in-pricelist) can be used. |
|  `note.sell`  | `null`  | Same as `note.buy`, but this for sell order listing note. |
|  `promoted`  | `0` (`false`)  | Set to `true` (will set it to `1` in your pricelist entry) if you want to promote an item (only enabled if you have Backpack.tf Premium). |