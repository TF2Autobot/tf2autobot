export const craftWeapons: { [charClass: string]: string[] } = {
    scout: [
        '45;6', // Force-A-Nature               == Scout/Primary ==
        '220;6', // Shortstop
        '448;6', // Soda Popper
        '772;6', // Baby Face's Blaster
        '1103;6', // Back Scatter
        '46;6', // Bonk! Atomic Punch           == Scout/Secondary ==
        '163;6', // Crit-a-Cola
        '222;6', // Mad Milk
        '449;6', // Winger
        '773;6', // Pretty Boy's Pocket Pistol
        '812;6', // Flying Guillotine
        '44;6', // Sandman                      == Scout/Melee ==
        '221;6', // Holy Mackerel
        '317;6', // Candy Cane
        '325;6', // Boston Basher
        '349;6', // Sun-on-a-Stick
        '355;6', // Fan O'War
        '450;6', // Atomizer
        '648;6' // Wrap Assassin
    ],
    soldier: [
        '127;6', // Direct Hit                  == Soldier/Primary ==
        '228;6', // Black Box
        '237;6', // Rocket Jumper
        '414;6', // Liberty Launcher
        '441;6', // Cow Mangler 5000
        '513;6', // Original
        '730;6', // Beggar's Bazooka
        '1104;6', // Air Strike
        '129;6', // Buff Banner                 == Soldier/Secondary ==
        '133;6', // Gunboats
        '226;6', // Battalion's Backup
        '354;6', // Concheror
        '415;6', // Reserve Shooter             - Shared - Soldier/Pyro
        '442;6', // Righteous Bison
        '1101;6', // B.A.S.E Jumper             - Shared - Soldier/Demoman
        '1153;6', // Panic Attack               - Shared - Soldier/Pyro/Heavy/Engineer
        '444;6', // Mantreads
        '128;6', // Equalizer                   == Soldier/Melee ==
        '154;6', // Pain Train                  - Shared - Soldier/Demoman
        '357;6', // Half-Zatoichi               - Shared - Soldier/Demoman
        '416;6', // Market Gardener
        '447;6', // Disciplinary Action
        '775;6' // Escape Plan
    ],
    pyro: [
        '40;6', // Backburner                   == Pyro/Primary ==
        '215;6', // Degreaser
        '594;6', // Phlogistinator
        '741;6', // Rainblower
        '1178;6', // Dragon's Fury
        '39;6', // Flare Gun                    == Pyro/Secondary ==
        '351;6', // Detonator
        '595;6', // Manmelter
        '740;6', // Scorch Shot
        '1179;6', // Thermal Thruster
        '1180;6', // Gas Passer
        '415;6', // Reserve Shooter             - Shared - Soldier/Pyro
        '1153;6', // Panic Attack               - Shared - Soldier/Pyro/Heavy/Engineer
        '38;6', // Axtinguisher                 == Pyro/Melee ==
        '153;6', // Homewrecker
        '214;6', // Powerjack
        '326;6', // Back Scratcher
        '348;6', // Sharpened Volcano Fragment
        '457;6', // Postal Pummeler
        '593;6', // Third Degree
        '739;6', // Lollichop
        '813;6', // Neon Annihilator
        '1181;6' // Hot Hand
    ],
    demoman: [
        '308;6', // Loch-n-Load                 == Demoman/Primary ==
        '405;6', // Ali Baba's Wee Booties
        '608;6', // Bootlegger
        '996;6', // Loose Cannon
        '1151;6', // Iron Bomber
        '130;6', // Scottish Resistance         == Demoman/Secondary ==
        '131;6', // Chargin' Targe
        '265;6', // Sticky Jumper
        '406;6', // Splendid Screen
        '1099;6', // Tide Turner
        '1150;6', // Quickiebomb Launcher
        '1101;6', // B.A.S.E Jumper             - Shared - Soldier/Demoman
        '132;6', // Eyelander                   == Demoman/Melee ==
        '172;6', // Scotsman's Skullcutter
        '307;6', // Ullapool Caber
        '327;6', // Claidheamh Mòr
        '404;6', // Persian Persuader
        '482;6', // Nessie's Nine Iron
        '609;6', // Scottish Handshake
        '154;6', // Pain Train                  - Shared - Soldier/Demoman
        '357;6' // Half-Zatoichi                - Shared - Soldier/Demoman
    ],
    heavy: [
        '41;6', // Natascha                     == Heavy/Primary ==
        '312;6', // Brass Beast
        '424;6', // Tomislav
        '811;6', // Huo-Long Heater
        '42;6', // Sandvich                     == Heavy/Secondary ==
        '159;6', // Dalokohs Bar
        '311;6', // Buffalo Steak Sandvich
        '425;6', // Family Business
        '1190;6', // Second Banana
        '1153;6', // Panic Attack               - Shared - Soldier/Pyro/Heavy/Engineer
        '43;6', // Killing Gloves of Boxing     == Heavy/Melee ==
        '239;6', // Gloves of Running Urgently
        '310;6', // Warrior's Spirit
        '331;6', // Fists of Steel
        '426;6', // Eviction Notice
        '656;6' // Holiday Punch
    ],
    engineer: [
        '141;6', // Frontier Justice            == Engineer/Primary ==
        '527;6', // Widowmaker
        '588;6', // Pomson 6000
        '997;6', // Rescue Ranger
        '140;6', // Wrangler                    == Engineer/Secondary ==
        '528;6', // Short Circuit
        '1153;6', // Panic Attack               - Shared - Soldier/Pyro/Heavy/Engineer
        '142;6', // Gunslinger                  == Engineer/Melee ==
        '155;6', // Southern Hospitality
        '329;6', // Jag
        '589;6' // Eureka Effect
    ],
    medic: [
        '36;6', // Blutsauger                   == Medic/Primary ==
        '305;6', // Crusader's Crossbow
        '412;6', // Overdose
        '35;6', // Kritzkrieg                   == Medic/Secondary ==
        '411;6', // Quick-Fix
        '998;6', // Vaccinator
        '37;6', // Ubersaw                      == Medic/Melee ==
        '173;6', // Vita-Saw
        '304;6', // Amputator
        '413;6' // Solemn Vow
    ],
    sniper: [
        '56;6', // Huntsman                     == Sniper/Primary ==
        '230;6', // Sydney Sleeper
        '402;6', // Bazaar Bargain
        '526;6', // Machina
        '752;6', // Hitman's Heatmaker
        '1092;6', // Fortified Compound
        '1098;6', // Classic
        '57;6', // Razorback                    == Sniper/Secondary ==
        '58;6', // Jarate
        '231;6', // Darwin's Danger Shield
        '642;6', // Cozy Camper
        '751;6', // Cleaner's Carbine
        '171;6', // Tribalman's Shiv            == Sniper/Melee ==
        '232;6', // Bushwacka
        '401;6' // Shahanshah
    ],
    spy: [
        '61;6', // Ambassador                   == Spy/Primary ==
        '224;6', // L'Etranger
        '460;6', // Enforcer
        '525;6', // Diamondback
        '225;6', // Your Eternal Reward         == Spy/Melee ==
        '356;6', // Conniver's Kunai
        '461;6', // Big Earner
        '649;6', // Spy-cicle
        '810;6', // Red-Tape Recorder           == Spy/PDA ==
        '60;6', // Cloak and Dagger             == Spy/PDA2 ==
        '59;6' // Dead Ringer
    ]
};

