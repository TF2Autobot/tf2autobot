import ReconnectingWebSocket from 'reconnecting-websocket';
import log from '../../lib/logger';
import WS from 'ws';
import PricesTfApi2 from './apis/pricer-tf-api2';
import * as Events from 'reconnecting-websocket/events';

export default class PricesTfApi2SocketManager {
    private readonly socketClass;

    constructor(private api: PricesTfApi2) {
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
            log.debug('Disconnected from socket server');
        };
    }

    private socketUnauthorized() {
        return () => {
            log.warn('Failed to authenticate with socket server', {});
        };
    }

    private socketAuthenticated() {
        return () => {
            log.debug('Authenticated with socket server');
        };
    }

    private socketConnect() {
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
                this.ws.close();
                void this.api
                    .setupToken()
                    .then(() => this.ws.reconnect())
                    .catch(err => {
                        this.ws.reconnect();
                        this.socketUnauthorized();
                        throw err;
                    });
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
