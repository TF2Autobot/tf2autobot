import request from '@nicklason/request-retry';
import SteamID from 'steamid';

export async function isBanned(steamID: SteamID | string, bptfApiKey: string): Promise<boolean> {
    const steamID64 = steamID.toString();

    const [bptf, steamrep] = await Promise.all([
        isBptfBanned(steamID64, bptfApiKey),
        isSteamRepMarked(steamID64, bptfApiKey)
    ]);

    return bptf || steamrep;
}

function isBptfBanned(steamID: SteamID | string, bptfApiKey: string): Promise<boolean> {
    const steamID64 = steamID.toString();

    return new Promise((resolve, reject) => {
        request(
            {
                url: 'https://backpack.tf/api/users/info/v1',
                qs: {
                    key: bptfApiKey,
                    steamids: steamID64
                },
                gzip: true,
                json: true
            },
            (err, response, body) => {
                if (err) {
                    return reject(err);
                }

                const user = body.users[steamID64];

                return resolve(user.bans && user.bans.all);
            }
        );
    });
}

function isBptfSteamRepBanned(steamID: SteamID | string, bptfApiKey: string): Promise<boolean> {
    const steamID64 = steamID.toString();

    return new Promise((resolve, reject) => {
        request(
            {
                url: 'https://backpack.tf/api/users/info/v1',
                qs: {
                    key: bptfApiKey,
                    steamids: steamID64
                },
                gzip: true,
                json: true
            },
            (err, response, body) => {
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

function isSteamRepMarked(steamID: SteamID | string, bptfApiKey: string): Promise<boolean> {
    const steamID64 = steamID.toString();

    return new Promise(resolve => {
        request(
            {
                url: 'http://steamrep.com/api/beta4/reputation/' + steamID64,
                qs: {
                    json: 1
                },
                gzip: true,
                json: true
            },
            (err, response, body) => {
                if (err) {
                    return isBptfSteamRepBanned(steamID64, bptfApiKey);
                }

                return resolve(body.steamrep.reputation.summary.toLowerCase().indexOf('scammer') !== -1);
            }
        );
    });
}
