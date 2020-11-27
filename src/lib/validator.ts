import jsonschema from 'jsonschema';
const Validator = jsonschema.Validator;

const v = new Validator();

import * as pl from '../schemas/pricelist-json/export';

v.addSchema(pl.currenciesSchema);
v.addSchema(pl.pricelistSchema);
v.addSchema(pl.addSchema);
v.addSchema(pl.listingSchema);

import * as op from '../schemas/options-json/export';

v.addSchema(op.stringArraySchema);
v.addSchema(op.optionsSchema);
v.addSchema(op.highValueSchema);
v.addSchema(op.checkUsesSchema);
v.addSchema(op.gameSchema);
v.addSchema(op.normalizeSchema);
v.addSchema(op.detailsSchema);
v.addSchema(op.customMessageSchema);
v.addSchema(op.statisticsSchema);

v.addSchema(op.a.autokeysSchema);
v.addSchema(op.a.bankingSchema);
v.addSchema(op.a.scrapAdjustmentSchema);
v.addSchema(op.a.acceptSchema);

v.addSchema(op.c.craftingSchema);
v.addSchema(op.c.weaponsSchema);
v.addSchema(op.c.metalsSchema);

v.addSchema(op.mv.manualReviewSchema);
v.addSchema(op.mv.invalidValueSchema);
v.addSchema(op.mv.autoDeclineIVSchema);
v.addSchema(op.mv.exceptionValueIVSchema);
v.addSchema(op.mv.invalidItemsSchema);
v.addSchema(op.mv.overUnderstockedSchema);
v.addSchema(op.mv.dupedSchema);
v.addSchema(op.mv.dupedCheckFailedSchema);

v.addSchema(op.dw.discordWebhookSchema);
v.addSchema(op.dw.tradeSummarySchema);
v.addSchema(op.dw.miscTradeSummarySchema);
v.addSchema(op.dw.mentionOwnerSchema);
v.addSchema(op.dw.offerReviewSchema);
v.addSchema(op.dw.miscOfferReviewSchema);
v.addSchema(op.dw.messagesSchema);
v.addSchema(op.dw.priceUpdateSchema);
v.addSchema(op.dw.sendAlertSchema);

export = function(data: any, schema: string): string[] | null {
    const putSchema =
        schema === 'pricelist-add'
            ? pl.addSchema
            : schema === 'pricelist'
            ? pl.pricelistSchema
            : schema === 'tf2-currencies'
            ? pl.currenciesSchema
            : schema === 'options'
            ? op.optionsSchema
            : pl.listingSchema;

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
