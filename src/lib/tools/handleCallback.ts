import log from '../logger';

export default function handleCallback<T>(
    promise: Promise<T>,
    callback: (error: Error | null, value?: T) => void
): Promise<void> {
    return promise
        .then(
            value => (value === undefined ? callback(null) : callback(null, value)),
            error => callback(error as Error)
        )
        .catch(error => {
            log.error('Promise callback threw', error);
            throw error;
        });
}
