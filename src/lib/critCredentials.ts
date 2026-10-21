import { readFileSync } from 'fs';
import path from 'path';
import writeFileAtomic from 'write-file-atomic';

export interface CritCredentials {
    steam64: string;
    apiKey: string;
}

export function loadCritCredentials(directory: string): CritCredentials | undefined {
    try {
        const value = JSON.parse(
            readFileSync(path.join(directory, 'crit-credentials.json'), 'utf8')
        ) as CritCredentials;
        if (!/^7656119\d{10}$/.test(value.steam64) || !/^sk_[a-f0-9]{64}$/.test(value.apiKey)) {
            throw new Error('invalid credentials');
        }
        return value;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
        throw new Error(
            'Cannot read Crit TF credentials; restore or remove crit-credentials.json and run auto setup again.'
        );
    }
}

export async function saveCritCredentials(directory: string, credentials: CritCredentials): Promise<void> {
    try {
        await writeFileAtomic(
            path.join(directory, 'crit-credentials.json'),
            JSON.stringify(credentials, null, 4) + '\n',
            {
                mode: 0o600
            }
        );
    } catch {
        throw new Error('Could not save Crit TF credentials; check that the bot account directory is writable.');
    }
}
