declare module 'tf2-sku-2' {
    export interface skuObject {
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
        paint?: number;
    }

    export function fromObject(item: skuObject): string;

    export function fromString(sku: string): skuObject;
}
