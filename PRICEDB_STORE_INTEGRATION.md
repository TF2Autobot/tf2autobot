# PriceDB.io Store Integration

This document explains how to configure and use the pricedb.io store integration in tf2autobot.

## Overview

The pricedb.io store integration allows your bot to automatically create, update, and remove listings on store.pricedb.io in addition to backpack.tf. The store is designed as a storefront for TF2 trading bots and only supports **sell listings**.

## Features

-   **Automatic Listing Management**: Creates, updates, and removes sell listings on pricedb.io automatically
-   **Inventory Synchronization**: Periodic inventory refresh (up to 25 times per day as per API limits)
-   **Seamless Integration**: Works alongside backpack.tf listings without interference
-   **Error Handling**: Robust error handling with detailed logging

## Configuration

### 1. Get Your API Key

1. Visit [store.pricedb.io](https://store.pricedb.io)
2. Log in via Steam
3. Navigate to the [Settings page](https://store.pricedb.io/settings)
4. Generate your API key in the "API Keys" section

### 2. Configure Your Bot

Add the following to your `options.json` or set environment variables:

#### In options.json:

```json
{
    "pricedbStoreApiKey": "sk_your_api_key_here",
    "miscSettings": {
        "pricedbStore": {
            "enable": true,
            "enableInventoryRefresh": true
        }
    }
}
```

#### As Environment Variables:

```bash
pricedbStoreApiKey=sk_your_api_key_here
```

### Configuration Options

| Option                                             | Type    | Default | Description                                     |
| -------------------------------------------------- | ------- | ------- | ----------------------------------------------- |
| `pricedbStoreApiKey`                               | string  | `""`    | Your pricedb.io API key (required)              |
| `miscSettings.pricedbStore.enable`                 | boolean | `false` | Enable/disable pricedb.io store integration     |
| `miscSettings.pricedbStore.enableInventoryRefresh` | boolean | `false` | Enable automatic inventory refresh after trades |

## How It Works

### Listing Management

When your bot creates, updates, or removes listings on backpack.tf, it will automatically:

1. **Create Listings**: When a sell listing is created on backpack.tf, the same item is listed on pricedb.io
2. **Update Listings**: When a sell listing price is updated on backpack.tf, the pricedb.io listing is updated
3. **Remove Listings**: When a sell listing is removed from backpack.tf (e.g., item sold), it's also removed from pricedb.io

**Important**: Only **sell listings** are created on pricedb.io. Buy listings are not supported by the store platform.

### Inventory Refresh

The inventory refresh feature keeps your pricedb.io store inventory synchronized with Steam:

-   Automatically refreshes after every completed trade
-   Rate limited to 1 refresh per 15 minutes (API restriction)
-   The bot will log when rate limit is hit and how long until next allowed refresh

## API Rate Limits

The pricedb.io API has the following limits:

-   **General Requests**: 1,000 requests per 15 minutes (per API key)
-   **Inventory Refresh**: 25 refreshes per day (per account)

The bot automatically manages these limits and will log warnings if limits are approached.

## Logging

The integration provides detailed logging:

```
[PriceDB] Initializing PriceDB Store Manager...
[PriceDB] Fetched 150 listings from pricedb.io
[PriceDB] Created listing on pricedb.io for asset 12345678
[PriceDB] Updated listing on pricedb.io for asset 12345678
[PriceDB] Deleted listing on pricedb.io for asset 12345678
[PriceDB] Inventory refreshed on pricedb.io (5/25 today). Items: 150
[PriceDB] PriceDB Store inventory refresh enabled, will refresh every 6 hours
```

## Troubleshooting

### Common Issues

**"Failed to initialize PriceDB Store Manager"**

-   Verify your API key is correct
-   Ensure you're logged into store.pricedb.io with the Steam account matching your bot
-   Check that your account is approved on pricedb.io

**"Inventory refresh rate limit"**

-   This is expected behavior - inventory refreshes are limited to 1 per 15 minutes
-   The bot will log when the rate limit is hit and how many minutes remain
-   Inventory refreshes occur automatically after each completed trade

**"Failed to create listing"**

-   Ensure the item exists in your Steam inventory
-   Verify your account is approved on pricedb.io
-   Check that you haven't exceeded rate limits

**Listings not appearing**

-   Enable `createListings` in miscSettings
-   Ensure `pricedbStore.enable` is set to `true`
-   Check that you have a valid API key
-   Review bot logs for error messages

### Disabling the Feature

To disable pricedb.io store integration:

```json
{
    "miscSettings": {
        "pricedbStore": {
            "enable": false
        }
    }
}
```

Or simply remove/unset the `pricedbStoreApiKey`.

## API Documentation

For complete API documentation, visit: [https://store.pricedb.io/api-docs](https://store.pricedb.io/api-docs)

## Support

-   **Bot Issues**: [GitHub Issues](https://github.com/TF2-Price-DB/tf2autobot-pricedb/issues)
-   **Store Issues**: [Discord](https://discord.gg/7H2bceTgQK)
-   **API Documentation**: [store.pricedb.io/api-docs](https://store.pricedb.io/api-docs)

## Example Configuration

Here's a complete example of a typical configuration:

```json
{
    "steamAccountName": "your_bot_account",
    "steamPassword": "your_password",
    "steamSharedSecret": "your_shared_secret",
    "steamIdentitySecret": "your_identity_secret",
    "bptfAccessToken": "your_bptf_token",
    "pricedbStoreApiKey": "sk_your_pricedb_api_key_here",
    "miscSettings": {
        "createListings": {
            "enable": true
        },
        "pricedbStore": {
            "enable": true,
            "enableInventoryRefresh": true
        }
    }
}
```

## Notes

-   The pricedb.io store is a storefront platform, so only sell listings are supported
-   Inventory refresh is optional but recommended for keeping the store in sync
-   The bot will continue to function normally even if pricedb.io API calls fail
-   All pricedb.io operations are asynchronous and won't block backpack.tf listings
