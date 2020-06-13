import path from 'path';

const folderName = process.env.FOLDER_NAME || process.env.STEAM_ACCOUNT_NAME;
const filePrefix = process.env.FILE_PREFIX || process.env.STEAM_ACCOUNT_NAME;

export = {
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
