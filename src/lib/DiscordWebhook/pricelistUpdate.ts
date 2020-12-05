import SKU from 'tf2-sku-2';
import SchemaManager from 'tf2-schema-2';

import { Webhook, sendWebhook } from './export';

import log from '../logger';

import { Entry } from '../../classes/Pricelist';
import Options from '../../classes/Options';

import { paintCan, australiumImageURL, qualityColor } from '../../lib/data';

export default function sendWebHookPriceUpdateV1(
    sku: string,
    name: string,
    newPrice: Entry,
    time: string,
    schema: SchemaManager.Schema,
    options: Options
): void {
    const parts = sku.split(';');
    const newSku = parts[0] + ';6';
    const newItem = SKU.fromString(newSku);
    const newName = schema.getName(newItem, false);

    const itemImageUrl = schema.getItemByItemName(newName);

    let itemImageUrlPrint: string;

    const item = SKU.fromString(sku);

    if (!itemImageUrl || !item) {
        itemImageUrlPrint = 'https://jberlife.com/wp-content/uploads/2019/07/sorry-image-not-available.jpg';
    } else if (Object.keys(paintCan).includes(newSku)) {
        itemImageUrlPrint = `https://steamcommunity-a.akamaihd.net/economy/image/IzMF03bi9WpSBq-S-ekoE33L-iLqGFHVaU25ZzQNQcXdEH9myp0erksICf${
            paintCan[newSku] as string
        }512fx512f`;
    } else if (item.australium === true) {
        const australiumSKU = parts[0] + ';11;australium';
        itemImageUrlPrint = `https://steamcommunity-a.akamaihd.net/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgE${
            australiumImageURL[australiumSKU] as string
        }512fx512f`;
    } else if (item.defindex === 266) {
        itemImageUrlPrint =
            'https://steamcommunity-a.akamaihd.net/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEIUw8UXB_2uTNGmvfqDOCLDa5Zwo03sMhXgDQ_xQciY7vmYTRmKwDGUKENWfRt8FnvDSEwu5RlBYfnuasILma6aCYE/512fx512f';
    } else if (item.paintkit !== null) {
        itemImageUrlPrint = `https://scrap.tf/img/items/warpaint/${encodeURIComponent(newName)}_${item.paintkit}_${
            item.wear
        }_${item.festive === true ? 1 : 0}.png`;
    } else {
        itemImageUrlPrint = itemImageUrl.image_url_large;
    }

    let effectsId: string;

    if (parts[2]) {
        effectsId = parts[2].replace('u', '');
    }

    let effectURL: string;

    if (!effectsId) {
        effectURL = '';
    } else {
        effectURL = `https://marketplace.tf/images/particles/${effectsId}_94x94.png`;
    }

    const qualityItem = parts[1];
    const qualityColorPrint = qualityColor[qualityItem] as string;

    const opt = options.discordWebhook;

    /*eslint-disable */
    const priceUpdate: Webhook = {
        username: opt.displayName,
        avatar_url: opt.avatarURL,
        content: '',
        embeds: [
            {
                author: {
                    name: name,
                    url: `https://www.prices.tf/items/${sku}`,
                    icon_url:
                        'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/3d/3dba19679c4a689b9d24fa300856cbf3d948d631_full.jpg'
                },
                footer: {
                    text: `v${process.env.BOT_VERSION} • ${sku} • ${time}`
                },
                thumbnail: {
                    url: itemImageUrlPrint
                },
                image: {
                    url: effectURL
                },
                title: '',
                fields: [
                    {
                        name: 'Buying for',
                        value: newPrice.buy.toString(),
                        inline: true
                    },
                    {
                        name: 'Selling for',
                        value: newPrice.sell.toString(),
                        inline: true
                    }
                ],
                description: opt.priceUpdate.note ? opt.priceUpdate.note : '',
                color: qualityColorPrint
            }
        ]
    };
    /*eslint-enable */

    sendWebhook(opt.priceUpdate.url, priceUpdate, 'pricelist-update')
        .then(() => {
            log.debug(`Sent ${sku} update to Discord.`);
        })
        .catch(err => {
            log.debug(`❌ Failed to send ${sku} price update webhook to Discord: `, err);
        });
}
