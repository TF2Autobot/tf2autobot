import SteamTradeOfferManager from '@tf2autobot/tradeoffer-manager';
import fs from 'fs';

export default function loadPollData(dir: string) {
    let polldata: SteamTradeOfferManager.PollData;

    let init = false;

    fs.readdirSync(dir)
        .filter(name => name.includes('polldata'))
        .map(name => {
            return {
                name: name,
                mtime: fs.statSync(dir + name).mtimeMs
            };
        })
        .sort((a, b) => a.mtime - b.mtime)
        .forEach(e => {
            const data = JSON.parse(
                fs.readFileSync(dir + e.name, { encoding: 'utf8' })
            ) as SteamTradeOfferManager.PollData;

            if (!init) {
                polldata = { ...data };
                init = true;
            } else {
                for (const key in polldata) {
                    if (key === 'offersSince') {
                        // Keep offersSince from the oldest polldata file
                        continue;
                    }

                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    polldata[key] = {
                        ...polldata[key],
                        ...data[key]
                    };
                }
            }
        });

    return polldata;
}
