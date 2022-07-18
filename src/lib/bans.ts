import axios, { AxiosError } from 'axios';
import SteamID from 'steamid';
import { BPTFGetUserInfo } from '../classes/MyHandler/interfaces';
import log from '../lib/logger';
import filterAxiosError from '@tf2autobot/filter-axios-error';

let isReptfFailed = false;

export interface IsBanned {
    isBanned: boolean;
    contents?: { [website: string]: string };
}

interface SiteResult {
    isBanned: boolean;
    content?: string;
}

let _isBptfSteamRepBanned: boolean = null;

export async function isBanned(
    steamID: SteamID | string,
    bptfApiKey: string,
    mptfApiKey: string,
    userID: string,
    checkMptfBanned: boolean,
    reptfAsPrimarySource: boolean,
    showLog = true
): Promise<IsBanned> {
    const steamID64 = steamID.toString();

    const finalize = (bptf: SiteResult, mptf: SiteResult, steamrep: SiteResult, untrusted: SiteResult): IsBanned => {
        _isBptfSteamRepBanned = null;

        const toReturn = {
            isBanned: bptf.isBanned || mptf.isBanned || steamrep.isBanned || untrusted.isBanned,
            contents: {
                'Backpack.tf': bptf.isBanned ? `banned${bptf.content !== '' ? ` - ${bptf.content}` : ''}` : 'clean',
                'Steamrep.com:': steamrep.isBanned
                    ? `banned${steamrep.content !== '' ? ` - ${steamrep.content}` : ''}`
                    : 'clean'
            }
        };

        if (checkMptfBanned) {
            toReturn.contents['Marketplace.tf'] = mptf.isBanned
                ? `banned${mptf.content !== '' ? ` - ${mptf.content}` : ''}`
                : 'clean';
        }

        toReturn.contents['TF2Autobot'] = untrusted.isBanned
            ? `banned${untrusted.content !== '' ? ` - ${untrusted.content}` : ''}`
            : 'clean';

        if (showLog) log[toReturn.isBanned ? 'warn' : 'debug'](`Bans result for ${steamID64}:`, toReturn.contents);

        return toReturn;
    };

    if (reptfAsPrimarySource) {
        const isBanned = await getFromReptf(steamID64, checkMptfBanned, reptfAsPrimarySource, showLog);

        if (isReptfFailed) {
            const [bptf, mptf, steamrep, untrusted] = await Promise.all([
                isBptfBanned(steamID64, bptfApiKey, userID, showLog),
                isMptfBanned(steamID64, mptfApiKey, checkMptfBanned, showLog),
                isSteamRepMarked(steamID64, showLog),
                isListedUntrusted(steamID64, showLog)
            ]);
            isReptfFailed = false;

            return finalize(bptf, mptf, steamrep, untrusted);
        }

        return isBanned;
    } else {
        try {
            const [bptf, mptf, steamrep, untrusted] = await Promise.all([
                isBptfBanned(steamID64, bptfApiKey, userID, showLog),
                isMptfBanned(steamID64, mptfApiKey, checkMptfBanned, showLog),
                isSteamRepMarked(steamID64, showLog),
                isListedUntrusted(steamID64, showLog)
            ]);

            return finalize(bptf, mptf, steamrep, untrusted);
        } catch (err) {
            return await getFromReptf(steamID64, checkMptfBanned, reptfAsPrimarySource, showLog);
        }
    }
}

async function getFromReptf(
    steamID: string,
    checkMptf: boolean,
    reptfAsPrimarySource: boolean,
    showLog: boolean
): Promise<IsBanned> {
    return new Promise((resolve, reject) => {
        void axios({
            method: 'POST',
            url: 'https://rep.tf/api/bans?str=' + steamID,
            headers: {
                'User-Agent': 'TF2Autobot@' + process.env.BOT_VERSION
            }
        })
            .then(response => {
                const bans = response.data as RepTF;

                const v = ['bptfBans', 'srBans', 'mpBans'];
                for (let i = 0; i < v.length; i++) {
                    if (bans[v[i] as 'bptfBans' | 'srBans' | 'mpBans'].message.includes('Failed to get data')) {
                        throw `Failed to get data (${v[i]})`;
                    }
                }

                const isBptfBanned = bans.bptfBans ? bans.bptfBans.banned === 'bad' : false;
                const isSteamRepBanned = bans.srBans ? bans.srBans.banned === 'bad' : false;
                const isMptfBanned = bans.mpBans ? bans.mpBans.banned === 'bad' : false;

                const bansResult = {
                    'Backpack.tf': isBptfBanned ? `banned - ${removeHTMLTags(bans.bptfBans.message)}` : 'clean',
                    'Steamrep.com': isSteamRepBanned ? `banned - ${removeHTMLTags(bans.srBans.message)}` : 'clean'
                };

                if (checkMptf) {
                    bansResult['Marketplace.tf'] = isMptfBanned
                        ? `banned - ${removeHTMLTags(bans.mpBans.message)}`
                        : 'clean';
                }

                void isListedUntrusted(steamID)
                    .then(isListed => {
                        const isListedUntrusted = isListed.isBanned;
                        bansResult['TF2Autobot'] = isListedUntrusted ? `banned - ${isListed.content}` : 'clean';

                        if (showLog) {
                            log[
                                isBptfBanned || isSteamRepBanned || (checkMptf && isMptfBanned) || isListedUntrusted
                                    ? 'warn'
                                    : 'debug'
                            ]('Bans result:', bansResult);
                        }

                        return resolve({
                            isBanned:
                                isBptfBanned ||
                                isSteamRepBanned ||
                                (checkMptf ? isMptfBanned : false) ||
                                isListedUntrusted,
                            contents: bansResult
                        });
                    })
                    .catch(err => {
                        if (showLog) log.warn('Failed to obtain data from Github: ', err);
                        return reject(err);
                    });
            })
            .catch((err: AxiosError) => {
                if (err) {
                    if (showLog) log.warn('Failed to obtain data from Rep.tf');
                    if (reptfAsPrimarySource) {
                        if (showLog) {
                            log.debug(
                                `Getting data from Backpack.tf${
                                    !checkMptf ? ' and ' : ', Marketplace.tf and '
                                } Steamrep.com...`
                            );
                        }
                        isReptfFailed = true;
                        return resolve({ isBanned: false });
                    }

                    return reject(filterAxiosError(err));
                }
            });
    });
}

