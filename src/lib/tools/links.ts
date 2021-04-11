export default function generateLinks(steamID: string): Links {
    return {
        steam: `https://steamcommunity.com/profiles/${steamID}`,
        bptf: `https://backpack.tf/profiles/${steamID}`,
        steamrep: `https://steamrep.com/profiles/${steamID}`
    };
}

export interface Links {
    steam: string;
    bptf: string;
    steamrep: string;
}
