/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import ReconnectingWebSocket from 'reconnecting-websocket';
import request from 'request';
import WS from 'ws';
import log from '../../lib/logger';

let token = '';

class WebSocket extends WS {
    constructor(url, protocols) {
        super(url, protocols, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
    }
}

export default class SocketManager {
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

    init(): Promise<void> {
        return new Promise(resolve => {
            this.shutDown();

            this.ws = new ReconnectingWebSocket('wss://ws.prices.tf', [], {
                WebSocket,
                maxEnqueuedMessages: 0,
                startClosed: true
            });

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
            this.ws.addEventListener('open', this.socketConnect());

            this.ws.addEventListener('error', this.socketUnauthorized());

            this.ws.addEventListener('close', this.socketDisconnected());

            this.ws.addEventListener('error', err => {
                if (err.message === 'Unexpected server response: 401') {
                    log.debug('WS JWT expired');
                    this.ws.close();

                    request(
                        {
                            method: 'POST',
                            url: 'https://api2.prices.tf/auth/access',
                            json: true
                        },
                        (err, response, body) => {
                            if (err) {
                                this.ws.reconnect();
                                throw err;
                            }

                            log.debug('Got new access token for WS');
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            token = body.accessToken;
                            this.ws.reconnect();
                        }
                    );
                }
            });

            resolve(undefined);
        });
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

    on(name: string, handler: OmitThisParameter<(T: any) => void>): void {
        this.ws.addEventListener('message', handler);
    }
}
