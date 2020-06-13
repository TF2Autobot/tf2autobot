import SteamID from 'steamid';
import TradeOfferManager from 'steam-tradeoffer-manager';
import request from '@nicklason/request-retry';
import cheerio from 'cheerio';

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

export = class TF2Inventory {
    private readonly steamID: SteamID;

    private readonly manager: TradeOfferManager;

    private items: TF2Item[] = [];

    private slots: number = null;

    constructor(steamID: SteamID | string, manager: TradeOfferManager) {
        this.steamID = new SteamID(steamID.toString());
        this.manager = manager;
    }

    getSteamID(): SteamID {
        return this.steamID;
    }

    getItems(): TF2Item[] {
        return this.items;
    }

    getSlots(): number {
        return this.slots;
    }

    async isDuped(assetid: string): Promise<boolean | null> {
        // Check if the item exists on backpack.tf and if it is duped
        const history = await TF2Inventory.getItemHistory(assetid);

        if (history.recorded === true) {
            return history.isDuped;
        }

        // Inventory is not updated on bptf, get the original id

        // Fetch inventory using TF2 GetPlayerItems API if we haven't already
        if (this.getItems().length === 0) {
            await this.fetch();
        }

        // Find item in the inventory
        const item = this.getItems().find(item => item.id.toString() == assetid);

        if (item === undefined) {
            // Could not find the item in the inventory, failed to check if the item is duped
            throw new Error('Could not find item in inventory');
        }

        // Get history using original id
        const historyFromOriginal = await TF2Inventory.getItemHistory(item.original_id.toString());

        if (historyFromOriginal.recorded === true) {
            return historyFromOriginal.isDuped;
        }

        // Item has never been seen on backpack.tf before
        // throw new Error('No history for given item');

        return null;
    }

    fetch(): Promise<void> {
        return new Promise((resolve, reject) => {
            request(
                {
                    url: 'https://api.steampowered.com/IEconItems_440/GetPlayerItems/v0001/',
                    method: 'GET',
                    qs: {
                        key: this.manager.apiKey,
                        steamid: this.getSteamID().toString()
                    },
                    json: true,
                    gzip: true
                },
                (err, response, body) => {
                    if (err) {
                        return reject(err);
                    }

                    if (body.result.status != 1) {
                        err = new Error(body.result.statusDetail);
                        err.status = body.result.status;
                        return reject(err);
                    }

                    this.slots = body.result.num_backpack_slots;
                    this.items = body.result.items;

                    return resolve();
                }
            );
        });
    }

    static getItemHistory(
        assetid: string
    ): Promise<{
        recorded: boolean;
        isDuped?: boolean;
        history?: [];
    }> {
        return new Promise((resolve, reject) => {
            request(
                {
                    url: 'https://backpack.tf/item/' + assetid,
                    method: 'GET'
                },
                function(err, response, body) {
                    if (err) {
                        return reject(err);
                    }

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
                }
            );
        });
    }
};
