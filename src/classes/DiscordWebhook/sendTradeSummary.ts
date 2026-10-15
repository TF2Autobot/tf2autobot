import { TradeOffer, ItemsDict, ItemsValue, OurTheirItemsDict } from '@tf2autobot/tradeoffer-manager';
import pluralize from 'pluralize';
import Currencies from '@tf2autobot/tf2-currencies';
import SKU from '@tf2autobot/tf2-sku';
import { getPartnerDetails, quickLinks, sendWebhook, WebhookAttachment } from './utils';
import { Container, Webhook } from './interfaces';
import log from '../../lib/logger';
import * as t from '../../lib/tools/export';
import Bot from '../Bot';
import { sendToAdmin } from '../MyHandler/offer/accepted/processAccepted';
import { calculateFifoProfit, getFifoCostBasis, type FIFOEntry, type FIFOPrice } from '../InventoryCostBasis';
import type { TradeCardMeta, TradeCardOptions } from './tradeCard';
import { renderCard as renderCardInWorker } from './tradeCard/cardRenderClient';
import { TradeCardPayload } from './tradeCard/cardRenderProtocol';
// A direct import, unlike ./tradeCard below: offerFacts pulls in no native
// canvas binding, so it cannot be the thing that costs us the summary.
import {
    amountOf,
    collectPricedItems,
    collectStatReadings,
    formatDuration,
    KEY_SKU,
    METAL_SKUS,
    PricedItem,
    priceRows,
    PURE_SKUS,
    StatReading,
    unitValueOf
} from './tradeCard/offerFacts';

/** `IS_COMPONENTS_V2` — required on any message that sets `components`. */
const COMPONENTS_V2_FLAG = 1 << 15;

/**
 * Discord's ceiling on combined Text Display content across the whole message
 * (down from the embed's 6000 = 4096 description + 2048 footer). Fixed blocks
 * (header, detail, subtext) are built first; whatever is left funds the item
 * link blocks, which degrade in stages rather than truncate mid-link.
 */
const TOTAL_TEXT_BUDGET = 4000;
const BUDGET_SAFETY_MARGIN = 150;

const MESSAGE_CAP = 180;
const NAME_CAP = 34;
/**
 * Item names run in full unless the budget forces otherwise — "Professional
 * Killstreak Sharp Dresser" is 37 characters and a legitimate item, not an
 * outlier. This is the ceiling once that degradation stage kicks in, sized so
 * an unusual effect plus a killstreak tier still survives.
 */
const TIGHT_NAME_CAP = 42;
/** 10 a side keeps the worst case inside the budget before degradation kicks in. */
const MAX_LINKED_ITEMS = 10;

/** High value attributes are worth spelling out, so they get lines rather than a count. */
const MAX_HIGH_VALUE_LINES = 3;
const HIGH_VALUE_LINE_CAP = 240;
/** Past a handful of sales the block stops being read, so it aggregates instead. */
const MAX_PROFIT_LINES = 3;
/**
 * The floor the fixed blocks (detail + status + header + subtext) must leave
 * before the verbose detail form is allowed: roughly one side block's worth, so
 * the item links never starve just because XML-style flagged names got roomy.
 */
const MIN_LINK_BUDGET = 800;

