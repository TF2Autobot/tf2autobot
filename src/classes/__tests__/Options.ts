import * as Options from '../Options';
import { existsSync, mkdirSync, readdirSync, rmdirSync, unlinkSync, writeFileSync, readFileSync } from 'fs';
import path from 'path';
import { DEFAULTS as defaultOptions } from '../Options';
import { deepMerge } from '../../lib/tools/deep-merge';

const OLD_ENV = process.env;

function cleanPath(p: string): void {
    if (existsSync(p)) {
        readdirSync(p).map(s => unlinkSync(path.join(p, s)));
        rmdirSync(p);
    }
}

beforeEach(() => {
    cleanPath(path.resolve(__dirname, '..', '..', '..', 'files', 'abc123'));
    cleanPath(path.resolve(__dirname, '..', '..', '..', 'files', 'test123'));
    jest.resetModules(); // most important - it clears the cache
    process.env = { ...OLD_ENV }; // make a copy
});

afterAll(() => {
    cleanPath(Options.getFilesPath('abc123'));
    cleanPath(Options.getFilesPath('test123'));
    process.env = OLD_ENV; // restore old env
});

test('Parsing Options', () => {
    // test defaults of each type
    let result = Options.loadOptions({ steamAccountName: 'abc123' });
    expect(result.steamAccountName).toBe('abc123');
    expect(result.autokeys.minKeys).toBe(3);
    expect(result.discordWebhook.commandCards.get).toBe(true);
    expect(result.discordWebhook.commandCards.autokeys).toBe(true);
    expect(result.discordWebhook.commandCards.version).toBe(true);
    expect(result.normalize.festivized.our).toBeFalsy();
    expect(result.normalize.festivized.their).toBeFalsy();

    // test loading a string variable
    process.env.STEAM_ACCOUNT_NAME = 'test123';
    result = Options.loadOptions();
    expect(result.steamAccountName).toBe('test123');
    delete process.env.STEAM_ACCOUNT_NAME;
    result = Options.loadOptions({ steamAccountName: 'abc123' });
    cleanPath(path.resolve(__dirname, '..', '..', '..', 'files', 'abc123'));
    cleanPath(path.resolve(__dirname, '..', '..', '..', 'files', 'test123'));
    expect(result.steamAccountName).toBe('abc123');
    process.env.BPTF_ACCESS_TOKEN = 'test';
    result = Options.loadOptions({ steamAccountName: 'abc123' });
    expect(result.bptfAccessToken).toBe('test');
    delete process.env.BPTF_ACCESS_TOKEN;
    cleanPath(path.resolve(__dirname, '..', '..', '..', 'files', 'abc123'));

    // test loading admins (an array of Objects)
    result = Options.loadOptions({
        steamAccountName: 'abc123',
        admins: [{ steam: 'STEAM_0:1:1234567', discord: '987654321' }]
    });
    expect(result.admins).toEqual([{ steam: 'STEAM_0:1:1234567', discord: '987654321' }]);
    result = Options.loadOptions({ steamAccountName: 'abc123', admins: [{ steam: 'STEAM_0:1:1234567' }] });
    expect(result.admins).toEqual([{ steam: 'STEAM_0:1:1234567', discord: undefined }]);
    process.env.ADMINS = '["STEAM_0:1:7654321"]'; // outdated?
    result = Options.loadOptions({ steamAccountName: 'abc123' });
    expect(result.admins).toEqual(['STEAM_0:1:7654321']);
    delete process.env.ADMINS;
    cleanPath(path.resolve(__dirname, '..', '..', '..', 'files', 'abc123'));

    // test loading numbers
    result = Options.loadOptions({ steamAccountName: 'abc123', autokeys: { minKeys: 1 } });
    expect(result.autokeys.minKeys).toEqual(1);
    cleanPath(path.resolve(__dirname, '..', '..', '..', 'files', 'abc123'));

    // test loading booleans
    result = Options.loadOptions({
        steamAccountName: 'abc123',
        normalize: { festivized: { our: false, their: false } }
    });
    expect(result.normalize.festivized.our).toBeFalsy();
    expect(result.normalize.festivized.their).toBeFalsy();
    cleanPath(path.resolve(__dirname, '..', '..', '..', 'files', 'abc123'));

    // Deprecated option is retained so existing options files remain valid.
    result = Options.loadOptions({
        steamAccountName: 'abc123',
        miscSettings: { counterOffer: { useSeparateKeyRates: true } }
    });
    expect(result.miscSettings.counterOffer.useSeparateKeyRates).toBe(true);
    cleanPath(path.resolve(__dirname, '..', '..', '..', 'files', 'abc123'));

    // test missing options in json
    const defaults = deepMerge({}, defaultOptions);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    delete defaults.crafting.metals;
    expect(defaults.crafting).toEqual({ manual: false, weapons: { enable: true } });
    const optionsPath = Options.getOptionsPath('abc123');
    mkdirSync(path.dirname(optionsPath), { recursive: true });
    writeFileSync(optionsPath, JSON.stringify(defaults, null, 4), {
        encoding: 'utf8'
    });
    result = Options.loadOptions({ steamAccountName: 'abc123' });
    expect(result.crafting).toEqual({
        manual: false,
        weapons: {
            enable: true
        },
        metals: {
            enable: true,
            minScrap: 9,
            minRec: 9,
            threshold: 9
        }
    });
    cleanPath(path.resolve(__dirname, '..', '..', '..', 'files', 'abc123'));
});

