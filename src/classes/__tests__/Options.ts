import * as Options from '../Options';

const OLD_ENV = process.env;

beforeEach(() => {
    jest.resetModules(); // most important - it clears the cache
    process.env = { ...OLD_ENV }; // make a copy
});

afterAll(() => {
    process.env = OLD_ENV; // restore old env
});

test('Parsing Options', () => {
    // test defaults of each type
    let result = Options.loadOptions();
    expect(result.steamAccountName).toBe('');
    expect(result.minimumKeys).toBe(3);
    expect(result.normalizeFestivizedItems).toBeFalsy();

    // test loading a string variable
    process.env.STEAM_ACCOUNT_NAME = 'test123';
    result = Options.loadOptions();
    expect(result.steamAccountName).toBe('test123');
    result = Options.loadOptions({ steamAccountName: 'abc123' });
    expect(result.steamAccountName).toBe('abc123');
    process.env.BPTF_ACCESS_TOKEN = 'test';
    result = Options.loadOptions();
    expect(result.bptfAccessToken).toBe('test');

    // test loading an array of strings
    result = Options.loadOptions({ admins: ['STEAM_0:1:1234567'] });
    expect(result.admins).toEqual(['STEAM_0:1:1234567']);
    process.env.ADMINS = '["STEAM_0:1:7654321"]';
    result = Options.loadOptions();
    expect(result.admins).toEqual(['STEAM_0:1:7654321']);

    // test loading numbers
    result = Options.loadOptions({ minimumKeys: 1 });
    expect(result.minimumKeys).toEqual(1);
    process.env.MINIMUM_KEYS = '9';
    result = Options.loadOptions();
    expect(result.minimumKeys).toEqual(9);

    // test loading booleans
    result = Options.loadOptions({ normalizeFestivizedItems: true });
    expect(result.normalizeFestivizedItems).toBeTruthy();
    process.env.NORMALIZE_FESTIVIZED_ITEMS = 'true';
    result = Options.loadOptions();
    expect(result.normalizeFestivizedItems).toBeTruthy();
});
