import jsonschema from 'jsonschema';
const Validator = jsonschema.Validator;

const v = new Validator();

import * as pl from '../schemas/pricelist-json/export';

v.addSchema(pl.currenciesSchema);
v.addSchema(pl.pricelistSchema);
v.addSchema(pl.addSchema);
v.addSchema(pl.listingSchema);

import * as op from '../schemas/options-json/export';

v.addSchema(op.optionsSchema);
v.addSchema(op.onlyEnableSchema);
v.addSchema(op.onlyNoteSchema);
v.addSchema(op.onlyAllowSchema);
v.addSchema(op.stringArraySchema);
v.addSchema(op.sortInventorySchema);

v.addSchema(op.sa.sendAlertSchema);
v.addSchema(op.sa.autokeysSaSchema);
v.addSchema(op.sa.highValueSaSchema);

v.addSchema(op.bypassSchema);
v.addSchema(op.priceAgeSchema);
v.addSchema(op.weaponsAsCurrencySchema);
v.addSchema(op.tradeSummarySchema);
v.addSchema(op.highValueSchema);
v.addSchema(op.checkUsesSchema);
v.addSchema(op.gameSchema);
v.addSchema(op.normalizeSchema);

v.addSchema(op.dl.detailsSchema);
v.addSchema(op.dl.highValueDetailsSchema);

v.addSchema(op.statisticsSchema);

v.addSchema(op.ak.autokeysSchema);
v.addSchema(op.ak.bankingSchema);
v.addSchema(op.ak.scrapAdjustmentSchema);
v.addSchema(op.ak.acceptSchema);

v.addSchema(op.cf.craftingSchema);
v.addSchema(op.cf.metalsSchema);
v.addSchema(op.cf.weaponsSchema);

v.addSchema(op.or.offerReceivedSchema);
v.addSchema(op.or.autoDeclineOrSchema);
v.addSchema(op.or.exceptionValueIvOrSchema);
v.addSchema(op.or.invalidValueOrSchema);
v.addSchema(op.or.invalidItemsOrSchema);
v.addSchema(op.or.overUnderstockedOrSchema);
v.addSchema(op.or.dupedOrSchema);

v.addSchema(op.manualReviewSchema);

v.addSchema(op.dw.discordWebhookSchema);
v.addSchema(op.dw.tradeSummaryDWSchema);
v.addSchema(op.dw.miscTradeSummaryDWSchema);
v.addSchema(op.dw.mentionOwnerSchema);
v.addSchema(op.dw.offerReviewDWSchema);
v.addSchema(op.dw.miscOfferReviewDWSchema);
v.addSchema(op.dw.messagesDWSchema);
v.addSchema(op.dw.priceUpdateDWSchema);
v.addSchema(op.dw.sendAlertDWSchema);

v.addSchema(op.cm.customMessageSchema);
v.addSchema(op.cm.declineCMSchema);

v.addSchema(op.cmd.commandsSchema);
v.addSchema(op.cmd.customReplyOnlyReplyCmdSchema);
v.addSchema(op.cmd.customReplyOnlyDisabledCmdSchema);
v.addSchema(op.cmd.customReplyDisabledReplyCmdSchema);
v.addSchema(op.cmd.customReplyDisabledHaveDontCmdSchema);
v.addSchema(op.cmd.customReplyOnlyDisabledDisabledForSKUCmdSchema);
v.addSchema(op.cmd.priceCmdSchema);
v.addSchema(op.cmd.buySellCmdSchema);
v.addSchema(op.cmd.cartCmdSchema);
v.addSchema(op.cmd.customReplyCartCmdSchema);
v.addSchema(op.cmd.checkoutCmdSchema);
v.addSchema(op.cmd.customReplyCheckoutCmdSchema);
v.addSchema(op.cmd.queueCmdSchema);
v.addSchema(op.cmd.customReplyQueueCmdSchema);
v.addSchema(op.cmd.cancelCmdSchema);
v.addSchema(op.cmd.customReplyCancelCmdSchema);
v.addSchema(op.cmd.discordCmdSchema);
v.addSchema(op.cmd.messageCmdSchema);
v.addSchema(op.cmd.customReplyMessageCmdSchema);
v.addSchema(op.cmd.stockCmdSchema);
v.addSchema(op.cmd.weaponsCmdSchema);

v.addSchema(op.cmd.onlyReplyCmdSchema);
v.addSchema(op.cmd.onlyDisabledReplyCmdSchema);
v.addSchema(op.cmd.onlyEnableDisabledCmdSchema);
v.addSchema(op.cmd.onlyEnableDisabledReplyCmdSchema);
v.addSchema(op.cmd.donateBuyingOfferAtqCmdSchema);

v.addSchema(op.dx.detailsExtraSchema);
v.addSchema(op.dx.spellsDxSchema);
v.addSchema(op.dx.sheensDxSchema);
v.addSchema(op.dx.killstreakersDxSchema);
v.addSchema(op.dx.paintedDxSchema);
v.addSchema(op.dx.strangePartsDxSchema);

import { EntryData } from '../classes/Pricelist';
import Options from '../classes/Options';

export = function (data: EntryData | Options, schema: string): string[] | null {
    const putSchema =
        schema === 'pricelist-add'
            ? pl.addSchema
            : schema === 'pricelist'
            ? pl.pricelistSchema
            : schema === 'options'
            ? op.optionsSchema
            : {};

    const validated = v.validate(data, putSchema);
    if (validated.valid === true) {
        return null;
    }

    const errors = errorParser(validated);
    return errors;
};

function errorParser(validated: jsonschema.ValidatorResult): string[] {
    const errors: string[] = [];
    for (let i = 0; i < validated.errors.length; i++) {
        const error = validated.errors[i];
        let property = error.property;
        if (property.startsWith('instance.')) {
            property = property.replace('instance.', '');
        } else if (property === 'instance') {
            property = '';
        }

        let message = error.stack;
        if (error.name === 'additionalProperties') {
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            message = `unknown property "${error.argument}"`;
        } else if (property) {
            if (error.name === 'anyOf') {
                message = `"${property}" does not have a valid value`;
            } else {
                message = message.replace(error.property, `"${property}"`).trim();
            }
        } else {
            message = message.replace(error.property, property).trim();
        }

        errors.push(message);
    }
    return errors;
}