test('malformed options.json should crash', () => {
    const optionsPath = Options.getOptionsPath('abc123');
    cleanPath(path.dirname(optionsPath));
    Options.loadOptions({ steamAccountName: 'abc123' }); // make default options get loaded
    const malformedOptions = '{"good": "entry",\r\n"unclosed": "string}';
    writeFileSync(optionsPath, malformedOptions, { encoding: 'utf8' }); // options are now mangled
    expect(() => {
        Options.loadOptions({ steamAccountName: 'abc123' });
    }).toThrow(
        new Error(
            `${optionsPath}\n` +
                "Parse error on line 2:\n...ntry\",\r\"unclosed\": \"string}\n----------------------^\nExpecting 'STRING', 'NUMBER', 'NULL', 'TRUE', 'FALSE', '{', '[', got 'undefined'"
        )
    );
    // ensure options.json is left untouched
    const rawOptions = readFileSync(optionsPath, { encoding: 'utf8' });
    expect(rawOptions).toEqual('{"good": "entry",\r\n"unclosed": "string}');
});

test('write options.json if no file exists in directory', () => {
    const optionsPath = Options.getOptionsPath('abc123');
    cleanPath(path.dirname(optionsPath));
    Options.loadOptions({ steamAccountName: 'abc123' }); // options should create directory and write defaults
    expect(readFileSync(optionsPath, { encoding: 'utf8' })).toEqual(JSON.stringify(Options.DEFAULTS, null, 4));
    cleanPath(path.dirname(optionsPath));
    mkdirSync(path.dirname(optionsPath)); // now only the directory exists but no options.json
    Options.loadOptions({ steamAccountName: 'abc123' });
    expect(readFileSync(optionsPath, { encoding: 'utf8' })).toEqual(JSON.stringify(Options.DEFAULTS, null, 4));
});

test('malformed json in the files dir should crash', () => {
    const filesPath = Options.getFilesPath('abc123');
    cleanPath(filesPath);
    const malformedJsonFile = '{"good": "entry",\r\n"unclosed": "string}';
    const malformedFilePath = path.join(filesPath, 'bad.json');
    mkdirSync(filesPath, { recursive: true });
    writeFileSync(malformedFilePath, malformedJsonFile, { encoding: 'utf8' });
    expect(() => {
        Options.loadOptions({ steamAccountName: 'abc123' });
    }).toThrow(
        new Error(
            `${malformedFilePath}\n` +
                "Parse error on line 2:\n...ntry\",\r\"unclosed\": \"string}\n----------------------^\nExpecting 'STRING', 'NUMBER', 'NULL', 'TRUE', 'FALSE', '{', '[', got 'undefined'"
        )
    );
});

