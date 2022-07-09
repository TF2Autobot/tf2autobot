import io, { Socket } from 'socket.io-client';
import log from '../../../lib/logger';

export default class CustomPricerSocketManager {
    public socket: Socket;

    constructor(public url: string, public key?: string) {}

    private socketDisconnected(): (reason: string) => void {
        return reason => {
            log.debug('Disconnected from socket server', { reason: reason });

            if (reason === 'io server disconnect') {
                if (!this.isConnecting) {
                    this.socket.connect();
                }
            }
        };
    }

    private socketAuthenticated(): () => void {
        return () => {
            log.debug('Authenticated with socket server');
        };
    }

    private socketConnect(): () => void {
        return () => {
            log.debug('Connected to socket server');
        };
    }

    init(): void {
        this.shutDown();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-assignment
        this.socket = io(this.url, {
            forceNew: true,
            autoConnect: false,
            auth: {
                token: this.key
            }
        });

        this.socket.on('connect', this.socketConnect());

        this.socket.on('authenticated', this.socketAuthenticated());

        this.socket.on('disconnect', this.socketDisconnected());

        this.socket.on('ratelimit', (rateLimit: { limit: number; remaining: number; reset: number }) => {
            log.debug(`ptf quota: ${JSON.stringify(rateLimit)}`);
        });

        this.socket.on('blocked', (blocked: { expire: number }) => {
            log.warn(`Socket blocked. Expires in ${blocked.expire}`);
        });

        this.socket.on('connect_error', err => {
            log.warn(`Couldn't connect to socket server`, err);
        });
    }

    get isConnecting(): boolean {
        return this.socket.active;
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
