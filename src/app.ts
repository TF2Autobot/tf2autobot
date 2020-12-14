// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
const { version: BOT_VERSION } = require('../package.json');
import { loadOptions } from './classes/Options';

process.env.BOT_VERSION = BOT_VERSION as string;

import fs from 'fs';
import path from 'path';
import genPaths from './resources/paths';

if (!fs.existsSync(path.join(__dirname, '../node_modules'))) {
    /* eslint-disable-next-line no-console */
    console.error('Missing dependencies! Install them by running `npm install`');
    process.exit(1);
}

import pjson from 'pjson';

if (process.env.BOT_VERSION !== pjson.version) {
    /* eslint-disable-next-line no-console */
    console.error('You have a newer version on disk! Compile the code by running `npm run build`');
    process.exit(1);
}

import 'bluebird-global';

import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });
const options = loadOptions();
const paths = genPaths(options.steamAccountName);

import log, { init } from './lib/logger';
init(paths, options);

if (process.env.pm_id === undefined) {
    log.warn(
        "You are not running the bot with PM2! If the bot crashes it won't start again. Get a VPS and run your bot with PM2: https://github.com/idinium96/tf2autobot/wiki/Getting-a-VPS"
    );
}

import BotManager from './classes/BotManager';

const botManager = new BotManager();

import ON_DEATH from 'death';
import * as inspect from 'util';

ON_DEATH({ uncaughtException: true })((signalOrErr, origin) => {
    const crashed = signalOrErr !== 'SIGINT';

    if (crashed) {
        const botReady = botManager.isBotReady();

        log.error(
            [
                'TF2Autobot' +
                    (!botReady
                        ? ' failed to start properly, this is most likely a temporary error. See the log:'
                        : ' crashed! Please create an issue with the following log:'),
                `package.version: ${process.env.BOT_VERSION || undefined}; node: ${process.version} ${
                    process.platform
                } ${process.arch}}`,
                'Stack trace:',
                inspect.inspect(origin)
            ].join('\r\n')
        );

        if (botReady) {
            log.error(
                'Refer to Wiki here: https://github.com/idinium96/tf2autobot/wiki/Common-Errors OR Create an issue here: https://github.com/idinium96/tf2autobot/issues/new?assignees=&labels=bug&template=bug_report.md&title='
            );
        }
    } else {
        log.warn('Received kill signal `' + (signalOrErr as string) + '`');
    }

    botManager.stop(crashed ? (signalOrErr as Error) : null, true, false);
});

process.on('message', message => {
    if (message === 'shutdown') {
        log.warn('Process received shutdown message, stopping...');

        botManager.stop(null, true, false);
    } else {
        log.warn('Process received unknown message `' + (message as string) + '`');
    }
});

void botManager.start(options).asCallback(err => {
    if (err) {
        throw err;
    }
});