export const craftAll = [
    '45;6', // Force-A-Nature               == Scout/Primary ==
    '220;6', // Shortstop
    '448;6', // Soda Popper
    '772;6', // Baby Face's Blaster
    '1103;6', // Back Scatter
    '46;6', // Bonk! Atomic Punch           == Scout/Secondary ==
    '163;6', // Crit-a-Cola
    '222;6', // Mad Milk
    '449;6', // Winger
    '773;6', // Pretty Boy's Pocket Pistol
    '812;6', // Flying Guillotine
    '44;6', // Sandman                      == Scout/Melee ==
    '221;6', // Holy Mackerel
    '317;6', // Candy Cane
    '325;6', // Boston Basher
    '349;6', // Sun-on-a-Stick
    '355;6', // Fan O'War
    '450;6', // Atomizer
    '648;6', // Wrap Assassin
    '127;6', // Direct Hit                  == Soldier/Primary ==
    '228;6', // Black Box
    '237;6', // Rocket Jumper
    '414;6', // Liberty Launcher
    '441;6', // Cow Mangler 5000
    '513;6', // Original
    '730;6', // Beggar's Bazooka
    '1104;6', // Air Strike
    '129;6', // Buff Banner                 == Soldier/Secondary ==
    '133;6', // Gunboats
    '226;6', // Battalion's Backup
    '354;6', // Concheror
    '415;6', // Reserve Shooter             - Shared - Soldier/Pyro
    '442;6', // Righteous Bison
    '1101;6', // B.A.S.E Jumper             - Shared - Soldier/Demoman
    '1153;6', // Panic Attack               - Shared - Soldier/Pyro/Heavy/Engineer
    '444;6', // Mantreads
    '128;6', // Equalizer                   == Soldier/Melee ==
    '154;6', // Pain Train                  - Shared - Soldier/Demoman
    '357;6', // Half-Zatoichi               - Shared - Soldier/Demoman
    '416;6', // Market Gardener
    '447;6', // Disciplinary Action
    '775;6', // Escape Plan
    '40;6', // Backburner                   == Pyro/Primary ==
    '215;6', // Degreaser
    '594;6', // Phlogistinator
    '741;6', // Rainblower
    '1178;6', // Dragon's Fury
    '39;6', // Flare Gun                    == Pyro/Secondary ==
    '351;6', // Detonator
    '595;6', // Manmelter
    '740;6', // Scorch Shot
    '1179;6', // Thermal Thruster
    '1180;6', // Gas Passer
    '38;6', // Axtinguisher                 == Pyro/Melee ==
    '153;6', // Homewrecker
    '214;6', // Powerjack
    '326;6', // Back Scratcher
    '348;6', // Sharpened Volcano Fragment
    '457;6', // Postal Pummeler
    '593;6', // Third Degree
    '739;6', // Lollichop
    '813;6', // Neon Annihilator
    '1181;6', // Hot Hand
    '308;6', // Loch-n-Load                 == Demoman/Primary ==
    '405;6', // Ali Baba's Wee Booties
    '608;6', // Bootlegger
    '996;6', // Loose Cannon
    '1151;6', // Iron Bomber
    '130;6', // Scottish Resistance         == Demoman/Secondary ==
    '131;6', // Chargin' Targe
    '265;6', // Sticky Jumper
    '406;6', // Splendid Screen
    '1099;6', // Tide Turner
    '1150;6', // Quickiebomb Launcher
    '132;6', // Eyelander                   == Demoman/Melee ==
    '172;6', // Scotsman's Skullcutter
    '307;6', // Ullapool Caber
    '327;6', // Claidheamh Mòr
    '404;6', // Persian Persuader
    '482;6', // Nessie's Nine Iron
    '609;6', // Scottish Handshake
    '41;6', // Natascha                     == Heavy/Primary ==
    '312;6', // Brass Beast
    '424;6', // Tomislav
    '811;6', // Huo-Long Heater
    '42;6', // Sandvich                     == Heavy/Secondary ==
    '159;6', // Dalokohs Bar
    '311;6', // Buffalo Steak Sandvich
    '425;6', // Family Business
    '1190;6', // Second Banana
    '43;6', // Killing Gloves of Boxing     == Heavy/Melee ==
    '239;6', // Gloves of Running Urgently
    '310;6', // Warrior's Spirit
    '331;6', // Fists of Steel
    '426;6', // Eviction Notice
    '656;6', // Holiday Punch
    '141;6', // Frontier Justice            == Engineer/Primary ==
    '527;6', // Widowmaker
    '588;6', // Pomson 6000
    '997;6', // Rescue Ranger
    '140;6', // Wrangler                    == Engineer/Secondary ==
    '528;6', // Short Circuit
    '142;6', // Gunslinger                  == Engineer/Melee ==
    '155;6', // Southern Hospitality
    '329;6', // Jag
    '589;6', // Eureka Effect
    '36;6', // Blutsauger                   == Medic/Primary ==
    '305;6', // Crusader's Crossbow
    '412;6', // Overdose
    '35;6', // Kritzkrieg                   == Medic/Secondary ==
    '411;6', // Quick-Fix
    '998;6', // Vaccinator
    '37;6', // Ubersaw                      == Medic/Melee ==
    '173;6', // Vita-Saw
    '304;6', // Amputator
    '413;6', // Solemn Vow
    '56;6', // Huntsman                     == Sniper/Primary ==
    '230;6', // Sydney Sleeper
    '402;6', // Bazaar Bargain
    '526;6', // Machina
    '752;6', // Hitman's Heatmaker
    '1092;6', // Fortified Compound
    '1098;6', // Classic
    '57;6', // Razorback                    == Sniper/Secondary ==
    '58;6', // Jarate
    '231;6', // Darwin's Danger Shield
    '642;6', // Cozy Camper
    '751;6', // Cleaner's Carbine
    '171;6', // Tribalman's Shiv            == Sniper/Melee ==
    '232;6', // Bushwacka
    '401;6', // Shahanshah
    '61;6', // Ambassador                   == Spy/Primary ==
    '224;6', // L'Etranger
    '460;6', // Enforcer
    '525;6', // Diamondback
    '225;6', // Your Eternal Reward         == Spy/Melee ==
    '356;6', // Conniver's Kunai
    '461;6', // Big Earner
    '649;6', // Spy-cicle
    '810;6', // Red-Tape Recorder           == Spy/PDA ==
    '60;6', // Cloak and Dagger             == Spy/PDA2 ==
    '59;6' // Dead Ringer
];

