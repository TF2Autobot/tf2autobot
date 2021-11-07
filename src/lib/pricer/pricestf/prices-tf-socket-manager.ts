import ReconnectingWebSocket from 'reconnecting-websocket';
import log from '../../../lib/logger';
import WS from 'ws';
import * as Events from 'reconnecting-websocket/events';
import PricesTfApi from './prices-tf-api';
import logger from '../../../lib/logger';

export default class PricesTfSocketManager {
    private readonly socketClass;

    private announceConnectionStatus = true;

    constructor(private api: PricesTfApi) {
        // https://stackoverflow.com/questions/28784375/nested-es6-classes
        this.socketClass = class WebSocket extends WS {
            constructor(url, protocols) {
                super(url, protocols, {
                    headers: {
                        Authorization: 'Bearer ' + api.token
                    }
                });
            }
        };
    }

    private ws: ReconnectingWebSocket;

    private socketDisconnected() {
        return () => {
            if (this.announceConnectionStatus) {
                log.debug('Disconnected from socket server');
            }
        };
    }

    private socketUnauthorized() {
        return () => {
            log.warn('Failed to authenticate with socket server', {});
        };
    }

    private socketConnect() {
        return () => {
            if (this.announceConnectionStatus) {
                log.debug('Connected to socket server');
            } else {
                // plan to announce status once we've reconnected
                this.announceConnectionStatus = true;
            }
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
            // our most common error is 401, so we don't announce all the socket action
            if (err.message === 'Unexpected server response: 401') {
                this.announceConnectionStatus = false;
                this.ws.close();
                void this.api
                    .setupToken()
                    .then(() => {
                        this.ws.reconnect();
                    })
                    .catch(e => {
                        this.announceConnectionStatus = true; // looks like we are in a bad state so enable the announcement
                        this.ws.reconnect();
                        this.socketUnauthorized();
                        logger.error('Error in prices.tf socket manager', e);
                    });
            } else {
                // if we got here then we got a error, announce the disconnect and allow status logging
                this.announceConnectionStatus = true;
                logger.error('Error in prices.tf socket manager', err);
            }
        });

        this.ws.addEventListener('close', this.socketDisconnected());
    }

    connect(): void {
        this.ws.reconnect();
    }

    shutDown(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = undefined;
        }
    }

    on<T extends keyof Events.WebSocketEventListenerMap>(name: T, handler: Events.WebSocketEventListenerMap[T]): void {
        this.ws.addEventListener(name, handler);
    }
}
