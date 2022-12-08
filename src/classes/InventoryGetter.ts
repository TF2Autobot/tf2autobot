import SteamID from 'steamid';
import { EconItem } from '@tf2autobot/tradeoffer-manager';

import Bot from './Bot';
import InventoryAPI from './InventoryAPI';
import SteamApis from './SteamApis';

export default class InventoryGetter {
    private readonly inventoryAPIs: InventoryAPI[];

    constructor(private readonly bot: Bot) {
        this.inventoryAPIs = [new SteamApis(this.bot)];
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
        for (const inventoryAPI of this.inventoryAPIs) {
            if (inventoryAPI.isEnabled()) {
                inventoryAPI.getUserInventoryContents(steamID, appid, contextid, tradeableOnly, callback);
                return;
            }
        }
        this.bot.manager.getUserInventoryContents(steamID, appid, contextid, tradeableOnly, callback);
    }
}
