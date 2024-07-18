import SteamID from 'steamid';
import TradeOfferManager from '@tf2autobot/tradeoffer-manager';
import cheerio from 'cheerio';
import { SteamRequestParams } from '../types/common';
import { apiRequest } from '../lib/apiRequest';
// import { uid } from 'rand-token';

type TF2Attribute = {
    defindex: number;
    value: number | string;
    float_value?: number;
};

type TF2Item = {
    id: number;

    original_id: number;

    defindex: number;

    level: number;

    quality: number;

    inventory: number;

    quantity: number;

    origin: number;

    style?: number | undefined;

    flag_cannot_trade?: boolean;

    flag_cannot_craft?: boolean;

    attributes?: TF2Attribute[];
};

export default class TF2Inventory {
    private readonly steamID: SteamID;

    private items: TF2Item[] = [];

    private slots: number = null;

    constructor(steamID: SteamID | string, private readonly manager: TradeOfferManager) {
        this.steamID = new SteamID(steamID.toString());
        this.manager = manager;
    }

    private get getSteamID(): SteamID {
        return this.steamID;
    }

    private get getItems(): TF2Item[] {
        return this.items;
    }

    private get getSlots(): number {
        return this.slots;
    }

    async isDuped(assetid: string, userID: string): Promise<boolean | null> {
        // Check if the item exists on backpack.tf and if it is duped
        const history = await TF2Inventory.getItemHistory(assetid, userID);

        if (history.recorded === true) {
            return history.isDuped;
        }

        // Inventory is not updated on bptf, get the original id

        // Fetch inventory using TF2 GetPlayerItems API if we haven't already
        if (this.getItems.length === 0) {
            await this.fetch();
        }

        // Find item in the inventory
        const item = this.getItems.find(item => item.id.toString() == assetid);

        if (item === undefined) {
            throw new Error('Could not find item in inventory');
        }
        // Could not find the item in the inventory, failed to check if the item is duped

        // Get history using original id
        const historyFromOriginal = await TF2Inventory.getItemHistory(item.original_id.toString(), userID);

        if (historyFromOriginal.recorded === true) {
            return historyFromOriginal.isDuped;
        }

        // Item has never been seen on backpack.tf before
        // throw new Error('No history for given item');

        return null;
    }

    private fetch(): Promise<void> {
        return new Promise((resolve, reject) => {
            const params: SteamRequestParams = { steamid: this.getSteamID.toString() };

            if (this.manager.apiKey) params.key = this.manager.apiKey;
            else params.access_token = this.manager.accessToken;

            apiRequest<GetPlayerItems>({
                method: 'GET',
                url: 'https://api.steampowered.com/IEconItems_440/GetPlayerItems/v0001/',
                params
            })
                .then(body => {
                    if (body.result.status != 1) {
                        const err = new Error(body.result.statusDetail);
                        err['status'] = body.result.status;
                        return reject(err);
                    }
                    this.slots = body.result.num_backpack_slots;
                    this.items = body.result.items;
                    return resolve();
                })
                .catch(err => reject(err));
        });
    }

    private static getItemHistory(
        assetid: string,
        userID: string
    ): Promise<{
        recorded: boolean;
        isDuped?: boolean;
        history?: [];
    }> {
        return new Promise((resolve, reject) => {
            apiRequest<string>({
                method: 'GET',
                url: 'https://backpack.tf/item/' + assetid,
                headers: {
                    'User-Agent': 'TF2Autobot@' + process.env.BOT_VERSION,
                    Cookie: 'user-id=' + userID // uid(12)
                }
            })
                .then(body => {
                    const $ = cheerio.load(body);

                    if ($('table').length !== 1) {
                        return resolve({
                            recorded: false
                        });
                    }

                    // TODO: Make a list that contains the item history

                    const isDuped = $('#dupe-modal-btn').length > 0;

                    return resolve({
                        recorded: true,
                        isDuped: isDuped,
                        history: []
                    });
                })
                .catch(err => reject(err));
        });
    }
}

interface GetPlayerItems {
    result?: Result;
}

interface Result {
    status?: number;
    statusDetail?: string;
    num_backpack_slots?: number;
    items?: Item[];
}

interface Item {
    id: number;
    original_id: number;
    defindex: number;
    level: number;
    quality: number;
    inventory: number;
    quantity: number;
    origin: number;
    style?: number;
    flag_cannot_trade?: boolean;
    flag_cannot_craft?: boolean;
    custom_name?: string;
    custom_desc?: string;
    equipped?: Equipped[];
    attributes?: Attribute[];
}

interface Equipped {
    class: number;
    slot: number;
}

interface Attribute {
    defindex: number;
    value: number | string;
    float_value?: number;
    account_info?: AccountInfo; // attr defindex: 228
}

interface AccountInfo {
    steamid: number;
    personaname: string;
}
