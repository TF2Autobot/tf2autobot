import SKU from 'tf2-sku-2';
import SchemaManager from 'tf2-schema-2';
import Currencies from 'tf2-currencies-2';
import sleepasync from 'sleep-async';
import { UnknownDictionary } from '../../types/common';
import { Webhook, sendWebhook } from './export';

import log from '../logger';
import { Entry } from '../../classes/Pricelist';
import Options from '../../classes/Options';

const australiumImageURL: { [name: string]: string } = {
    // Australium Ambassador
    '61;11;australium':
        'IUwYcXxrxqzlHh9rZCv2ADN8Mmsgy4N4MgGBvxVQuY7G2ZW8zJlfDUKJYCqxp8lnuW34wvJM3DIHgr-8CcAu9qsKYZG08QCvM/',
    // Australium Medi Gun
    '211;11;australium':
        'cUwoUWRLlrTZ8j8fqCc2ACfIHnpQ35pFWgGVtkFEqMuawNTQ-IwaaVfgICfRs9Vm9UXdmvpcwV4TipO4CZ0yx42dGigAL/',
    // Australium SMG
    '203;11;australium': 'IUxQcWiTltzRHt8TnH_WJRrhXmYpmvchRimI4xlMtbOfmNGdhdlTGV_VdDqBjrV-9CH43uZMzV4f457UBxvSrc7I/',
    // Australium Stickybomb Launcher
    '207;11;australium':
        'cUxQFVBjpoTpMhcrZAfOZBuMInsgK4p9Z3QlnkBN8Ma2xNGBldwbGBfQHCqNj9Vy-UXJm6sVmVYS0oLlWeFm9soqSYbd_N4tEAYCODYMwr6jb/',
    // Australium Black Box
    '228;11;australium':
        'IUwUdXBjpujdbt8_pAfazBOESnN97tJUAiGc6wFl4ZbvjaDU0JFbGUvUJCPc-8QvqDXc36pI6V4_go-oCexKv6tWDpsnI5Q/',
    // Australium Blutsauger
    '36;11;australium':
        'IUwsUWBjqvy1Nt8_pAfazBOESnN97vZQFgGVtyQUrbeW2ZjM_IFHGA_JYC_BuoQ7qDyJlusVnUdO1orpQfRKv6tW-OVvZVQ/',
    // Australium Flame Thrower
    '208;11;australium':
        'IUwEdXBbnrDBRh9_jH82LB-wEpNY095dQl2AzwlAsY7GzY242JlbHUKRdD6JtrV_pCndhvcJgDI7jpe8Afgrq54LYc-5723D3DXU/',
    // Australium Force-A-Nature
    '45;11;australium':
        'IUwMeSBnuvQdBidr0CP6zD-8Mn-U55IJS3Hg4xFB_NbSzYjJkcwCRUaFaCaJopVzuWHBi65dnAILu8u9Te1--t9DCLfByZ9DzsRlF/',
    // Australium Frontier Justice
    '141;11;australium':
        'IUwEDUhX2sT1Rgt31GfuPDd8HlNYx2pxUyzFu31V6YrLiZWJiIVeUV6IKDvdi9wy-UXA3upY3VtG19eMDeAzusYLOMrcycIYb30r634E/',
    // Australium Grenade Launcher
    '206;11;australium':
        'cUwADWBXjvD1Pid3oDvqJGt8HlNYx2pxUyzFu31YtYObgYGFjJ12VBKYLDac78FC5WyYxvMU1DYC0pLpTcAq8sIOVNrEycIYbGbNsLhA/',
    // Australium Minigun
    '202;11;australium':
        'cUwoYUxLlrTZ8j8fqCc2ACfIHnpRl48RRjjczw1N_YuLmYjVhJwaSUvILCa1r8Fm5X3cwupFnAoXvob8DZ0yx4_oW5y4u/',
    // Australium Tomislav
    '424;11;australium':
        'IUxMeUBLxtDlVt8_pAfazBOESnN974chX2mQ9wQMrY-G3YGdhcwWXB_UPWKZt9wruUX9ivpFlAIWwou1VehKv6tXcWH-bzQ/',
    // Australium Rocket Launcher
    '205;11;australium':
        'cUxUeXhDnrDRCncblBfeeN-cPl94K6ZFH3jMlwgcsNeaxZDYwcQWbA_BbDvZprArqXSJluJ5hUYPur-xRKlnq4daUO65sbo8Wbc6SlA/',
    // Australium Scattergun
    '200;11;australium':
        'cUxQSXA_2vSpEncbZCv2ADN8Mmsgy4N4E2Gc-lQcsMuDlY2A2IQbHB6UGWK0-9V29WnY365E3BYTkpb1UewzqqsKYZAHhHABV/',
    // Australium Sniper Rifle
    '201;11;australium':
        'cUxQfVAvnqipKjsTjMvWDBOQ_l9sn4pUbiGI6wFUoYLftMjMzcFeQBPFYD6dsoF-_Wn9nvJ82B4fkpOgAelrq5ZyGbefBeMmAbQ/',
    // Australium Sniper Rifle 2 - weird
    '15072;11;australium':
        'cUxQfVAvnqipKjsTjMvWDBOQ_l9sn4pUbiGI6wFUoYLftMjMzcFeQBPFYD6dsoF-_Wn9nvJ82B4fkpOgAelrq5ZyGbefBeMmAbQ/',
    // Australium Axtinguisher
    '38;11;australium':
        'IUwYJSRLsvy1Km8DjH82cEfIPpN066ZRq1Td5lgQ1MrDhZmAyKgfHU_cLX6NtrAy8W3Bnup4zVdPur-heew3otoTCZ7R_ZcYMQZeUvB7w1w/',
    // Australium Eyelander
    '132;11;australium':
        'IUwQdXALvtypGt8_pAfazBOESnN974ZFWjW8ylVJ_Y-C3aWEyKwGbUvUHWaRpo1--CHE2vsRmUITh9bhWehKv6tX00uGxPA/',
    // Australium Knife
    '194;11;australium': 'cUwwfVB3nhz9MhMzZAfOeD-VOyIJs55YAjDA8wAd6NrHnMm4xcFKSU_ZcCPQ49QzoXXQ0vcUxAYDu8vUWJ1teRmVbCw/',
    // Australium Wrench
    '197;11;australium': 'cUxADWBXhsAdEh8TiMv6NGucF1Ypg4ZNWgG9qyAB5YOfjaTRmJweaB_cPCaNjpAq9CnVgvZI1UNTn8bhIOVK4UnPgIXo/'
};