test('removes cli options', () => {
    const testOptions = { steamAccountName: 'abc123' };

    Options.removeCliOptions(testOptions);
    expect(testOptions).toEqual({});
});

test('migrates legacy game presence settings', () => {
    const optionsPath = Options.getOptionsPath('abc123');
    cleanPath(path.dirname(optionsPath));

    const legacyOptions = JSON.parse(JSON.stringify(defaultOptions)) as typeof defaultOptions;
    legacyOptions.miscSettings.game = {
        playOnlyTF2: true,
        customName: 'Legacy game name'
    };
    mkdirSync(path.dirname(optionsPath), { recursive: true });
    writeFileSync(optionsPath, JSON.stringify(legacyOptions, null, 4), { encoding: 'utf8' });

    const result = Options.loadOptions({ steamAccountName: 'abc123' });
    expect(result.miscSettings.game.presence).toEqual({ mode: 'tf2Only', customName: '' });

    const persistedOptions = JSON.parse(readFileSync(optionsPath, { encoding: 'utf8' })) as typeof defaultOptions;
    expect(persistedOptions.miscSettings.game).toEqual({ presence: { mode: 'tf2Only' } });
    cleanPath(path.dirname(optionsPath));
});

test('loads custom pricer options', () => {
    let result = Options.loadOptions({ steamAccountName: 'abc123' });
    expect(result.customPricerUrl).toEqual('');
    result = Options.loadOptions({ steamAccountName: 'abc123', customPricerUrl: 'https://custom-pricer.example.com' });
    expect(result.customPricerUrl).toEqual('https://custom-pricer.example.com');
});

test('validates skipItemsInTrade cancelOfferAfterMinutes', () => {
    let result = Options.loadOptions({ steamAccountName: 'abc123' });
    expect(result.miscSettings.skipItemsInTrade.cancelOfferAfterMinutes).toBe(0);

    result = Options.loadOptions({
        steamAccountName: 'abc123',
        miscSettings: { skipItemsInTrade: { cancelOfferAfterMinutes: 2 } }
    });
    expect(result.miscSettings.skipItemsInTrade.cancelOfferAfterMinutes).toBe(2);

    const optionsPath = Options.getOptionsPath('abc123');
    const invalidValues = [-1, 1.5, 'two'];
    invalidValues.forEach(cancelOfferAfterMinutes => {
        const invalidOptions = {
            ...defaultOptions,
            miscSettings: {
                ...defaultOptions.miscSettings,
                skipItemsInTrade: {
                    ...defaultOptions.miscSettings.skipItemsInTrade,
                    cancelOfferAfterMinutes
                }
            }
        };
        writeFileSync(optionsPath, JSON.stringify(invalidOptions, null, 4), { encoding: 'utf8' });

        expect(() => Options.loadOptions({ steamAccountName: 'abc123' })).toThrow();
    });
    cleanPath(path.dirname(optionsPath));
});

test('loads NextCrit options', () => {
    let result = Options.loadOptions({ steamAccountName: 'abc123' });
    expect(result.nextCritEnable).toBeTruthy();
    expect(result.nextCritApiKey).toEqual('');
    expect(result.nextCritAllowSelfSigned).toBeFalsy();
    process.env.NEXT_CRIT_ENABLE = 'true';
    process.env.NEXT_CRIT_API_KEY = 'nextcrit-test-key';
    process.env.NEXT_CRIT_ALLOW_SELF_SIGNED = 'true';
    try {
        result = Options.loadOptions({ steamAccountName: 'abc123' });
        expect(result.nextCritEnable).toBeTruthy();
        expect(result.nextCritApiKey).toEqual('nextcrit-test-key');
        expect(result.nextCritAllowSelfSigned).toBeTruthy();
    } finally {
        delete process.env.NEXT_CRIT_ENABLE;
        delete process.env.NEXT_CRIT_API_KEY;
        delete process.env.NEXT_CRIT_ALLOW_SELF_SIGNED;
    }
});

