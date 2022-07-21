import axios, { AxiosError } from 'axios';
import { BPTFGetUserInfo } from '../classes/MyHandler/interfaces';
import log from '../lib/logger';
import filterAxiosError from '@tf2autobot/filter-axios-error';
import Bot from '../classes/Bot';
import { ReputationCheck } from '../classes/Options';

export interface IsBanned {
    isBanned: boolean;
    contents?: { [website: string]: string };
}

interface SiteResult {
    isBanned: boolean;
    content?: string;
}

export default class Bans {
    private _isBptfBanned: boolean = null;

    private _isBptfSteamRepBanned: boolean = null;

    private _isSteamRepBanned: boolean = null;

    private _isCommunityBanned: boolean = null;

    private _isMptfBanned: boolean = null;

    constructor(
        private readonly bot: Bot,
        private readonly userID: string,
        private readonly steamID: string,
        private readonly showLog = true
    ) {
        //
    }

    private get repOpt(): ReputationCheck {
        return this.bot.options.miscSettings.reputationCheck;
    }

    async isBanned(): Promise<IsBanned> {
        const finalize = (
            bptf: SiteResult,
            mptf: SiteResult,
            steamrep: SiteResult,
            untrusted: SiteResult
        ): IsBanned => {
            const toReturn = {
                isBanned: bptf.isBanned || mptf.isBanned || steamrep.isBanned || untrusted.isBanned,
                contents: {
                    'Backpack.tf': bptf.isBanned ? `banned${bptf.content !== '' ? ` - ${bptf.content}` : ''}` : 'clean',
                    'Steamrep.com:': steamrep.isBanned
                        ? `banned${steamrep.content !== '' ? ` - ${steamrep.content}` : ''}`
                        : 'clean'
                }
            };

            if (this.repOpt.checkMptfBanned) {
                toReturn.contents['Marketplace.tf'] = mptf.isBanned
                    ? `banned${mptf.content !== '' ? ` - ${mptf.content}` : ''}`
                    : 'clean';
            }

            toReturn.contents['TF2Autobot'] = untrusted.isBanned
                ? `banned${untrusted.content !== '' ? ` - ${untrusted.content}` : ''}`
                : 'clean';

            if (this.showLog)
                log[toReturn.isBanned ? 'warn' : 'debug'](`Bans result for ${this.steamID}:`, toReturn.contents);

            return toReturn;
        };

        if (this.repOpt.reptfAsPrimarySource) {
            // If rep.tf as primary, get from reptf first
            return await this.getFromReptf()
                .catch(async () => {
                    // If error, get from each website
                    const [untrusted, mptf, steamrep, bptf] = await Promise.all([
                        this.isListedUntrusted(),
                        this.isMptfBanned(),
                        this.isSteamRepMarked(),
                        this.isBptfBanned()
                    ]);

                    return finalize(bptf, mptf, steamrep, untrusted);
                })
                .catch(err => {
                    // but if still got an error, try check if any cached is true
                    if (
                        this._isBptfBanned ||
                        this._isBptfSteamRepBanned ||
                        this._isSteamRepBanned ||
                        this._isCommunityBanned ||
                        (this.repOpt.checkMptfBanned && this._isMptfBanned)
                    ) {
                        return { isBanned: true };
                    }

                    // if non is true, we are unsure so then throw error
                    throw err;
                });
        }

        // Else if rep.tf is not as primary, check from each website first
        return await Promise.all([
            this.isListedUntrusted(),
            this.isMptfBanned(),
            this.isSteamRepMarked(),
            this.isBptfBanned()
        ])
            .then(([untrusted, mptf, steamrep, bptf]) => {
                // If all success, proceed
                return finalize(bptf, mptf, steamrep, untrusted);
            })
            .catch(async () => {
                // Else if an error occured, check if any cached is true
                if (
                    this._isBptfBanned ||
                    this._isBptfSteamRepBanned ||
                    this._isSteamRepBanned ||
                    this._isCommunityBanned ||
                    (this.repOpt.checkMptfBanned && this._isMptfBanned)
                ) {
                    return { isBanned: true };
                }

                // Else, try get data from Rep.tf, if still error, this will automatically be throw
                // and should be catch by other
                return await this.getFromReptf();
            });
    }

