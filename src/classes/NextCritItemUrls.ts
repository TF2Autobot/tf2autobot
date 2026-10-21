import axios from 'axios';
import { createHatVersionZ, unparseHatVersionZ } from '../vendor/the-future/createHat';
import log from '../lib/logger';

/** Cache the public HAT-to-item-ID feed used by crit.tf advanced search. */
export default class NextCritItemUrls {
    private readonly http = axios.create({ baseURL: 'https://crit.tf', timeout: 30000, maxRedirects: 0 });

    private ids = new Map<string, number>();

    private nextRefresh = 0;

    private loading: Promise<boolean> | undefined;

    getUrl(hat: string): string {
        const id = this.ids.get(NextCritItemUrls.key(hat));
        return id === undefined ? '' : `https://crit.tf/item/${id}`;
    }

    refresh(): Promise<boolean> {
        if (this.loading !== undefined) return this.loading;
        if (Date.now() < this.nextRefresh) return Promise.resolve(false);
        this.loading = this.load()
            .then(ids => {
                this.ids = ids;
                this.nextRefresh = Date.now() + 60 * 60 * 1000;
                return true;
            })
            .catch(() => {
                // Keep previously resolved URLs available during outages; retry in a minute.
                this.nextRefresh = Date.now() + 60000;
                log.warn('Failed to refresh crit.tf item links; keeping the cached mapping');
                return false;
            })
            .finally(() => {
                this.loading = undefined;
            });
        return this.loading;
    }

    private async load(): Promise<Map<string, number>> {
        const ids = new Map<string, number>();
        for (let start = 1; start <= 10000000; start += 10000) {
            const { data } = await this.http.get<unknown>(`/hyper-json/hats/${start}`, { responseType: 'text' });
            if (typeof data !== 'string') throw new Error('Invalid crit.tf item mapping');
            const rows = data.split('\x1e').filter(row => row !== '');
            if (rows.length === 0) return ids;
            let previous = start - 1;
            for (const row of rows) {
                const fields = row.split('\x1c');
                const id = Number(fields[0]);
                if (fields.length !== 3 || !Number.isSafeInteger(id) || id <= previous || id >= start + 10000) {
                    throw new Error('Invalid crit.tf item mapping row');
                }
                const key = NextCritItemUrls.key(fields[1]);
                if (!ids.has(key)) ids.set(key, id);
                previous = id;
            }
        }
        throw new Error('crit.tf item mapping exceeded the supported size');
    }

    private static key(hat: string): string {
        if (!hat.startsWith('Z^')) throw new Error('Invalid NextCrit HAT');
        const props = unparseHatVersionZ(hat.slice(2));
        if (!props.marketHashName) throw new Error('Invalid NextCrit HAT');
        // SKU does not distinguish marketability; preserve every other attribute.
        props.marketable = false;
        props.marketHashName = props.marketHashName.replace(/%23/g, '#').replace(/^The /, '');
        return createHatVersionZ(props);
    }
}
