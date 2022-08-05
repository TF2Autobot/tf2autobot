import Bot from '../../Bot';

export interface CraftWeaponsBySlot {
    [slot: string]: string[];
}

export type ClassesForCraftableWeapons =
    | 'scout'
    | 'soldier'
    | 'pyro'
    | 'demoman'
    | 'heavy'
    | 'engineer'
    | 'medic'
    | 'sniper'
    | 'spy';

export type SlotsForCraftableWeapons = 'primary' | 'secondary' | 'melee' | 'pda2';

export default async function craftClassWeapons(bot: Bot): Promise<void> {
    if (!bot.options.crafting.weapons.enable) {
        return;
    }
    const currencies = bot.inventoryManager.getInventory.getCurrencies(bot.craftWeapons, false);

    await Promise.all(
        ['scout', 'soldier', 'pyro', 'demoman', 'heavy', 'engineer', 'medic', 'sniper', 'spy'].map(classChar =>
            craftEachClassWeapons(bot, bot.craftWeaponsByClass[classChar as ClassesForCraftableWeapons], currencies)
        )
    );
}

function craftEachClassWeapons(bot: Bot, weapons: string[], currencies: { [sku: string]: string[] }): Promise<void> {
    return new Promise(resolve => {
        let stopLoop = false;

        const weaponsCount = weapons.length;

        for (let i = 0; i < weaponsCount; i++) {
            // first loop
            // check if that weapon1 only have 1 in inventory AND it's not in pricelist
            const isWep1 =
                currencies[weapons[i]].length === 1 &&
                bot.pricelist.getPrice({ priceKey: weapons[i], onlyEnabled: true }) === null;

            for (let j = 0; j < weaponsCount; j++) {
                if (j === i) {
                    // second loop inside first loop, but ignore same index (same weapons)
                    continue;
                }
                const isWep2 =
                    currencies[weapons[j]].length === 1 &&
                    bot.pricelist.getPrice({ priceKey: weapons[j], onlyEnabled: true }) === null;

                if (isWep1 && isWep2) {
                    // if both are different weapons and both wep1 and wep2 conditions are true, call combine function
                    bot.tf2gc.combineClassWeapon([weapons[i], weapons[j]]);
                    stopLoop = true;
                    break;
                }
            }

            if (stopLoop) {
                break;
            }
        }
        return resolve();
    });
}
