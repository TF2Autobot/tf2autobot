import axios, { AxiosError } from 'axios';
import filterAxiosError from '@tf2autobot/filter-axios-error';
import { UnknownDictionary, UnknownDictionaryKnownValues } from 'src/types/common';
import SteamID from 'steamid';
import CEconItem from '@tf2autobot/steamcommunity/classes/CEconItem';
import { EconItem } from '@tf2autobot/tradeoffer-manager';
import Bot from '../Bot';

export default class InventoryApi {
    constructor(private bot: Bot, private optionsKey: string) {}

    public isEnabled(): boolean {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
        return this.bot.options.inventoryApis[this.optionsKey].enable;
    }

    public getApiKey(): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this.bot.options[this.optionsKey + 'ApiKey'];
    }

    // This method should be defined by a class extending InventoryAPI
    protected getURLAndParams(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        steamID64: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        appID: number,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        contextID: string
    ): [string, UnknownDictionaryKnownValues] {
        return ['', {}];
    }

    // Adapted from node-steamcommunity
    public getUserInventoryContents(
        userID: SteamID | string,
        appID: number,
        contextID: string,
        tradableOnly: boolean,
        callback: (err?: Error, inventory?: EconItem[], currency?: EconItem[], totalInventoryCount?: number) => void
    ): void {
        if (!this.isEnabled()) {
            callback(new Error("This API is disabled in the bot's options"));
            return;
        }

        if (!userID) {
            callback(new Error("The user's SteamID is invalid or missing."));
            return;
        }

        const userSteamID64 = typeof userID === 'string' ? userID : userID.getSteamID64();

        const [apiCallUrl, apiCallParams] = this.getURLAndParams(userSteamID64, appID, contextID);

        if (apiCallUrl === '') {
            callback(new Error('Improper usage of InventoryAPI; descendant class should define getURLAndParams'));
            return;
        }

        let pos = 1;
        get([], []);

        function get(inventory: EconItem[], currency: EconItem[], start?: string) {
            axios({
                url: apiCallUrl,
                params: {
                    ...apiCallParams,
                    start_assetid: start
                }
            }).then(
                response => {
                    const result = response.data as GetUserInventoryContentsResult;

                    if (response.status === 403 && result === null) {
                        callback(new Error('This profile is private.'));
                        return;
                    }

                    if (response.status == 500 && result && result.error) {
                        const errToReturn = new Error(result.error);
                        const match = result.error.match(/^(.+) \((\d+)\)$/);
                        if (match) {
                            errToReturn.message = match[1];
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            errToReturn.eresult = match[2];
                        }
                        callback(errToReturn);
                        return;
                    }

                    if (result?.fake_redirect === 0) {
                        // fake redirect caused by steam erros on the proxy's side
                        return callback(new Error('Received fake redirect 0'));
                    }

                    if (result && result.success && result.total_inventory_count === 0) {
                        // Empty inventory
                        callback(null, [], [], 0);
                        return;
                    }

                    if (!result || !result.success || !result.assets || !result.descriptions) {
                        if (result) {
                            // Dunno if the error/Error property even exists on this new endpoint
                            callback(new Error(result.error || result.Error || 'Malformed response'));
                        } else {
                            callback(new Error('Malformed response'));
                        }

                        return;
                    }

                    for (let i = 0; i < result.assets.length; i++) {
                        const description = getDescription(
                            result.descriptions,
                            result.assets[i].classid,
                            result.assets[i].instanceid
                        );

                        if (!tradableOnly || (description && description.tradable)) {
                            result.assets[i].pos = pos++;
                            (result.assets[i].currencyid ? currency : inventory).push(
                                new CEconItem(result.assets[i], description, contextID)
                            );
                        }
                    }

                    if (result.more_items) {
                        get(inventory, currency, result.last_assetid);
                    } else {
                        callback(null, inventory, currency, result.total_inventory_count);
                    }
                },
                (err: AxiosError) => {
                    callback(filterAxiosError(err) as Error);
                }
            );
        }

        // A bit of optimization; objects are hash tables so it's more efficient to look up by key than to iterate an array
        const quickDescriptionLookup: UnknownDictionary<Description> = {};

        function getDescription(descriptions: Description[], classID: string, instanceID: string): Description {
            const key = classID + '_' + (instanceID || '0'); // instanceID can be undefined, in which case it's 0.

            if (quickDescriptionLookup[key]) {
                return quickDescriptionLookup[key];
            }

            for (let i = 0; i < descriptions.length; i++) {
                quickDescriptionLookup[descriptions[i].classid + '_' + (descriptions[i].instanceid || '0')] =
                    descriptions[i];
            }

            return quickDescriptionLookup[key];
        }
    }
}

interface Description {
    classid: string;
    instanceid?: string;
    tradable?: number;
}

interface Asset {
    pos?: number;
    classid: string;
    currencyid?: string;
    instanceid: string;
}

interface GetUserInventoryContentsResult {
    assets?: Asset[];
    descriptions?: Description[];
    error?: string;
    Error?: string;
    last_assetid?: string;
    more_items?: number;
    total_inventory_count?: number;
    success?: number;
    fake_redirect?: 1 | 0;
}
