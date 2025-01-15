/* eslint @typescript-eslint/no-unsafe-call: 1 */
/* eslint @typescript-eslint/no-unsafe-member-access: 1 */
import { IPC } from 'node-ipc';
import log from '../lib/logger';
import Bot from './Bot';
import fs, { promises as fsp } from 'fs';
import path from 'path';
import Options, { getOptionsPath, JsonOptions, removeCliOptions } from './Options';
import generateCert from '../lib/tools/generateCert';
import { Entry, EntryData } from './Pricelist';
import { deepMerge } from '../lib/tools/deep-merge';
import validator from '../lib/validator';

interface Item extends Entry {
    statslink?: any;
    style?: any;
}

class IPCMessage {
    constructor(private readonly success: boolean, private readonly data: unknown) {}
}

export default class ipcHandler extends IPC {
    private ourServer: Client;

    private bot: Bot;

    private options: Options;

    private privateKey?: string;

    private publicKey?: string;

    private serverCert?: string;

    private caCert?: string;

    constructor(bot: Bot) {
        super();
        this.server = null;
        this.bot = bot;
        this.options = bot.options;
        if (this.options.tls) {
            this.publicKey = path.join(__dirname, `../../files/${this.bot.options.steamAccountName}/client.pub`);
            this.privateKey = path.join(__dirname, `../../files/${this.bot.options.steamAccountName}/client.key`);
            this.serverCert = path.join(__dirname, `../../files/${this.bot.options.steamAccountName}/server.pem`);
            this.caCert = path.join(__dirname, `../../files/${this.bot.options.steamAccountName}/ca.pem`);
        }
    }

    init(): void {
        this.config.id = this.bot.client.steamID.getSteamID64();
        this.config.retry = 15000;
        this.config.silent = true;

        if (this.options.tls) {
            this.config.networkHost = this.options.tlsHost;
            this.config.networkPort = this.options.tlsPort;
            if (!fs.existsSync(this.publicKey) || !fs.existsSync(this.privateKey)) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const { certificate, privateKey } = generateCert();
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                fs.writeFileSync(this.publicKey, certificate);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                fs.writeFileSync(this.privateKey, privateKey);
            }

            if (!fs.existsSync(this.serverCert) || !fs.existsSync(this.caCert)) {
                log.error('Servers public key not found');
                throw new Error('Servers public key not found');
            }
            this.config.tls = {
                private: this.privateKey,
                public: this.publicKey,
                trustedConnections: this.serverCert,
                ca: fs.readFileSync(this.caCert)
            } as Record<string, unknown>; //Ignore TS once again
        }

        // eslint-disable-next-line
        const onConnected = () => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
            this.ourServer = this.of.autobot_gui;
            log.debug('connected IPC');

