import path from 'path';
import fs from 'fs';

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

function generatePollDataPath(steamAccountName: string, increment: number) {
    return path.join(__dirname, `../../files/${steamAccountName}/polldata${increment > 0 ? increment : ''}.json`);
}

export default function genPaths(steamAccountName: string): Paths {
    let increment = 0;
    let pollDataPath = generatePollDataPath(steamAccountName, increment);

    // TODO: Make max file size configurable (?)
    while (fs.existsSync(pollDataPath) && fs.statSync(pollDataPath).size / (1024 * 1024) > 5) {
        pollDataPath = generatePollDataPath(steamAccountName, ++increment);
    }

    return {
        files: {
            loginKey: path.join(__dirname, `../../files/${steamAccountName}/loginkey.txt`),
            pollData: pollDataPath,
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
