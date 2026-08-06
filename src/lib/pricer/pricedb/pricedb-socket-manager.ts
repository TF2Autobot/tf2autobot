import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';
import log from '../../logger';

export default class PriceDbSocketManager extends EventEmitter {
    private socket: Socket | null = null;

    private reconnectAttempts = 0;

    private maxReconnectAttempts = 5;

    private reconnectDelay = 1000;

    public isConnecting = false;

    constructor(private url: string = 'ws://ws.pricedb.io/') {
        super();
    }

    init(reconnect = false): void {
        if (this.socket) {
            this.shutdown(reconnect);
        }

        this.socket = io(this.url, {
            forceNew: true,
            transports: ['websocket'],
            timeout: 10000,
            autoConnect: false,
            reconnection: false // We'll handle reconnection manually
        });

        this.socket.on('connect', () => {
            log.debug('✅ Connected to PriceDB WebSocket');
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            this.emit('connected');
        });

        this.socket.on('disconnect', reason => {
            log.debug(`Disconnected from PriceDB WebSocket: ${reason}`);
            this.isConnecting = false;
            this.emit('disconnected', reason);
            this.handleReconnect();
        });

        this.socket.on('connect_error', error => {
            log.warn('PriceDB WebSocket connection error:', error);
            this.isConnecting = false;
            this.handleReconnect();
        });

        this.socket.on('price', data => {
            this.emit('price', data);
        });
    }

    connect(): void {
        if (this.socket && this.socket.connected) {
            log.debug('PriceDB socket already connected');
            return;
        }

        this.isConnecting = true;
        log.debug('Connecting to PriceDB WebSocket...');

        this.socket.connect();
    }

    private handleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            log.error('Max reconnection attempts reached for PriceDB WebSocket');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        log.debug(
            `Attempting to reconnect to PriceDB WebSocket in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
        );

        setTimeout(() => {
            this.init(true);
            this.connect();
        }, delay);
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = undefined;
        }
        this.isConnecting = false;
        this.reconnectAttempts = 0;
    }

    shutdown(reconnect = false): void {
        this.disconnect();
        if (!reconnect) this.removeAllListeners(); // not while reconnecting
    }
}