            //bind handlers
            this.ourServer.on('connect', this.connected.bind(this));
            this.ourServer.on('getInfo', this.sendInfo.bind(this));
            this.ourServer.on('disconnected', this.disconnected.bind(this));
            this.ourServer.on('addItem', this.addItem.bind(this));
            this.ourServer.on('haltBot', this.onHaltBot.bind(this));
            this.ourServer.on('getHaltStatus', this.onGetHaltStatus.bind(this));
            this.ourServer.on('updateItem', this.updateItem.bind(this));
            this.ourServer.on('removeItem', this.removeItem.bind(this));
            this.ourServer.on('getKeyPrices', this.sendKeyPrices.bind(this));
            this.ourServer.on('getPricelist', this.sendPricelist.bind(this));
            this.ourServer.on('getTrades', this.sendTrades.bind(this));
            this.ourServer.on('getInventory', this.sendInventory.bind(this));
            this.ourServer.on('getUserInventory', this.sendUserInventory.bind(this));
            this.ourServer.on('sendChat', this.sendChat.bind(this));
            this.ourServer.on('getOptions', this.sendOptions.bind(this));
            this.ourServer.on('updateOptions', this.updateOptions.bind(this));
        };
        this[this.options.tls ? 'connectToNet' : 'connectTo']('autobot_gui', onConnected);
    }

    private static cleanItem(item: Item): void {
        if (item?.name) delete item.name;
        if (item?.time) delete item.time;
        if (item?.statslink) delete item.statslink;
        if (item?.style) delete item.style;
    }

    /* HANDLERS */
    private onHaltBot(halt: boolean): void {
        try {
            if (this.bot.isHalted && halt) {
                this.onGetHaltStatus();
                return;
            }
            if (halt) {
                this.bot
                    .halt()
                    .then(removeAllListingsFailed => {
                        if (removeAllListingsFailed) {
                            this.ourServer.emit('haltStatus', new IPCMessage(false, 'Failed to remove all listings'));
                        } else {
                            this.onGetHaltStatus();
                        }
                    })
                    .catch((e: Error) => {
                        this.ourServer.emit('haltStatus', new IPCMessage(false, e.message));
                    });
            } else {
                this.bot
                    .unhalt()
                    .then(recreatedListingsFailed => {
                        if (recreatedListingsFailed) {
                            this.ourServer.emit('haltStatus', new IPCMessage(false, 'Failed to relist all listings'));
                        } else {
                            this.onGetHaltStatus();
                        }
                    })
                    .catch((e: Error) => {
                        this.ourServer.emit('haltStatus', new IPCMessage(false, e.message));
                    });
            }
        } catch (error: unknown) {
            let message: unknown;
            if (error instanceof Error) {
                message = error.message;
            } else message = String(error);
            this.ourServer.emit('haltStatus', new IPCMessage(false, message));
        }
    }

    private onGetHaltStatus(): void {
        const haltStatus = this.bot.isHalted;
        this.ourServer.emit('haltStatus', new IPCMessage(true, haltStatus));
    }

    private addItem(item: Item): void {
        ipcHandler.cleanItem(item);

        let priceKey: string = undefined;
        if (item.id) {
            priceKey = item.id;
        }
        priceKey = priceKey ? priceKey : item.sku;
        this.bot.pricelist
            .addPrice({ entryData: item as EntryData, emitChange: true })
            .then(item => {
                const result = Object.assign(item, priceKey === item.sku ? {} : { id: priceKey });
                this.ourServer.emit('itemAdded', new IPCMessage(true, result));
            })
            .catch((e: Error) => {
                this.ourServer.emit('itemAdded', new IPCMessage(false, e.message));
            });
    }

    private updateItem(item: Item): void {
        ipcHandler.cleanItem(item);

        let priceKey: string = undefined;
        if (item.id) {
            priceKey = item.id;
        }
        priceKey = priceKey ? priceKey : item.sku;
        this.bot.pricelist
            .updatePrice({ priceKey, entryData: item as EntryData, emitChange: true })
            .then(item => {
                const result = Object.assign(item, priceKey === item.sku ? {} : { id: priceKey });
                this.ourServer.emit('itemUpdated', new IPCMessage(true, result));
            })
            .catch((e: Error) => {
                this.ourServer.emit('itemUpdated', new IPCMessage(false, e.message));
            });
    }

    private removeItem(priceKey: string): void {
        this.bot.pricelist
            .removePrice(priceKey, true)
            .then(item => {
                const result = Object.assign(item, priceKey === item.sku ? {} : { id: priceKey });
                this.ourServer.emit('itemRemoved', new IPCMessage(true, result));
            })
            .catch((e: Error) => {
                this.ourServer.emit('itemRemoved', new IPCMessage(false, e.message));
            });
    }

    private connected(): void {
        log.info('IPC connected');
    }

    private disconnected(): void {
        log.warn('IPC disconnect');
    }

    private sendInfo(): void {
        try {
            const data = {
                id: this.bot.client.steamID.getSteamID64(),
                admins: this.bot.getAdmins.map(id => id.getSteamID64()),
                name: this.bot.options.steamAccountName
            };
            this.ourServer.emit('info', new IPCMessage(true, data));
        } catch (error: unknown) {
            let message: unknown;
            if (error instanceof Error) {
                message = error.message;
            } else message = String(error);
            this.ourServer.emit('info', new IPCMessage(false, message));
        }
    }

    private sendKeyPrices(): void {
        const keyPrices = this.bot.pricelist.getKeyPrices;
        if (keyPrices) {
            this.ourServer.emit('keyPrices', new IPCMessage(true, keyPrices));
        } else {
            this.ourServer.emit('keyPrices', new IPCMessage(false, 'Key prices not available'));
        }
    }

    sendPricelist(): void {
        const pricelist = this.bot.pricelist.getPrices;
        if (pricelist) {
            const pricelistMapped = Object.keys(pricelist).map(key => {
                const item = pricelist[key];
                if (item.sku !== key) {
                    return Object.assign(item, { id: key });
                } else {
                    return item;
                }
            });
            this.ourServer.emit('pricelist', new IPCMessage(true, pricelistMapped));
        } else {
            this.ourServer.emit('pricelist', new IPCMessage(false, 'Price list not available'));
        }
    }

    sendTrades(): void {
        const pollData = this.bot.manager.pollData;
        if (pollData) {
            this.ourServer.emit('polldata', new IPCMessage(true, pollData));
        } else {
            this.ourServer.emit('polldata', new IPCMessage(false, 'Poll data not available'));
        }
    }

    private sendChat(message: string): void {
        this.bot.handler
            .onMessage(this.bot.getAdmins[0], message, false)
            .then(msg => {
                this.ourServer.emit('chatResp', new IPCMessage(true, msg));
            })
            .catch((e: Error) => {
                this.ourServer.emit('chatResp', new IPCMessage(false, e.message));
            });
    }

    sendInventory(): void {
        const items = this.bot.inventoryManager.getInventory.getItems;
        if (items) {
            this.ourServer.emit('inventory', new IPCMessage(true, items));
        } else {
            this.ourServer.emit('inventory', new IPCMessage(false, 'Inventory not available'));
        }
    }

    sendUserInventory(id: string): void {
        const inv = new Inventory(id, this.bot, 'their', this.bot.boundInventoryGetter);
        inv.fetch()
            .then(() => {
                const theirInventoryItems = inv.getItems;
                this.ourServer.emit('userInventory', new IPCMessage(true, theirInventoryItems));
            })
            .catch((e: Error) => {
                this.ourServer.emit('userInventory', new IPCMessage(false, e.message));
            });
    }

    sendOptions(): void {
        try {
            const saveOptions = deepMerge({}, this.bot.options) as JsonOptions;
            removeCliOptions(saveOptions);

            this.ourServer.emit('options', new IPCMessage(true, saveOptions));
        } catch (error: unknown) {
            let message: unknown;
            if (error instanceof Error) {
                message = error.message;
            } else message = String(error);
            this.ourServer.emit('options', new IPCMessage(false, message));
        }
    }

    updateOptions(newOptions): void {
        const opt = this.bot.options;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const errors = validator(newOptions, 'options');
        if (errors !== null) {
            const msg = '❌ Error updating options: ' + errors.join(', ');
            this.ourServer.emit('optionsUpdated', new IPCMessage(false, msg));
            return;
        }
        const optionsPath = getOptionsPath(opt.steamAccountName);
        fsp.writeFile(optionsPath, JSON.stringify(newOptions, null, 4), { encoding: 'utf8' })
            .then(() => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                deepMerge(opt, newOptions);
                const msg = '✅ Updated options!';

                this.ourServer.emit('optionsUpdated', new IPCMessage(true, msg));
            })
            .catch(err => {
                const errStringify = JSON.stringify(err);
                const errMessage = errStringify === '' ? (err as Error)?.message : errStringify;
                const msg = `❌ Error saving options file to disk: ${errMessage}`;
                this.ourServer.emit('optionsUpdated', new IPCMessage(false, msg));
                return;
            });
    }
}

import { Socket } from 'net';
import Inventory from './Inventory';

interface Client {
    /**
     * triggered when a JSON message is received. The event name will be the type string from your message
     * and the param will be the data object from your message eg : \{ type:'myEvent',data:\{a:1\}\}
     */
    on(event: string, callback: (...args: any[]) => void): Client;

    /**
     * triggered when an error has occured
     */
    on(event: 'error', callback: (err: any) => void): Client;

    /**
     * connect - triggered when socket connected
     * disconnect - triggered by client when socket has disconnected from server
     * destroy - triggered when socket has been totally destroyed, no further auto retries will happen and all references are gone
     */
    on(event: 'connect' | 'disconnect' | 'destroy', callback: () => void): Client;

    /**
     * triggered by server when a client socket has disconnected
     */
    on(event: 'socket.disconnected', callback: (socket: Socket, destroyedSocketID: string) => void): Client;

    /**
     * triggered when ipc.config.rawBuffer is true and a message is received
     */
    on(event: 'data', callback: (buffer: Buffer) => void): Client;

    emit(event: string, value?: any): Client;

    /**
     * Unbind subscribed events
     */
    off(event: string, handler: any): Client;
}