export const uncraftAll = [
    '45;6;uncraftable', // Force-A-Nature               == Scout/Primary ==
    '220;6;uncraftable', // Shortstop
    '448;6;uncraftable', // Soda Popper
    '772;6;uncraftable', // Baby Face's Blaster
    '1103;6;uncraftable', // Back Scatter
    '46;6;uncraftable', // Bonk! Atomic Punch           == Scout/Secondary ==
    '163;6;uncraftable', // Crit-a-Cola
    '222;6;uncraftable', // Mad Milk
    '449;6;uncraftable', // Winger
    '773;6;uncraftable', // Pretty Boy's Pocket Pistol
    '812;6;uncraftable', // Flying Guillotine
    '44;6;uncraftable', // Sandman                      == Scout/Melee ==
    '221;6;uncraftable', // Holy Mackerel
    '317;6;uncraftable', // Candy Cane
    '325;6;uncraftable', // Boston Basher
    '349;6;uncraftable', // Sun-on-a-Stick
    '355;6;uncraftable', // Fan O'War
    '450;6;uncraftable', // Atomizer
    '648;6;uncraftable', // Wrap Assassin
    '127;6;uncraftable', // Direct Hit                  == Soldier/Primary ==
    '228;6;uncraftable', // Black Box
    '237;6;uncraftable', // Rocket Jumper
    '414;6;uncraftable', // Liberty Launcher
    '441;6;uncraftable', // Cow Mangler 5000
    '513;6;uncraftable', // Original
    '730;6;uncraftable', // Beggar's Bazooka
    '1104;6;uncraftable', // Air Strike
    '129;6;uncraftable', // Buff Banner                 == Soldier/Secondary ==
    '133;6;uncraftable', // Gunboats
    '226;6;uncraftable', // Battalion's Backup
    '354;6;uncraftable', // Concheror
    '415;6;uncraftable', // Reserve Shooter             - Shared - Soldier/Pyro
    '442;6;uncraftable', // Righteous Bison
    '1101;6;uncraftable', // B.A.S.E Jumper             - Shared - Soldier/Demoman
    '1153;6;uncraftable', // Panic Attack               - Shared - Soldier/Pyro/Heavy/Engineer
    '444;6;uncraftable', // Mantreads
    '128;6;uncraftable', // Equalizer                   == Soldier/Melee ==
    '154;6;uncraftable', // Pain Train                  - Shared - Soldier/Demoman
    '357;6;uncraftable', // Half-Zatoichi               - Shared - Soldier/Demoman
    '416;6;uncraftable', // Market Gardener
    '447;6;uncraftable', // Disciplinary Action
    '775;6;uncraftable', // Escape Plan
    '40;6;uncraftable', // Backburner                   == Pyro/Primary ==
    '215;6;uncraftable', // Degreaser
    '594;6;uncraftable', // Phlogistinator
    '741;6;uncraftable', // Rainblower
    '39;6;uncraftable', // Flare Gun                    == Pyro/Secondary ==
    '351;6;uncraftable', // Detonator
    '595;6;uncraftable', // Manmelter
    '740;6;uncraftable', // Scorch Shot
    '38;6;uncraftable', // Axtinguisher                 == Pyro/Melee ==
    '153;6;uncraftable', // Homewrecker
    '214;6;uncraftable', // Powerjack
    '326;6;uncraftable', // Back Scratcher
    '348;6;uncraftable', // Sharpened Volcano Fragment
    '457;6;uncraftable', // Postal Pummeler
    '593;6;uncraftable', // Third Degree
    '739;6;uncraftable', // Lollichop
    '813;6;uncraftable', // Neon Annihilator
    '308;6;uncraftable', // Loch-n-Load                 == Demoman/Primary ==
    '405;6;uncraftable', // Ali Baba's Wee Booties
    '608;6;uncraftable', // Bootlegger
    '996;6;uncraftable', // Loose Cannon
    '1151;6;uncraftable', // Iron Bomber
    '130;6;uncraftable', // Scottish Resistance         == Demoman/Secondary ==
    '131;6;uncraftable', // Chargin' Targe
    '265;6;uncraftable', // Sticky Jumper
    '406;6;uncraftable', // Splendid Screen
    '1099;6;uncraftable', // Tide Turner
    '1150;6;uncraftable', // Quickiebomb Launcher
    '132;6;uncraftable', // Eyelander                   == Demoman/Melee ==
    '172;6;uncraftable', // Scotsman's Skullcutter
    '307;6;uncraftable', // Ullapool Caber
    '327;6;uncraftable', // Claidheamh Mòr
    '404;6;uncraftable', // Persian Persuader
    '482;6;uncraftable', // Nessie's Nine Iron
    '609;6;uncraftable', // Scottish Handshake
    '41;6;uncraftable', // Natascha                     == Heavy/Primary ==
    '312;6;uncraftable', // Brass Beast
    '424;6;uncraftable', // Tomislav
    '811;6;uncraftable', // Huo-Long Heater
    '42;6;uncraftable', // Sandvich                     == Heavy/Secondary ==
    '159;6;uncraftable', // Dalokohs Bar
    '311;6;uncraftable', // Buffalo Steak Sandvich
    '425;6;uncraftable', // Family Business
    '43;6;uncraftable', // Killing Gloves of Boxing     == Heavy/Melee ==
    '239;6;uncraftable', // Gloves of Running Urgently
    '310;6;uncraftable', // Warrior's Spirit
    '331;6;uncraftable', // Fists of Steel
    '426;6;uncraftable', // Eviction Notice
    '656;6;uncraftable', // Holiday Punch
    '141;6;uncraftable', // Frontier Justice            == Engineer/Primary ==
    '527;6;uncraftable', // Widowmaker
    '588;6;uncraftable', // Pomson 6000
    '997;6;uncraftable', // Rescue Ranger
    '140;6;uncraftable', // Wrangler                    == Engineer/Secondary ==
    '528;6;uncraftable', // Short Circuit
    '142;6;uncraftable', // Gunslinger                  == Engineer/Melee ==
    '155;6;uncraftable', // Southern Hospitality
    '329;6;uncraftable', // Jag
    '589;6;uncraftable', // Eureka Effect
    '36;6;uncraftable', // Blutsauger                   == Medic/Primary ==
    '305;6;uncraftable', // Crusader's Crossbow
    '412;6;uncraftable', // Overdose
    '35;6;uncraftable', // Kritzkrieg                   == Medic/Secondary ==
    '411;6;uncraftable', // Quick-Fix
    '998;6;uncraftable', // Vaccinator
    '37;6;uncraftable', // Ubersaw                      == Medic/Melee ==
    '173;6;uncraftable', // Vita-Saw
    '304;6;uncraftable', // Amputator
    '413;6;uncraftable', // Solemn Vow
    '56;6;uncraftable', // Huntsman                     == Sniper/Primary ==
    '230;6;uncraftable', // Sydney Sleeper
    '402;6;uncraftable', // Bazaar Bargain
    '526;6;uncraftable', // Machina
    '752;6;uncraftable', // Hitman's Heatmaker
    '1092;6;uncraftable', // Fortified Compound
    '1098;6;uncraftable', // Classic
    '57;6;uncraftable', // Razorback                    == Sniper/Secondary ==
    '58;6;uncraftable', // Jarate
    '231;6;uncraftable', // Darwin's Danger Shield
    '642;6;uncraftable', // Cozy Camper
    '751;6;uncraftable', // Cleaner's Carbine
    '171;6;uncraftable', // Tribalman's Shiv            == Sniper/Melee ==
    '232;6;uncraftable', // Bushwacka
    '401;6;uncraftable', // Shahanshah
    '61;6;uncraftable', // Ambassador                   == Spy/Primary ==
    '224;6;uncraftable', // L'Etranger
    '460;6;uncraftable', // Enforcer
    '525;6;uncraftable', // Diamondback
    '225;6;uncraftable', // Your Eternal Reward         == Spy/Melee ==
    '356;6;uncraftable', // Conniver's Kunai
    '461;6;uncraftable', // Big Earner
    '649;6;uncraftable', // Spy-cicle
    '810;6;uncraftable', // Red-Tape Recorder           == Spy/PDA ==
    '60;6;uncraftable', // Cloak and Dagger             == Spy/PDA2 ==
    '59;6;uncraftable' // Dead Ringer
];