export default async function sendTradeSummary(
    offer: TradeOffer,
    accepted: Accepted,
    bot: Bot,
    timeTakenToComplete: number,
    timeTakenToProcessOrConstruct: number,
    timeTakenToCounterOffer: number,
    isOfferSent: boolean,
    isAcceptedWithEscrow: boolean
): Promise<void> {
    const optBot = bot.options;
    const optDW = optBot.discordWebhook;

    // `showProperName` off abbreviates qualities — "Professional Killstreak"
    // becomes "Pro KS" — which is what the chat summary has always done.
    const properName = optBot.tradeSummary.showProperName;
    const named = (names: string[]): string[] => (properName ? names : names.map(n => t.replace.itemName(n)));

    const itemsName = {
        invalid: named(accepted.invalidItems),
        disabled: named(accepted.disabledItems),
        overstock: named(accepted.overstocked),
        understock: named(accepted.understocked),
        duped: [] as string[],
        dupedFailed: [] as string[],
        highValue: named(accepted.highValue)
    };

    const keyPrices = bot.pricelist.getKeyPrices;
    const value = t.valueDiff(offer);

    const dict = offer.data('dict') as ItemsDict;
    const mentionOwner = buildMention(optDW, dict, value.ourValue, {
        invalid: itemsName.invalid.length,
        highValue: itemsName.highValue.length,
        isMentionHV: accepted.isMention
    });

    const details = await getPartnerDetails(offer, bot);

    const botInfo = bot.handler.getBotInfo;
    const links = t.generateLinks(offer.partner.toString());
    const misc = optDW.tradeSummary.misc;

    const isShowOfferMessage = optBot.tradeSummary.showOfferMessage;
    const cTOfferMessage = optBot.tradeSummary.customText.offerMessage.discordWebhook || '💬 **Offer message:**';
    // The other customText.* entries have no home here: asked/offered and the
    // profit wording are drawn on the card or in the title, and keyRate /
    // pureStock / totalItems belong to buildStatBoxes in renderTradeCard.

    const message = t.replace.specialChar(offer.message);

    // ── Header ────────────────────────────────────────────────────────────────
    const net = t.isNetOverpayRelevant('summary-accepted', isOfferSent) ? t.getNetOverpay(offer, bot) : null;

    const meta: TradeCardMeta = {
        timeTakenToComplete,
        timeTakenToProcessOrConstruct,
        timeTakenToCounterOffer,
        isOfferSent,
        net
    };
    const cardOptions = optDW.tradeSummary.tradeCard;
    if (!cardOptions.enable) {
        return sendLegacyTradeSummary(
            offer,
            bot,
            itemsName,
            mentionOwner,
            details,
            timeTakenToComplete,
            timeTakenToProcessOrConstruct,
            timeTakenToCounterOffer,
            isOfferSent,
            isAcceptedWithEscrow
        );
    }
    const card = cardOptions.enable
        ? await renderTradeCardImage(
              offer,
              bot,
              // The spread carries the card options output of `enable`, which
              // TradeCardOptions does not itself carry.
              { ...cardOptions, partnerName: details.personaName, partnerAvatarUrl: details.avatarFull },
              meta
          )
        : null;
    const attachmentName = `trade-${offer.id}.png`;

    const isCountered = offer.data('processCounterTime') !== undefined;
    const source =
        isOfferSent === undefined ? '' : isOfferSent ? ' (chat)' : ` (offer${isCountered ? ' - countered' : ''})`;

    let title = `✅ Accepted${source}`;
    if (net && net.scrap !== 0) {
        const magnitude = Currencies.toCurrencies(Math.round(Math.abs(net.scrap)), net.keyRate).toString();
        title += net.scrap > 0 ? `  ·  📈 +${magnitude}` : `  ·  📉 -${magnitude}`;
    }

    const botLinks = misc.note
        ? misc.note
        : `[Backpack](https://backpack.tf/profiles/${botInfo.steamID.getSteamID64()})${
              bot.options.miscSettings.pricedbStore.enable ? ` · [Store](${bot.getPricedbStoreUrl()})` : ''
          }`;

    const keyRateMetal = bot.pricelist.getKeyPrice.metal;
    const profitData = collectItemProfits(offer, bot);

    const identity = `#${offer.id} • ${offer.partner.toString()} • ${process.env.BOT_VERSION_LABEL}`;

    // ── Body ──────────────────────────────────────────────────────────────────
    // Components V2: one ordered array, text and image interleaved freely, every
    // Text Display fully markdown.
    //
    // The name is itself the Steam link, so the row is three destinations with no
    // repeats. Title at h3, not h2, which dominated a message whose subject is the
    // card below it; the partner line is bold body text to stay clear of it.
    const partnerDisplayName = escapeMarkdown(details.personaName);
    const partnerLine = misc.showQuickLinks
        ? `**[${partnerDisplayName}](${links.steam}) | [backpack.tf](${links.bptf}) | [rep.tf](${links.reptf})**`
        : `**[${partnerDisplayName}](${links.steam})**`;
    const headerBlock = [`### ${title}`, partnerLine].join('\n');

    // Three lines rather than one: identity plus both timestamp forms measured as
    // the widest line in the message, and the container stretched to match.
    const unixSeconds = Math.floor(Date.now() / 1000);
    const subtextBlock = `-# 🤖 ${botLinks}\n` + `-# ${identity}\n` + `-# <t:${unixSeconds}:f> · <t:${unixSeconds}:R>`;

    const flags = [
        { label: '🟨 invalid', count: itemsName.invalid.length },
        { label: '🟧 disabled', count: itemsName.disabled.length },
        { label: '🟦 overstocked', count: itemsName.overstock.length },
        // No high-value count: their attributes are named in full below.
        { label: '🟩 understocked', count: itemsName.understock.length }
    ];

    // The status block is the card's text twin: the same readings and prices the
    // card would draw, so the summary never loses them to a render failure.
    const statusText =
        card === null
            ? buildStatusBlock(collectStatReadings(bot, meta), collectPricedItems(offer, bot, keyRateMetal))
            : '';

    // Decide the verbosity on the *compact* form (fixed blocks only, so a big
    // trade cannot starve the item links), then rebuild verbose if there is
    // still room for roughly a side block's worth of links.
    const detailMessage = isShowOfferMessage ? message : '';
    const compact = buildDetailBlock(
        detailMessage,
        cTOfferMessage,
        flags,
        itemsName.highValue,
        profitData,
        keyRateMetal,
        { offer, bot, itemsName, verbose: false }
    );
    const compactFixed = headerBlock.length + compact.length + statusText.length + subtextBlock.length;
    const verbose = TOTAL_TEXT_BUDGET - BUDGET_SAFETY_MARGIN - compactFixed >= MIN_LINK_BUDGET;

    let detailBlock = verbose
        ? buildDetailBlock(detailMessage, cTOfferMessage, flags, itemsName.highValue, profitData, keyRateMetal, {
              offer,
              bot,
              itemsName,
              verbose: true
          })
        : compact;

    if (statusText.length > 0) {
        detailBlock += `\n${statusText}`;
    }

    const fixedTextLength = headerBlock.length + detailBlock.length + subtextBlock.length;
    const linkBudget = Math.max(0, TOTAL_TEXT_BUDGET - BUDGET_SAFETY_MARGIN - fixedTextLength);
    const sideBlocks = buildItemLinkBlocks(offer, bot, linkBudget);

    const children: Container['components'] = [{ type: 10, content: headerBlock }];
    const addDivider = (divider: boolean): void => {
        children.push({ type: 14, divider, spacing: 1 });
    };

    if (card || sideBlocks.length > 0) {
        addDivider(true);
    }

    if (card) {
        children.push({ type: 12, items: [{ media: { url: `attachment://${attachmentName}` } }] });
    }

    sideBlocks.forEach((block, i) => {
        if (i > 0) {
            addDivider(false);
        }
        children.push({ type: 10, content: block });
    });

    if (detailBlock.length > 0) {
        addDivider(true);
        children.push({ type: 10, content: detailBlock });
    }

    addDivider(true);
    children.push({ type: 10, content: subtextBlock });

    const topLevel: Webhook['components'] = [];
    if (mentionOwner) {
        topLevel.push({ type: 10, content: mentionOwner });
    }
    topLevel.push({ type: 17, accent_color: Number(optDW.embedColor), components: children });

    const acceptedTradeSummary: Webhook = {
        username: optDW.displayName || botInfo.name,
        avatar_url: optDW.avatarURL || botInfo.avatarURL,
        flags: COMPONENTS_V2_FLAG,
        components: topLevel,
        allowed_mentions: buildAllowedMentions(optDW.ownerID)
    };

    const attachment: WebhookAttachment | undefined = card ? { name: attachmentName, buffer: card } : undefined;
    const url = optDW.tradeSummary.url;

    url.forEach((link, i) => {
        sendWebhook(link, acceptedTradeSummary, 'trade-summary', i, attachment).catch(err => {
            log.warn(
                `❌ Failed to send trade-summary webhook (#${offer.id}) to Discord ${
                    url.length > 1 ? `(${i + 1})` : ''
                }: `,
                err
            );

            const itemListx = t.listItems(offer, bot, itemsName, true);

            void sendToAdmin(
                bot,
                offer,
                value,
                itemListx,
                keyPrices,
                isOfferSent,
                timeTakenToComplete,
                timeTakenToProcessOrConstruct,
                timeTakenToCounterOffer,
                isAcceptedWithEscrow
            );
        });
    });
}

