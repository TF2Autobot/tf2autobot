/* eslint @typescript-eslint/no-unsafe-call: 1 */
/* eslint @typescript-eslint/no-unsafe-member-access: 1 */
import { IPC } from 'node-ipc';
const ipc = new IPC();
import log from '../lib/logger';
import Bot from './Bot';
export default class ipcHandler {
    ipc: any;

    bot: Bot;

    constructor(bot: Bot) {
        this.ipc = null;
        this.bot = bot;
    }

    init(): void {
        ipc.config.id = this.bot.client.steamID.getSteamID64();
        ipc.config.retry = 15000;
        ipc.config.silent = true;

        // eslint-disable-next-line
        ipc.connectTo('autobot_gui_dev', () => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
            this.ipc = ipc.of.autobot_gui_dev;
            log.debug('connected IPC');
            // eslint-disable-next-line @typescript-eslint/no-for-in-array
            Object.getOwnPropertyNames(Object.getPrototypeOf(this)).forEach(message => {
                if (typeof this[message] == 'function' && !['init', 'constructor'].includes(message)) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
                    this.ipc.on(message, this[message].bind(this));
                }
            });
        });
    }

    disconnect(): void {
        log.debug('IPC disconnect');
    }

    getInfo(): void {
        this.ipc.emit('info', {
            id: this.bot.client.steamID.getSteamID64()
        });
    }

    getPricelist(): void {
        this.ipc.emit('pricelist', this.bot.pricelist.getPrices);
    }
}
