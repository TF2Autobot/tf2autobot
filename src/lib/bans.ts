import request from 'request-retry-dayjs';
import SteamID from 'steamid';
import { BPTFGetUserInfo } from '../classes/MyHandler/interfaces';
import log from '../lib/logger';

let isReptfFailed = false;

export async function isBanned(
    steamID: SteamID | string,
    bptfApiKey: string,
    userID: string,
    checkMptfBanned: boolean
): Promise<boolean> {
    const steamID64 = steamID.toString();
    const isBanned = await isBannedOverall(steamID64, checkMptfBanned);

    if (isReptfFailed) {
        const [bptf, steamrep] = await Promise.all([
            isBptfBanned(steamID64, bptfApiKey, userID),
            isSteamRepMarked(steamID64, bptfApiKey, userID)
        ]);
        isReptfFailed = false;
        return bptf || steamrep;
    }

    return isBanned;
}

async function isBannedOverall(steamID: SteamID | string, checkMptf: boolean): Promise<boolean> {
    const steamID64 = steamID.toString();

    return new Promise((resolve, reject) => {
        void request(
            {
                method: 'POST',
                url: 'https://rep.tf/api/bans?str=' + steamID64,
                headers: {
                    'User-Agent': 'TF2Autobot@' + process.env.BOT_VERSION
                }
            },
            (err, response, body: RepTF) => {
                if (err) {
                    log.warn('Failed to obtain data from Rep.tf: ', err);
                    if (checkMptf) {
                        // If Marketplace.tf check enabled, we reject this.
                        return reject(err);
                    }

                    // If Marketplace.tf check disabled, try get from each websites
                    log.debug('Getting data from Backpack.tf and Steamrep.com...');
                    isReptfFailed = true;
                    return resolve(false);
                }

                const isBptfBanned = body.bptfBans ? body.bptfBans.banned === 'bad' : false;
                log[isBptfBanned ? 'warn' : 'debug'](
                    'Backpack.tf: ' + (isBptfBanned ? `banned - ${body.bptfBans.message}` : 'clean')
                );

                const isSteamRepBanned = body.srBans ? body.srBans.banned === 'bad' : false;
                log[isSteamRepBanned ? 'warn' : 'debug'](
                    'Backpack.tf: ' + (isSteamRepBanned ? `banned - ${body.srBans.message}` : 'clean')
                );

                const isMptfBanned = body.mpBans ? body.mpBans.banned === 'bad' : false;
                if (checkMptf) {
                    log[isMptfBanned ? 'warn' : 'debug'](
                        'Marketplace.tf (from Rep.tf): ' + (isMptfBanned ? `banned - ${body.mpBans.message}` : 'clean')
                    );
                }

                return resolve(isBptfBanned || isSteamRepBanned || (checkMptf ? isMptfBanned : false));
            }
        );
    });
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
