import { Schema } from 'tf2-schema-2';
import { Effect, Paints, StrangeParts } from '../../types/common';

export function getStrangeParts(schema: Schema): StrangeParts {
    const toObject: {
        [name: string]: string;
    } = {};

    // Filter out built-in parts and also filter repeated "Kills"
    const parts = schema.raw.schema.kill_eater_score_types.filter(
        part =>
            ![
                'Ubers',
                'Kill Assists',
                'Sentry Kills',
                'Sodden Victims',
                'Spies Shocked',
                'Heads Taken',
                'Humiliations',
                'Gifts Given',
                'Deaths Feigned',
                'Buildings Sapped',
                'Tickle Fights Won',
                'Opponents Flattened',
                'Food Items Eaten',
                'Banners Deployed',
                'Seconds Cloaked',
                'Health Dispensed to Teammates',
                'Teammates Teleported',
                'KillEaterEvent_UniquePlayerKills',
                'Points Scored',
                'Double Donks',
                'Teammates Whipped',
                'Wrangled Sentry Kills',
                'Carnival Kills',
                'Carnival Underworld Kills',
                'Carnival Games Won',
                'Contracts Completed',
                'Contract Points',
                'Contract Bonus Points',
                'Times Performed',
                'Kills and Assists during Invasion Event',
                'Kills and Assists on 2Fort Invasion',
                'Kills and Assists on Probed',
                'Kills and Assists on Byre',
                'Kills and Assists on Watergate',
                'Souls Collected',
                'Merasmissions Completed',
                'Halloween Transmutes Performed',
                'Power Up Canteens Used',
                'Contract Points Earned',
                'Contract Points Contributed To Friends'
            ].includes(part.type_name) && ![0, 97].includes(part.type)
    );

    for (let i = 0; i < parts.length; i++) {
        toObject[parts[i].type_name] = `sp${parts[i].type}`;
    }

    return toObject;
}

export function getPaints(schema: Schema): Paints {
    const paintCans = schema.raw.schema.items.filter(
        item => item.name.includes('Paint Can') && item.name !== 'Paint Can'
    );
    const toObject: {
        [name: string]: string;
    } = {};

    for (let i = 0; i < paintCans.length; i++) {
        if (paintCans[i].attributes === undefined) continue;

        toObject[paintCans[i].item_name] = `p${paintCans[i].attributes[0].value}`;
    }

    return toObject;
}

export function getUnusualEffects(schema: Schema): Effect[] {
    return schema.raw.schema.attribute_controlled_attached_particles.map(v => {
        return { name: v.name, id: v.id };
    });
}