type WebhookOptions = Bot['options']['discordWebhook'];

/**
 * The mention line above the container, or '' for no ping.
 *
 * Two separate triggers, in priority order: an accepted trade that needs
 * looking at (invalid or high-value items), which says why; and the owner's own
 * `mentionOwner` watchlist — a sku or a trade value they asked to hear about —
 * which is a bare ping.
 */
function buildMention(
    optDW: WebhookOptions,
    dict: ItemsDict,
    ourValueScrap: number,
    counts: { invalid: number; highValue: number; isMentionHV: boolean }
): string {
    const owners = optDW.ownerID;
    if (owners.length === 0) {
        return '';
    }

    const ping = owners.map(id => `<@!${id}>`).join(', ');
    const { invalid, highValue, isMentionHV } = counts;

    if (invalid > 0 || isMentionHV) {
        const what =
            invalid > 0 && isMentionHV
                ? `INVALID_ITEMS and High value ${pluralize('item', invalid + highValue)}`
                : invalid > 0
                ? `INVALID_ITEMS ${pluralize('item', invalid)}`
                : `High Value ${pluralize('item', highValue)}`;

        return `${ping} - Accepted ${what} trade here!`;
    }

    const watch = optDW.tradeSummary.mentionOwner;
    if (!watch.enable) {
        return '';
    }

    const traded = Object.keys(dict.our).concat(Object.keys(dict.their));
    const matchesSku = watch.itemSkus.some(wanted => traded.some(sku => sku.includes(wanted)));
    const matchesValue = watch.tradeValueInRef > 0 && ourValueScrap >= Currencies.toScrap(watch.tradeValueInRef);

    return matchesSku || matchesValue ? ping : '';
}

/** Restrict pings in component text to the configured webhook owners. */
export function buildAllowedMentions(ownerIDs: string[]): NonNullable<Webhook['allowed_mentions']> {
    return { parse: [], users: ownerIDs };
}

/** A Steam persona name is interpolated as Markdown link text, so escape its complete link-text syntax. */
export function escapeMarkdown(text: string): string {
    const escapable = new Set(['\\', '[', ']', '(', ')', '*', '_', '~', '`', '|', '>']);
    return Array.from(text, char => (escapable.has(char) ? `\\${char}` : char)).join('');
}

interface LinkedEntry {
    sku: string;
    name: string;
    amount: number;
    value: number;
    stock: string;
}

/** Collects one side's tradeable entries, pure sorted after real items — the same order the card's tiles use. */
function collectLinkedEntries(
    dict: OurTheirItemsDict,
    bot: Bot,
    which: 'our' | 'their',
    valueOf: (sku: string) => number
): LinkedEntry[] {
    if (!dict) {
        return [];
    }

    const properName = bot.options.tradeSummary.showProperName;
    const showStock = bot.options.tradeSummary.showStockChanges;
    // `showPureInEmoji` renders pure as its emoji token on the card and the
    // item list alike — the same map the Steam-chat summary already uses.
    const showPureEmoji = bot.options.tradeSummary.showPureInEmoji;
    const entries: LinkedEntry[] = [];
    const pure: LinkedEntry[] = [];

    for (const priceKey of Object.keys(dict)) {
        const amount = amountOf(dict[priceKey]);
        // Paint suffixes are a pricing concept; pricedb.io keys pages by the base sku.
        const sku = priceKey.replace(/;p\d+/, '');

        if (amount <= 0 || !t.testPriceKey(sku)) {
            continue;
        }

        try {
            const generated = bot.schema.getName(SKU.fromString(sku), properName);
            // `get` is only consulted for a pure sku (PURE_SKUS), which the map
            // always holds; undefined for anything else falls through to the name.
            const emoji = showPureEmoji ? t.pureEmoji.get(sku) : undefined;
            const entry: LinkedEntry = {
                sku,
                name: emoji ?? (properName ? generated : t.replace.itemName(generated)),
                amount,
                value: valueOf(priceKey),
                // Shared with the text summary so the two can never disagree
                // about which side of the trade the inventory has already seen.
                stock: showStock ? t.stockChangeText(bot, priceKey, which, 'summary-accepted', amount) : ''
            };

            // Pure is what the trade was *paid in*, so it sorts after what was
            // actually traded — the order the card's tiles use too.
            (PURE_SKUS.includes(sku) ? pure : entries).push(entry);
        } catch (err) {
            log.debug(`Could not name ${sku} for the trade summary links: `, err);
        }
    }

    entries.sort((a, b) => b.value - a.value);
    pure.sort((a, b) => PURE_SKUS.indexOf(a.sku) - PURE_SKUS.indexOf(b.sku));
    entries.push(...pure);
    return entries;
}