test('loads journal.tf options', () => {
    let result = Options.loadOptions({ steamAccountName: 'abc123' });
    expect(result.journalTfEnable).toBeFalsy();
    expect(result.journalTfApiKey).toEqual('');
    process.env.JOURNAL_TF_ENABLE = 'true';
    process.env.JOURNAL_TF_API_KEY = 'journal-test-key';
    result = Options.loadOptions({ steamAccountName: 'abc123' });
    expect(result.journalTfEnable).toBeTruthy();
    expect(result.journalTfApiKey).toEqual('journal-test-key');
    delete process.env.JOURNAL_TF_ENABLE;
    delete process.env.JOURNAL_TF_API_KEY;
});

test('loads a subset of options', () => {
    const filesPath = Options.getFilesPath('abc123');
    cleanPath(filesPath);
    const rawOptions = '{"miscSettings":{"addFriends":{"enable":false},"sendGroupInvite":{"enable":false}}}';
    const optionsFilePath = path.join(filesPath, 'options.json');
    mkdirSync(filesPath, { recursive: true });
    writeFileSync(optionsFilePath, rawOptions, { encoding: 'utf8' });
    const result = Options.loadOptions({
        steamAccountName: 'abc123',
        miscSettings: { addFriends: { enable: false }, sendGroupInvite: { enable: false } }
    });
    expect(result.miscSettings.addFriends.enable).toBeFalsy();
    expect(result.miscSettings.sendGroupInvite.enable).toBeFalsy();
});

test('loads saved Crit TF credentials on a later start', () => {
    Options.loadOptions({ steamAccountName: 'abc123' });
    const apiKey = `sk_${'a'.repeat(64)}`;
    writeFileSync(
        path.join(Options.getFilesPath('abc123'), 'crit-credentials.json'),
        JSON.stringify({ steam64: '76561198000000000', apiKey })
    );
    process.env.NEXT_CRIT_API_KEY = 'stale-key';
    try {
        const result = Options.loadOptions({ steamAccountName: 'abc123' });
        expect(result.nextCritEnable).toBe(true);
        expect(result.nextCritApiKey).toBe(apiKey);
    } finally {
        delete process.env.NEXT_CRIT_API_KEY;
    }
});

test('allows explicit disable even when credentials are saved', () => {
    Options.loadOptions({ steamAccountName: 'abc123' });
    writeFileSync(
        path.join(Options.getFilesPath('abc123'), 'crit-credentials.json'),
        JSON.stringify({
            steam64: '76561198000000000',
            apiKey: `sk_${'a'.repeat(64)}`
        })
    );
    process.env.NEXT_CRIT_ENABLE = 'false';
    const result = Options.loadOptions({ steamAccountName: 'abc123' });
    expect(result.nextCritEnable).toBe(false);
});

test('allows explicit disable without saved credentials', () => {
    process.env.NEXT_CRIT_ENABLE = 'false';
    const result = Options.loadOptions({ steamAccountName: 'abc123' });
    expect(result.nextCritEnable).toBe(false);
    expect(result.nextCritApiKey).toBe('');
});

test('allows disabling Crit TF through incoming options', () => {
    const result = Options.loadOptions({ steamAccountName: 'abc123', nextCritEnable: false });
    expect(result.nextCritEnable).toBe(false);
});

test('reports malformed credentials without including their contents', () => {
    Options.loadOptions({ steamAccountName: 'abc123' });
    writeFileSync(path.join(Options.getFilesPath('abc123'), 'crit-credentials.json'), '{"apiKey":"secret-value');
    expect(() => Options.loadOptions({ steamAccountName: 'abc123' })).toThrow('Cannot read Crit TF credentials');
});