    private async getFromReptf(): Promise<IsBanned> {
        return new Promise((resolve, reject) => {
            void axios({
                method: 'POST',
                url: 'https://rep.tf/api/bans?str=' + this.steamID,
                headers: {
                    'User-Agent': 'TF2Autobot@' + process.env.BOT_VERSION
                }
            })
                .then(response => {
                    const bans = response.data as RepTF;

                    const v = ['bptfBans', 'srBans'];
                    for (let i = 0; i < v.length; i++) {
                        if (bans[v[i] as 'bptfBans' | 'srBans']?.message?.includes('Failed to get data')) {
                            throw `Failed to get data (${v[i]})`;
                        }
                    }

                    if (this.repOpt.checkMptfBanned) {
                        if (bans.mpBans.message === 'Failed to get data') {
                            throw `Failed to get data (mpBans)`;
                        }
                    }

                    const isBptfBanned = bans.bptfBans ? bans.bptfBans.banned === 'bad' : false;
                    this._isBptfBanned = isBptfBanned;
                    const isSteamRepBanned = bans.srBans ? bans.srBans.banned === 'bad' : false;
                    this._isBptfSteamRepBanned = isSteamRepBanned;

                    const isMptfBanned = bans.mpBans ? bans.mpBans.banned === 'bad' : false;

                    const bansResult = {
                        'Backpack.tf': isBptfBanned ? `banned - ${removeHTMLTags(bans.bptfBans.message)}` : 'clean',
                        'Steamrep.com': isSteamRepBanned ? `banned - ${removeHTMLTags(bans.srBans.message)}` : 'clean'
                    };

                    if (this.repOpt.checkMptfBanned) {
                        this._isMptfBanned = isMptfBanned;
                        bansResult['Marketplace.tf'] = isMptfBanned
                            ? `banned - ${removeHTMLTags(bans.mpBans.message)}`
                            : 'clean';
                    }

                    void this.isListedUntrusted()
                        .then(isListed => {
                            const isListedUntrusted = isListed.isBanned;
                            bansResult['TF2Autobot'] = isListedUntrusted ? `banned - ${isListed.content}` : 'clean';

                            if (this.showLog) {
                                log[
                                    isBptfBanned ||
                                    isSteamRepBanned ||
                                    (this.repOpt.checkMptfBanned && isMptfBanned) ||
                                    isListedUntrusted
                                        ? 'warn'
                                        : 'debug'
                                ]('Bans result:', bansResult);
                            }

                            return resolve({
                                isBanned:
                                    isBptfBanned ||
                                    isSteamRepBanned ||
                                    (this.repOpt.checkMptfBanned ? isMptfBanned : false) ||
                                    isListedUntrusted,
                                contents: bansResult
                            });
                        })
                        .catch(err => {
                            if (this.showLog) log.warn('Failed to obtain data from Github: ', err);
                            return reject(err);
                        });
                })
                .catch((err: AxiosError) => {
                    if (err) {
                        if (this.showLog) log.warn('Failed to obtain data from Rep.tf');
                        if (this.repOpt.reptfAsPrimarySource) {
                            if (this.showLog) {
                                log.debug(
                                    `Getting data from Backpack.tf${
                                        !this.repOpt.checkMptfBanned ? ' and ' : ', Marketplace.tf and '
                                    } Steamrep.com...`
                                );
                            }
                        }

                        return reject(filterAxiosError(err));
                    }
                });
        });
    }