/** How much detail the item lines can afford. Tightened a field at a time when the budget bites. */
interface LinkDetail {
    capItems: number;
    stock: boolean;
    links: boolean;
    nameCap: number;
}

function formatLinkedEntry(e: LinkedEntry, detail: LinkDetail): string {
    const name = clamp(e.name, detail.nameCap);
    const label = detail.links ? `[${name}](https://pricedb.io/item/${e.sku})` : name;
    const amount = e.amount > 1 ? ` ×${e.amount}` : '';
    const stock = detail.stock && e.stock ? ` (${e.stock})` : '';
    return `${label}${amount}${stock}`;
}

/**
 * A container sizes to its widest line, unlike the embed's fixed ~520px, and the
 * card image scales with it. Wrapping at a fixed count keeps every line roughly
 * as wide regardless of trade size, so a big trade grows taller, not wider.
 */
const ITEMS_PER_LINE = 3;

function renderSideBody(entries: LinkedEntry[], detail: LinkDetail): string {
    const shown = entries.slice(0, detail.capItems);
    const rest = entries.length - shown.length;
    const parts = shown.map(e => formatLinkedEntry(e, detail));

    if (rest > 0) {
        parts.push(`+${rest} more`);
    }

    const lines: string[] = [];
    for (let i = 0; i < parts.length; i += ITEMS_PER_LINE) {
        lines.push(parts.slice(i, i + ITEMS_PER_LINE).join('  ·  '));
    }

    return lines.join('\n');
}

const SIDE_LABELS: Record<'their' | 'our', string> = {
    their: '📥 **They Sent**',
    our: '📤 **For Our**'
};

/**
 * One block per side that has anything to show. A one-way gift contributes no
 * block for the empty side, rather than a heading over an empty line.
 *
 * `budget` is what is left of the 4000-character ceiling once the fixed blocks
 * are built. A trade that does not fit degrades in stages rather than
 * truncating mid-link into a raw URL.
 */
export function buildItemLinkBlocks(
    offer: TradeOffer,
    bot: Bot,
    budget: number = TOTAL_TEXT_BUDGET - BUDGET_SAFETY_MARGIN
): string[] {
    const dict = offer.data('dict') as ItemsDict | undefined;
    if (!dict) {
        return [];
    }

    const value = offer.data('value') as ItemsValue | undefined;
    const valueOf = unitValueOf(offer, bot, value?.rate ?? bot.pricelist.getKeyPrice.metal);

    const theirEntries = collectLinkedEntries(dict.their, bot, 'their', valueOf);
    const ourEntries = collectLinkedEntries(dict.our, bot, 'our', valueOf);

    const detail: LinkDetail = { capItems: MAX_LINKED_ITEMS, stock: true, links: true, nameCap: Infinity };

    const build = (): string[] =>
        [
            [SIDE_LABELS.their, renderSideBody(theirEntries, detail)],
            [SIDE_LABELS.our, renderSideBody(ourEntries, detail)]
        ]
            .filter(([, body]) => body !== '')
            .map(([label, body]) => `${label}\n${body}`);

    let blocks = build();
    const fits = (): boolean => blocks.reduce((n, b) => n + b.length, 0) <= budget;

    // Cheapest loss first: "(3 → 2/5)" goes before a name is shortened, and both
    // go before the links themselves.
    for (const tighten of [
        () => (detail.stock = false),
        () => (detail.nameCap = TIGHT_NAME_CAP),
        () => (detail.links = false)
    ]) {
        if (fits()) {
            return blocks;
        }

        tighten();
        blocks = build();
    }

    while (!fits() && detail.capItems > 1) {
        detail.capItems--;
        blocks = build();
    }

    return blocks;
}

/** The shape sendTradeSummary builds for `t.listItems`: the flag lists, named. */
type ItemsName = {
    invalid: string[];
    disabled: string[];
    overstock: string[];
    understock: string[];
    duped: string[];
    dupedFailed: string[];
    highValue: string[];
};

