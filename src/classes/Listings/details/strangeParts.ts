import { StrangeParts } from '../../Options';

export default function replaceStrangeParts(name: string, opt: StrangeParts): string {
    return name
        .replace(/Robots Destroyed/, opt['Robots Destroyed'] ? opt['Robots Destroyed'] : 'Robots Destroyed')
        .replace(/Kills/, opt.Kills ? opt.Kills : 'Kills')
        .replace(
            /Airborne Enemy Kills/,
            opt['Airborne Enemy Kills'] ? opt['Airborne Enemy Kills'] : 'Airborne Enemy Kills'
        )
        .replace(/Damage Dealt/, opt['Damage Dealt'] ? opt['Damage Dealt'] : 'Damage Dealt')
        .replace(/Dominations/, opt.Dominations ? opt.Dominations : 'Dominations')
        .replace(/Snipers Killed/, opt['Snipers Killed'] ? opt['Snipers Killed'] : 'Snipers Killed')
        .replace(/Buildings Destroyed/, opt['Buildings Destroyed'] ? opt['Buildings Destroyed'] : 'Buildings Destroyed')
        .replace(
            /Projectiles Reflected/,
            opt['Projectiles Reflected'] ? opt['Projectiles Reflected'] : 'Projectiles Reflected'
        )
        .replace(/Headshot Kills/, opt['Headshot Kills'] ? opt['Headshot Kills'] : 'Headshot Kills')
        .replace(/Medics Killed/, opt['Medics Killed'] ? opt['Medics Killed'] : 'Medics Killed')
        .replace(/Fires Survived/, opt['Fires Survived'] ? opt['Fires Survived'] : 'Fires Survived')
        .replace(
            /Teammates Extinguished/,
            opt['Teammates Extinguished'] ? opt['Teammates Extinguished'] : 'Teammates Extinguished'
        )
        .replace(
            /Freezecam Taunt Appearances/,
            opt['Freezecam Taunt Appearances'] ? opt['Freezecam Taunt Appearances'] : 'Freezecam Taunt Appearances'
        )
        .replace(/Spies Killed/, opt['Spies Killed'] ? opt['Spies Killed'] : 'Spies Killed')
        .replace(/Allied Healing Done/, opt['Allied Healing Done'] ? opt['Allied Healing Done'] : 'Allied Healing Done')
        .replace(/Sappers Removed/, opt['Sappers Removed'] ? opt['Sappers Removed'] : 'Sappers Removed')
        .replace(/Players Hit/, opt['Players Hit'] ? opt['Players Hit'] : 'Players Hit')
        .replace(/Gib Kills/, opt['Gib Kills'] ? opt['Gib Kills'] : 'Gib Kills')
        .replace(/Scouts Killed/, opt['Scouts Killed'] ? opt['Scouts Killed'] : 'Scouts Killed')
        .replace(/Taunt Kills/, opt['Taunt Kills'] ? opt['Taunt Kills'] : 'Taunt Kills')
        .replace(/Point Blank Kills/, opt['Point Blank Kills'] ? opt['Point Blank Kills'] : 'Point Blank Kills')
        .replace(/Soldiers Killed/, opt['Soldiers Killed'] ? opt['Soldiers Killed'] : 'Soldiers Killed')
        .replace(/Long-Distance Kills/, opt['Long-Distance Kills'] ? opt['Long-Distance Kills'] : 'Long-Distance Kills')
        .replace(
            /Giant Robots Destroyed/,
            opt['Giant Robots Destroyed'] ? opt['Giant Robots Destroyed'] : 'Giant Robots Destroyed'
        )
        .replace(/Critical Kills/, opt['Critical Kills'] ? opt['Critical Kills'] : 'Critical Kills')
        .replace(/Demomen Killed/, opt['Demomen Killed'] ? opt['Demomen Killed'] : 'Demomen Killed')
        .replace(
            /Unusual-Wearing Player Kills/,
            opt['Unusual-Wearing Player Kills'] ? opt['Unusual-Wearing Player Kills'] : 'Unusual-Wearing Player Kills'
        )
        .replace(/Assists/, opt.Assists ? opt.Assists : 'Assists')
        .replace(
            /Medics Killed That Have Full ÜberCharge/,
            opt['Medics Killed That Have Full ÜberCharge']
                ? opt['Medics Killed That Have Full ÜberCharge']
                : 'Medics Killed That Have Full ÜberCharge'
        )
        .replace(
            /Cloaked Spies Killed/,
            opt['Cloaked Spies Killed'] ? opt['Cloaked Spies Killed'] : 'Cloaked Spies Killed'
        )
        .replace(/Engineers Killed/, opt['Engineers Killed'] ? opt['Engineers Killed'] : 'Engineers Killed')
        .replace(
            /Kills While Explosive-Jumping/,
            opt['Kills While Explosive-Jumping']
                ? opt['Kills While Explosive-Jumping']
                : 'Kills While Explosive-Jumping'
        )
        .replace(
            /Kills While Low Health/,
            opt['Kills While Low Health'] ? opt['Kills While Low Health'] : 'Kills While Low Health'
        )
        .replace(
            /Burning Player Kills/,
            opt['Burning Player Kills'] ? opt['Burning Player Kills'] : 'Burning Player Kills'
        )
        .replace(
            /Kills While Invuln ÜberCharged/,
            opt['Kills While Invuln ÜberCharged']
                ? opt['Kills While Invuln ÜberCharged']
                : 'Kills While Invuln ÜberCharged'
        )
        .replace(/Posthumous Kills/, opt['Posthumous Kills'] ? opt['Posthumous Kills'] : 'Posthumous Kills')
        .replace(
            /Not Crit nor MiniCrit Kills/,
            opt['Not Crit nor MiniCrit Kills'] ? opt['Not Crit nor MiniCrit Kills'] : 'Not Crit nor MiniCrit Kills'
        )
        .replace(/Full Health Kills/, opt['Full Health Kills'] ? opt['Full Health Kills'] : 'Full Health Kills')
        .replace(/Killstreaks Ended/, opt['Killstreaks Ended'] ? opt['Killstreaks Ended'] : 'Killstreaks Ended')
        .replace(/Defenders Killed/, opt['Defenders Killed'] ? opt['Defenders Killed'] : 'Defenders Killed')
        .replace(/Revenges/, opt.Revenges ? opt.Revenges : 'Revenges')
        .replace(
            /Robot Scouts Destroyed/,
            opt['Robot Scouts Destroyed'] ? opt['Robot Scouts Destroyed'] : 'Robot Scouts Destroyed'
        )
        .replace(/Heavies Killed/, opt['Heavies Killed'] ? opt['Heavies Killed'] : 'Heavies Killed')
        .replace(/Tanks Destroyed/, opt['Tanks Destroyed'] ? opt['Tanks Destroyed'] : 'Tanks Destroyed')
        .replace(
            /Kills During Halloween/,
            opt['Kills During Halloween'] ? opt['Kills During Halloween'] : 'Kills During Halloween'
        )
        .replace(/Pyros Killed/, opt['Pyros Killed'] ? opt['Pyros Killed'] : 'Pyros Killed')
        .replace(
            /Submerged Enemy Kills/,
            opt['Submerged Enemy Kills'] ? opt['Submerged Enemy Kills'] : 'Submerged Enemy Kills'
        )
        .replace(
            /Kills During Victory Time/,
            opt['Kills During Victory Time'] ? opt['Kills During Victory Time'] : 'Kills During Victory Time'
        )
        .replace(
            /Taunting Player Kills/,
            opt['Taunting Player Kills'] ? opt['Taunting Player Kills'] : 'Taunting Player Kills'
        )
        .replace(
            /Robot Spies Destroyed/,
            opt['Robot Spies Destroyed'] ? opt['Robot Spies Destroyed'] : 'Robot Spies Destroyed'
        )
        .replace(
            /Kills Under A Full Moon/,
            opt['Kills Under A Full Moon'] ? opt['Kills Under A Full Moon'] : 'Kills Under A Full Moon'
        )
        .replace(
            /Robots Killed During Halloween/,
            opt['Robots Killed During Halloween']
                ? opt['Robots Killed During Halloween']
                : 'Robots Killed During Halloween'
        );
}
