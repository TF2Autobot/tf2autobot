# 3.4. Add item to pricelist with `!add` command

In order to have your bot to start trading, you will need to tell your bot what items to buy/sell/bank by adding the items to the pricelist through Steam Chat.
The command that you will use is **!add** command. 

## 3.4.1 Using item [`name` or `defindex`](https://github.com/TF2Autobot/tf2autobot/wiki/Item-Identifying-parameters#321---name-and-defindex-parameters) parameters

Example:

-   [**Tour of Duty Ticket**](https://backpack.tf/stats/Unique/Tour%20of%20Duty%20Ticket/Tradable/Craftable)
    -   `!add name=Tour of Duty Ticket` OR
    -   `!add defindex=725` (no need to add sub-parameter since this is the default).

-   [**Non-Craftable Tour of Duty Ticket**](https://backpack.tf/stats/Unique/Tour%20of%20Duty%20Ticket/Tradable/Non-Craftable)
    -   `!add name=Tour of Duty Ticket&craftable=false` OR
    -   `!add defindex=725&craftable=false`

-   [**Vintage Pyro's Beanie**](https://backpack.tf/stats/Vintage/Pyro%27s%20Beanie/Tradable/Craftable)
    -   `!add name=Pyro's Beanie&quality=Vintage` OR
    -   `!add defindex=51&quality=Vintage`

-   [**Strange Silver Botkiller Minigun Mk.II**](https://backpack.tf/stats/Strange/Silver%20Botkiller%20Minigun%20Mk.II/Tradable/Craftable)
    -   `!add name=Silver Botkiller Minigun Mk.II&quality=Strange` OR
    -   `!add defindex=958&quality=Strange`

-   [**Pyroland Daydream Smissmas Saxton**](https://backpack.tf/stats/Unusual/Smissmas%20Saxton/Tradable/Craftable/145)
    -   `!add name=Smissmas Saxton&quality=Unusual&effect=Pyroland Daydream` OR
    -   `!add defindex=31089&quality=Unusual&effect=Pyroland Daydream`

-   [**Strange Australium Tomislav**](https://backpack.tf/stats/Strange/Australium%20Tomislav/Tradable/Craftable)
    -   `!add name=Tomislav&quality=Strange&australium=true` OR
    -   `!add defindex=424&quality=Strange&australium=true`

-   [**Strange Festivized Australium Tomislav**](https://backpack.tf/stats/Strange/Festivized%20Australium%20Tomislav/Tradable/Craftable)
    -   `!add name=Tomislav&quality=Strange&australium=true&festive=true` OR
    -   `!add defindex=424&quality=Strange&australium=true&festive=true`

-   [**Strange Professional Killstreak Australium Tomislav**](https://backpack.tf/stats/Strange/Professional%20Killstreak%20Australium%20Tomislav/Tradable/Craftable)
    -   `!add name=Tomislav&quality=Strange&australium=true&killstreak=3` OR
    -   `!add defindex=424&quality=Strange&australium=true&killstreak=3`

-   [**Festive Black Box**](https://backpack.tf/stats/Unique/Festive%20Black%20Box/Tradable/Craftable)
    -   `!add name=Festive Black Box` OR
    -   `!add defindex=1085`

#### \*Notes:

-   If you want to add [**Mann Co. Supply Crate Key**](https://backpack.tf/stats/Unique/Mann%20Co.%20Supply%20Crate%20Key/Tradable/Craftable) with name parameter, it will list out all possible key defindexes from the tf2 schema. Please choose the one at the top with the name **Decoder Ring** and use `!add defindex=5021`.

    <div align="center"><img src="https://user-images.githubusercontent.com/47635037/92546032-221aad80-f284-11ea-8efa-3fd895503ad0.png" alt="listings" style="display: block; margin-left: auto; margin-right: auto;"></div>

-   If you want to add a stock weapon (such as Scattergun, Minigun and etc), there are two defindexes for stock weapons. You only need to use the one with **Upgradeable_TF_WEAPON_NAME** and use that defindex.

    <div align="center"><img src="https://user-images.githubusercontent.com/47635037/92545998-0adbc000-f284-11ea-990e-15cf44b7b271.png" alt="listings" style="display: block; margin-left: auto; margin-right: auto;"></div>

-   **Festive** and **Festivized** are two different things. When adding a Festive weapon, please include `Festive` in the item name (oh and yes, the item defindex is also different), but if `Festivized`, you need to add the sub-parameter `festive=true`.

-   If you want to add `Name Tag` or `Non-Craftable Name Tag`, you will need to use the correct defindex, which is `5020` instead of `2093`. This bug can not be fixed unless Team Fortress 2 updates its schema to remove the wrong defindex.

## 3.4.2 Using [sku](https://github.com/TF2Autobot/tf2autobot/wiki/Item-Identifying-parameters#322---sku-parameter) parameter

-   Example 1:

    -   Item: Sunbeams Cosa Nostra Cap
    -   URL: https://marketplace.tf/items/tf2/459;5;u17
    -   `sku`: 459;5;u17
    -   to add: `!add sku=459;5;u17`

-   Example 2:
    -   Item: Specialized Festivized Australium Tomislav
    -   URL: https://marketplace.tf/items/tf2/424;11;australium;kt-2;festive
    -   `sku`: 424;11;australium;kt-2;festive
    -   to add: `!add sku=424;11;australium;kt-2;festive`

---

## 3.4.3 Example with situation/intention:

-   Example 1: "I want to **bank** `Max's Severed Head` for a **max** of `3`"
-   Summary:
    -   Item: [**Max's Severed Head**](https://backpack.tf/stats/Unique/Max%27s%20Severed%20Head/Tradable/Craftable) (`162;6`)
    -   intent: bank
    -   min: 0
    -   max: 3
    -   autoprice: true
    -   enabled: true
-   **Command to use**: `!add sku=162;6&max=3` (no need to add the other this since they are all default).

///

-   Example 2: "I want to **sell** `Strange Australium Stickybomb Launcher` for `23 keys`"
-   Summary:
    -   Item: Strange [**Australium Stickybomb Launcher**](https://backpack.tf/stats/Strange/Australium%20Stickybomb%20Launcher/Tradable/Craftable) (`207;11;australium`)
    -   intent: sell
    -   min: 0
    -   max: 1
    -   autoprice: false
    -   enabled: true
    -   sell price: 23 keys
    -   buy price: 0 keys, 0 ref
-   **Command to use**: `!add sku=207;11;australium&intent=sell&sell.keys=23&buy.metal=0`

---

#### \*Notes:

-   If you want to sell it for only in keys, then you can ignore the `sell.metal` parameter, but then you still need to include the `buy.keys` and/or `buy.metal` parameters.
-   You do not need to set `autoprice=false` if you're about to manually price the item.

---