export const noiseMakers: { [sku: string]: string } = {
    '280;6': 'Noise Maker - Black Cat',
    '280;6;uncraftable': 'Non-Craftable Noise Maker - Black Cat',
    '281;6': 'Noise Maker - Gremlin',
    '281;6;uncraftable': 'Non-Craftable Noise Maker - Gremlin',
    '282;6': 'Noise Maker - Werewolf',
    '282;6;uncraftable': 'Non-Craftable Noise Maker - Werewolf',
    '283;6': 'Noise Maker - Witch',
    '283;6;uncraftable': 'Non-Craftable Noise Maker - Witch',
    '284;6': 'Noise Maker - Banshee',
    '284;6;uncraftable': 'Non-Craftable Noise Maker - Banshee',
    '286;6': 'Noise Maker - Crazy Laugh',
    '286;6;uncraftable': 'Non-Craftable Noise Maker - Crazy Laugh',
    '288;6': 'Noise Maker - Stabby',
    '288;6;uncraftable': 'Non-Craftable Noise Maker - Stabby',
    '362;6': 'Noise Maker - Bell',
    '362;6;uncraftable': 'Non-Craftable Noise Maker - Bell',
    '364;6': 'Noise Maker - Gong',
    '364;6;uncraftable': 'Non-Craftable Noise Maker - Gong',
    '365;6': 'Noise Maker - Koto',
    '365;6;uncraftable': 'Non-Craftable Noise Maker - Koto',
    '365;1': 'Genuine Noise Maker - Koto',
    '493;6': 'Noise Maker - Fireworks',
    '493;6;uncraftable': 'Non-Craftable Noise Maker - Fireworks',
    '542;6': 'Noise Maker - Vuvuzela',
    '542;6;uncraftable': 'Non-Craftable Noise Maker - Vuvuzela',
    '542;1': 'Genuine Noise Maker - Vuvuzela'
};

