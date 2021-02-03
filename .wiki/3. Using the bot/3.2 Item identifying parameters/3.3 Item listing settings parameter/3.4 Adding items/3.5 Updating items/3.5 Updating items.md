# 3.5 Update items listing settings with `!update` command

## 3.5.1. Updating a single item
Sometime, after you've added the items that you want your bot trade, you might change your mind to adjust the `min` and `max`, change the `intent`, and maybe manually price items that your bot bought. In order to do that, you will need to use **!update** command.

An `!update` command pretty much similar to the `!add` command, where you need to tell your bot what item (identifying parameter) and then include the listing settings parameters that you want to update. That's mean [Table 3.2](https://github.com/TF2Autobot/tf2autobot/wiki/3.2-item-identifying-parameters#3.2.1---`name`-and-`defindex`-parameters) and [Table 3.3](https://github.com/TF2Autobot/tf2autobot/wiki/3.3-item-listing-settings-parameter#3.3---item-listing-settings-parameters) can also be used here. In addition to [Table 3.2](https://github.com/TF2Autobot/tf2autobot/wiki/3.2-item-identifying-parameters#3.2.1---`name`-and-`defindex`-parameters), since the items have been added to the pricelist, now you can use a new identifying parameter instead of `name`, `defindex`, and `sku`: the **`item`** identifying parameter.

To use `item` parameter, simply put the full item name. When you're using the `!add` command with `name` or `defindex` identifying parameter, you need to use sub-parameters to specifically add your targeted item, but not with `item` parameter.

-   Example 1: Let say you want to update the `max` to 3.

    -   [**Non-Craftable Tour of Duty Ticket**](https://backpack.tf/stats/Unique/Tour%20of%20Duty%20Ticket/Tradable/Non-Craftable)
        -   When adding item using `!add` command (3 options):
            -   `!add name=Tour of Duty Ticket&craftable=false` OR
            -   `!add defindex=725&craftable=false`
            -   `!add sku=725;6;uncraftable`
        -   When updating the item using `!update` command (4 options):
            -   `!update name=Tour of Duty Ticket&craftable=false&max=3`
            -   `!update defindex=725&craftable=false&max=3`
            -   `!update sku=725;6;uncraftable&max=3`
            -   `!update item=Non-Craftable Tour of Duty Ticket&max=3`

-   Example 2: Let say you want to update the `intent` to sell and manually price the item:
    -   [**Pyroland Daydream Smissmas Saxton**](https://backpack.tf/stats/Unusual/Smissmas%20Saxton/Tradable/Craftable/145)
        -   When adding item using `!add` command (3 options):
            -   `!add name=Smissmas Saxton&quality=Unusual&effect=Pyroland Daydream` OR
            -   `!add defindex=31089&quality=Unusual&effect=Pyroland Daydream`
            -   `!add sku=31089;5;u145`
        -   When updating the item using `!update` command (4 options):
            -   `!update name=Smissmas Saxton&quality=Unusual&effect=Pyroland Daydream&intent=sell&sell.keys=300&buy.keys=100`
            -   `!update defindex=31089&quality=Unusual&effect=Pyroland Daydream&intent=sell&sell.keys=300&buy.keys=100`
            -   `!update sku=31089;5;u145&intent=sell&sell.keys=300&buy.keys=100`
            -   `!update item=Pyroland Daydream Smissmas Saxton&intent=sell&sell.keys=300&buy.keys=100`

#### Special parameters

| Parameter | Type | Description |
| :-: | :-: | :- |
| `resetgroup` | `boolean` | Send with `resetgroup=true` will reset the group of that particular item to `all`. |
| `removenote` | `boolean` | Send with `removenote=true` will reset both `note.buy` and `note.sell` values to `null` (will use templates). |
| `removebuynote` | `boolean` | Send with `removebuynote=true` will reset `note.buy` value to `null` (will use buy order template). |
| `removesellnote` | `boolean` | Send with `removesellnote=true` will reset `note.sell` value to `null` (will use sell order template). |

## 3.5.2. Updating multiple items
This bot has an option to update the listing parameters of all items at once, or update all items by group (if you have set the group when adding/updating the items individually).

### 3.5.2.1. Update all items
- Syntax: `!update all=true&[listing parameters to update]`

- Example: 
   1. `!update all=true&intent=sell` - will update all item entries in your pricelist to intent=sell.
   2. `!update all=true&max=5&intent=bank&enabled=false` - will update max to 5, intent to bank and disable listing on backpack.tf for all items.

You can only update `intent`, `min`, `max`, `autoprice`, and `enabled` parameters for `!update all=true` command.

#### Special parameter 
| Parameter | Type | Description |
| :-: | :-: | :- |
| `removenote` | `boolean` | Sending `!update all=true&removenote=true` will set both `note.buy` and `note.sell` to `null` (will use your templates). |

#### \*Important Note
- `!update all=true` to update all items at once **DO NOT SUPPORT** to update **buy.keys, buy.metal, sell.keys, sell.metal, note.buy and note.sell** parameters.

### 3.5.2.2. Update all items by group
Syntax: `!update all=true&withgroup=<groupName>&[listing parameters to update]`
Example: 
1. `!update all=true&withgroup=craftw&intent=sell` - will update all item entries with group "craftw" in your pricelist to intent=sell.
2. `!update all=true&withgroup=craftw&group=craftweapon&max=5&intent=bank&enabled=false` - will update group "craftw" to "craftweapon", max to 5, intent to bank and disable listing on backpack.tf for all "craftw" items.

#### \*Note:
- Update all items by group **SUPPORT** updating **buy.keys, buy.metal, sell.keys, sell.metal, note.buy and note.sell**, BUT please make sure to adhere to the rules for `sell` and `buy`, which you HAVE to define BOTH of it.
Example:
- `!update all=true&withgroup=craft&buy.metal=0.05&sell.metal=0.11` - this will update buy/sell price for all items on the "craft" group.

---