const paintCan: { [name: string]: string } = {
    // A Color Similar to Slate
    '5052;6':
        'TbL_ROFcpnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvOvr1MdQ/',
    // A Deep Commitment to Purple
    '5031;6':
        'TeLfQYFp1nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvVs13Vys/',
    // A Distinctive Lack of Hue
    '5040;6':
        'TYffEcEJhnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvXrHVMg0/',
    // A Mann's Mint
    '5076;6':
        'SLKqRMQ59nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvU8z3W20/',
    // After Eight
    '5077;6':
        'TbLfJME5hnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvWdo-dtk/',
    // Aged Moustache Grey
    '5038;6':
        'TeLPdNFslnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvFkHADQU/',
    // An Air of Debonair
    '5063;6':
        'TffPQfFZxnqWSMU5OD2NsHx3oIzChGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8V0p8gFQg/',
    // An Extraordinary Abundance of Tinge
    '5039;6':
        'SMf6UeRJpnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgv64ewDK8/',
    // Australium Gold
    '5037;6':
        'SMfqIdEs5nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvsjysS5w/',
    // Balaclavas Are Forever
    '5062;6':
        'TaK_FOE59nqWSMU5OD2NgHxnAPzChGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8V3lcfHzA/',
    // Color No. 216-190-216
    '5030;6':
        'SNcaJNRZRnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvFOcRWGY/',
    // Cream Spirit
    '5065;6':
        'SKevZLE8hnqWSMU5OD2IsHzHMPnShGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8VQmu5hdU/',
    // Dark Salmon Injustice
    '5056;6':
        'SMcPkeFs1nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvy3dkty0/',
    // Drably Olive
    '5053;6':
        'TRefgYEZxnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvMuQVCSQ/',
    // Indubitably Green
    '5027;6':
        'Tee_lNFZ5nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvm153-6I/',
    // Mann Co. Orange
    '5032;6':
        'SKL_cbEppnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvTFGBHn4/',
    // Muskelmannbraun
    '5033;6':
        'SIfPcdFZlnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvcmoesjg/',
    // Noble Hatter's Violet
    '5029;6':
        'TcePMQFc1nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvgXmHfsU/',
    // Operator's Overalls
    '5060;6':
        'TdcfMQEpRnqWSMU5OD2NoHwHEIkChGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8V-hQN5Nc/',
    // Peculiarly Drab Tincture
    '5034;6':
        'SKfKFOGJ1nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvG7gZwMo/',
    // Pink as Hell
    '5051;6':
        'SPL_YRQ5hnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgv9O7ytVg/',
    // Radigan Conagher Brown
    '5035;6':
        'TfcPRMEs1nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgv4OlkQfA/',
    // Team Spirit
    '5046;6':
        'SLcfMQEs5nqWSMU5OD2NwHzHZdmihGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8VWwsKTpY/',
    // The Bitter Taste of Defeat and Lime
    '5054;6':
        'Tae6NMEp5nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvvmRKa6k/',
    // The Color of a Gentlemann's Business Pants
    '5055;6':
        'SPeaUeGc9nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvoDEBbxU/',
    // The Value of Teamwork
    '5064;6':
        'TRefMYE5xnqWSMU5OD2NsKwicEzChGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8Vs4Ux0YY/',
    // Waterlogged Lab Coat
    '5061;6':
        'SIcflJGc9nqWSMU5OD2NEMzSVdmyhGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8VT2CQ46M/',
    // Ye Olde Rustic Colour
    '5036;6':
        'TeKvZLFJtnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvmeRW1Z8/',
    // Zepheniah's Greed
    '5028;6':
        'Tde_ROEs5nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvPiWjbeE/'
};