// eslint-disable-next-line @typescript-eslint/require-await
async function sendLegacyTradeSummary(
    offer: TradeOffer,
    bot: Bot,
    itemsName: ItemsName,
    mentionOwner: string,
    details: { personaName: string; avatarFull: string },
    timeTakenToComplete: number,
    timeTakenToProcessOrConstruct: number,
    timeTakenToCounterOffer: number,
    isOfferSent: boolean,
    isAcceptedWithEscrow: boolean
): Promise<void> {
    const opt = bot.options;
    const optDW = opt.discordWebhook;
    const misc = optDW.tradeSummary.misc;
    const tSum = opt.tradeSummary;
    const customText = tSum.customText;
    const keyPrices = bot.pricelist.getKeyPrices;
    const botInfo = bot.handler.getBotInfo;
    const links = t.generateLinks(offer.partner.toString());
    const itemList = t.listItems(offer, bot, itemsName, false);
    const message = t.replace.specialChar(offer.message);
    const slots = bot.tf2.backpackSlots;
    const autokeys = bot.handler.autokeys;
    const status = autokeys.getOverallStatus;

    const timeLabel = customText.timeTaken.discordWebhook || '⏱ **Time taken:**';
    const keyRateLabel = customText.keyRate.discordWebhook || '🔑 Key rate:';
    const pureStockLabel = customText.pureStock.discordWebhook || '💰 Pure stock:';
    const totalItemsLabel = customText.totalItems.discordWebhook || '🎒 Total items:';
    const offerMessageLabel = customText.offerMessage.discordWebhook || '💬 **Offer message:**';
    const summary = t.summarizeToChat(
        offer,
        bot,
        'summary-accepted',
        true,
        t.valueDiff(offer),
        false,
        isOfferSent,
        isAcceptedWithEscrow
    );

    const statusLines = [
        misc.showKeyRate
            ? `${keyRateLabel} ${keyPrices.buy.metal.toString()}/${keyPrices.sell.metal.toString()} ref (${
                  keyPrices.src === 'manual'
                      ? 'manual'
                      : bot.pricelist.isUseCustomPricer
                      ? 'custom-pricer'
                      : 'PriceDB.IO'
              })${
                  autokeys.isEnabled
                      ? ` | Autokeys: ${
                            autokeys.getActiveStatus
                                ? `✅${
                                      status.isBankingKeys
                                          ? ' (banking)'
                                          : status.isBuyingKeys
                                          ? ' (buying)'
                                          : ' (selling)'
                                  }`
                                : '🛑'
                        }`
                      : ''
              }`
            : '',
        misc.showPureStock ? `${pureStockLabel} ${t.pure.stock(bot).join(', ')}` : '',
        misc.showInventory
            ? `${totalItemsLabel} ${bot.inventoryManager.getInventory.getTotalItems}${
                  slots !== undefined ? `/${slots}` : ''
              }`
            : '',
        misc.note || `[View my backpack](https://backpack.tf/profiles/${botInfo.steamID.getSteamID64()})`
    ].filter(Boolean);

    const webhook: Webhook = {
        username: optDW.displayName || botInfo.name,
        avatar_url: optDW.avatarURL || botInfo.avatarURL,
        content: mentionOwner,
        allowed_mentions: buildAllowedMentions(optDW.ownerID),
        embeds: [
            {
                color: optDW.embedColor,
                author: { name: details.personaName, url: links.steam, icon_url: details.avatarFull },
                description:
                    `${summary}\n${timeLabel} ${t.convertTime(
                        isAcceptedWithEscrow ? null : timeTakenToComplete,
                        timeTakenToProcessOrConstruct,
                        timeTakenToCounterOffer,
                        isOfferSent,
                        tSum.showDetailedTimeTaken,
                        tSum.showTimeTakenInMS
                    )}\n\n` +
                    (tSum.showOfferMessage && message.length > 0 ? `${offerMessageLabel} "${message}"\n\n` : '') +
                    (misc.showQuickLinks ? `${quickLinks(t.replace.specialChar(details.personaName), links)}\n` : ''),
                fields: [
                    { name: '__Item list__', value: itemList.replace(/@/g, '') },
                    { name: '__Status__', value: statusLines.join('\n') }
                ],
                footer: {
                    text: `#${offer.id} • ${offer.partner.toString()} • ${t.timeNow(opt).time} • v${
                        process.env.BOT_VERSION
                    }`
                }
            }
        ]
    };

    if (itemList === '-' || itemList === '') {
        webhook.embeds[0].fields.shift();
    } else if (itemList.length >= 1024) {
        const statusField = webhook.embeds[0].fields.pop()!;
        webhook.embeds[0].fields = [];
        let part = '';
        let number = 1;
        const entries = itemList.split('@');
        entries.forEach((entry, index) => {
            if ((part.length >= 800 || index === entries.length - 1) && number <= 4) {
                webhook.embeds[0].fields.push({ name: `__Item list ${number}__`, value: part.replace(/@/g, '') });
                if (index === entries.length - 1 || number === 4) webhook.embeds[0].fields.push(statusField);
                part = '';
                number++;
            } else {
                part += entry;
            }
        });
    }

    optDW.tradeSummary.url.forEach((url, index) => {
        sendWebhook(url, webhook, 'trade-summary', index).catch(err =>
            log.warn(`❌ Failed to send legacy trade-summary webhook (#${offer.id}) to Discord: `, err)
        );
    });
}

/**
 * When the budget allows, the detail block names the flagged items in full via
 * the old `listItems` block instead of counting them and naming high values.
 * `verbose: false` (the default, and all existing callers) is today's behaviour.
 */
interface DetailExtra {
    verbose?: boolean;
    offer?: TradeOffer;
    bot?: Bot;
    itemsName?: ItemsName;
}

