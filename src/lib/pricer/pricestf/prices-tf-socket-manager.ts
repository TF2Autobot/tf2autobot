import ReconnectingWebSocket from 'reconnecting-websocket';
import log from '../../../lib/logger';
import WS from 'ws';
import * as Events from 'reconnecting-websocket/events';
import PricesTfApi from './prices-tf-api';
import { exponentialBackoff } from '../../helpers';

export default class PricesTfSocketManager {
    private readonly socketClass;

    private retrySetupTokenTimeout: NodeJS.Timeout;

    private retryAttempts = -1;

    constructor(private api: PricesTfApi) {
        // https://stackoverflow.com/questions/28784375/nested-es6-classes
        this.socketClass = class WebSocket extends WS {
            constructor(url: string, protocols: string | string[]) {
                super(url, protocols, {
                    headers: {
                        Authorization: 'Bearer ' + api.token
                    }
                });
            }
        };
    }

    private ws: ReconnectingWebSocket;

    private socketDisconnected(): () => void {
        return () => {
            log.debug('Disconnected from socket server');
        };
    }

    private socketConnect(): () => void {
        return () => {
            log.debug('Connected to socket server');
        };
    }

    init(): void {
        this.shutDown();
        this.ws = new ReconnectingWebSocket('wss://ws.prices.tf', [], {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            WebSocket: this.socketClass,
            maxEnqueuedMessages: 0,
            startClosed: true
        });

        this.ws.addEventListener('open', this.socketConnect());

        this.ws.addEventListener('error', err => {
            if (err.message === 'Unexpected server response: 401') {
                log.debug('JWT expired');
                this.setupToken();
            } else {
                log.error('Websocket error', err?.error);
            }
        });

        this.ws.addEventListener('close', this.socketDisconnected());
    }

    private setupToken(): void {
        void this.api
            .setupToken()
            .then(() => {
                if (!this.isConnecting) {
                    this.ws.reconnect();
                }
                this.retryAttempts = -1;
            })
            .catch(err => {
                log.error('Websocket error - setupToken():', err);
                this.retrySetupToken();
            });
    }

    private retrySetupToken(): void {
        this.retryAttempts++;
        log.debug(`Retry reconnect attempt ${this.retryAttempts + 1}`);
        clearTimeout(this.retrySetupTokenTimeout);
        this.retrySetupTokenTimeout = setTimeout(() => this.setupToken(), exponentialBackoff(this.retryAttempts));
    }

    get isConnecting(): boolean {
        return this.ws.readyState === WS.CONNECTING;
    }

    connect(): void {
        this.ws.reconnect();
    }

    shutDown(): void {
        if (this.ws) {
            // Why no removeAllEventListener ws? :(
            this.ws.close();
            this.ws = undefined;
        }
    }

    send(data: string): void {
        this.ws.send(data);
    }

    on<T extends keyof Events.WebSocketEventListenerMap>(name: T, handler: Events.WebSocketEventListenerMap[T]): void {
        this.ws.addEventListener(name, handler);
    }
}
