import SteamID from 'steamid';
import { EconItem } from '@tf2autobot/tradeoffer-manager';

import Bot from './Bot';
import ExpressLoad from './InventoryApis/ExpressLoad';
import InventoryApi from './InventoryApis/InventoryApi';
import SteamSupply from './InventoryApis/SteamSupply';
import SteamApis from './InventoryApis/SteamApis';

export default class InventoryGetter {
    private readonly inventoryApis: InventoryApi[];

    constructor(private readonly bot: Bot) {
        this.inventoryApis = [new SteamSupply(this.bot), new SteamApis(this.bot), new ExpressLoad(this.bot)];
    }

    getUserInventoryContents(
        steamID: SteamID | string,
        appid: number,
        contextid: string,
        tradeableOnly: boolean,
        callback: (err?: Error, inventory?: EconItem[], currencies?: EconItem[]) => void
    ): void {
        if (steamID.toString() == this.bot.client.steamID.getSteamID64()) {
            this.bot.manager.getUserInventoryContents(steamID, appid, contextid, tradeableOnly, callback);
            return;
        }
        for (const inventoryApi of this.inventoryApis) {
            if (inventoryApi.isEnabled() && inventoryApi.getApiKey() != '') {
                inventoryApi.getUserInventoryContents(steamID, appid, contextid, tradeableOnly, callback);
                return;
            }
        }
        this.bot.manager.getUserInventoryContents(steamID, appid, contextid, tradeableOnly, callback);
    }
}