// export const strangePartsData: { [name: string]: number } = {
//     // Most Strange Parts name will change once applied/attached.
//     'Robots Destroyed': 6026 (sp39), //              checked               ----- more than 1 keys ↓
//     Kills: 6060 (sp87), //                           checked
//     'Airborne Enemy Kills': 6012 (sp22), //          was "Airborne Enemies Killed"
//     'Damage Dealt': 6056 (sp82), //                  checked
//     Dominations: 6016 (sp28), //                     was "Domination Kills"
//     'Snipers Killed': 6005 (sp11), //                checked
//     'Buildings Destroyed': 6009 (sp19), //           checked
//     'Projectiles Reflected': 6010 (sp20), //         checked
//     'Headshot Kills': 6011 (sp21), //                checked
//     'Medics Killed': 6007 (sp18), //                 checked
//     'Fires Survived': 6057 (sp83), //                checked
//     'Teammates Extinguished': 6020 (sp32), //        checked
//     'Freezecam Taunt Appearances': 6055 (sp81), //   checked
//     'Spies Killed': 6008 (sp16), //                  checked
//     'Allied Healing Done': 6058 (sp84), //           checked
//     'Sappers Removed': 6025 (sp36), //               was "Sappers Destroyed"
//     'Players Hit': 6064 (sp94), //                   was "Player Hits"
//     'Gib Kills': 6013 (sp23), //                     checked
//     'Scouts Killed': 6003 (sp10), //                 checked
//     'Taunt Kills': 6051 (sp77), //                   was "Kills with a Taunt Attack"
//     'Point Blank Kills': 6059 (sp85), //             was "Point-Blank Kills"
//     'Soldiers Killed': 6002 (sp12), //               checked               ----- more than 1 keys ↑
//     'Long-Distance Kills': 6039 (sp62), //           checked
//     'Giant Robots Destroyed': 6028 (sp40), //        checked
//     'Critical Kills': 6021 (sp33), //                checked
//     'Demomen Killed': 6001 (sp13), //                checked
//     'Unusual-Wearing Player Kills': 6052 (sp78), //  checked
//     Assists: 6065 (sp95), //                         checked
//     'Medics Killed That Have Full ÜberCharge': 6023 (sp38), // checked
//     'Cloaked Spies Killed': 6024 (sp37), //          checked
//     'Engineers Killed': 6004 (sp17), //              checked
//     'Kills While Explosive-Jumping': 6022 (sp34), // was "Kills While Explosive Jumping"
//     'Kills While Low Health': 6032 (sp44), //        was "Low-Health Kills"
//     'Burning Player Kills': 6053 (sp79), //          was "Burning Enemy Kills"
//     'Kills While Invuln ÜberCharged': 6037 (sp49), // was "Kills While Übercharged"
//     'Posthumous Kills': 6019 (sp31), //              checked
//     'Not Crit nor MiniCrit Kills': 6063 (sp93), //   checked
//     'Full Health Kills': 6061 (sp88), //             checked
//     'Killstreaks Ended': 6054 (sp80), //             checked
//     'Defenders Killed': 6035 (sp47), //              was "Defender Kills"
//     Revenges: 6018 (sp30), //                        was "Revenge Kills"
//     'Robot Scouts Destroyed': 6042 (sp68), //        checked
//     'Heavies Killed': 6000 (sp14), //                checked
//     'Tanks Destroyed': 6038 (sp61), //               checked
//     'Kills During Halloween': 6033 (sp45), //        was "Halloween Kills"
//     'Pyros Killed': 6006 (sp15), //                  checked
//     'Submerged Enemy Kills': 6036 (sp48), //         was "Underwater Kills"
//     'Kills During Victory Time': 6041 (sp67), //     checked
//     'Taunting Player Kills': 6062 (sp89), //         checked
//     'Robot Spies Destroyed': 6048 (sp74), //         checked
//     'Kills Under A Full Moon': 6015 (sp27), //       was "Full Moon Kills"
//     'Robots Killed During Halloween': 6034 (sp46) // was "Robots Destroyed During Halloween"
// };

