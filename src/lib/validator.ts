import jsonschema from 'jsonschema';
const Validator = jsonschema.Validator;

const v = new Validator();

import currenciesSchema from '../schemas/tf2-currencies';
import pricelistSchema from '../schemas/pricelist';
import addSchema from '../schemas/pricelist-add';

v.addSchema(currenciesSchema);
v.addSchema(pricelistSchema);
v.addSchema(addSchema);

export = function(...args): string[] | null {
    // @ts-ignore
    const validated = v.validate(...args);
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
