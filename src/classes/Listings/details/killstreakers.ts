import { Killstreakers } from '../../Options';

export default function replaceKillstreaker(name: string, opt: Killstreakers): string {
    return name
        .replace(/Cerebral Discharge/, opt['Cerebral Discharge'] ? opt['Cerebral Discharge'] : '⚡')
        .replace(/Fire Horns/, opt['Fire Horns'] ? opt['Fire Horns'] : '🔥🐮')
        .replace(/Flames/, opt.Flames ? opt.Flames : '🔥')
        .replace(/Hypno-Beam/, opt['Hypno-Beam'] ? opt['Hypno-Beam'] : '😵💫')
        .replace(/Incinerator/, opt.Incinerator ? opt.Incinerator : '🚬')
        .replace(/Singularity/, opt.Singularity ? opt.Singularity : '🔆')
        .replace(/Tornado/, opt.Tornado ? opt.Tornado : '🌪️');
}