export function isBptfBanned(steamID: string, bptfApiKey: string, userID: string, showLog = true): Promise<SiteResult> {
    return new Promise((resolve, reject) => {
        void axios({
            url: 'https://api.backpack.tf/api/users/info/v1',
            headers: {
                'User-Agent': 'TF2Autobot@' + process.env.BOT_VERSION,
                Cookie: 'user-id=' + userID
            },
            params: {
                key: bptfApiKey,
                steamids: steamID
            }
        })
            .then(response => {
                const user = (response.data as BPTFGetUserInfo).users[steamID];
                const isBptfBanned =
                    user.bans && (user.bans.all !== undefined || user.bans['all features'] !== undefined);

                const banReason = user.bans ? user.bans.all?.reason ?? user.bans['all features']?.reason ?? '' : '';

                _isBptfSteamRepBanned = user.bans ? user.bans.steamrep_scammer === 1 : false;

                return resolve({ isBanned: isBptfBanned, content: banReason });
            })
            .catch((err: AxiosError) => {
                if (err) {
                    if (showLog) log.warn('Failed to get data from backpack.tf');
                    return reject(filterAxiosError(err));
                }
            });
    });
}

function isSteamRepMarked(steamID: string, showLog = true): Promise<SiteResult> {
    return new Promise((resolve, reject) => {
        void axios({
            url: 'https://steamrep.com/api/beta4/reputation/' + steamID,
            params: {
                json: 1
            }
        })
            .then(response => {
                const isSteamRepBanned =
                    (response.data as SteamRep).steamrep.reputation?.summary.toLowerCase().indexOf('scammer') !== -1;
                const fullRepInfo = (response.data as SteamRep).steamrep.reputation?.full ?? '';

                return resolve({ isBanned: isSteamRepBanned, content: fullRepInfo });
            })
            .catch((err: AxiosError) => {
                if (err) {
                    if (showLog) log.warn('Failed to get data from SteamRep');
                    if (_isBptfSteamRepBanned !== null) {
                        return resolve({ isBanned: _isBptfSteamRepBanned });
                    } else {
                        return reject(filterAxiosError(err));
                    }
                }
            });
    });
}

function isMptfBanned(
    steamID: string,
    mptfApiKey: string,
    checkMptfBanned: boolean,
    showLog = true
): Promise<SiteResult> {
    return new Promise((resolve, reject) => {
        if (!checkMptfBanned) {
            return resolve({ isBanned: false });
        }

        if (mptfApiKey === '') {
            return reject(new Error('Marketplace.tf API key was not set.'));
        }

        void axios({
            method: 'POST',
            url: 'https://marketplace.tf/api/Bans/GetUserBan/v2',
            headers: {
                'User-Agent': 'TF2Autobot@' + process.env.BOT_VERSION
            },
            params: {
                key: mptfApiKey,
                steamid: steamID
            }
        })
            .then(response => {
                const results = (response.data as MptfGetUserBan)?.results;

                if (!Array.isArray(results)) {
                    return reject(new Error('Marketplace.tf returned invalid data'));
                }

                const resultSize = results.length;
                for (let i = 0; i < resultSize; i++) {
                    if (steamID === results[i].steamid) {
                        return resolve({ isBanned: results[i].banned ?? false, content: results[i].ban?.type ?? '' });
                    }
                }

                return resolve({ isBanned: false });
            })
            .catch((err: AxiosError) => {
                if (err) {
                    if (showLog) log.warn('Failed to get data from Marketplace.tf');
                    return reject(filterAxiosError(err));
                }
            });
    });
}

function isListedUntrusted(steamID: string, showLog = true): Promise<SiteResult> {
    return new Promise((resolve, reject) => {
        void axios({
            method: 'GET',
            url: 'https://raw.githubusercontent.com/TF2Autobot/untrusted-steam-ids/master/untrusted.min.json'
        })
            .then(response => {
                const results = (response.data as UntrustedJson).steamids[steamID];

                if (results === undefined) {
                    return resolve({ isBanned: false });
                }

                return resolve({ isBanned: true, content: `Reason: ${results.reason} - Source: ${results.source}` });
            })
            .catch((err: AxiosError) => {
                if (err) {
                    if (showLog) log.warn('Failed to get data from Github');
                    return reject(filterAxiosError(err));
                }
            });
    });
}

// https://www.geeksforgeeks.org/how-to-strip-out-html-tags-from-a-string-using-javascript/
function removeHTMLTags(str: string): string {
    if (str === null || str === '') {
        return '';
    }

    str = str.toString();
    return str.replace(/(<([^>]+)>)/gi, '');
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
    flags: Flags;
    steamID32?: string;
    steamID64?: string;
    steamrepurl?: string;
    reputation?: Reputation;
}

interface Flags {
    status: string;
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

interface UntrustedJson {
    last_update: number;
    steamids: UntrustedJsonSteamids;
}

interface UntrustedJsonSteamids {
    [steamID: string]: UntrustedJsonSteamidsContent;
}

interface UntrustedJsonSteamidsContent {
    reason: string;
    source: string;
    time: number;
}
