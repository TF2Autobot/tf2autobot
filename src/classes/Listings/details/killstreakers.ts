export default function replaceKillstreaker(name: string): string {
    return name
        .replace(/Cerebral Discharge/, '⚡')
        .replace(/Fire Horns/, '🔥🐮')
        .replace(/Flames/, '🔥')
        .replace(/Hypno-Beam/, '😵💫')
        .replace(/Incinerator/, '🚬')
        .replace(/Singularity/, '🔆')
        .replace(/Tornado/, '🌪️');
}