/**
 * Everything the card cannot carry: offer message, the stock-flag counts,
 * high-value attributes and per-item profit, in that order. Shown whether or not
 * the card rendered.
 *
 * With `extra.verbose` the flag count and the `highValueLines(...)` output are
 * replaced by a single wholesale `t.listItems(...)` block (its `@` field
 * splitter stripped — meaningless in a Text Display): the old embed's own
 * renderer, reusing its HIGH_VALUE_ITEMS section and its `showItemPrices` gate
 * rather than writing a second one.
 */
export function buildDetailBlock(
    message: string,
    offerMessageLabel: string,
    flags: { label: string; count: number }[],
    highValue: string[],
    profits: ProfitData,
    keyRateMetal: number,
    extra?: DetailExtra
): string {
    const { verbose = false, offer, bot, itemsName } = extra ?? {};
    const lines: string[] = [];

    if (message.length > 0) {
        lines.push(`${offerMessageLabel} "${clamp(message, MESSAGE_CAP)}"`);
    }

    if (verbose && offer && bot && itemsName) {
        // Prices already live on the rendered card (and, card-absent, in the
        // buildStatusBlock fallback below), so this verbatim listItems block
        // reuses only its flag and high-value naming — never a second set of
        // prices. Flip its own showItemPrices gate off instead of slicing the
        // string. The clone is a shallow options override; listItems only reads
        // tradeSummary options, schema, and pricelist (all preserved by ref).
        const tSum = bot.options.tradeSummary;
        const listBot = tSum
            ? ({ ...bot, options: { ...bot.options, tradeSummary: { ...tSum, showItemPrices: false } } } as Bot)
            : bot;

        const listed = t.listItems(offer, listBot, itemsName, false).replace(/@/g, '');
        if (listed !== '-') {
            lines.push(listed);
        }
    } else {
        const activeFlags = flags.filter(f => f.count > 0);
        if (activeFlags.length > 0) {
            lines.push(activeFlags.map(f => `${f.label} ${f.count}`).join('  ·  '));
        }

        lines.push(...highValueLines(highValue));
    }

    lines.push(...profitLines(profits, keyRateMetal));

    return lines.join('\n');
}

/**
 * The card-disabled fallback: one markdown line per stat reading, in the same
 * order the card draws them, plus the priced items when the card is absent.
 * Lives here (not in offerFacts) because it is presentation; the readings are
 * the shared facts both this and the card format, so the toggles cannot drift.
 *
 * `prices` come from `collectPricedItems` (already `showItemPrices`-gated), so
 * this is the single text-home of prices when there is no card to draw them.
 */
export function buildStatusBlock(readings: StatReading[], prices: PricedItem[]): string {
    const lines = readings.flatMap(statusLines);
    appendPriceLines(lines, prices);
    return lines.join('\n');
}

function statusLines(reading: StatReading): string[] {
    if (reading.kind === 'keyRate' || reading.kind === 'pureStock')
        return [`${reading.label} ${reading.value}  ·  ${reading.sub}`];
    if (reading.kind === 'totalItems')
        return [`${reading.label} ${reading.value}${reading.sub ? ` ${reading.sub}` : ''}`];
    if (!reading.detailed) {
        const [, figure, ms] = reading.rows[0];
        return [`${reading.label} ${figure}${timeMsSuffix(reading.showMs, ms)}`];
    }
    return [
        reading.label,
        ...reading.rows.map(([caption, figure, ms]) => `- ${caption}: ${figure}${timeMsSuffix(reading.showMs, ms)}`)
    ];
}

function timeMsSuffix(showMs: boolean, ms: number): string {
    return showMs ? ` (${ms} ms)` : '';
}

function appendPriceLines(lines: string[], prices: PricedItem[]): void {
    if (prices.length === 0) return;
    lines.push('📜 **Item prices**');
    priceRows(prices).forEach(([left, right]) => lines.push(right ? `- **${clamp(left, NAME_CAP)}** ${right}` : left));
}

/**
 * Spells, strange parts, killstreakers, sheens and paint, one line per item.
 * Entries arrive formatted for the chat summary — name in `_…_`, one attachment
 * per line — so the underscores come off and the block folds flat. The card
 * badges these; here they get named.
 */
function highValueLines(items: string[]): string[] {
    if (items.length === 0) {
        return [];
    }

    const shown = items.slice(0, MAX_HIGH_VALUE_LINES).map(entry => {
        const flat = entry
            .replace(/_/g, '')
            .split('\n')
            .map(part => part.trim())
            .filter(part => part.length > 0)
            .join('  ');

        return `🔶 ${clamp(flat, HIGH_VALUE_LINE_CAP)}`;
    });

    const rest = items.length - shown.length;
    if (rest > 0) {
        shown.push(`🔶 +${rest} more high value ${rest === 1 ? 'item' : 'items'}`);
    }

    return shown;
}

function formatCurrencyValue(scrap: number, keyRateMetal: number): string {
    return scrap === 0 ? '0 ref' : Currencies.toCurrencies(scrap, keyRateMetal).toString();
}

function formatProfitResult(scrap: number, keyRateMetal: number, net = false): string {
    const outcome = scrap > 0 ? 'Profit' : scrap < 0 ? 'Loss' : 'Break-even';
    const label = net ? `Net ${outcome.toLowerCase()}` : outcome;
    return `${label}: ${formatCurrencyValue(Math.abs(scrap), keyRateMetal)}`;
}

