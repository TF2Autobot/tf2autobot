import { UnknownDictionary } from './common';

export type ItemsDictionaryWithAmounts = UnknownDictionary<number>;

export interface CurrencyObject {
    '5021;6': number;
    '5002;6': number;
    '5001;6': number;
    '5000;6': number;
}

export interface Currency {
    keys: number;
    metal: number;
}

export interface Item {
    defindex: number;
    quality: number;
    craftable: boolean;
    tradable?: boolean;
    killstreak: number;
    australium: boolean;
    effect: number;
    festive: boolean;
    paintkit: number;
    wear: number;
    quality2: number;
    craftnumber: number;
    crateseries: number;
    target: number;
    output: number;
    outputQuality: number;
}

export interface MinimumItem {
    defindex: number;
    quality: number;
    craftable?: boolean;
    tradable?: boolean;
    killstreak?: number;
    australium?: boolean;
    effect?: number;
    festive?: boolean;
    paintkit?: number;
    wear?: number;
    quality2?: number;
    craftnumber?: number;
    crateseries?: number;
    target?: number;
    output?: number;
    outputQuality?: number;
}
