import path from 'path';

interface FilePaths {
    loginKey: string;
    pollData: string;
    loginAttempts: string;
    pricelist: string;
    blockedList: string;
}

interface LogPaths {
    log: string;
    trade: string;
    error: string;
}

export interface Paths {
    files: FilePaths;
    logs: LogPaths;
}

export default function genPaths(steamAccountName: string): Paths {
    return {
        files: {
            loginKey: path.join(__dirname, `../../files/${steamAccountName}/loginkey.txt`),
            pollData: path.join(__dirname, `../../files/${steamAccountName}/polldata.json`),
            loginAttempts: path.join(__dirname, `../../files/${steamAccountName}/loginattempts.json`),
            pricelist: path.join(__dirname, `../../files/${steamAccountName}/pricelist.json`),
            blockedList: path.join(__dirname, `../../files/${steamAccountName}/blockedList.json`)
        },
        logs: {
            log: path.join(__dirname, `../../logs/${steamAccountName}-%DATE%.log`),
            trade: path.join(__dirname, `../../logs/${steamAccountName}.trade.log`),
            error: path.join(__dirname, `../../logs/${steamAccountName}.error.log`)
        }
    };
}