function profitLines(data: ProfitData, keyRateMetal: number): string[] {
    const lines: string[] = [];

    if (data.profits.length > 0 && data.profits.length <= MAX_PROFIT_LINES) {
        // Few enough to name individually, which is the interesting case.
        for (const p of data.profits) {
            lines.push(
                `${profitIndicator(p.profitScrap)} **${escapeMarkdown(clamp(p.name, NAME_CAP))} · ${formatProfitResult(
                    p.profitScrap,
                    keyRateMetal
                )}**`,
                `**Cost basis:** ${formatCurrencyValue(new Currencies(p.buy).toValue(keyRateMetal), keyRateMetal)} → ` +
                    `**Sold:** ${formatCurrencyValue(new Currencies(p.sell).toValue(keyRateMetal), keyRateMetal)}`,
                `Held: ${formatDuration(p.heldForMs)}`
            );
        }
    } else if (data.profits.length > 0) {
        // Too many to list: report the total and the single biggest earner.
        const total = data.profits.reduce((sum, p) => sum + p.profitScrap, 0);
        const best = data.profits.reduce((a, b) => (b.profitScrap > a.profitScrap ? b : a), data.profits[0]);

        lines.push(
            `${profitIndicator(total)} **${formatProfitResult(total, keyRateMetal, true)}** across ` +
                `${data.profits.length} items  ·  best ${escapeMarkdown(clamp(best.name, NAME_CAP))} · ` +
                `${formatProfitResult(best.profitScrap, keyRateMetal)}`
        );
    }

    if (data.missing.length > 0) {
        const named = data.missing.slice(0, 2).map(name => clamp(name, NAME_CAP));
        const rest = data.missing.length - named.length;

        const overflow = rest > 0 ? ` +${rest} more` : '';
        lines.push(`⚠️ no cost data: ${named.join(', ')}${overflow}`);
    }

    return lines;
}

function clamp(text: string, limit: number): string {
    return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}

/** Lazily loaded: a missing or broken native canvas binding must not cost us the summary. */
export async function renderTradeCardImage(
    offer: TradeOffer,
    bot: Bot,
    options: TradeCardOptions,
    meta: TradeCardMeta
): Promise<Buffer | null> {
    try {
        return await renderCardInWorker({ type: 'trade', payload: buildTradeCardPayload(offer, bot, options, meta) });
    } catch (err) {
        log.warn(`Trade card unavailable for offer #${offer.id}, falling back to text: `, err);
        return null;
    }
}

export function buildTradeCardPayload(
    offer: TradeOffer,
    bot: Bot,
    options: TradeCardOptions,
    meta: TradeCardMeta
): TradeCardPayload {
    const prices = offer.data('prices') as Record<string, unknown> | undefined;
    const dict = offer.data('dict') as ItemsDict | undefined;
    const cardPrices = buildTradeCardPrices(prices, dict, bot);
    const names: Record<string, string> = {};
    const skus = new Set([
        ...Object.keys(prices ?? {}),
        ...Object.keys(dict?.our ?? {}),
        ...Object.keys(dict?.their ?? {})
    ]);
    for (const sku of skus) {
        try {
            const parsed = SKU.fromString(sku);
            const name = bot.schema.getName(parsed, false);
            // The renderer recreates this object from the SKU, so retain its
            // canonical TF2-SKU form as well as the key kept in offer data.
            names[sku] = name;
            names[SKU.fromObject(parsed)] = name;
        } catch {
            names[sku] = sku;
        }
    }

    const inventory = bot.inventoryManager.getInventory;
    const autokeys = bot.handler.autokeys;
    return {
        offer: {
            id: offer.id,
            dict: offer.data('dict'),
            value: offer.data('value'),
            highValue: offer.data('highValue'),
            prices: cardPrices
        },
        options: { ...options },
        meta: { ...meta },
        bot: {
            options: {
                steamAccountName: bot.options.steamAccountName,
                tradeSummary: bot.options.tradeSummary,
                discordWebhook: bot.options.discordWebhook
            },
            pricelist: {
                getKeyPrice: { metal: bot.pricelist.getKeyPrice.metal },
                getKeyPrices: bot.pricelist.getKeyPrices,
                isUseCustomPricer: bot.pricelist.isUseCustomPricer
            },
            inventory: {
                currencies: inventory.getCurrencies(bot.craftWeapons, true),
                totalItems: inventory.getTotalItems
            },
            tf2: { backpackSlots: bot.tf2.backpackSlots },
            handler: {
                autokeys: {
                    isEnabled: autokeys.isEnabled,
                    getActiveStatus: autokeys.getActiveStatus,
                    getOverallStatus: autokeys.getOverallStatus
                }
            },
            names
        }
    };
}

/**
 * Preserve the trade-processing price map, but give the card a presentation
 * copy keyed by the SKU that actually appears in the offer. A generic pricelist
 * entry can price a variant SKU; without this projection the card has no way to
 * associate that recorded price with the traded item.
 */
