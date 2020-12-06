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
    jest.resetModules(); // most important - it clears the cache
    process.env = { ...OLD_ENV }; // make a copy
});

afterAll(() => {
    process.env = OLD_ENV; // restore old env
    cleanPath(path.resolve(__dirname, '..', '..', '..', 'files', 'abc123'));
    cleanPath(path.resolve(__dirname, '..', '..', '..', 'files', 'test123'));
});

test('Parsing Options', () => {
    // test defaults of each type
    let result = Options.loadOptions({ steamAccountName: 'abc123' });
    expect(result.steamAccountName).toBe('abc123');
    expect(result.autokeys.minKeys).toBe(3);
    expect(result.normalize.festivized).toBeFalsy();

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

    // test loading an array of strings
    result = Options.loadOptions({ steamAccountName: 'abc123', admins: ['STEAM_0:1:1234567'] });
    expect(result.admins).toEqual(['STEAM_0:1:1234567']);
    process.env.ADMINS = '["STEAM_0:1:7654321"]';
    result = Options.loadOptions({ steamAccountName: 'abc123' });
    expect(result.admins).toEqual(['STEAM_0:1:7654321']);
    delete process.env.ADMINS;
    cleanPath(path.resolve(__dirname, '..', '..', '..', 'files', 'abc123'));

    // test loading numbers
    result = Options.loadOptions({ steamAccountName: 'abc123', autokeys: { minKeys: 1 } });
    expect(result.autokeys.minKeys).toEqual(1);
    cleanPath(path.resolve(__dirname, '..', '..', '..', 'files', 'abc123'));

    // test loading booleans
    result = Options.loadOptions({ steamAccountName: 'abc123', normalize: { festivized: true } });
    expect(result.normalize.festivized).toBeTruthy();
    cleanPath(path.resolve(__dirname, '..', '..', '..', 'files', 'abc123'));

    // test missing options in json
    const defaults = deepMerge({}, defaultOptions);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    delete defaults.crafting.metals;
    expect(defaults.crafting).toEqual({ weapons: { enable: true } });
    const optionsPath = Options.getOptionsPath('abc123');
    mkdirSync(path.dirname(optionsPath), { recursive: true });
    writeFileSync(optionsPath, JSON.stringify(defaults, null, 4), {
        encoding: 'utf8'
    });
    result = Options.loadOptions({ steamAccountName: 'abc123' });
    expect(result.crafting).toEqual({
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
