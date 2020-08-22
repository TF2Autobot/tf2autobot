import request from '@nicklason/request-retry';
import SteamID from 'steamid';

export async function isBanned(steamID: SteamID | string): Promise<boolean> {
    const steamID64 = steamID.toString();

    // const [bptf, steamrep] = await Promise.all([isBptfBanned(steamID64), isSteamRepMarked(steamID64)]);

    return await Promise.resolve(isBptfBanned(steamID64));
}

function isBptfBanned(steamID: SteamID | string): Promise<boolean> {
    const steamID64 = steamID.toString();

    return new Promise((resolve, reject) => {
        request(
            {
                url: 'https://backpack.tf/api/users/info/v1',
                qs: {
                    key: process.env.BPTF_API_KEY,
                    steamids: steamID64
                },
                gzip: true,
                json: true
            },
            function(err, response, body) {
                if (err) {
                    return reject(err);
                }

                const user = body.users[steamID64];
                const isBptfBanned = user.bans && user.bans.all;
                const isSteamRepBanned = user.bans ? user.bans.steamrep_scammer : false;

                return resolve(isBptfBanned || isSteamRepBanned);
            }
        );
    });
}

// function isSteamRepMarked(steamID: SteamID | string): Promise<boolean> {
//     const steamID64 = steamID.toString();

//     return new Promise((resolve, reject) => {
//         request(
//             {
//                 url: 'http://steamrep.com/api/beta4/reputation/' + steamID64,
//                 qs: {
//                     json: 1
//                 },
//                 gzip: true,
//                 json: true
//             },
//             function(err, response, body) {
//                 if (err) {
//                     return reject(err);
//                 }

//                 return resolve(body.steamrep.reputation.summary.toLowerCase().indexOf('scammer') !== -1);
//             }
//         );
//     });
// }