const qualityColor: { [name: string]: string } = {
    '0': '11711154', // Normal - #B2B2B2
    '1': '5076053', // Genuine - #4D7455
    '3': '4678289', // Vintage - #476291
    '5': '8802476', // Unusual - #8650AC
    '6': '16766720', // Unique - #FFD700
    '7': '7385162', // Community - #70B04A
    '8': '10817401', // Valve - #A50F79
    '9': '7385162', //Self-Made - #70B04A
    '11': '13593138', //Strange - #CF6A32
    '13': '3732395', //Haunted - #38F3AB
    '14': '11141120', //Collector's - #AA0000
    '15': '16711422' // Decorated Weapon
};

export default function sendWebHookPriceUpdateV1(
    sku: string,
    itemName: string,
    newPrice: Entry,
    time: string,
    schema: SchemaManager.Schema,
    options: Options,
    currentStock: number,
    oldPrice: { buy: Currencies; sell: Currencies },
    keyPrice: number,
    isCustomPricer: boolean
): void {
    const parts = sku.split(';');
    const newItem = SKU.fromString(`${parts[0]};6`);
    const name = schema.getName(newItem, false);

    const itemImageUrl = schema.getItemByItemName(name);

    let itemImageUrlPrint: string;
    const item = SKU.fromString(sku);

    if (!itemImageUrl || !item) {
        itemImageUrlPrint = 'https://jberlife.com/wp-content/uploads/2019/07/sorry-image-not-available.jpg';
    } else if (Object.keys(paintCan).includes(`${parts[0]};6`)) {
        itemImageUrlPrint = `https://steamcommunity-a.akamaihd.net/economy/image/IzMF03bi9WpSBq-S-ekoE33L-iLqGFHVaU25ZzQNQcXdEH9myp0erksICf${
            paintCan[`${parts[0]};6`]
        }512fx512f`;
    } else if (item.australium === true) {
        const australiumSKU = parts[0] + ';11;australium';
        itemImageUrlPrint = `https://steamcommunity-a.akamaihd.net/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgE${australiumImageURL[australiumSKU]}512fx512f`;
    } else if (item.defindex === 266) {
        itemImageUrlPrint =
            'https://steamcommunity-a.akamaihd.net/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEIUw8UXB_2uTNGmvfqDOCLDa5Zwo03sMhXgDQ_xQciY7vmYTRmKwDGUKENWfRt8FnvDSEwu5RlBYfnuasILma6aCYE/512fx512f';
    } else if (item.paintkit !== null) {
        itemImageUrlPrint = `https://scrap.tf/img/items/warpaint/${encodeURIComponent(name)}_${item.paintkit}_${
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
    } else effectURL = `https://marketplace.tf/images/particles/${effectsId}_94x94.png`;

    const qualityItem = parts[1];
    const qualityColorPrint = qualityColor[qualityItem];

    const oldBuyValue = oldPrice.buy.toValue(keyPrice);
    const newBuyValue = newPrice.buy.toValue(keyPrice);
    const oldSellValue = oldPrice.sell.toValue(keyPrice);
    const newSellValue = newPrice.sell.toValue(keyPrice);

    const buyChangesValue = Math.round(newBuyValue - oldBuyValue);
    const buyChanges = Currencies.toCurrencies(buyChangesValue).toString();
    const sellChangesValue = Math.round(newSellValue - oldSellValue);
    const sellChanges = Currencies.toCurrencies(sellChangesValue).toString();

    const opt = options.discordWebhook;
    const priceUpdate: Webhook = {
        username: opt.displayName,
        avatar_url: opt.avatarURL,
        content: '',
        embeds: [
            {
                author: {
                    name: itemName,
                    url: `https://www.prices.tf/items/${sku}`,
                    icon_url: isCustomPricer
                        ? 'https://cdn.akamai.steamstatic.com/steamcommunity/public/images/avatars/81/818fb1e235ccf685e8532a17f111f2697451b0d0_full.jpg'
                        : 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/3d/3dba19679c4a689b9d24fa300856cbf3d948d631_full.jpg'
                },
                footer: {
                    text: `${sku} • ${time} • v${process.env.BOT_VERSION}`
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
                        value: `${oldPrice.buy.toString()} → ${newPrice.buy.toString()} (${
                            buyChangesValue > 0 ? `+${buyChanges}` : buyChangesValue === 0 ? `0 ref` : buyChanges
                        })`
                    },
                    {
                        name: 'Selling for',
                        value: `${oldPrice.sell.toString()} → ${newPrice.sell.toString()} (${
                            sellChangesValue > 0 ? `+${sellChanges}` : sellChangesValue === 0 ? `0 ref` : sellChanges
                        })`
                    }
                ],
                description: `Stock: ${currentStock}${opt.priceUpdate.note ? `\n${opt.priceUpdate.note}` : ''}`,
                color: qualityColorPrint
            }
        ]
    };

    PriceUpdateQueue.setURL(opt.priceUpdate.url);
    PriceUpdateQueue.enqueue(sku, priceUpdate);
}

class PriceUpdateQueue {
    private static priceUpdate: UnknownDictionary<Webhook> = {};

    private static url: string;

    static setURL(url: string) {
        this.url = url;
    }

    private static isProcessing = false;

    static enqueue(sku: string, webhook: Webhook): void {
        this.priceUpdate[sku] = webhook;

        void this.process();
    }

    private static dequeue(): void {
        delete this.priceUpdate[this.first()];
    }

    private static first(): string {
        return Object.keys(this.priceUpdate)[0];
    }

    private static size(): number {
        return Object.keys(this.priceUpdate).length;
    }

    private static async process(): Promise<void> {
        const sku = this.first();

        if (sku === undefined || this.isProcessing) {
            return;
        }

        this.isProcessing = true;

        if (this.size() >= 5) {
            await sleepasync().Promise.sleep(500);
        }

        sendWebhook(this.url, this.priceUpdate[sku], 'pricelist-update')
            .then(() => {
                log.debug(`Sent ${sku} update to Discord.`);
            })
            .catch(err => {
                log.debug(`❌ Failed to send ${sku} price update webhook to Discord: `, err);
            })
            .finally(() => {
                this.isProcessing = false;
                this.dequeue();
                void this.process();
            });
    }
}