export const sheensData: { [name: string]: string } = {
    'Team Shine': 'ks-1',
    'Deadly Daffodil': 'ks-2',
    Manndarin: 'ks-3',
    'Mean Green': 'ks-4',
    'Agonizing Emerald': 'ks-5',
    'Villainous Violet': 'ks-6',
    'Hot Rod': 'ks-7'
};

export const killstreakersData: { [name: string]: string } = {
    'Fire Horns': 'ke-2002',
    'Cerebral Discharge': 'ke-2002',
    Tornado: 'ke-2002',
    Flames: 'ke-2002',
    Singularity: 'ke-2002',
    Incinerator: 'ke-2002',
    'Hypno-Beam': 'ke-2002'
};

// Replaced with a function to generate this.
// export const paintedData: { [name: string]: string } = {
//     'A Color Similar to Slate': 'p3100495',
//     'A Deep Commitment to Purple': 'p8208497',
//     'A Distinctive Lack of Hue': 'p1315860',
//     "A Mann's Mint": 'p12377523',
//     'After Eight': 'p2960676',
//     'Aged Moustache Grey': 'p8289918',
//     'An Extraordinary Abundance of Tinge': 'p15132390',
//     'Australium Gold': 'p15185211',
//     'Color No. 216-190-216': 'p14204632',
//     'Dark Salmon Injustice': 'p15308410',
//     'Drably Olive': 'p8421376',
//     'Indubitably Green': 'p7511618',
//     'Mann Co. Orange': 'p13595446',
//     Muskelmannbraun: 'p10843461',
//     "Noble Hatter's Violet": 'p5322826',
//     'Peculiarly Drab Tincture': 'p12955537',
//     'Pink as Hell': 'p16738740',
//     'Radigan Conagher Brown': 'p6901050',
//     'The Bitter Taste of Defeat and Lime': 'p3329330',
//     "The Color of a Gentlemann's Business Pants": 'p15787660',
//     'Ye Olde Rustic Colour': 'p8154199',
//     "Zepheniah's Greed": 'p4345659',
//     'An Air of Debonair': 'p6637376',
//     'Balaclavas Are Forever': 'p3874595',
//     'Cream Spirit': 'p12807213',
//     "Operator's Overalls": 'p4732984',
//     'Team Spirit': 'p12073019',
//     'The Value of Teamwork': 'p8400928',
//     'Waterlogged Lab Coat': 'p11049612'
// };

