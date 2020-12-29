import { Spells } from '../../Options';

export default function replaceSpells(name: string, opt: Spells): string {
    return name
        .replace(/Putrescent Pigmentation/, opt['Putrescent Pigmentation'] ? opt['Putrescent Pigmentation'] : 'PP 🍃')
        .replace(/Die Job/, opt['Die Job'] ? opt['Die Job'] : 'DJ 🍐')
        .replace(/Chromatic Corruption/, opt['Chromatic Corruption'] ? opt['Chromatic Corruption'] : 'CC 🪀')
        .replace(/Spectral Spectrum/, opt['Spectral Spectrum'] ? opt['Spectral Spectrum'] : 'Spec 🔵🔴')
        .replace(/Sinister Staining/, opt['Sinister Staining'] ? opt['Sinister Staining'] : 'Sin 🍈')
        .replace(/Voices From Below/, opt['Voices From Below'] ? opt['Voices From Below'] : 'VFB 🗣️')
        .replace(/Team Spirit Footprints/, opt['Team Spirit Footprints'] ? opt['Team Spirit Footprints'] : 'TS-FP 🔵🔴')
        .replace(/Gangreen Footprints/, opt['Gangreen Footprints'] ? opt['Gangreen Footprints'] : 'GG-FP 🟡')
        .replace(/Corpse Gray Footprints/, opt['Corpse Gray Footprints'] ? opt['Corpse Gray Footprints'] : 'CG-FP 👽')
        .replace(
            /Violent Violet Footprints/,
            opt['Violent Violet Footprints'] ? opt['Violent Violet Footprints'] : 'VV-FP ♨️'
        )
        .replace(
            /Rotten Orange Footprints/,
            opt['Rotten Orange Footprints'] ? opt['Rotten Orange Footprints'] : 'RO-FP 🍊'
        )
        .replace(
            /Bruised Purple Footprints/,
            opt['Bruised Purple Footprints'] ? opt['Bruised Purple Footprints'] : 'BP-FP 🍷'
        )
        .replace(/Headless Horseshoes/, opt['Headless Horseshoes'] ? opt['Headless Horseshoes'] : 'HH 🍇')
        .replace(/Exorcism/, opt.Exorcism ? opt.Exorcism : '👻')
        .replace(/Pumpkin Bomb/, opt['Pumpkin Bomb'] ? opt['Pumpkin Bomb'] : '🎃💣')
        .replace(/Halloween Fire/, opt['Halloween Fire'] ? opt['Halloween Fire'] : '🔥🟢');
}
