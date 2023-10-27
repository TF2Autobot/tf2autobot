try {
    // only installed in dev mode
    // eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
    const { bootstrap } = require('global-agent');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    bootstrap();
} catch (e) {
    // no worries
}
import 'module-alias/register';
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
const { version: BOT_VERSION } = require('../package.json');
import { getPricer } from './lib/pricer/pricer';
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

if (process.env.pm_id === undefined && process.env.DOCKER === undefined) {
    log.warn(
        "You are not running the bot with PM2! If the bot crashes it won't start again." +
            ' Get a VPS and run your bot with PM2: https://github.com/TF2Autobot/tf2autobot/wiki/Getting-a-VPS'
    );
}

if (process.env.DOCKER !== undefined) {
    log.warn(
        'You are running the bot with Docker! If the bot crashes, it will start again only if you run the container with --restart=always'
    );
}

import BotManager from './classes/BotManager';
const botManager = new BotManager(
    getPricer({
        pricerUrl: options.customPricerUrl,
        pricerApiToken: options.customPricerApiToken
    })
);

import ON_DEATH from 'death';
import * as inspect from 'util';
import { Webhook } from './classes/DiscordWebhook/interfaces';
import axios, { AxiosError } from 'axios';
import { uptime } from './lib/tools/time';
import filterAxiosError from '@tf2autobot/filter-axios-error';

ON_DEATH({ uncaughtException: true })((signalOrErr, origin: string | Error) => {
    const crashed = !['SIGINT', 'SIGTERM'].includes(signalOrErr as 'SIGINT' | 'SIGTERM' | 'SIGQUIT');

    // finds error in case signal is uncaughtException
    const error = origin instanceof Error ? origin : signalOrErr instanceof Error ? signalOrErr : undefined;
    const message =
        typeof origin === 'string' ? origin : typeof signalOrErr === 'string' ? origin.message : signalOrErr.message;
    if (crashed && error) {
        const botReady = botManager.isBotReady;

        const stackTrace = inspect.inspect(error);

        if (stackTrace.includes('Error: Not allowed')) {
            log.error('Not Allowed');
            return botManager.stop(error, true, true);
        }

        const errorMessage = [
            'TF2Autobot' +
                (!botReady
                    ? ' failed to start properly, this is most likely a temporary error. See the log:'
                    : ' crashed! Please create an issue with the following log:'),
            `package.version: ${process.env.BOT_VERSION || undefined}; node: ${process.version} ${process.platform} ${
                process.arch
            }}`,
            'Stack trace:',
            stackTrace,
            `${uptime()}`
        ].join('\r\n');

        log.error(errorMessage);

        if (options.discordWebhook.sendAlert.enable && options.discordWebhook.sendAlert.url.main !== '') {
            const optDW = options.discordWebhook;
            const sendAlertWebhook: Webhook = {
                username: optDW.displayName ? optDW.displayName : 'Your beloved bot',
                avatar_url: optDW.avatarURL ? optDW.avatarURL : '',
                content:
                    optDW.sendAlert.isMention && optDW.ownerID.length > 0
                        ? optDW.ownerID.map(id => `<@!${id}>`).join(', ')
                        : '',
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

            void axios({
                method: 'POST',
                url: optDW.sendAlert.url.main,
                data: sendAlertWebhook // axios should automatically set Content-Type header to application/json
            }).catch((err: AxiosError) => {
                log.error('Error sending webhook on crash', filterAxiosError(err));
            });
        }

        if (botReady) {
            log.error(
                'Refer to Wiki here: https://github.com/TF2Autobot/tf2autobot/wiki/Common-Errors OR ' +
                    'Create an issue here: https://github.com/idinium96/TF2Autobot/issues/new?assignees=&labels=bug&template=bug_report.md&title='
            );
        }
    } else {
        log.warn('Received kill signal `' + message + '`');
    }

    botManager.stop(crashed ? error : null, true, false);
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
        /*eslint-disable */
        if (err.response || err.name === 'AxiosError') {
            // if it's Axios error, filter the error

            const e = new Error(err.message);

            e['code'] = err.code;
            e['status'] = err.response?.status ?? err.status;
            e['method'] = err.config?.method ?? err.method;
            e['url'] = err.config?.url?.replace(/\?.+/, '') ?? err.baseURL?.replace(/\?.+/, ''); // Ignore parameters

            if (typeof err.response?.data === 'string' && err.response?.data?.includes('<html>')) {
                throw e;
            }

            e['data'] = err.response?.data;

            throw e;
        }
        /*eslint-enable */

        throw err;
    }

    if (options.enableHttpApi) {
        void import('./classes/HttpManager').then(({ default: HttpManager }) => {
            const httpManager = new HttpManager(options);
            void httpManager.start().asCallback(err => {
                if (err) {
                    throw err;
                }
            });
        });
    }
});
