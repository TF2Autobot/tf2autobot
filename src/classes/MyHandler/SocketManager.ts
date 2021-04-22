import io from 'socket.io-client';
import log from '@lib/logger';

export default class SocketManager {
    private socket: SocketIOClient.Socket;

    constructor(public url: string, public key?: string) {}

    private socketDisconnected() {
        return (reason: string) => {
            log.debug('Disconnected from socket server', { reason: reason });

            if (reason === 'io server disconnect') {
                this.socket.connect();
            }
        };
    }

    private socketUnauthorized() {
        return (err: Error) => {
            log.debug('Failed to authenticate with socket server', {
                error: err
            });
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
            this.socket.emit('authentication', this.key);
        };
    }

    init(): Promise<void> {
        return new Promise(resolve => {
            this.shutDown();
            this.socket = io(this.url, {
                forceNew: true,
                autoConnect: false
            });
            this.socket.on('connect', this.socketConnect());

            this.socket.on('authenticated', this.socketAuthenticated());

            this.socket.on('unauthorized', this.socketUnauthorized());

            this.socket.on('disconnect', this.socketDisconnected());

            this.socket.on('ratelimit', (rateLimit: { limit: number; remaining: number; reset: number }) => {
                log.debug(`ptf quota: ${JSON.stringify(rateLimit)}`);
            });

            this.socket.on('blocked', (blocked: { expire: number }) => {
                log.warn(`Socket blocked. Expires in ${blocked.expire}`);
            });

            resolve(undefined);
        });
    }

    connect(): void {
        this.socket.connect();
    }

    shutDown(): void {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = undefined;
        }
    }

    on(name: string, handler: OmitThisParameter<(T: any) => void>): void {
        this.socket.on(name, handler);
    }
}
