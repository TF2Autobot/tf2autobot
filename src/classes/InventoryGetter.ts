import SteamID from 'steamid';
import { EconItem } from '@tf2autobot/tradeoffer-manager';

import Bot from './Bot';
import SteamApis from './SteamApis';

export default class InventoryGetter {
    private readonly steamApis: SteamApis;

    constructor(private readonly bot: Bot) {
        this.steamApis = new SteamApis(this.bot);
    }

    getUserInventoryContents(
        steamID: SteamID | string,
        appid: number,
        contextid: string,
        tradeableOnly: boolean,
        callback: (err?: Error, inventory?: EconItem[], currencies?: EconItem[]) => void
    ): void {
        if (!this.bot.options.steamApis.enable || steamID.toString() == this.bot.client.steamID.getSteamID64())
            this.bot.manager.getUserInventoryContents(steamID, appid, contextid, tradeableOnly, callback);
        else this.steamApis.getUserInventoryContents(steamID, appid, contextid, tradeableOnly, callback);
    }
}
