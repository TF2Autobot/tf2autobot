import request from 'request-retry-dayjs';
import SteamID from 'steamid';
import { BPTFGetUserInfo } from '../classes/MyHandler/interfaces';
import log from '../lib/logger';

export async function isBanned(
    steamID: SteamID | string,
    bptfApiKey: string,
    userID: string,
    checkMptfBanned: boolean
): Promise<boolean> {
    const steamID64 = steamID.toString();
    const [bptf, steamrep] = await Promise.all([
        isBptfBanned(steamID64, bptfApiKey, userID),
        isSteamRepMarked(steamID64, bptfApiKey, userID)
    ]);

    const mptfBanned = checkMptfBanned ? await isMptfBanned(steamID) : false;

    return bptf || steamrep || mptfBanned;
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
                    log.warn('Failed to get data from backpack.tf: ', err);
                    return reject(err);
                }

                const user = body.users[steamID64];
                const isBptfBanned = user.bans && user.bans.all !== undefined;

                log[isBptfBanned ? 'warn' : 'debug']('Backpack.tf: ' + (isBptfBanned ? 'banned' : 'clean'));

                return resolve(isBptfBanned);
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
                    log.warn('Failed to get data from backpack.tf (for SteamRep status): ', err);
                    return reject(err);
                }

                const user = body.users[steamID64];
                const isSteamRepBanned = user.bans ? user.bans.steamrep_scammer === 1 : false;

                log[isSteamRepBanned ? 'warn' : 'debug'](
                    'SteamRep (from Backpack.tf): ' + (isSteamRepBanned ? 'banned' : 'clean')
                );

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
                    log.warn('Failed to get data from SteamRep: ', err);
                    return resolve(isBptfSteamRepBanned(steamID64, bptfApiKey, userID));
                }

                const isSteamRepBanned = body.steamrep.reputation.summary.toLowerCase().indexOf('scammer') !== -1;
                log[isSteamRepBanned ? 'warn' : 'debug']('SteamRep: ' + (isSteamRepBanned ? 'banned' : 'clean'));

                return resolve(isSteamRepBanned);
            }
        );
    });
}

function isMptfBanned(steamID: SteamID | string): Promise<boolean> {
    const steamID64 = steamID.toString();

    return new Promise((resolve, reject) => {
        void request(
            {
                method: 'POST',
                url: 'https://rep.tf/api/bans',
                qs: {
                    str: steamID64
                },
                gzip: true,
                json: true
            },
            (err, response, body: RepTF) => {
                if (err) {
                    log.warn('Failed to obtain data from Rep.tf: ', err);
                    return reject(err);
                }

                const isMptfBanned = body.mpBans ? body.mpBans.banned === 'bad' : false;
                log[isMptfBanned ? 'warn' : 'debug'](
                    'Marketplace.tf (from Rep.tf): ' + (isMptfBanned ? 'banned' : 'clean')
                );

                return resolve(isMptfBanned);
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

interface RepTF {
    success: boolean;
    message: string;
    steamBans: BansInfo; // Steam
    srBans: BansInfo; // SteamRep
    stfBans: BansInfo; // Scrap.tf
    bptfBans: BansInfo; // Backpack.tf
    mpBans: BansInfo; // Marketplace.tf
    bzBans: BansInfo; // Bazaar.tf
    ppmBans: BansInfo; // PPM
    hgBans: BansInfo; // Harpoon Gaming
    nhsBans: BansInfo; // NeonHeights Servers
    stBans: BansInfo; // SMT Gaming
    fogBans: BansInfo; // FoG Trade
    etf2lBans: BansInfo; // ETF2L
}

interface BansInfo {
    banned: 'good' | 'bad';
    message: string;
    icons: string;
}
