declare module 'tf2-currencies-2' {
    class Currencies {
        static toCurrencies(value: number, conversion?: number): Currencies;

        static toRefined(scrap: number): number;

        static toScrap(refined: number): number;

        static addRefined(...arg: number[]): number;

        constructor(currencies: { keys?: number; metal?: number });

        keys: number;

        metal: number;

        toValue(conversion?: number): number;

        toString(): string;

        toJSON(): {
            keys: number;
            metal: number;
        };
    }

    export = Currencies;
}
