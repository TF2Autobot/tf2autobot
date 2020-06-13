import fs from 'graceful-fs';
import path from 'path';

import { exponentialBackoff } from './helpers';

let filesBeingSaved = 0;

export function readFile(p: string, json: boolean): Promise<any> {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(p)) {
            resolve(null);
            return;
        }

        fs.readFile(p, { encoding: 'utf8' }, function(err, data) {
            if (err) {
                return reject(err);
            }

            if (json !== true) {
                return resolve(data);
            }

            if (data.length === 0) {
                return resolve(null);
            }

            let parsed;
            try {
                parsed = JSON.parse(data);
            } catch (err) {
                return reject(err);
            }

            resolve(parsed);
        });
    });
}

export function writeFile(p: string, data: any, json: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
        let write;

        if (json === true) {
            write = process.env.DEBUG === 'true' ? JSON.stringify(data, undefined, 4) : JSON.stringify(data);
        } else {
            write = data;
        }

        const dir = path.dirname(p);

        if (fs.existsSync(dir)) {
            writeFile();
        } else {
            fs.mkdir(dir, { recursive: true }, function(err) {
                if (err) {
                    return reject(err);
                }

                writeFile();
            });
        }

        function writeFile(): void {
            filesBeingSaved++;
            fs.writeFile(p, write, { encoding: 'utf8' }, function(err) {
                filesBeingSaved--;

                if (err) {
                    return reject(err);
                }

                return resolve(null);
            });
        }
    });
}

export function deleteFile(p: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(p)) {
            resolve(null);
            return;
        }

        filesBeingSaved++;
        fs.unlink(p, function(err) {
            filesBeingSaved--;
            if (err) {
                return reject(err);
            }

            return resolve();
        });
    });
}

export function isWritingToFiles(): boolean {
    return filesBeingSaved !== 0;
}

export function waitForWriting(checks = 0): Promise<void> {
    if (!isWritingToFiles()) {
        return Promise.resolve();
    }

    return new Promise(resolve => {
        Promise.delay(exponentialBackoff(checks, 100)).then(() => {
            resolve(waitForWriting(checks + 1));
        });
    });
}
