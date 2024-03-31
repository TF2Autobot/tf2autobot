import path from 'path';
import fs from 'fs';

interface FilePaths {
    refreshToken: string;
    pollData: string;
    loginAttempts: string;
    pricelist: string;
    blockedList: string;
    dir: string;
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

function generatePollDataPath(steamAccountName: string, increment: number) {
    return path.join(__dirname, `../../files/${steamAccountName}/polldata${increment > 0 ? increment : ''}.json`);
}

export default function genPaths(steamAccountName: string, maxPollDataSizeMB = 5): Paths {
    let increment = 0;
    let pollDataPath = generatePollDataPath(steamAccountName, increment);

    while (fs.existsSync(pollDataPath) && fs.statSync(pollDataPath).size / (1024 * 1024) > maxPollDataSizeMB) {
        pollDataPath = generatePollDataPath(steamAccountName, ++increment);
    }

    return {
        files: {
            refreshToken: path.join(__dirname, `../../files/${steamAccountName}/refreshToken.txt`),
            pollData: pollDataPath,
            loginAttempts: path.join(__dirname, `../../files/${steamAccountName}/loginattempts.json`),
            pricelist: path.join(__dirname, `../../files/${steamAccountName}/pricelist.json`),
            blockedList: path.join(__dirname, `../../files/${steamAccountName}/blockedList.json`),
            dir: path.join(__dirname, `../../files/${steamAccountName}/`)
        },
        logs: {
            log: path.join(__dirname, `../../logs/${steamAccountName}-%DATE%.log`),
            trade: path.join(__dirname, `../../logs/${steamAccountName}.trade.log`),
            error: path.join(__dirname, `../../logs/${steamAccountName}.error.log`)
        }
    };
}
