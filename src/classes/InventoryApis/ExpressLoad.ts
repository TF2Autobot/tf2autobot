import { UnknownDictionaryKnownValues } from 'src/types/common';
import Bot from '../Bot';
import InventoryApi from './InventoryApi';

export default class ExpressLoad extends InventoryApi {
    constructor(bot: Bot) {
        super(bot, 'expressLoad');
    }

    protected getURLAndParams(
        steamID: string,
        appID: number,
        contextID: string
    ): [string, UnknownDictionaryKnownValues] {
        return [`https://api.express-load.com/inventory/${steamID}/${appID}/${contextID}`, {}];
    }

    protected getHeaders(): UnknownDictionaryKnownValues {
        return {
            'X-API-KEY': this.getApiKey(),
            'User-Agent': 'TF2Autobot'
        };
    }
}
