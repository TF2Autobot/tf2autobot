// eslint-disable-next-line no-undef
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
    moduleNameMapper: {
        '@classes/(.*)': '<rootDir>/src/classes/$1',
        '@Carts/(.*)': '<rootDir>/src/classes/Carts/$1',
        '@accepted/(.*)': '<rootDir>/src/classes/MyHandler/offer/accepted/$1',
        '@notify/(.*)': '<rootDir>/src/classes/MyHandler/offer/notify/$1',
        '@review/(.*)': '<rootDir>/src/classes/MyHandler/offer/review/$1',
        '@handlerUtils/(.*)': '<rootDir>/src/classes/MyHandler/utils/$1',
        '@lib/(.*)': '<rootDir>/src/lib/$1',
        '@pricer/(.*)': '<rootDir>/src/lib/pricer/$1',
        '@tools/(.*)': '<rootDir>/src/lib/tools/$1',
        '@extend/(.*)': '<rootDir>/src/lib/extend/$1',
        '@DiscordWebhook/(.*)': '<rootDir>/src/lib/DiscordWebhook/$1',
        '@resources/(.*)': '<rootDir>/src/resources/$1'
    }
};
