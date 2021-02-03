declare module 'tf2-schema-2' {
    import { EventEmitter } from 'events';

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Events {
        schema: (schema: SchemaManager.Schema) => void;
    }

    class SchemaManager extends EventEmitter {
        apiKey: string | undefined;

        updateTime: number;

        ready: boolean;

        schema: SchemaManager.Schema | null;

        _updateTimeout: ReturnType<typeof setTimeout>;

        _updateInterval: ReturnType<typeof setInterval>;

        constructor(options: { apiKey?: string; updateTime?: number });

        init(callback: (err: any) => void): void;

        setAPIKey(apiKey: string): void;

        setSchema(data: GetSchemaResponse, fromUpdate?: boolean): void;

        getSchema(callback: (err: any, schema?: any) => void): void;
    }

    interface PricesResponse {
        success: boolean;
        message?: string;
    }

    interface GetSchemaResponse extends PricesResponse {
        version: string;
        time: number;
        raw: any;
    }

    namespace SchemaManager {
        interface SchemaAttribute {
            name: string;
            defindex: number;
            attribute_class: string;
            description_string?: string;
            description_format?: string;
            effect_type: string;
            hidden: boolean;
            stored_as_integer: boolean;
        }

        interface ItemSet {
            item_set: string;
            name: string;
            items: string[];
            attributes?: Attribute[];
        }

        interface Attribute {
            name: string;
            class: string;
            value: number;
        }

        interface SchemaAttributeControlledAttachedParticle {
            system: string;
            id: number;
            attach_to_rootbone: boolean;
            name: string;
        }

        interface SchemaStrangeParts {
            type: number;
            type_name: string;
            level_data: string;
        }

        export interface SchemaItem {
            name: string;
            defindex: number;
            item_class: string;
            item_type_name: string;
            item_name: string;
            item_description: string;
            proper_name: boolean;
            model_player?: string | null;
            item_quality: number;
            image_inventory: string;
            min_ilevel: number;
            max_ilevel: number;
            image_url: string | null;
            image_url_large: string | null;
            drop_type?: string;
            craft_class?: string;
            craft_material_type?: string;
            capabilities?: SchemaItemCapabilities;
            styles?: SchemaItemStyle[];
            tool?: SchemaItemTools;
            used_by_classes: string[];
            attributes: Attribute[];
        }

        interface SchemaItemStyle {
            name: string;
        }

        interface SchemaItemTools {
            type: string;
            use_string?: string;
            restriction?: string;
            usage_capabilities?: SchemaItemUsageCapabilities;
        }

        interface SchemaItemUsageCapabilities {
            decodeable?: boolean;
            paintable?: boolean;
            can_customize_texture?: boolean;
            can_gift_wrap?: boolean;
            paintable_team_colors?: boolean;
            strange_parts?: boolean;
            nameable?: boolean;
            can_card_upgrade?: boolean;
            can_consume?: boolean;
            can_killstreakify?: boolean;
            can_spell_page?: boolean;
            can_strangify?: boolean;
            can_unusualify?: boolean;
            duck_upgradable?: boolean;
        }

        interface SchemaItemCapabilities {
            decodable?: boolean;
            paintable?: boolean;
            nameable?: boolean;
            usable_gc?: boolean;
            usable?: boolean;
            can_craft_if_purchased?: boolean;
            can_gift_wrap?: boolean;
            usable_out_of_game?: boolean;
            can_craft_count?: boolean;
            can_craft_mark?: boolean;
            can_be_restored?: boolean;
            strange_parts?: boolean;
            can_card_upgrade?: boolean;
            can_strangify?: boolean;
            can_killstreakify?: boolean;
            can_consume?: boolean;
        }

        interface Item {
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
            target?: number;
            craftnumber?: number;
            crateseries?: number;
            output?: number;
            outputQuality?: number;
            paint?: number;
        }

        export interface Effect {
            name: string;
            id: number;
        }

        export interface Paints {
            [name: string]: string;
        }

        export interface StrangeParts {
            [name: string]: string;
        }

        export type CharacterClasses =
            | 'Scout'
            | 'Soldier'
            | 'Pyro'
            | 'Demoman'
            | 'Heavy'
            | 'Engineer'
            | 'Medic'
            | 'Sniper'
            | 'Spy';

        export class Schema {
            static getOverview(apiKey: string, callback: (err: any, result?: Record<string, unknown>) => void): void;

            static getItems(apiKey: string, callback: (err: any, result?: Record<string, unknown>) => void): void;

            static getPaintKits(callback: (err: any, result?: Record<string, unknown>) => void): void;

            static getItemsGame(callback: (err: any, result?: Record<string, unknown>) => void): void;

            version: string;

            raw: {
                schema: {
                    items_game_url: string;
                    attributes: SchemaAttribute[];
                    item_sets: ItemSet[];
                    attribute_controlled_attached_particles: SchemaAttributeControlledAttachedParticle[];
                    kill_eater_score_types: SchemaStrangeParts[];
                    items: SchemaItem[];
                    paintkits: Record<string, string>;
                };
                items_game: {
                    items: Record<string, Record<string, any>>;
                    attributes: Record<string, Record<string, any>>;
                };
            };

            time: number;

            constructor(data: { version: string; raw: Record<string, unknown>; time: number });

            getItemByDefindex(defindex: number): SchemaItem | null;

            getItemByItemName(name: string): SchemaItem | null;

            getAttributeByDefindex(defindex: number): SchemaAttribute | null;

            getQualityById(id: number): string | null;

            getQualityIdByName(name: string): number | null;

            getEffectById(id: number): string | null;

            getEffectIdByName(name: string): number | null;

            getSkinById(id: number): string | null;

            getSkinIdByName(name: string): number | null;

            getName(item: Item, proper?: boolean): string | null;

            getUnusualEffects(): Effect[];

            getPaintNameByDecimal(decimal: number): string | null;

            getPaintDecimalByName(name: string): number | null;

            getPaints(): Paints;

            getStrangeParts(): StrangeParts;

            getPaintableItemDefindexes(): number[];

            getCraftableWeaponsSchema(): SchemaItem[];

            getWeaponsForCraftingByClass(charClass: CharacterClasses): string[];

            getCraftableWeaponsForTrading(): string[];

            getUncraftableWeaponsForTrading(): string[];

            toJSON(): { version: string; time: number; raw: Record<string, any> };
        }
    }

    export = SchemaManager;
}
