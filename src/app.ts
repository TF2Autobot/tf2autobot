// TODO: Update version for each release
process.env.BOT_VERSION = '1.5.3';

import fs from 'fs';
import path from 'path';

if (!fs.existsSync(path.join(__dirname, '../node_modules'))) {
    /* eslint-disable-next-line no-console */
    console.error('Missing dependencies! Install them using `npm install`');
    process.exit(1);
}

import pjson from 'pjson';

if (process.env.BOT_VERSION !== pjson.version) {
    /* eslint-disable-next-line no-console */
    console.error('You have a newer version on disk! Compile the code using `tsc`');
    process.exit(1);
}

import 'bluebird-global';

import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

import log from './lib/logger';

if (process.env.pm_id === undefined) {
    log.warn(
        "You are not running the bot with PM2! If the bot crashes it won't start again, see the documentation: https://github.com/idinium96/tf2autobot/wiki/e.-Running-with-PM2"
    );
}

import SchemaManager from 'tf2-schema';
import { getSchema } from './lib/ptf-api';

// Make the schema manager request the schema from PricesTF

/* eslint-disable-next-line @typescript-eslint/unbound-method */
SchemaManager.prototype.getSchema = function(callback): void {
    getSchema()
        .then(schema => {
            this.setSchema(schema, true);
            callback(null, this.schema);
        })
        .catch(function(err) {
            callback(err);
        });
};

import BotManager from './classes/BotManager';

const botManager = new BotManager();

import ON_DEATH from 'death';

// @ts-ignore
// This error is a false positive.
// The signal and err are being created dynamically.
// Treat them as any for now.
ON_DEATH({ uncaughtException: true })(function(signal, err) {
    const crashed = typeof err !== 'string';

    if (crashed) {
        if (err.statusCode >= 500 || err.statusCode === 429) {
            delete err.body;
        }

        const botReady = botManager.isBotReady();

        log.error(
            [
                'tf2autobot' +
                    (!botReady
                        ? ' failed to start properly, this is most likely a temporary error. See the log:'
                        : ' crashed! Please create an issue with the following log:'),
                `package.version: ${process.env.BOT_VERSION || undefined}; node: ${process.version} ${
                    process.platform
                } ${process.arch}}`,
                'Stack trace:',
                require('util').inspect(err)
            ].join('\r\n')
        );

        if (botReady) {
            log.error(
                'Create an issue here: https://github.com/idinium96/tf2autobot/issues/new?assignees=&labels=bug&template=bug_report.md&title='
            );
        }
    } else {
        log.warn('Received kill signal `' + signal + '`');
    }

    botManager.stop(crashed ? err : null, true, signal === 'SIGKILL');
});

process.on('message', function(message) {
    if (message === 'shutdown') {
        log.warn('Process received shutdown message, stopping...');

        botManager.stop(null, true, false);
    } else {
        log.warn('Process received unknown message `' + message + '`');
    }
});

import EconItem from 'steam-tradeoffer-manager/lib/classes/EconItem.js';
import CEconItem from 'steamcommunity/classes/CEconItem.js';

['hasDescription', 'getAction', 'getTag', 'getSKU'].forEach(function(v) {
    EconItem.prototype[v] = require('./lib/extend/item/' + v);
    CEconItem.prototype[v] = require('./lib/extend/item/' + v);
});

import TradeOffer from 'steam-tradeoffer-manager/lib/classes/TradeOffer';

['log', 'summarize', 'getDiff', 'summarizeWithLink', 'summarizeSKU'].forEach(function(v) {
    TradeOffer.prototype[v] = require('./lib/extend/offer/' + v);
});

botManager.start().asCallback(function(err) {
    if (err) {
        throw err;
    }
});
