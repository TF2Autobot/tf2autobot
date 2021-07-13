import request from 'request-retry-dayjs';
import SteamID from 'steamid';
import { BPTFGetUserInfo } from '../classes/MyHandler/interfaces';

export async function isBanned(steamID: SteamID | string, bptfApiKey: string, userID: string): Promise<boolean> {
    const steamID64 = steamID.toString();
    const [bptf, steamrep] = await Promise.all([
        isBptfBanned(steamID64, bptfApiKey, userID),
        isSteamRepMarked(steamID64, bptfApiKey, userID)
    ]);

    return bptf || steamrep;
}

export function isBptfBanned(steamID: SteamID | string, bptfApiKey: string, userID: string): Promise<boolean> {
    const steamID64 = steamID.toString();

    return new Promise((resolve, reject) => {
        void request(
            {
                url: 'https://backpack.tf/api/users/info/v1',
                headers: {
                    'User-Agent': 'TF2Autobot@' + process.env.BOT_VERSION,
                    Cookie: 'user-id=' + userID
                },
                qs: {
                    key: bptfApiKey,
                    steamids: steamID64
                },
                gzip: true,
                json: true
            },
            (err, response, body: BPTFGetUserInfo) => {
                if (err) {
                    return reject(err);
                }

                const user = body.users[steamID64];

                return resolve(user.bans && user.bans.all !== undefined);
            }
        );
    });
}

function isBptfSteamRepBanned(steamID: SteamID | string, bptfApiKey: string, userID: string): Promise<boolean> {
    const steamID64 = steamID.toString();

    return new Promise((resolve, reject) => {
        void request(
            {
                url: 'https://backpack.tf/api/users/info/v1',
                qs: {
                    key: bptfApiKey,
                    steamids: steamID64
                },
                headers: {
                    'User-Agent': 'TF2Autobot@' + process.env.BOT_VERSION,
                    Cookie: 'user-id=' + userID
                },
                gzip: true,
                json: true
            },
            (err, response, body: BPTFGetUserInfo) => {
                if (err) {
                    return reject(err);
                }

                const user = body.users[steamID64];
                const isSteamRepBanned = user.bans ? user.bans.steamrep_scammer === 1 : false;

                return resolve(isSteamRepBanned);
            }
        );
    });
}

function isSteamRepMarked(steamID: SteamID | string, bptfApiKey: string, userID: string): Promise<boolean> {
    const steamID64 = steamID.toString();

    return new Promise(resolve => {
        void request(
            {
                url: 'http://steamrep.com/api/beta4/reputation/' + steamID64,
                qs: {
                    json: 1
                },
                gzip: true,
                json: true
            },
            (err, response, body: SteamRep) => {
                if (err) {
                    resolve(isBptfSteamRepBanned(steamID64, bptfApiKey, userID));
                }

                resolve(body.steamrep.reputation.summary.toLowerCase().indexOf('scammer') !== -1);
            }
        );
    });
}

interface SteamRep {
    steamrep: Details;
}

interface Details {
    steamID32?: string;
    steamID64?: string;
    steamrepurl?: string;
    reputation?: Reputation;
}

interface Reputation {
    full?: string;
    summary?: string;
}
