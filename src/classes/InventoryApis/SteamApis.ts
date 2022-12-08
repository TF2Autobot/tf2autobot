import { UnknownDictionaryKnownValues } from 'src/types/common';
import Bot from '../Bot';
import InventoryApi from './InventoryApi';

export default class SteamApis extends InventoryApi {
    constructor(bot: Bot) {
        super(bot, 'steamApis');
    }

    protected getURLAndParams(
        steamID64: string,
        appID: number,
        contextID: string
    ): [string, UnknownDictionaryKnownValues] {
        return [
            `https://api.steamapis.com/steam/inventory/${steamID64}/${appID}/${contextID}`,
            { api_key: this.getApiKey() }
        ];
    }
}
