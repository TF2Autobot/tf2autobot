import { UnknownDictionary } from '../types/common';
import SteamID from 'steamid';
import TradeOfferManager, { EconItem } from 'steam-tradeoffer-manager';
import SchemaManager from 'tf2-schema';

export = class Inventory {
    private readonly steamID: SteamID;

    private readonly manager: TradeOfferManager;

    private readonly schema: SchemaManager.Schema;

    private tradable: UnknownDictionary<string[]> = {};

    private nonTradable: UnknownDictionary<string[]> = {};

    constructor(steamID: SteamID | string, manager: TradeOfferManager, schema: SchemaManager.Schema) {
        this.steamID = new SteamID(steamID.toString());
        this.manager = manager;
        this.schema = schema;
    }

    static fromItems(
        steamID: SteamID | string,
        items: EconItem[],
        manager: TradeOfferManager,
        schema: SchemaManager.Schema
    ): Inventory {
        const inventory = new Inventory(steamID, manager, schema);

        // Funny how typescript allows calling a private function from a static function
        inventory.setItems(items);

        return inventory;
    }

    getSteamID(): SteamID {
        return this.steamID;
    }

    getItems(): UnknownDictionary<string[]> {
        return this.tradable;
    }

    addItem(sku: string, assetid: string): void {
        const items = this.tradable;
        (items[sku] = items[sku] || []).push(assetid);
    }

    removeItem(assetid: string): void;

    removeItem(item: EconItem): void;

    removeItem(...args: any[]): void {
        const assetid = typeof args[0] === 'string' ? args[0] : args[0].id;

        const items = this.tradable;

        for (const sku in items) {
            if (Object.prototype.hasOwnProperty.call(items, sku)) {
                const assetids = items[sku];

                const index = assetids.indexOf(assetid);

                if (index !== -1) {
                    assetids.splice(index, 1);
                    if (assetids.length === 0) {
                        delete items[sku];
                    }
                    break;
                }
            }
        }
    }

    fetch(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.manager.getUserInventoryContents(this.getSteamID(), 440, '2', false, (err, items) => {
                if (err) {
                    return reject(err);
                }

                this.setItems(items);

                resolve();
            });
        });
    }

    private setItems(items: EconItem[]): void {
        const tradable: EconItem[] = [];
        const nonTradable: EconItem[] = [];

        items.forEach(function(item) {
            if (item.tradable) {
                tradable.push(item);
            } else {
                nonTradable.push(item);
            }
        });

        this.tradable = Inventory.createDictionary(tradable, this.schema);
        this.nonTradable = Inventory.createDictionary(nonTradable, this.schema);
    }

    findByAssetid(assetid: string): string | null {
        for (const sku in this.tradable) {
            if (!Object.prototype.hasOwnProperty.call(this.tradable, sku)) {
                continue;
            }

            if (!this.tradable[sku].includes(assetid)) {
                continue;
            }

            return sku;
        }

        for (const sku in this.nonTradable) {
            if (!Object.prototype.hasOwnProperty.call(this.nonTradable, sku)) {
                continue;
            }

            if (!this.nonTradable[sku].includes(assetid)) {
                continue;
            }

            return sku;
        }

        return null;
    }

    findBySKU(sku: string, tradableOnly = true): string[] {
        const tradable = this.tradable[sku] || [];

        if (tradableOnly) {
            // Copies the array
            return tradable.slice(0);
        }

        const nonTradable = this.nonTradable[sku] || [];

        return nonTradable.concat(tradable);
    }

    getAmount(sku: string, tradableOnly?: boolean): number {
        return this.findBySKU(sku, tradableOnly).length;
    }

    getCurrencies(): {
        '5021;6': string[]; // Mann Co. Supply Crate Key
        '5002;6': string[]; // Refined Metal
        '5001;6': string[]; // Reclaimed Metal
        '5000;6': string[]; // Scrap Metal
        '45;6': string[]; // Scout - Primary - Force-A-Nature
        '220;6': string[]; // Shortstop
        '448;6': string[]; // Soda Popper
        '772;6': string[]; // Baby Face's Blaster
        '1103;6': string[]; // Back Scatter
        '46;6': string[]; // Scout - Secondary - Bonk! Atomic Punch
        '163;6': string[]; // Crit-a-Cola
        '222;6': string[]; // Mad Milk
        '449;6': string[]; // Winger
        '773;6': string[]; // Pretty Boy's Pocket Pistol
        '812;6': string[]; // Flying Guillotine
        '44;6': string[]; // Scout - Melee - Sandman
        '221;6': string[]; // Holy Mackerel
        '317;6': string[]; // Candy Cane
        '325;6': string[]; // Boston Basher
        '349;6': string[]; // Sun-on-a-Stick
        '355;6': string[]; // Fan O'War
        '450;6': string[]; // Atomizer
        '648;6': string[]; // Wrap Assassin
        '127;6': string[]; // Soldier - Primary - Direct Hit
        '228;6': string[]; // Black Box
        '237;6': string[]; // Rocket Jumper
        '414;6': string[]; // Liberty Launcher
        '441;6': string[]; // Cow Mangler 5000
        '513;6': string[]; // Original
        '730;6': string[]; // Beggar's Bazooka
        '1104;6': string[]; // Air Strike
        '129;6': string[]; // Soldier - Secondary - Buff Banner
        '133;6': string[]; // Gunboats
        '226;6': string[]; // Battalion's Backup
        '354;6': string[]; // Concheror
        '415;6': string[]; // (Reserve Shooter - Shared - Soldier/Pyro)
        '442;6': string[]; // Righteous Bison
        '1101;6': string[]; // (B.A.S.E Jumper - Shared - Soldier/Demoman)
        '1153;6': string[]; // (Panic Attack - Shared - Soldier/Pyro/Heavy/Engineer)
        '444;6': string[]; // Mantreads
        '128;6': string[]; // Soldier - Melee -  Equalizer
        '154;6': string[]; // (Pain Train - Shared - Soldier/Demoman)
        '357;6': string[]; // (Half-Zatoichi - Shared - Soldier/Demoman)
        '416;6': string[]; // Market Gardener
        '447;6': string[]; // Disciplinary Action
        '775;6': string[]; // Escape Plan
        '40;6': string[]; // Pyro - Primary - Backburner
        '215;6': string[]; // Degreaser
        '594;6': string[]; // Phlogistinator
        '741;6': string[]; // Rainblower
        '1178;6': string[]; // Dragon's Fury
        '39;6': string[]; // Pyro - Secondary - Flare Gun
        '351;6': string[]; // Detonator
        '595;6': string[]; // Manmelter
        '740;6': string[]; // Scorch Shot
        '1179;6': string[]; // Thermal Thruster
        '1180;6': string[]; // Gas Passer
        '38;6': string[]; // Pyro - Melee - Axtinguisher
        '153;6': string[]; // Homewrecker
        '214;6': string[]; // Powerjack
        '326;6': string[]; // Back Scratcher
        '348;6': string[]; // Sharpened Volcano Fragment
        '457;6': string[]; // Postal Pummeler
        '593;6': string[]; // Third Degree
        '739;6': string[]; // Lollichop
        '813;6': string[]; // Neon Annihilator
        '1181;6': string[]; // Hot Hand
        '308;6': string[]; // Demoman - Primary - Loch-n-Load
        '405;6': string[]; // Ali Baba's Wee Booties
        '608;6': string[]; // Bootlegger
        '996;6': string[]; // Loose Cannon
        '1151;6': string[]; // Iron Bomber
        '130;6': string[]; // Demoman - Secondary - Scottish Resistance
        '131;6': string[]; // Chargin' Targe
        '265;6': string[]; // Sticky Jumper
        '406;6': string[]; // Splendid Screen
        '1099;6': string[]; // Tide Turner
        '1150;6': string[]; // Quickiebomb Launcher
        '132;6': string[]; // Demoman - Melee - Eyelander
        '172;6': string[]; // Scotsman's Skullcutter
        '307;6': string[]; // Ullapool Caber
        '327;6': string[]; // Claidheamh Mòr
        '404;6': string[]; // Persian Persuader
        '482;6': string[]; // Nessie's Nine Iron
        '609;6': string[]; // Scottish Handshake
        '41;6': string[]; // Heavy - Primary - Natascha
        '312;6': string[]; // Brass Beast
        '424;6': string[]; // Tomislav
        '811;6': string[]; // Huo-Long Heater
        '42;6': string[]; // Heavy - Secondary - Sandvich
        '159;6': string[]; // Dalokohs Bar
        '311;6': string[]; // Buffalo Steak Sandvich
        '425;6': string[]; // Family Business
        '1190;6': string[]; // Second Banana
        '43;6': string[]; // Heavy - Melee - Killing Gloves of Boxing
        '239;6': string[]; // Gloves of Running Urgently
        '310;6': string[]; // Warrior's Spirit
        '331;6': string[]; // Fists of Steel
        '426;6': string[]; // Eviction Notice
        '656;6': string[]; // Holiday Punch
        '141;6': string[]; // Engineer - Primary - Frontier Justice
        '527;6': string[]; // Widowmaker
        '588;6': string[]; // Pomson 6000
        '997;6': string[]; // Rescue Ranger
        '140;6': string[]; // Engineer - Secondary - Wrangler
        '528;6': string[]; // Short Circuit
        '142;6': string[]; // Engineer - Melee - Gunslinger
        '155;6': string[]; // Southern Hospitality
        '329;6': string[]; // Jag
        '589;6': string[]; // Eureka Effect
        '36;6': string[]; // **Medic - Primary - Blutsauger
        '305;6': string[]; // Crusader's Crossbow
        '412;6': string[]; // Overdose
        '35;6': string[]; // Medic - Secondary - Kritzkrieg
        '411;6': string[]; // Quick-Fix
        '998;6': string[]; // Vaccinator
        '37;6': string[]; // Medic - Melee - Ubersaw
        '173;6': string[]; // Vita-Saw
        '304;6': string[]; // Amputator
        '413;6': string[]; // Solemn Vow
        '56;6': string[]; // Sniper - Primary - Huntsman
        '230;6': string[]; // Sydney Sleeper
        '402;6': string[]; // Bazaar Bargain
        '526;6': string[]; // Machina
        '752;6': string[]; // Hitman's Heatmaker
        '1092;6': string[]; // Fortified Compound
        '1098;6': string[]; // Classic
        '57;6': string[]; // Sniper - Secondary - Razorback
        '58;6': string[]; // Jarate
        '231;6': string[]; // Darwin's Danger Shield
        '642;6': string[]; // Cozy Camper
        '751;6': string[]; // Cleaner's Carbine
        '171;6': string[]; // Sniper - Melee - Tribalman's Shiv
        '232;6': string[]; // Bushwacka
        '401;6': string[]; // Shahanshah
        '61;6': string[]; // Spy - Primary - Ambassador
        '224;6': string[]; // L'Etranger
        '460;6': string[]; // Enforcer
        '525;6': string[]; // Diamondback
        '810;6': string[]; // Spy - Secondary - Red-Tape Recorder
        '225;6': string[]; // Spy - Melee - Your Eternal Reward
        '356;6': string[]; // Conniver's Kunai
        '461;6': string[]; // Big Earner
        '649;6': string[]; // Spy-cicle
        '60;6': string[]; // Spy - PDA2 - Cloak and Dagger
        '59;6': string[]; // Dead Ringer
        '939;6': string[]; // Bat Outta Hell
        '61;6;uncraftable': string[];
        '1101;6;uncraftable': string[];
        '226;6;uncraftable': string[];
        '46;6;uncraftable': string[];
        '129;6;uncraftable': string[];
        '311;6;uncraftable': string[];
        '131;6;uncraftable': string[];
        '751;6;uncraftable': string[];
        '354;6;uncraftable': string[];
        '642;6;uncraftable': string[];
        '163;6;uncraftable': string[];
        '159;6;uncraftable': string[];
        '231;6;uncraftable': string[];
        '351;6;uncraftable': string[];
        '525;6;uncraftable': string[];
        '460;6;uncraftable': string[];
        '425;6;uncraftable': string[];
        '39;6;uncraftable': string[];
        '812;6;uncraftable': string[];
        '133;6;uncraftable': string[];
        '58;6;uncraftable': string[];
        '35;6;uncraftable': string[];
        '224;6;uncraftable': string[];
        '222;6;uncraftable': string[];
        '595;6;uncraftable': string[];
        '444;6;uncraftable': string[];
        '773;6;uncraftable': string[];
        '411;6;uncraftable': string[];
        '1150;6;uncraftable': string[];
        '57;6;uncraftable': string[];
        '415;6;uncraftable': string[];
        '442;6;uncraftable': string[];
        '42;6;uncraftable': string[];
        '740;6;uncraftable': string[];
        '130;6;uncraftable': string[];
        '528;6;uncraftable': string[];
        '406;6;uncraftable': string[];
        '265;6;uncraftable': string[];
        '1099;6;uncraftable': string[];
        '998;6;uncraftable': string[];
        '449;6;uncraftable': string[];
        '140;6;uncraftable': string[];
        '1104;6;uncraftable': string[];
        '405;6;uncraftable': string[];
        '772;6;uncraftable': string[];
        '1103;6;uncraftable': string[];
        '40;6;uncraftable': string[];
        '402;6;uncraftable': string[];
        '730;6;uncraftable': string[];
        '228;6;uncraftable': string[];
        '36;6;uncraftable': string[];
        '608;6;uncraftable': string[];
        '312;6;uncraftable': string[];
        '1098;6;uncraftable': string[];
        '441;6;uncraftable': string[];
        '305;6;uncraftable': string[];
        '215;6;uncraftable': string[];
        '127;6;uncraftable': string[];
        '45;6;uncraftable': string[];
        '1092;6;uncraftable': string[];
        '141;6;uncraftable': string[];
        '752;6;uncraftable': string[];
        '56;6;uncraftable': string[];
        '811;6;uncraftable': string[];
        '1151;6;uncraftable': string[];
        '414;6;uncraftable': string[];
        '308;6;uncraftable': string[];
        '996;6;uncraftable': string[];
        '526;6;uncraftable': string[];
        '41;6;uncraftable': string[];
        '513;6;uncraftable': string[];
        '412;6;uncraftable': string[];
        '1153;6;uncraftable': string[];
        '594;6;uncraftable': string[];
        '588;6;uncraftable': string[];
        '741;6;uncraftable': string[];
        '997;6;uncraftable': string[];
        '237;6;uncraftable': string[];
        '220;6;uncraftable': string[];
        '448;6;uncraftable': string[];
        '230;6;uncraftable': string[];
        '424;6;uncraftable': string[];
        '527;6;uncraftable': string[];
        '60;6;uncraftable': string[];
        '59;6;uncraftable': string[];
        '304;6;uncraftable': string[];
        '450;6;uncraftable': string[];
        '38;6;uncraftable': string[];
        '326;6;uncraftable': string[];
        '939;6;uncraftable': string[];
        '461;6;uncraftable': string[];
        '325;6;uncraftable': string[];
        '232;6;uncraftable': string[];
        '317;6;uncraftable': string[];
        '327;6;uncraftable': string[];
        '356;6;uncraftable': string[];
        '447;6;uncraftable': string[];
        '128;6;uncraftable': string[];
        '775;6;uncraftable': string[];
        '589;6;uncraftable': string[];
        '426;6;uncraftable': string[];
        '132;6;uncraftable': string[];
        '355;6;uncraftable': string[];
        '331;6;uncraftable': string[];
        '239;6;uncraftable': string[];
        '142;6;uncraftable': string[];
        '357;6;uncraftable': string[];
        '656;6;uncraftable': string[];
        '221;6;uncraftable': string[];
        '153;6;uncraftable': string[];
        '329;6;uncraftable': string[];
        '43;6;uncraftable': string[];
        '739;6;uncraftable': string[];
        '416;6;uncraftable': string[];
        '813;6;uncraftable': string[];
        '482;6;uncraftable': string[];
        '154;6;uncraftable': string[];
        '404;6;uncraftable': string[];
        '457;6;uncraftable': string[];
        '214;6;uncraftable': string[];
        '44;6;uncraftable': string[];
        '172;6;uncraftable': string[];
        '609;6;uncraftable': string[];
        '401;6;uncraftable': string[];
        '348;6;uncraftable': string[];
        '413;6;uncraftable': string[];
        '155;6;uncraftable': string[];
        '649;6;uncraftable': string[];
        '349;6;uncraftable': string[];
        '593;6;uncraftable': string[];
        '171;6;uncraftable': string[];
        '37;6;uncraftable': string[];
        '307;6;uncraftable': string[];
        '173;6;uncraftable': string[];
        '310;6;uncraftable': string[];
        '648;6;uncraftable': string[];
        '225;6;uncraftable': string[];
        '810;6;uncraftable': string[];
    } {
        return {
            '5021;6': this.findBySKU('5021;6'),
            '5002;6': this.findBySKU('5002;6'),
            '5001;6': this.findBySKU('5001;6'),
            '5000;6': this.findBySKU('5000;6'),
            '45;6': this.findBySKU('45;6'),
            '220;6': this.findBySKU('220;6'),
            '448;6': this.findBySKU('448;6'),
            '772;6': this.findBySKU('772;6'),
            '1103;6': this.findBySKU('1103;6'),
            '46;6': this.findBySKU('46;6'),
            '163;6': this.findBySKU('163;6'),
            '222;6': this.findBySKU('222;6'),
            '449;6': this.findBySKU('449;6'),
            '773;6': this.findBySKU('773;6'),
            '812;6': this.findBySKU('812;6'),
            '44;6': this.findBySKU('44;6'),
            '221;6': this.findBySKU('221;6'),
            '317;6': this.findBySKU('317;6'),
            '325;6': this.findBySKU('325;6'),
            '349;6': this.findBySKU('349;6'),
            '355;6': this.findBySKU('355;6'),
            '450;6': this.findBySKU('450;6'),
            '648;6': this.findBySKU('648;6'),
            '127;6': this.findBySKU('127;6'),
            '228;6': this.findBySKU('228;6'),
            '237;6': this.findBySKU('237;6'),
            '414;6': this.findBySKU('414;6'),
            '441;6': this.findBySKU('441;6'),
            '513;6': this.findBySKU('513;6'),
            '730;6': this.findBySKU('730;6'),
            '1104;6': this.findBySKU('1104;6'),
            '129;6': this.findBySKU('129;6'),
            '133;6': this.findBySKU('133;6'),
            '226;6': this.findBySKU('226;6'),
            '354;6': this.findBySKU('354;6'),
            '415;6': this.findBySKU('415;6'),
            '442;6': this.findBySKU('442;6'),
            '1101;6': this.findBySKU('1101;6'),
            '1153;6': this.findBySKU('1153;6'),
            '444;6': this.findBySKU('444;6'),
            '128;6': this.findBySKU('128;6'),
            '154;6': this.findBySKU('154;6'),
            '357;6': this.findBySKU('357;6'),
            '416;6': this.findBySKU('416;6'),
            '447;6': this.findBySKU('447;6'),
            '775;6': this.findBySKU('775;6'),
            '40;6': this.findBySKU('40;6'),
            '215;6': this.findBySKU('215;6'),
            '594;6': this.findBySKU('594;6'),
            '741;6': this.findBySKU('741;6'),
            '1178;6': this.findBySKU('1178;6'),
            '39;6': this.findBySKU('39;6'),
            '351;6': this.findBySKU('351;6'),
            '595;6': this.findBySKU('595;6'),
            '740;6': this.findBySKU('740;6'),
            '1179;6': this.findBySKU('1179;6'),
            '1180;6': this.findBySKU('1180;6'),
            '38;6': this.findBySKU('38;6'),
            '153;6': this.findBySKU('153;6'),
            '214;6': this.findBySKU('214;6'),
            '326;6': this.findBySKU('326;6'),
            '348;6': this.findBySKU('348;6'),
            '457;6': this.findBySKU('457;6'),
            '593;6': this.findBySKU('593;6'),
            '739;6': this.findBySKU('739;6'),
            '813;6': this.findBySKU('813;6'),
            '1181;6': this.findBySKU('1181;6'),
            '308;6': this.findBySKU('308;6'),
            '405;6': this.findBySKU('405;6'),
            '608;6': this.findBySKU('608;6'),
            '996;6': this.findBySKU('996;6'),
            '1151;6': this.findBySKU('1151;6'),
            '130;6': this.findBySKU('130;6'),
            '131;6': this.findBySKU('131;6'),
            '265;6': this.findBySKU('265;6'),
            '406;6': this.findBySKU('406;6'),
            '1099;6': this.findBySKU('1099;6'),
            '1150;6': this.findBySKU('1150;6'),
            '132;6': this.findBySKU('132;6'),
            '172;6': this.findBySKU('172;6'),
            '307;6': this.findBySKU('307;6'),
            '327;6': this.findBySKU('327;6'),
            '404;6': this.findBySKU('404;6'),
            '482;6': this.findBySKU('482;6'),
            '609;6': this.findBySKU('609;6'),
            '41;6': this.findBySKU('41;6'),
            '312;6': this.findBySKU('312;6'),
            '424;6': this.findBySKU('424;6'),
            '811;6': this.findBySKU('811;6'),
            '42;6': this.findBySKU('42;6'),
            '159;6': this.findBySKU('159;6'),
            '311;6': this.findBySKU('311;6'),
            '425;6': this.findBySKU('425;6'),
            '1190;6': this.findBySKU('1190;6'),
            '43;6': this.findBySKU('43;6'),
            '239;6': this.findBySKU('239;6'),
            '310;6': this.findBySKU('310;6'),
            '331;6': this.findBySKU('331;6'),
            '426;6': this.findBySKU('426;6'),
            '656;6': this.findBySKU('656;6'),
            '141;6': this.findBySKU('141;6'),
            '527;6': this.findBySKU('527;6'),
            '588;6': this.findBySKU('588;6'),
            '997;6': this.findBySKU('997;6'),
            '140;6': this.findBySKU('140;6'),
            '528;6': this.findBySKU('528;6'),
            '142;6': this.findBySKU('142;6'),
            '155;6': this.findBySKU('155;6'),
            '329;6': this.findBySKU('329;6'),
            '589;6': this.findBySKU('589;6'),
            '36;6': this.findBySKU('36;6'),
            '305;6': this.findBySKU('305;6'),
            '412;6': this.findBySKU('412;6'),
            '35;6': this.findBySKU('35;6'),
            '411;6': this.findBySKU('411;6'),
            '998;6': this.findBySKU('998;6'),
            '37;6': this.findBySKU('37;6'),
            '173;6': this.findBySKU('173;6'),
            '304;6': this.findBySKU('304;6'),
            '413;6': this.findBySKU('413;6'),
            '56;6': this.findBySKU('56;6'),
            '230;6': this.findBySKU('230;6'),
            '402;6': this.findBySKU('402;6'),
            '526;6': this.findBySKU('526;6'),
            '752;6': this.findBySKU('752;6'),
            '1092;6': this.findBySKU('1092;6'),
            '1098;6': this.findBySKU('1098;6'),
            '57;6': this.findBySKU('57;6'),
            '58;6': this.findBySKU('58;6'),
            '231;6': this.findBySKU('231;6'),
            '642;6': this.findBySKU('642;6'),
            '751;6': this.findBySKU('751;6'),
            '171;6': this.findBySKU('171;6'),
            '232;6': this.findBySKU('232;6'),
            '401;6': this.findBySKU('401;6'),
            '61;6': this.findBySKU('61;6'),
            '224;6': this.findBySKU('224;6'),
            '460;6': this.findBySKU('460;6'),
            '525;6': this.findBySKU('525;6'),
            '810;6': this.findBySKU('810;6'),
            '225;6': this.findBySKU('225;6'),
            '356;6': this.findBySKU('356;6'),
            '461;6': this.findBySKU('461;6'),
            '649;6': this.findBySKU('649;6'),
            '60;6': this.findBySKU('60;6'),
            '59;6': this.findBySKU('59;6'),
            '939;6': this.findBySKU('939;6'),
            '61;6;uncraftable': this.findBySKU('61;6;uncraftable'),
            '1101;6;uncraftable': this.findBySKU('1101;6;uncraftable'),
            '226;6;uncraftable': this.findBySKU('226;6;uncraftable'),
            '46;6;uncraftable': this.findBySKU('46;6;uncraftable'),
            '129;6;uncraftable': this.findBySKU('129;6;uncraftable'),
            '311;6;uncraftable': this.findBySKU('311;6;uncraftable'),
            '131;6;uncraftable': this.findBySKU('131;6;uncraftable'),
            '751;6;uncraftable': this.findBySKU('751;6;uncraftable'),
            '354;6;uncraftable': this.findBySKU('354;6;uncraftable'),
            '642;6;uncraftable': this.findBySKU('642;6;uncraftable'),
            '163;6;uncraftable': this.findBySKU('163;6;uncraftable'),
            '159;6;uncraftable': this.findBySKU('159;6;uncraftable'),
            '231;6;uncraftable': this.findBySKU('231;6;uncraftable'),
            '351;6;uncraftable': this.findBySKU('351;6;uncraftable'),
            '525;6;uncraftable': this.findBySKU('525;6;uncraftable'),
            '460;6;uncraftable': this.findBySKU('460;6;uncraftable'),
            '425;6;uncraftable': this.findBySKU('425;6;uncraftable'),
            '39;6;uncraftable': this.findBySKU('39;6;uncraftable'),
            '812;6;uncraftable': this.findBySKU('812;6;uncraftable'),
            '133;6;uncraftable': this.findBySKU('133;6;uncraftable'),
            '58;6;uncraftable': this.findBySKU('58;6;uncraftable'),
            '35;6;uncraftable': this.findBySKU('35;6;uncraftable'),
            '224;6;uncraftable': this.findBySKU('224;6;uncraftable'),
            '222;6;uncraftable': this.findBySKU('222;6;uncraftable'),
            '595;6;uncraftable': this.findBySKU('595;6;uncraftable'),
            '444;6;uncraftable': this.findBySKU('444;6;uncraftable'),
            '773;6;uncraftable': this.findBySKU('773;6;uncraftable'),
            '411;6;uncraftable': this.findBySKU('411;6;uncraftable'),
            '1150;6;uncraftable': this.findBySKU('1150;6;uncraftable'),
            '57;6;uncraftable': this.findBySKU('57;6;uncraftable'),
            '415;6;uncraftable': this.findBySKU('415;6;uncraftable'),
            '442;6;uncraftable': this.findBySKU('442;6;uncraftable'),
            '42;6;uncraftable': this.findBySKU('42;6;uncraftable'),
            '740;6;uncraftable': this.findBySKU('740;6;uncraftable'),
            '130;6;uncraftable': this.findBySKU('130;6;uncraftable'),
            '528;6;uncraftable': this.findBySKU('528;6;uncraftable'),
            '406;6;uncraftable': this.findBySKU('406;6;uncraftable'),
            '265;6;uncraftable': this.findBySKU('265;6;uncraftable'),
            '1099;6;uncraftable': this.findBySKU('1099;6;uncraftable'),
            '998;6;uncraftable': this.findBySKU('998;6;uncraftable'),
            '449;6;uncraftable': this.findBySKU('449;6;uncraftable'),
            '140;6;uncraftable': this.findBySKU('140;6;uncraftable'),
            '1104;6;uncraftable': this.findBySKU('1104;6;uncraftable'),
            '405;6;uncraftable': this.findBySKU('405;6;uncraftable'),
            '772;6;uncraftable': this.findBySKU('772;6;uncraftable'),
            '1103;6;uncraftable': this.findBySKU('1103;6;uncraftable'),
            '40;6;uncraftable': this.findBySKU('40;6;uncraftable'),
            '402;6;uncraftable': this.findBySKU('402;6;uncraftable'),
            '730;6;uncraftable': this.findBySKU('730;6;uncraftable'),
            '228;6;uncraftable': this.findBySKU('228;6;uncraftable'),
            '36;6;uncraftable': this.findBySKU('36;6;uncraftable'),
            '608;6;uncraftable': this.findBySKU('608;6;uncraftable'),
            '312;6;uncraftable': this.findBySKU('312;6;uncraftable'),
            '1098;6;uncraftable': this.findBySKU('1098;6;uncraftable'),
            '441;6;uncraftable': this.findBySKU('441;6;uncraftable'),
            '305;6;uncraftable': this.findBySKU('305;6;uncraftable'),
            '215;6;uncraftable': this.findBySKU('215;6;uncraftable'),
            '127;6;uncraftable': this.findBySKU('127;6;uncraftable'),
            '45;6;uncraftable': this.findBySKU('45;6;uncraftable'),
            '1092;6;uncraftable': this.findBySKU('1092;6;uncraftable'),
            '141;6;uncraftable': this.findBySKU('141;6;uncraftable'),
            '752;6;uncraftable': this.findBySKU('752;6;uncraftable'),
            '56;6;uncraftable': this.findBySKU('56;6;uncraftable'),
            '811;6;uncraftable': this.findBySKU('811;6;uncraftable'),
            '1151;6;uncraftable': this.findBySKU('1151;6;uncraftable'),
            '414;6;uncraftable': this.findBySKU('414;6;uncraftable'),
            '308;6;uncraftable': this.findBySKU('308;6;uncraftable'),
            '996;6;uncraftable': this.findBySKU('996;6;uncraftable'),
            '526;6;uncraftable': this.findBySKU('526;6;uncraftable'),
            '41;6;uncraftable': this.findBySKU('41;6;uncraftable'),
            '513;6;uncraftable': this.findBySKU('513;6;uncraftable'),
            '412;6;uncraftable': this.findBySKU('412;6;uncraftable'),
            '1153;6;uncraftable': this.findBySKU('1153;6;uncraftable'),
            '594;6;uncraftable': this.findBySKU('594;6;uncraftable'),
            '588;6;uncraftable': this.findBySKU('588;6;uncraftable'),
            '741;6;uncraftable': this.findBySKU('741;6;uncraftable'),
            '997;6;uncraftable': this.findBySKU('997;6;uncraftable'),
            '237;6;uncraftable': this.findBySKU('237;6;uncraftable'),
            '220;6;uncraftable': this.findBySKU('220;6;uncraftable'),
            '448;6;uncraftable': this.findBySKU('448;6;uncraftable'),
            '230;6;uncraftable': this.findBySKU('230;6;uncraftable'),
            '424;6;uncraftable': this.findBySKU('424;6;uncraftable'),
            '527;6;uncraftable': this.findBySKU('527;6;uncraftable'),
            '60;6;uncraftable': this.findBySKU('60;6;uncraftable'),
            '59;6;uncraftable': this.findBySKU('59;6;uncraftable'),
            '304;6;uncraftable': this.findBySKU('304;6;uncraftable'),
            '450;6;uncraftable': this.findBySKU('450;6;uncraftable'),
            '38;6;uncraftable': this.findBySKU('38;6;uncraftable'),
            '326;6;uncraftable': this.findBySKU('326;6;uncraftable'),
            '939;6;uncraftable': this.findBySKU('939;6;uncraftable'),
            '461;6;uncraftable': this.findBySKU('461;6;uncraftable'),
            '325;6;uncraftable': this.findBySKU('325;6;uncraftable'),
            '232;6;uncraftable': this.findBySKU('232;6;uncraftable'),
            '317;6;uncraftable': this.findBySKU('317;6;uncraftable'),
            '327;6;uncraftable': this.findBySKU('327;6;uncraftable'),
            '356;6;uncraftable': this.findBySKU('356;6;uncraftable'),
            '447;6;uncraftable': this.findBySKU('447;6;uncraftable'),
            '128;6;uncraftable': this.findBySKU('128;6;uncraftable'),
            '775;6;uncraftable': this.findBySKU('775;6;uncraftable'),
            '589;6;uncraftable': this.findBySKU('589;6;uncraftable'),
            '426;6;uncraftable': this.findBySKU('426;6;uncraftable'),
            '132;6;uncraftable': this.findBySKU('132;6;uncraftable'),
            '355;6;uncraftable': this.findBySKU('355;6;uncraftable'),
            '331;6;uncraftable': this.findBySKU('331;6;uncraftable'),
            '239;6;uncraftable': this.findBySKU('239;6;uncraftable'),
            '142;6;uncraftable': this.findBySKU('142;6;uncraftable'),
            '357;6;uncraftable': this.findBySKU('357;6;uncraftable'),
            '656;6;uncraftable': this.findBySKU('656;6;uncraftable'),
            '221;6;uncraftable': this.findBySKU('221;6;uncraftable'),
            '153;6;uncraftable': this.findBySKU('153;6;uncraftable'),
            '329;6;uncraftable': this.findBySKU('329;6;uncraftable'),
            '43;6;uncraftable': this.findBySKU('43;6;uncraftable'),
            '739;6;uncraftable': this.findBySKU('739;6;uncraftable'),
            '416;6;uncraftable': this.findBySKU('416;6;uncraftable'),
            '813;6;uncraftable': this.findBySKU('813;6;uncraftable'),
            '482;6;uncraftable': this.findBySKU('482;6;uncraftable'),
            '154;6;uncraftable': this.findBySKU('154;6;uncraftable'),
            '404;6;uncraftable': this.findBySKU('404;6;uncraftable'),
            '457;6;uncraftable': this.findBySKU('457;6;uncraftable'),
            '214;6;uncraftable': this.findBySKU('214;6;uncraftable'),
            '44;6;uncraftable': this.findBySKU('44;6;uncraftable'),
            '172;6;uncraftable': this.findBySKU('172;6;uncraftable'),
            '609;6;uncraftable': this.findBySKU('609;6;uncraftable'),
            '401;6;uncraftable': this.findBySKU('401;6;uncraftable'),
            '348;6;uncraftable': this.findBySKU('348;6;uncraftable'),
            '413;6;uncraftable': this.findBySKU('413;6;uncraftable'),
            '155;6;uncraftable': this.findBySKU('155;6;uncraftable'),
            '649;6;uncraftable': this.findBySKU('649;6;uncraftable'),
            '349;6;uncraftable': this.findBySKU('349;6;uncraftable'),
            '593;6;uncraftable': this.findBySKU('593;6;uncraftable'),
            '171;6;uncraftable': this.findBySKU('171;6;uncraftable'),
            '37;6;uncraftable': this.findBySKU('37;6;uncraftable'),
            '307;6;uncraftable': this.findBySKU('307;6;uncraftable'),
            '173;6;uncraftable': this.findBySKU('173;6;uncraftable'),
            '310;6;uncraftable': this.findBySKU('310;6;uncraftable'),
            '648;6;uncraftable': this.findBySKU('648;6;uncraftable'),
            '225;6;uncraftable': this.findBySKU('225;6;uncraftable'),
            '810;6;uncraftable': this.findBySKU('810;6;uncraftable')
        };
    }

    private static createDictionary(items: EconItem[], schema: SchemaManager.Schema): UnknownDictionary<string[]> {
        const dict: UnknownDictionary<string[]> = {};

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const sku = item.getSKU(schema);
            (dict[sku] = dict[sku] || []).push(item.id);
        }

        return dict;
    }
};
