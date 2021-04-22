import 'module-alias/register';
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
const { version: BOT_VERSION } = require('../package.json');
import { getPricer } from '@pricer/pricer';
import Pricer, { GetPricerFn } from '@classes/Pricer';
import { loadOptions } from '@classes/Options';
import HttpManager from '@classes/HttpManager';

process.env.BOT_VERSION = BOT_VERSION as string;

import fs from 'fs';
import path from 'path';
import genPaths from '@resources/paths';

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

import log, { init } from '@lib/logger';
init(paths, options);

if (process.env.pm_id === undefined) {
    log.warn(
        "You are not running the bot with PM2! If the bot crashes it won't start again." +
            ' Get a VPS and run your bot with PM2: https://github.com/TF2Autobot/tf2autobot/wiki/Getting-a-VPS'
    );
}

import BotManager from './classes/BotManager';
function _getPricer(): Pricer {
    return (getPricer as GetPricerFn)({
        pricerUrl: options.customPricerUrl,
        pricerApiToken: options.customPricerApiToken
    });
}
const botManager = new BotManager(_getPricer());

import ON_DEATH from 'death';
import * as inspect from 'util';
import { Webhook } from '@DiscordWebhook/interfaces';
import { XMLHttpRequest } from 'xmlhttprequest-ts';
import { uptime } from '@tools/time';

ON_DEATH({ uncaughtException: true })((signalOrErr, origin) => {
    const crashed = !['SIGINT', 'SIGTERM'].includes(signalOrErr as 'SIGINT' | 'SIGTERM' | 'SIGQUIT');

    if (crashed) {
        const botReady = botManager.isBotReady;

        const errorMessage = [
            'TF2Autobot' +
                (!botReady
                    ? ' failed to start properly, this is most likely a temporary error. See the log:'
                    : ' crashed! Please create an issue with the following log:'),
            `package.version: ${process.env.BOT_VERSION || undefined}; node: ${process.version} ${process.platform} ${
                process.arch
            }}`,
            'Stack trace:',
            inspect.inspect(origin),
            `${uptime()}`
        ].join('\r\n');

        log.error(errorMessage);

        if (options.discordWebhook.sendAlert.enable && options.discordWebhook.sendAlert.url !== '') {
            const optDW = options.discordWebhook;
            const sendAlertWebhook: Webhook = {
                username: optDW.displayName ? optDW.displayName : 'Your beloved bot',
                avatar_url: optDW.avatarURL ? optDW.avatarURL : '',
                content: optDW.sendAlert.isMention ? `<@!${optDW.ownerID}>` : '',
                embeds: [
                    {
                        title: 'Bot crashed!',
                        description: errorMessage,
                        color: '16711680',
                        footer: {
                            text: `${String(new Date(Date.now()))} • v${process.env.BOT_VERSION}`
                        }
                    }
                ]
            };

            const request = new XMLHttpRequest();
            request.open('POST', optDW.sendAlert.url);
            request.setRequestHeader('Content-type', 'application/json');
            request.send(JSON.stringify(sendAlertWebhook));
        }

        if (botReady) {
            log.error(
                'Refer to Wiki here: https://github.com/TF2Autobot/tf2autobot/wiki/Common-Errors OR ' +
                    'Create an issue here: https://github.com/idinium96/TF2Autobot/issues/new?assignees=&labels=bug&template=bug_report.md&title='
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

    if (options.enableHttpApi) {
        const httpManager = new HttpManager(options);

        void httpManager.start().asCallback(err => {
            if (err) {
                throw err;
            }
        });
    }
});
