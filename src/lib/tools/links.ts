export default function generateLinks(steamID: string): { steam: string; bptf: string; steamrep: string } {
    const links = {
        steam: `https://steamcommunity.com/profiles/${steamID}`,
        bptf: `https://backpack.tf/profiles/${steamID}`,
        steamrep: `https://steamrep.com/profiles/${steamID}`
    };
    return links;
}
