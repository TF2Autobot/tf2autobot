import path from 'path';

interface FilePaths {
    loginKey: string;
    pollData: string;
    loginAttempts: string;
    pricelist: string;
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

export default function genPaths(folderName: string, filePrefix: string): Paths {
    return {
        files: {
            loginKey: path.join(__dirname, `../../files/${folderName}/loginkey.txt`),
            pollData: path.join(__dirname, `../../files/${folderName}/polldata.json`),
            loginAttempts: path.join(__dirname, `../../files/${folderName}/loginattempts.json`),
            pricelist: path.join(__dirname, `../../files/${folderName}/pricelist.json`)
        },
        logs: {
            log: path.join(__dirname, `../../logs/${filePrefix}-%DATE%.log`),
            trade: path.join(__dirname, `../../logs/${filePrefix}.trade.log`),
            error: path.join(__dirname, `../../logs/${filePrefix}.error.log`)
        }
    };
}
