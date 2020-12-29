import { Sheens } from '../../Options';

export default function replaceSheens(name: string, opt: Sheens): string {
    return name
        .replace(/Team Shine/, opt['Team Shine'] ? opt['Team Shine'] : '🔵🔴')
        .replace(/Hot Rod/, opt['Hot Rod'] ? opt['Hot Rod'] : '🎗️')
        .replace(/Manndarin/, opt.Manndarin ? opt.Manndarin : '🟠')
        .replace(/Deadly Daffodil/, opt['Deadly Daffodil'] ? opt['Deadly Daffodil'] : '🟡')
        .replace(/Mean Green/, opt['Mean Green'] ? opt['Mean Green'] : '🟢')
        .replace(/Agonizing Emerald/, opt['Agonizing Emerald'] ? opt['Agonizing Emerald'] : '🟩')
        .replace(/Villainous Violet/, opt['Villainous Violet'] ? opt['Villainous Violet'] : '🟣');
}
