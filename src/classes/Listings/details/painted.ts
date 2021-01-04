import { Painted } from '../../Options';

export default function replacePainted(name: string, opt: Painted): string {
    return name
        .replace(/A Color Similar to Slate/, opt['A Color Similar to Slate'] ? opt['A Color Similar to Slate'] : '🧪')
        .replace(
            /A Deep Commitment to Purple/,
            opt['A Deep Commitment to Purple'] ? opt['A Deep Commitment to Purple'] : '🪀'
        )
        .replace(
            /A Distinctive Lack of Hue/,
            opt['A Distinctive Lack of Hue'] ? opt['A Distinctive Lack of Hue'] : '🎩'
        )
        .replace(/A Mann's Mint/, opt["A Mann's Mint"] ? opt["A Mann's Mint"] : '👽')
        .replace(/After Eight/, opt['After Eight'] ? opt['After Eight'] : '🏴')
        .replace(/Aged Moustache Grey/, opt['Aged Moustache Grey'] ? opt['Aged Moustache Grey'] : '👤')
        .replace(
            /An Extraordinary Abundance of Tinge/,
            opt['An Extraordinary Abundance of Tinge'] ? opt['An Extraordinary Abundance of Tinge'] : '🏐'
        )
        .replace(/Australium Gold/, opt['Australium Gold'] ? opt['Australium Gold'] : '🏆')
        .replace(/Color No. 216-190-216/, opt['Color No. 216-190-216'] ? opt['Color No. 216-190-216'] : '🧠')
        .replace(/Dark Salmon Injustice/, opt['Dark Salmon Injustice'] ? opt['Dark Salmon Injustice'] : '🐚')
        .replace(/Drably Olive/, opt['Drably Olive'] ? opt['Drably Olive'] : '🥝')
        .replace(/Indubitably Green/, opt['Indubitably Green'] ? opt['Indubitably Green'] : '🥦')
        .replace(/Mann Co. Orange/, opt['Mann Co. Orange'] ? opt['Mann Co. Orange'] : '🏀')
        .replace(/Muskelmannbraun/, opt.Muskelmannbraun ? opt.Muskelmannbraun : '👜')
        .replace(/Noble Hatter's Violet/, opt["Noble Hatter's Violet"] ? opt["Noble Hatter's Violet"] : '🍇')
        .replace(/Peculiarly Drab Tincture/, opt['Peculiarly Drab Tincture'] ? opt['Peculiarly Drab Tincture'] : '🪑')
        .replace(/Pink as Hell/, opt['Pink as Hell'] ? opt['Pink as Hell'] : '🎀')
        .replace(/Radigan Conagher Brown/, opt['Radigan Conagher Brown'] ? opt['Radigan Conagher Brown'] : '🚪')
        .replace(
            /The Bitter Taste of Defeat and Lime/,
            opt['The Bitter Taste of Defeat and Lime'] ? opt['The Bitter Taste of Defeat and Lime'] : '💚'
        )
        .replace(
            /The Color of a Gentlemann's Business Pants/,
            opt["The Color of a Gentlemann's Business Pants"] ? opt["The Color of a Gentlemann's Business Pants"] : '🧽'
        )
        .replace(/Ye Olde Rustic Colour/, opt['Ye Olde Rustic Colour'] ? opt['Ye Olde Rustic Colour'] : '🥔')
        .replace(/Zepheniah's Greed/, opt["Zepheniah's Greed"] ? opt["Zepheniah's Greed"] : '🌳')
        .replace(/An Air of Debonair/, opt['An Air of Debonair'] ? opt['An Air of Debonair'] : '👜🔷')
        .replace(/Balaclavas Are Forever/, opt['Balaclavas Are Forever'] ? opt['Balaclavas Are Forever'] : '👜🔷')
        .replace(/Operator's Overalls/, opt["Operator's Overalls"] ? opt["Operator's Overalls"] : '👜🔷')
        .replace(/Cream Spirit/, opt['Cream Spirit'] ? opt['Cream Spirit'] : '🍘🥮')
        .replace(/Team Spirit/, opt['Team Spirit'] ? opt['Team Spirit'] : '🔵🔴')
        .replace(/The Value of Teamwork/, opt['The Value of Teamwork'] ? opt['The Value of Teamwork'] : '👨🏽‍🤝‍👨🏻')
        .replace(/Waterlogged Lab Coat/, opt['Waterlogged Lab Coat'] ? opt['Waterlogged Lab Coat'] : '👨🏽‍🤝‍👨🏽');
}