export const spellsData: { [name: string]: string } = {
    'Team Spirit Footprints': 's-1000',
    'Gangreen Footprints': 's-1001',
    'Corpse Gray Footprints': 's-1002',
    'Violent Violet Footprints': 's-1003',
    'Rotten Orange Footprints': 's-1004',
    'Bruised Purple Footprints': 's-1005',
    'Headless Horseshoes': 's-1006',
    'Putrescent Pigmentation': 's-2000',
    'Die Job': 's-2001',
    'Chromatic Corruption': 's-2002',
    'Spectral Spectrum': 's-2003',
    'Sinister Staining': 's-2004',
    'Voices From Below': 's-3000',
    Exorcism: 's-4000',
    'Pumpkin Bomb': 's-5000',
    'Halloween Fire': 's-6000'
};

// const otherCrates = {
//     5048: 6, // Festive Winter Crate #6
//     5066: 22, // Refreshing Summer Cooler #22
//     5070: 35, // Naughty Winter Crate #35
//     5071: 36, // Nice Winter Crate #36
//     5078: 46, // Scorched Crate #46
//     5080: 48, // Fall Crate #48
//     5627: 51, // Eerie Crate #51
//     5629: 52, // Naughty Winter Crate 2012 #52
//     5630: 53, // Nice Winter Crate 2012 #53
//     5635: 58, // Robo Community Crate #58
//     5660: 60, // Select Reserve Mann Co. Supply Crate #60
//     5640: 61, // Summer Appetizer Crate #61
//     5642: 62, // Red Summer 2013 Cooler #62
//     5644: 63, // Orange Summer 2013 Cooler #63
//     5646: 64, // Yellow Summer 2013 Cooler #64
//     5648: 65, // Green Summer 2013 Cooler #65
//     5650: 66, // Aqua Summer 2013 Cooler #66
//     5652: 67, // Blue Summer 2013 Cooler #67
//     5654: 68, // Brown Summer 2013 Cooler #68
//     5656: 69, // Black Summer 2013 Cooler #69 // No #70
//     5708: 72, // Fall 2013 Acorns Crate #72
//     5709: 73, // Fall 2013 Gourd Crate #73
//     5712: 74, // Spooky Crate #74
//     5714: 78, // Naughty Winter Crate 2013 #78
//     5715: 79, // Nice Winter Crate 2013 #79 // No #80
//     5719: 81, // Mann Co. Strongbox #81
//     5734: 82, // Mann Co. Munition Crate #82
//     5735: 83, // Mann Co. Munition Crate #83
//     5742: 84, // Mann Co. Munition Crate #84
//     5752: 85, // Mann Co. Munition Crate #85
//     5761: 86, // Limited Late Summer Crate #86
//     5774: 87, // End of the Line Community Crate #87
//     5789: 88, // Naughty Winter Crate 2014 #88
//     5790: 89, // Nice Winter Crate 2014 #89
//     5781: 90, // Mann Co. Munition Crate #90
//     5802: 91, // Mann Co. Munition Crate #91
//     5803: 92, // Mann Co. Munition Crate #92
//     5806: 93, // The Concealed Killer Weapons Case #93
//     5807: 94, // The Powerhouse Weapons Case #94
//     5817: 95, // Gun Mettle Cosmetic Case #95
//     5822: 96, // Quarantined Collection Case #96
//     5823: 97, // Confidential Collection Case #97
//     5828: 98, // Gargoyle Case #98
//     5831: 99, // Pyroland Weapons Case #99
//     5832: 100, // Warbird Weapons Case #100
//     5842: 101, // Tough Break Cosmetic Case #101
//     5849: 102, // Mayflower Cosmetic Case #102
//     5859: 103, // Mann Co. Munition Crate #103
//     5861: 104, // Creepy Crawly Case #104
//     5865: 105, // Unlocked Winter 2016 Cosmetic Case #105
//     5867: 106, // Rainy Day Cosmetic Case #106
//     5871: 107, // Abominable Cosmetic Case #107
//     5875: 108, // Unleash the Beast Cosmetic Case #108
//     5883: 109, // Jungle Jackpot War Paint Case #109
//     5885: 110, // Infernal Reward War Paint Case #110
//     18000: 111, // 'Decorated War Hero' War Paint\nCivilian Grade Keyless Case
//     18001: 112, // 'Decorated War Hero' War Paint\nFreelance Grade Keyless Case
//     18002: 113, // 'Decorated War Hero' War Paint\nMercenary Grade Keyless Case
//     18003: 114, // 'Contract Campaigner' War Paint\nCivilian Grade Keyless Case
//     18004: 115, // 'Contract Campaigner' War Paint\nFreelance Grade Keyless Case
//     18005: 116, // 'Contract Campaigner' War Paint\nMercenary Grade Keyless Case
//     5888: 117, // Winter 2017 Cosmetic Case #117
//     5890: 118, // Winter 2017 War Paint Case #118
//     5893: 119, // Blue Moon Cosmetic Case #119
//     5894: 120, // Violet Vermin Case #120
//     5897: 121, // Scream Fortress X War Paint Case #121
//     5902: 122, // Winter 2018 Cosmetic Case #122
//     5904: 123, // Summer 2019 Cosmetic Case #123
//     5905: 124, // Spooky Spoils Case #124
//     5909: 125, // Winter 2019 Cosmetic Case #125
//     5912: 126, // Winter 2019 War Paint Case #126
//     5914: 127, // Summer 2020 Cosmetic Case #127
//     5915: 128, // Wicked Windfall Case #128
//     5918: 129 // Scream Fortress XII War Paint Case #129
// };
