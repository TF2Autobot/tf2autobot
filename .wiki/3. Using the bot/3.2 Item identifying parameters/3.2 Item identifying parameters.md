## 3.2 - Item identifying parameter

You have 3 choices of item identifying parameters on how you want to add your items:

1. `name` - Must be the item based name (without any quality/effect/Killstreak and etc)
2. `defindex` - The item definition index. You can find it [here](https://wiki.alliedmods.net/Team_Fortress_2_Item_Definition_Indexes) or [here](https://docs.google.com/spreadsheets/d/11bv5J-l1UCNjvTF2FyiqivbQds8LxBCQj0QBpw6Ukec/edit#gid=0)
3. `sku` **(recommended)** - The item "Stock Keeping Unit".

## 3.2.1 - `name` and `defindex` parameters

These two parameters act the same since the defindex (in integer form) is just a replacement for the name of an item (if the bot failed to choose the item, so it needs more specific detail of an item). There are 6 _optional_ sub-parameters under these two item identifying parameters:

_Table 3.2: Sub-parameters for `name` and `defindex`._

| Parameter | Default | Description |
| :-------: | :-----: | ----------- |
| `craftable`  |  `true`  | Set to `false` if you want the item to be a Non-Craftable. |
|  `quality`   | `Unique` | Normal/ Genuine/ Vintage/ Unusual/ Unique/ Community/ Valve/ Self-made/ Strange/ Haunted/ Collector's/ Decorated (this is case sensitive). |
| `australium` | `false`  | Set to `true` if you want that item to be an Australium (Australium-able weapons only). |
|   `effect`   |  `null`  | An Unusual effect name, for example: `Sunbeams` or `Green Confetti`. |
| `killstreak` |   `0`    | This should be in an integer of 1 to 3 only. 1 - Killstreak, 2 - Specialized Killstreak, and 3 - Professional Killstreak. |
|  `festive`   | `false`  | Set to `true` if the item is Festivized. |
|  `paintkit`  |  `null`  | When adding a decorated weapon/skin. This should be the War Paint name (broken). |

## 3.2.2 - `sku` parameter

This parameter is recommended because you will no longer need to use the sub-parameters in [Table 3.2](#3.2.1---`name`-and-`defindex`-parameters).
So how can I find the sku of a specific item?

-   Go to [Marketplace.tf](https://marketplace.tf/).
-   In the search bar, type in the item name or unusual effect, or anything related.
-   If "No items found", simply click on the "In stock" button two to the right of the search bar and it will change to "Not In Stock".
-   If your desired item appeared, click on it and take a look at the URL. The item sku is right at the end of the URL.

<div align="center"><img src="https://media.giphy.com/media/Pj78znBQro1BZu0CiE/giphy.gif" alt="listings" style="display: block; margin-left: auto; margin-right: auto;"></div>

Continue: [Listing settings parameters](https://github.com/TF2Autobot/tf2autobot/wiki/Listing-settings-parameters)