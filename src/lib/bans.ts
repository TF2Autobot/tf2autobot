import axios from 'axios';
import SteamID from 'steamid';
import { BPTFGetUserInfo } from '../classes/MyHandler/interfaces';
import log from '../lib/logger';

let isReptfFailed = false;

export interface IsBanned {
    isBanned: boolean;
    contents?: { [website: string]: string };
}

let _isBptfSteamRepBanned: boolean = null;

export async function isBanned(
    steamID: SteamID | string,
    bptfApiKey: string,
    mptfApiKey: string,
    userID: string,
    checkMptfBanned: boolean,
    reptfAsPrimarySource: boolean
): Promise<IsBanned> {
    const steamID64 = steamID.toString();

    const finalize = (bptf: boolean, mptf: boolean, steamrep: boolean): IsBanned => {
        _isBptfSteamRepBanned = null;

        const toReturn = {
            isBanned: bptf || mptf || steamrep,
            contents: {
                'Backpack.tf': bptf ? 'banned' : 'clean',
                'Steamrep.com:': steamrep ? 'banned' : 'clean'
            }
        };

        if (checkMptfBanned) {
            toReturn.contents['Marketplace.tf'] = mptf ? 'banned' : 'clean';
        }

        return toReturn;
    };

    if (reptfAsPrimarySource) {
        const isBanned = await getFromReptf(steamID64, checkMptfBanned, reptfAsPrimarySource);

        if (isReptfFailed) {
            const [bptf, mptf, steamrep] = await Promise.all([
                isBptfBanned(steamID64, bptfApiKey, userID),
                isMptfBanned(steamID64, mptfApiKey, checkMptfBanned),
                isSteamRepMarked(steamID64)
            ]);
            isReptfFailed = false;

            return finalize(bptf, mptf, steamrep);
        }

        return isBanned;
    } else {
        try {
            const bptf = await isBptfBanned(steamID64, bptfApiKey, userID);
            const mptf = await isMptfBanned(steamID64, mptfApiKey, checkMptfBanned);
            const steamrep = await isSteamRepMarked(steamID64);

            return finalize(bptf, mptf, steamrep);
        } catch (err) {
            return await getFromReptf(steamID64, checkMptfBanned, reptfAsPrimarySource);
        }
    }
}

async function getFromReptf(
    steamID: SteamID | string,
    checkMptf: boolean,
    reptfAsPrimarySource: boolean
): Promise<IsBanned> {
    const steamID64 = steamID.toString();

    return new Promise((resolve, reject) => {
        void axios({
            method: 'POST',
            url: 'https://rep.tf/api/bans?str=' + steamID64,
            headers: {
                'User-Agent': 'TF2Autobot@' + process.env.BOT_VERSION
            }
        })
            .then(response => {
                const bans = response.data as RepTF;

                const isBptfBanned = bans.bptfBans ? bans.bptfBans.banned === 'bad' : false;
                const isSteamRepBanned = bans.srBans ? bans.srBans.banned === 'bad' : false;
                const isMptfBanned = bans.mpBans ? bans.mpBans.banned === 'bad' : false;

                const bansResult = {
                    'Backpack.tf': isBptfBanned ? `banned - ${bans.bptfBans.message}` : 'clean',
                    'Steamrep.com': isSteamRepBanned ? `banned - ${bans.srBans.message}` : 'clean'
                };

                if (checkMptf) {
                    bansResult['Marketplace.tf'] = isMptfBanned ? `banned - ${bans.mpBans.message}` : 'clean';
                }

                log[isBptfBanned || isSteamRepBanned || (checkMptf && isMptfBanned) ? 'warn' : 'debug'](
                    'Bans result:',
                    bansResult
                );

                return resolve({
                    isBanned: isBptfBanned || isSteamRepBanned || (checkMptf ? isMptfBanned : false),
                    contents: bansResult
                });
            })
            .catch(err => {
                if (err) {
                    log.warn('Failed to obtain data from Rep.tf: ', err);
                    if (reptfAsPrimarySource) {
                        log.debug(
                            `Getting data from Backpack.tf${
                                !checkMptf ? ' and ' : ', Marketplace.tf and '
                            } Steamrep.com...`
                        );
                        isReptfFailed = true;
                        return resolve({ isBanned: false });
                    }

                    return reject(err);
                }
            });
    });
}

export function isBptfBanned(steamID: SteamID | string, bptfApiKey: string, userID: string): Promise<boolean> {
    const steamID64 = steamID.toString();

    return new Promise((resolve, reject) => {
        void axios({
            url: 'https://api.backpack.tf/api/users/info/v1',
            headers: {
                'User-Agent': 'TF2Autobot@' + process.env.BOT_VERSION,
                Cookie: 'user-id=' + userID
            },
            params: {
                key: bptfApiKey,
                steamids: steamID64
            }
        })
            .then(response => {
                const user = (response.data as BPTFGetUserInfo).users[steamID64];
                const isBptfBanned = user.bans && user.bans.all !== undefined;

                _isBptfSteamRepBanned = user.bans ? user.bans.steamrep_scammer === 1 : false;

                log[isBptfBanned ? 'warn' : 'debug']('Backpack.tf: ' + (isBptfBanned ? 'banned' : 'clean'));

                return resolve(isBptfBanned);
            })
            .catch(err => {
                if (err) {
                    log.warn('Failed to get data from backpack.tf: ', err);
                    return reject(err);
                }
            });
    });
}

function isSteamRepMarked(steamID: SteamID | string): Promise<boolean> {
    const steamID64 = steamID.toString();

    return new Promise((resolve, reject) => {
        void axios({
            url: 'http://steamrep.com/api/beta4/reputation/' + steamID64,
            params: {
                json: 1
            }
        })
            .then(response => {
                const isSteamRepBanned =
                    (response.data as SteamRep).steamrep.reputation.summary.toLowerCase().indexOf('scammer') !== -1;
                log[isSteamRepBanned ? 'warn' : 'debug']('SteamRep: ' + (isSteamRepBanned ? 'banned' : 'clean'));

                return resolve(isSteamRepBanned);
            })
            .catch(err => {
                if (err) {
                    log.warn('Failed to get data from SteamRep: ', err);
                    if (_isBptfSteamRepBanned !== null) {
                        return resolve(_isBptfSteamRepBanned);
                    } else {
                        return reject(err);
                    }
                }
            });
    });
}

function isMptfBanned(steamID: SteamID | string, mptfApiKey: string, checkMptfBanned: boolean): Promise<boolean> {
    const steamID64 = steamID.toString();

    return new Promise((resolve, reject) => {
        if (!checkMptfBanned) {
            return resolve(false);
        }

        void axios({
            url: 'https://api.backpack.tf/api/users/info/v1',
            headers: {
                'User-Agent': 'TF2Autobot@' + process.env.BOT_VERSION
            },
            params: {
                key: mptfApiKey,
                steamid: steamID64
            }
        })
            .then(response => {
                const results = (response.data as MptfGetUserBan).results;

                const isMptfBanned = results[0].banned;
                return resolve(isMptfBanned);
            })
            .catch(err => {
                if (err) {
                    log.warn('Failed to get data from Marketplace.tf: ', err);
                    return reject(err);
                }
            });
    });
}

interface MptfGetUserBan {
    success: boolean;
    results: MptfResult[];
}

interface MptfResult {
    steamid: string;
    id: number;
    name: string;
    banned: boolean;
    ban?: MptfBan;
    seller: boolean;
}

interface MptfBan {
    time: number;
    type: string;
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
