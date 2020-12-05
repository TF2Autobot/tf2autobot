export default function generateLinks(steamID: string): Links {
    const links = {
        steam: `https://steamcommunity.com/profiles/${steamID}`,
        bptf: `https://backpack.tf/profiles/${steamID}`,
        steamrep: `https://steamrep.com/profiles/${steamID}`
    };
    return links;
}

export interface Links {
    steam: string;
    bptf: string;
    steamrep: string;
}