function buildTradeCardPrices(
    prices: Record<string, unknown> | undefined,
    dict: ItemsDict | undefined,
    bot: Bot
): Record<string, unknown> | undefined {
    if (!prices || !dict) return prices;

    const cardPrices = { ...prices };
    const tradedSkus = new Set([...Object.keys(dict.our ?? {}), ...Object.keys(dict.their ?? {})]);

    for (const sku of tradedSkus) {
        if (cardPrices[sku] !== undefined) continue;

        const matchedPrice = bot.pricelist.getPrice({ priceKey: sku, onlyEnabled: false, getGenericPrice: true });
        if (matchedPrice?.sku && prices[matchedPrice.sku] !== undefined) {
            cardPrices[sku] = prices[matchedPrice.sku];
        }
    }

    const nonPureTradedSkus = [...tradedSkus].filter(sku => !PURE_SKUS.includes(sku));
    const missingFocusSkus = nonPureTradedSkus.filter(sku => cardPrices[sku] === undefined);
    const recordedSkus = Object.keys(prices);
    const paymentPriceSkus = recordedSkus.filter(sku => !nonPureTradedSkus.includes(sku));
    if (missingFocusSkus.length === 1 && paymentPriceSkus.length > 0) {
        const keyRateMetal = bot.pricelist.getKeyPrice.metal;
        const focusPriceSku = paymentPriceSkus.sort((a, b) => priceValue(prices[b], keyRateMetal) - priceValue(prices[a], keyRateMetal))[0];
        cardPrices[missingFocusSkus[0]] = prices[focusPriceSku];
    }

    return cardPrices;
}

function priceValue(price: unknown, keyRateMetal: number): number {
    try {
        return new Currencies((price as { sell: unknown }).sell).toValue(keyRateMetal);
    } catch {
        return Number.NEGATIVE_INFINITY;
    }
}

/** One realised sale, before it is formatted for the detail block. */
interface ItemProfit {
    name: string;
    buy: FIFOPrice;
    sell: FIFOPrice;
    profitScrap: number;
    /** How long we held it before this sale. */
    heldForMs: number;
}

export interface ProfitData {
    profits: ItemProfit[];
    /** Items we sold with no purchase record, so no cost basis to profit against. */
    missing: string[];
}

function profitIndicator(scrap: number): string {
    return scrap > 0 ? '📈' : scrap < 0 ? '📉' : '➖';
}

function collectItemProfits(offer: TradeOffer, bot: Bot): ProfitData {
    const empty: ProfitData = { profits: [], missing: [] };

    const dict = offer.data('dict') as ItemsDict;
    if (!dict?.our || Object.keys(dict.our).length === 0) {
        return empty;
    }

    // Written by calculateProfitData(); its presence is what marks this as a sale.
    const removedFifoEntries = offer.data('removedFifoEntries') as Record<string, FIFOEntry[]> | undefined;
    if (!removedFifoEntries || Object.keys(removedFifoEntries).length === 0) {
        return empty; // No FIFO data available - this was likely a buy
    }

    const itemProfits: ItemProfit[] = [];
    const itemsWithoutFifo: string[] = [];
    const prices = offer.data('prices') as Record<string, { sell?: { keys: number; metal: number } }> | undefined;

    const ourSKUs = Object.keys(dict.our);

    // Keys are payment rather than inventory, unless autokeys is banking them.
    const isAutokeysEnabled = bot.options.autokeys.enable;
    const skusInTrade = ourSKUs.filter(s => !METAL_SKUS.includes(s));
    const isKeyOnlyTrade = skusInTrade.length === 1 && skusInTrade[0] === KEY_SKU;

    ourSKUs.forEach(sku => {
        if (METAL_SKUS.includes(sku)) {
            return;
        }

        // Same logic as processAccepted.ts
        if (sku === KEY_SKU && (!isAutokeysEnabled || !isKeyOnlyTrade)) {
            return;
        }

        const fifoEntries = removedFifoEntries[sku];
        if (!fifoEntries || fifoEntries.length === 0) {
            return;
        }

        // Prefer the per-trade stored sell price (works for autopriced items too),
        // falling back to the live pricelist.
        const storedSell = prices?.[sku]?.sell;
        const pricelistEntry = bot.pricelist.getPrice({ priceKey: sku, onlyEnabled: false });
        const fallbackSell = storedSell ?? pricelistEntry?.sell;
        if (!fallbackSell) {
            return;
        }

        fifoEntries.forEach(fifoEntry => {
            const itemName = bot.schema.getName(SKU.fromString(sku), false);

            // No real purchase record: report it separately rather than inventing a cost.
            if (fifoEntry.tradeId === 'ESTIMATE') {
                itemsWithoutFifo.push(itemName);
                return;
            }

            const buyPrice = getFifoCostBasis(fifoEntry);
            const sellPrice = { keys: fallbackSell.keys, metal: fallbackSell.metal };
            const keyRateMetal = bot.pricelist.getKeyPrice.metal;

            // One signed scrap total, split by toCurrencies afterwards: deriving both
            // parts from one value keeps their signs consistent, unlike a raw
            // `new Currencies({keys, metal})`, which can print "4 keys, -20.94 ref".
            const profit = calculateFifoProfit(fallbackSell, fifoEntry);
            const profitScrap = new Currencies(profit).toValue(keyRateMetal);

            itemProfits.push({
                name: itemName,
                buy: buyPrice,
                sell: sellPrice,
                profitScrap,
                // InventoryCostBasis stores timestamps in milliseconds. Older
                // persisted entries may be in Unix seconds, so accept both.
                // Treating milliseconds as seconds made ordinary sales appear
                // to be held for a huge negative duration.
                heldForMs: Math.max(
                    0,
                    Date.now() -
                        (fifoEntry.timestamp < 100_000_000_000 ? fifoEntry.timestamp * 1000 : fifoEntry.timestamp)
                )
            });
        });
    });

    return { profits: itemProfits, missing: [...new Set(itemsWithoutFifo)] };
}

interface Accepted {
    invalidItems: string[];
    disabledItems: string[];
    overstocked: string[];
    understocked: string[];
    highValue: string[];
    isMention: boolean;
}
