import { UnknownDictionaryKnownValues } from 'src/types/common';
import Bot from '../Bot';
import InventoryApi from './InventoryApi';

export default class SteamSupply extends InventoryApi {
    constructor(bot: Bot) {
        super(bot, 'steamSupply');
    }

    protected getURLAndParams(
        steamid: string,
        appid: number,
        contextid: string
    ): [string, UnknownDictionaryKnownValues] {
        return [`https://steam.supply/API/${this.getApiKey()}/loadinventory`, { steamid, appid, contextid }];
    }
}
