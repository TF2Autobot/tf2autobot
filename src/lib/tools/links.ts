export default function generateLinks(steamID: string): Links {
    return {
        steam: `https://steamcommunity.com/profiles/${steamID}`,
        bptf: `https://backpack.tf/profiles/${steamID}`,
        reptf: `https://rep.tf/${steamID}`
    };
}

export interface Links {
    steam: string;
    bptf: string;
    reptf: string;
}