    private isBptfBanned(): Promise<SiteResult> {
        return new Promise((resolve, reject) => {
            void axios({
                url: 'https://api.backpack.tf/api/users/info/v1',
                headers: {
                    'User-Agent': 'TF2Autobot@' + process.env.BOT_VERSION,
                    Cookie: 'user-id=' + this.userID
                },
                params: {
                    key: this.bot.options.bptfApiKey,
                    steamids: this.steamID
                }
            })
                .then(response => {
                    const user = (response.data as BPTFGetUserInfo).users[this.steamID];
                    const isBptfBanned =
                        user.bans && (user.bans.all !== undefined || user.bans['all features'] !== undefined);

                    const banReason = user.bans ? user.bans.all?.reason ?? user.bans['all features']?.reason ?? '' : '';

                    this._isBptfBanned = isBptfBanned;
                    this._isBptfSteamRepBanned = user.bans ? user.bans.steamrep_scammer === 1 : false;

                    return resolve({ isBanned: isBptfBanned, content: banReason });
                })
                .catch((err: AxiosError) => {
                    if (err) {
                        if (this.showLog) log.warn('Failed to get data from backpack.tf');
                        return reject(filterAxiosError(err));
                    }
                });
        });
    }

    private isSteamRepMarked(): Promise<SiteResult> {
        return new Promise((resolve, reject) => {
            void axios({
                url: 'https://steamrep.com/api/beta4/reputation/' + this.steamID,
                params: {
                    json: 1
                }
            })
                .then(response => {
                    const isSteamRepBanned =
                        (response.data as SteamRep).steamrep.reputation?.summary.toLowerCase().indexOf('scammer') !==
                        -1;
                    const fullRepInfo = (response.data as SteamRep).steamrep.reputation?.full ?? '';

                    this._isSteamRepBanned = isSteamRepBanned;
                    return resolve({ isBanned: isSteamRepBanned, content: fullRepInfo });
                })
                .catch((err: AxiosError) => {
                    if (err) {
                        if (this.showLog) log.warn('Failed to get data from SteamRep');
                        if (this._isBptfSteamRepBanned !== null) {
                            return resolve({ isBanned: this._isBptfSteamRepBanned });
                        }

                        return reject(filterAxiosError(err));
                    }
                });
        });
    }

    private isMptfBanned(): Promise<SiteResult> {
        return new Promise((resolve, reject) => {
            if (!this.repOpt.checkMptfBanned) {
                return resolve({ isBanned: false });
            }

            if (this.bot.options.mptfApiKey === '') {
                return reject(new Error('Marketplace.tf API key was not set.'));
            }

            void axios({
                method: 'POST',
                url: 'https://marketplace.tf/api/Bans/GetUserBan/v2',
                headers: {
                    'User-Agent': 'TF2Autobot@' + process.env.BOT_VERSION
                },
                params: {
                    key: this.bot.options.mptfApiKey,
                    steamid: this.steamID
                }
            })
                .then(response => {
                    const results = (response.data as MptfGetUserBan)?.results;

                    if (!Array.isArray(results)) {
                        return reject(new Error('Marketplace.tf returned invalid data'));
                    }

                    const resultSize = results.length;
                    for (let i = 0; i < resultSize; i++) {
                        if (this.steamID === results[i].steamid) {
                            this._isMptfBanned = results[i].banned ?? false;

                            return resolve({
                                isBanned: results[i].banned ?? false,
                                content: results[i].ban?.type ?? ''
                            });
                        }
                    }

                    return resolve({ isBanned: false });
                })
                .catch((err: AxiosError) => {
                    if (err) {
                        if (this.showLog) log.warn('Failed to get data from Marketplace.tf');
                        return reject(filterAxiosError(err));
                    }
                });
        });
    }

    private isListedUntrusted(): Promise<SiteResult> {
        return new Promise((resolve, reject) => {
            void axios({
                method: 'GET',
                url: 'https://raw.githubusercontent.com/TF2Autobot/untrusted-steam-ids/master/untrusted.min.json'
            })
                .then(response => {
                    const results = (response.data as UntrustedJson).steamids[this.steamID];

                    if (results === undefined) {
                        return resolve({ isBanned: false });
                    }

                    this._isCommunityBanned = true;
                    return resolve({
                        isBanned: true,
                        content: `Reason: ${results.reason} - Source: ${results.source}`
                    });
                })
                .catch((err: AxiosError) => {
                    if (err) {
                        if (this.showLog) log.warn('Failed to get data from Github');
                        return reject(filterAxiosError(err));
                    }
                });
        });
    }
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
