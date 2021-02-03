# 3.6 Remove items from pricelist with `!remove` command.

## 3.6.1 Removing a single item
If you want to remove an item from the pricelist, simply use any identifying parameters (`name`, `defindex`, `sku`, or `item`).

-   Example: You want to remove [**Non-Craftable Tour of Duty Ticket**](https://backpack.tf/stats/Unique/Tour%20of%20Duty%20Ticket/Tradable/Non-Craftable) (4 options)
    -   `!remove name=Tour of Duty Ticket&craftable=false`
    -   `!remove defindex=725&craftable=false`
    -   `!remove sku=725;6;uncraftable`
    -   `!remove item=Non-Craftable Tour of Duty Ticket`

## 3.6.2 Removing multiple items
This bot has a feature to remove all item entries in your pricelist at once, or remove only items of a specific group.

### 3.6.2.1 Removing all items at once
Simply send `!remove all=true` to your bot. Once you've sent this to your bot, it will reply with:
```
⚠️ Are you sure that you want to remove x items? Try again with i_am_sure=yes_i_am
```
Confirm to remove all items from the pricelist with `!remove all=true&i_am_sure=yes_i_am`.

### 3.6.2.2 Removing all items by group
Send `!remove all=true&withgroup=<groupName>`, and your bot will reply for confirmation.
Once confirmed, send `!remove all=true&withgroup=<groupName>&i_am_sure=yes_i_am`.