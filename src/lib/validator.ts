import jsonschema from 'jsonschema';
const Validator = jsonschema.Validator;

const v = new Validator();

import { currenciesSchema } from '../schemas/pricelist-json/tf2-currencies';
import { pricelistSchema } from '../schemas/pricelist-json/pricelist';
import { addSchema } from '../schemas/pricelist-json/pricelist-add';
import { listingSchema } from '../schemas/pricelist-json/listing-note';

v.addSchema(currenciesSchema);
v.addSchema(pricelistSchema);
v.addSchema(addSchema);
v.addSchema(listingSchema);

import { stringArraySchema } from '../schemas/options-json/array-string';
import { optionsSchema } from '../schemas/options-json/options';
import { highValueSchema } from '../schemas/options-json/high-value/high-value';
import { checkUsesSchema } from '../schemas/options-json/check-uses/check-uses';
import { gameSchema } from '../schemas/options-json/game/game';
import { normalizeSchema } from '../schemas/options-json/normalize/normalize';
import { detailsSchema } from '../schemas/options-json/details/details';
import { customMessageSchema } from '../schemas/options-json/custom-message/custom-message';
import { statisticsSchema } from '../schemas/options-json/statistics/statistics';

v.addSchema(stringArraySchema);
v.addSchema(optionsSchema);
v.addSchema(highValueSchema);
v.addSchema(checkUsesSchema);
v.addSchema(gameSchema);
v.addSchema(normalizeSchema);
v.addSchema(detailsSchema);
v.addSchema(customMessageSchema);
v.addSchema(statisticsSchema);

import { autokeysSchema } from '../schemas/options-json/autokeys/autokeys';
import { bankingSchema } from '../schemas/options-json/autokeys/banking';
import { scrapAdjustmentSchema } from '../schemas/options-json/autokeys/scrapAdjustment';
import { acceptSchema } from '../schemas/options-json/autokeys/accept';

v.addSchema(autokeysSchema);
v.addSchema(bankingSchema);
v.addSchema(scrapAdjustmentSchema);
v.addSchema(acceptSchema);

import { craftingSchema } from '../schemas/options-json/crafting/crafting';
import { weaponsSchema } from '../schemas/options-json/crafting/weapons';
import { metalsSchema } from '../schemas/options-json/crafting/metals';

v.addSchema(craftingSchema);
v.addSchema(weaponsSchema);
v.addSchema(metalsSchema);

import { manualReviewSchema } from '../schemas/options-json/manual-review/manual-review';
import { invalidValueSchema } from '../schemas/options-json/manual-review/invalid-value/invalid-value';
import { autoDeclineIVSchema } from '../schemas/options-json/manual-review/invalid-value/auto-decline';
import { exceptionValueIVSchema } from '../schemas/options-json/manual-review/invalid-value/exception-value';
import { invalidItemsSchema } from '../schemas/options-json/manual-review/invalid-items/invalid-items';
import { overUnderstockedSchema } from '../schemas/options-json/manual-review/overstocked-understocked/overstocked-understocked';
import { dupedSchema } from '../schemas/options-json/manual-review/duped/duped';
import { dupedCheckFailedSchema } from '../schemas/options-json/manual-review/duped-check-failed/duped-check-failed';

v.addSchema(manualReviewSchema);
v.addSchema(invalidValueSchema);
v.addSchema(autoDeclineIVSchema);
v.addSchema(exceptionValueIVSchema);
v.addSchema(invalidItemsSchema);
v.addSchema(overUnderstockedSchema);
v.addSchema(dupedSchema);
v.addSchema(dupedCheckFailedSchema);

import { discordWebhookSchema } from '../schemas/options-json/discord-webhook/discord-webhook';
import { tradeSummarySchema } from '../schemas/options-json/discord-webhook/trade-summary/trade-summary';
import { miscTradeSummarySchema } from '../schemas/options-json/discord-webhook/trade-summary/misc-trade-summary';
import { mentionOwnerSchema } from '../schemas/options-json/discord-webhook/trade-summary/mention-owner';
import { offerReviewSchema } from '../schemas/options-json/discord-webhook/offer-review/offer-review';
import { miscOfferReviewSchema } from '../schemas/options-json/discord-webhook/offer-review/misc-offer-review';
import { messagesSchema } from '../schemas/options-json/discord-webhook/messages/messages';
import { priceUpdateSchema } from '../schemas/options-json/discord-webhook/price-update/price-update';
import { sendAlertSchema } from '../schemas/options-json/discord-webhook/send-alert/send-alert';

v.addSchema(discordWebhookSchema);
v.addSchema(tradeSummarySchema);
v.addSchema(miscTradeSummarySchema);
v.addSchema(mentionOwnerSchema);
v.addSchema(offerReviewSchema);
v.addSchema(miscOfferReviewSchema);
v.addSchema(messagesSchema);
v.addSchema(priceUpdateSchema);
v.addSchema(sendAlertSchema);

export = function(data: any, schema: string): string[] | null {
    const putSchema =
        schema === 'pricelist-add'
            ? addSchema
            : schema === 'pricelist'
            ? pricelistSchema
            : schema === 'tf2-currencies'
            ? currenciesSchema
            : schema === 'options'
            ? optionsSchema
            : listingSchema;

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
