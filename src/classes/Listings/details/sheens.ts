export default function replaceSheens(name: string): string {
    return name
        .replace(/Team Shine/, '🔵🔴')
        .replace(/Hot Rod/, '🎗️')
        .replace(/Manndarin/, '🟠')
        .replace(/Deadly Daffodil/, '🟡')
        .replace(/Mean Green/, '🟢')
        .replace(/Agonizing Emerald/, '🟩')
        .replace(/Villainous Violet/, '🟣');
}
