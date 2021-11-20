import SKU from '@tf2autobot/tf2-sku';
import SchemaManager from '@tf2autobot/tf2-schema';
import Currencies from '@tf2autobot/tf2-currencies';
import sleepasync from 'sleep-async';
import { UnknownDictionary } from '../../types/common';
import { Webhook, sendWebhook } from './export';

import log from '../logger';
import { Entry } from '../../classes/Pricelist';
import Options from '../../classes/Options';

const australiumImageURL: { [name: string]: string } = {
    // Australium Ambassador
    '61;11;australium':
        'IUwYcXxrxqzlHh9rZCv2ADN8Mmsgy4N4MgGBvxVQuY7G2ZW8zJlfDUKJYCqxp8lnuW34wvJM3DIHgr-8CcAu9qsKYZG08QCvM/',
    // Australium Medi Gun
    '211;11;australium':
        'cUwoUWRLlrTZ8j8fqCc2ACfIHnpQ35pFWgGVtkFEqMuawNTQ-IwaaVfgICfRs9Vm9UXdmvpcwV4TipO4CZ0yx42dGigAL/',
    // Australium SMG
    '203;11;australium': 'IUxQcWiTltzRHt8TnH_WJRrhXmYpmvchRimI4xlMtbOfmNGdhdlTGV_VdDqBjrV-9CH43uZMzV4f457UBxvSrc7I/',
    // Australium Stickybomb Launcher
    '207;11;australium':
        'cUxQFVBjpoTpMhcrZAfOZBuMInsgK4p9Z3QlnkBN8Ma2xNGBldwbGBfQHCqNj9Vy-UXJm6sVmVYS0oLlWeFm9soqSYbd_N4tEAYCODYMwr6jb/',
    // Australium Black Box
    '228;11;australium':
        'IUwUdXBjpujdbt8_pAfazBOESnN97tJUAiGc6wFl4ZbvjaDU0JFbGUvUJCPc-8QvqDXc36pI6V4_go-oCexKv6tWDpsnI5Q/',
    // Australium Blutsauger
    '36;11;australium':
        'IUwsUWBjqvy1Nt8_pAfazBOESnN97vZQFgGVtyQUrbeW2ZjM_IFHGA_JYC_BuoQ7qDyJlusVnUdO1orpQfRKv6tW-OVvZVQ/',
    // Australium Flame Thrower
    '208;11;australium':
        'IUwEdXBbnrDBRh9_jH82LB-wEpNY095dQl2AzwlAsY7GzY242JlbHUKRdD6JtrV_pCndhvcJgDI7jpe8Afgrq54LYc-5723D3DXU/',
    // Australium Force-A-Nature
    '45;11;australium':
        'IUwMeSBnuvQdBidr0CP6zD-8Mn-U55IJS3Hg4xFB_NbSzYjJkcwCRUaFaCaJopVzuWHBi65dnAILu8u9Te1--t9DCLfByZ9DzsRlF/',
    // Australium Frontier Justice
    '141;11;australium':
        'IUwEDUhX2sT1Rgt31GfuPDd8HlNYx2pxUyzFu31V6YrLiZWJiIVeUV6IKDvdi9wy-UXA3upY3VtG19eMDeAzusYLOMrcycIYb30r634E/',
    // Australium Grenade Launcher
    '206;11;australium':
        'cUwADWBXjvD1Pid3oDvqJGt8HlNYx2pxUyzFu31YtYObgYGFjJ12VBKYLDac78FC5WyYxvMU1DYC0pLpTcAq8sIOVNrEycIYbGbNsLhA/',
    // Australium Minigun
    '202;11;australium':
        'cUwoYUxLlrTZ8j8fqCc2ACfIHnpRl48RRjjczw1N_YuLmYjVhJwaSUvILCa1r8Fm5X3cwupFnAoXvob8DZ0yx4_oW5y4u/',
    // Australium Tomislav
    '424;11;australium':
        'IUxMeUBLxtDlVt8_pAfazBOESnN974chX2mQ9wQMrY-G3YGdhcwWXB_UPWKZt9wruUX9ivpFlAIWwou1VehKv6tXcWH-bzQ/',
    // Australium Rocket Launcher
    '205;11;australium':
        'cUxUeXhDnrDRCncblBfeeN-cPl94K6ZFH3jMlwgcsNeaxZDYwcQWbA_BbDvZprArqXSJluJ5hUYPur-xRKlnq4daUO65sbo8Wbc6SlA/',
    // Australium Scattergun
    '200;11;australium':
        'cUxQSXA_2vSpEncbZCv2ADN8Mmsgy4N4E2Gc-lQcsMuDlY2A2IQbHB6UGWK0-9V29WnY365E3BYTkpb1UewzqqsKYZAHhHABV/',
    // Australium Sniper Rifle
    '201;11;australium':
        'cUxQfVAvnqipKjsTjMvWDBOQ_l9sn4pUbiGI6wFUoYLftMjMzcFeQBPFYD6dsoF-_Wn9nvJ82B4fkpOgAelrq5ZyGbefBeMmAbQ/',
    // Australium Sniper Rifle 2 - weird
    '15072;11;australium':
        'cUxQfVAvnqipKjsTjMvWDBOQ_l9sn4pUbiGI6wFUoYLftMjMzcFeQBPFYD6dsoF-_Wn9nvJ82B4fkpOgAelrq5ZyGbefBeMmAbQ/',
    // Australium Axtinguisher
    '38;11;australium':
        'IUwYJSRLsvy1Km8DjH82cEfIPpN066ZRq1Td5lgQ1MrDhZmAyKgfHU_cLX6NtrAy8W3Bnup4zVdPur-heew3otoTCZ7R_ZcYMQZeUvB7w1w/',
    // Australium Eyelander
    '132;11;australium':
        'IUwQdXALvtypGt8_pAfazBOESnN974ZFWjW8ylVJ_Y-C3aWEyKwGbUvUHWaRpo1--CHE2vsRmUITh9bhWehKv6tX00uGxPA/',
    // Australium Knife
    '194;11;australium': 'cUwwfVB3nhz9MhMzZAfOeD-VOyIJs55YAjDA8wAd6NrHnMm4xcFKSU_ZcCPQ49QzoXXQ0vcUxAYDu8vUWJ1teRmVbCw/',
    // Australium Wrench
    '197;11;australium': 'cUxADWBXhsAdEh8TiMv6NGucF1Ypg4ZNWgG9qyAB5YOfjaTRmJweaB_cPCaNjpAq9CnVgvZI1UNTn8bhIOVK4UnPgIXo/'
};

const paintCan: { [name: string]: string } = {
    // A Color Similar to Slate
    '5052;6':
        'TbL_ROFcpnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvOvr1MdQ/',
    // A Deep Commitment to Purple
    '5031;6':
        'TeLfQYFp1nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvVs13Vys/',
    // A Distinctive Lack of Hue
    '5040;6':
        'TYffEcEJhnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvXrHVMg0/',
    // A Mann's Mint
    '5076;6':
        'SLKqRMQ59nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvU8z3W20/',
    // After Eight
    '5077;6':
        'TbLfJME5hnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvWdo-dtk/',
    // Aged Moustache Grey
    '5038;6':
        'TeLPdNFslnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvFkHADQU/',
    // An Air of Debonair
    '5063;6':
        'TffPQfFZxnqWSMU5OD2NsHx3oIzChGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8V0p8gFQg/',
    // An Extraordinary Abundance of Tinge
    '5039;6':
        'SMf6UeRJpnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgv64ewDK8/',
    // Australium Gold
    '5037;6':
        'SMfqIdEs5nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvsjysS5w/',
    // Balaclavas Are Forever
    '5062;6':
        'TaK_FOE59nqWSMU5OD2NgHxnAPzChGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8V3lcfHzA/',
    // Color No. 216-190-216
    '5030;6':
        'SNcaJNRZRnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvFOcRWGY/',
    // Cream Spirit
    '5065;6':
        'SKevZLE8hnqWSMU5OD2IsHzHMPnShGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8VQmu5hdU/',
    // Dark Salmon Injustice
    '5056;6':
        'SMcPkeFs1nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvy3dkty0/',
    // Drably Olive
    '5053;6':
        'TRefgYEZxnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvMuQVCSQ/',
    // Indubitably Green
    '5027;6':
        'Tee_lNFZ5nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvm153-6I/',
    // Mann Co. Orange
    '5032;6':
        'SKL_cbEppnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvTFGBHn4/',
    // Muskelmannbraun
    '5033;6':
        'SIfPcdFZlnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvcmoesjg/',
    // Noble Hatter's Violet
    '5029;6':
        'TcePMQFc1nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvgXmHfsU/',
    // Operator's Overalls
    '5060;6':
        'TdcfMQEpRnqWSMU5OD2NoHwHEIkChGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8V-hQN5Nc/',
    // Peculiarly Drab Tincture
    '5034;6':
        'SKfKFOGJ1nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvG7gZwMo/',
    // Pink as Hell
    '5051;6':
        'SPL_YRQ5hnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgv9O7ytVg/',
    // Radigan Conagher Brown
    '5035;6':
        'TfcPRMEs1nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgv4OlkQfA/',
    // Team Spirit
    '5046;6':
        'SLcfMQEs5nqWSMU5OD2NwHzHZdmihGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8VWwsKTpY/',
    // The Bitter Taste of Defeat and Lime
    '5054;6':
        'Tae6NMEp5nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvvmRKa6k/',
    // The Color of a Gentlemann's Business Pants
    '5055;6':
        'SPeaUeGc9nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvoDEBbxU/',
    // The Value of Teamwork
    '5064;6':
        'TRefMYE5xnqWSMU5OD2NsKwicEzChGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8Vs4Ux0YY/',
    // Waterlogged Lab Coat
    '5061;6':
        'SIcflJGc9nqWSMU5OD2NEMzSVdmyhGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8VT2CQ46M/',
    // Ye Olde Rustic Colour
    '5036;6':
        'TeKvZLFJtnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvmeRW1Z8/',
    // Zepheniah's Greed
    '5028;6':
        'Tde_ROEs5nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvPiWjbeE/'
};

const ks1Images: { [sku: string]: string } = {
    // Killstreak Kit
    // Kritzkrieg
    '6527;6;uncraftable;kt-1;td-35':
        'y1FZPCfq1XFsaeB-B8fH0gL-7-OISHauPTOUeiDYRQ1qTOBaN2vZ_jSt5eWVEGnKQu0rRwwFfqIE92xXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFmn22oo8',
    '5749;6;uncraftable;kt-1;td-35':
        'y1FZPCfq1XFsaeB-B8fH0gL-7-OISHauPTOUeiDYRQ1qTOBaN2vZ_jSt5eWVEGnKQu0rRwwFfqIE92xXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFmn22oo8',
    // Blutsauger
    '6527;6;uncraftable;kt-1;td-36':
        'y1FaLyf71XN4a9pgOdnBxUv5ouHaTS31bmDCd3iBH1g_SeINMj6Ir2H3sbiTE2rJQ-4oR1sHe_AF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pfJry0Kb',
    // Ubersaw
    '6527;6;uncraftable;kt-1;td-37':
        'y1FDKCfqznV6WultKszDjgSsp7GMSy30OjPHfSeLT1g4GLZeM2iL_TTx4OWVETmfQb0lFw8BfvQasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479J1HqJfxhAFCeY84VVhFSL94YGqEXa_vkXnJX-rhN-Jb7cBQAggTQknrnXMqDh0g6P6NYgte8CBxgs8gevo',
    '5730;6;uncraftable;kt-1;td-37':
        'y1FDKCfqznV6WultKszDjgSsp7GMSy30OjPHfSeLT1g4GLZeM2iL_TTx4OWVETmfQb0lFw8BfvQasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479J1HqJfxhAFCeY84VVhFSL94YGqEXa_vkXnJX-rhN-Jb7cBQAggTQknrnXMqDh0g6P6NYgte8CBxgs8gevo',
    // Axtinguisher
    '6527;6;uncraftable;kt-1;td-38':
        'y1FXMjbx03N4bPZkPdn50Bzprt2BHWbwbXnHeXbfGQ0wSOdfZDnc_mWssb-cED7JQeksQwgNevFXpm1PbMqANhA_ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIx0QdScQPTZQxxZ5KhJngvgxQbrc_Gk0VEoYiNCvWAeexynfOWOaxOuhf7ZNXBlgTGUe-yXx6Dxx44fHfPAtH4X9y-6KV-8W20JWxGLBGOePO',
    '5733;6;uncraftable;kt-1;td-38':
        'y1FXMjbx03N4bPZkPdn50Bzprt2BHWbwbXnHeXbfGQ0wSOdfZDnc_mWssb-cED7JQeksQwgNevFXpm1PbMqANhA_ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIx0QdScQPTZQxxZ5KhJngvgxQbrc_Gk0VEoYiNCvWAeexynfOWOaxOuhf7ZNXBlgTGUe-yXx6Dxx44fHfPAtH4X9y-6KV-8W20JWxGLBGOePO',
    // Flare Gun
    '6527;6;uncraftable;kt-1;td-39':
        'y1FQJiPq2HN4a9p8IdnJ_wn6s-WIUnGhPmSVfXSNGgo6TLNZY2iP_Tuk4r_AQTrISO8tFw0CfPRWoGUbbsyXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75Pns1DBc9Q',
    '5793;6;uncraftable;kt-1;td-39':
        'y1FQJiPq2HN4a9p8IdnJ_wn6s-WIUnGhPmSVfXSNGgo6TLNZY2iP_Tuk4r_AQTrISO8tFw0CfPRWoGUbbsyXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75Pns1DBc9Q',
    // Backburner
    '6527;6;uncraftable;kt-1;td-40':
        'y1FUKyHz32F_a-B-B8fH0gL-77SIGCDyOG6VfHGJSVwwGbdWN26I9zun4-rHSzGcSespRVhQf_MGpmFXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFKUvrF8Q',
    '5747;6;uncraftable;kt-1;td-40':
        'y1FUKyHz32F_a-B-B8fH0gL-77SIGCDyOG6VfHGJSVwwGbdWN26I9zun4-rHSzGcSespRVhQf_MGpmFXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFKUvrF8Q',
    // Natascha
    '6527;6;uncraftable;kt-1;td-41':
        'y1FBFS7t2XlkaeRTNMrUxwC187aLS3WibGWdfHbaRVxrHrpdNWqMrGL37b-QR2vPEroqFQ4HLKtR8HoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPVNx04ibA',
    // Killing Gloves of Boxing
    '6527;6;uncraftable;kt-1;td-43':
        'y1FUJTrx03NSYuljLs7V_wn6s-WIUnegaW6TdniBGVhsSrNaMWDc-TDw5rnARmufROl5R18GL6FX8WAdacCXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75PnBTxCUU4',
    // Sandman
    '6527;6;uncraftable;kt-1;td-44':
        'y1FBJS382HpSZ-R4B8fH0gL-77aMHS2nMTOWKXPfS1xqGLQLYTnZ-TLx4u-cRmvNEuouEV9XdaZQ8jJXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFpUeECuM',
    // Force-A-Nature
    '6527;6;uncraftable;kt-1;td-45':
        'y1FSJTf60XFSZ-R-Ks7K_wn6s-WIUi32amScLniNTlpuH7dWPW7b9meltunAEDCbQb0pSl9ReKVWozVMbJyXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75PnJiCmFyc',
    // Huntsman
    '6527;6;uncraftable;kt-1;td-56':
        'y1FUJTXH0XV_YuAiapvFkFKq87TaGCajOWWceiCOTw08TbddNj6M_2WhtL6SQzvMFO1-FRdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjXJwtwpx5t5_gvAgNbdFkHQhJQux3M2HTU6jmyi2QXbG6PuFctMhYUQ8cTR68z317CB0h7ueZNFroLjUFxA',
    '5746;6;uncraftable;kt-1;td-56':
        'y1FUJTXH0XV_YuAiapvFkFKq87TaGCajOWWceiCOTw08TbddNj6M_2WhtL6SQzvMFO1-FRdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjXJwtwpx5t5_gvAgNbdFkHQhJQux3M2HTU6jmyi2QXbG6PuFctMhYUQ8cTR68z317CB0h7ueZNFroLjUFxA',
    // Ambassador
    '6527;6;uncraftable;kt-1;td-61':
        'y1FXJyD5zmdsYep-B8TW1Dr3oPCKGTrzOjXALXSNSAtqRbFaNGvdrDDw4-vBFzjPQewpRgxSfqsBpzUaNM6AIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umb3fCrnh',
    '5750;6;uncraftable;kt-1;td-61':
        'y1FXJyD5zmdsYep-B8TW1Dr3oPCKGTrzOjXALXSNSAtqRbFaNGvdrDDw4-vBFzjPQewpRgxSfqsBpzUaNM6AIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umb3fCrnh',
    // Direct Hit
    '6527;6;uncraftable;kt-1;td-127':
        'y1FSIzD93mBlbPFTNMrUxwC18rOJS3GhOWfHK3fdRVw5TuBeYT7f-Tf34buXRjybQOkvQAkHf6ED9noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPV8HUCLQA',
    '5745;6;uncraftable;kt-1;td-127':
        'y1FSIzD93mBlbPFTNMrUxwC18rOJS3GhOWfHK3fdRVw5TuBeYT7f-Tf34buXRjybQOkvQAkHf6ED9noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPV8HUCLQA',
    // Equalizer
    '6527;6;uncraftable;kt-1;td-128':
        'y1FGIyHz3GxoWvY-B8fH0gL-77vbH3LyOmaWKSWPHwlpH-FXMGGM-2Wj5urGQTydE-h4Rl8NfqVRo2NXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFGkLoPk0',
    // Scottish Resistance
    '6527;6;uncraftable;kt-1;td-130':
        '31FFPiv71m1vauhuB8_DxgD1peefI3j2ejDBYXTcHg08RLBfPGqK_DSt57idEzjKSLp_FVxSLqsMoWEbaJuJPENv3YAVu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkCXc4aW44twpBIupLNvB9Gaps4JFwdArAtCjXQFq6y3SiRV7W0OuIM7JdYBV5LS0buk3cpB0gpvajQYgsWtnl38_abr8rkxtPxDx5wqj9qHPE',
    // Chargin' Targe
    '6527;6;uncraftable;kt-1;td-131':
        'y1FCKzD_2EthZPdrPYWexFf58ObbTnCnbWOXLnKJT1puReVbNW_Yqzf04uyUF2ybRbt6F18AY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKrXZe610J6ho8cSL6FEASsAPW6I8yoxPuKH-uh9EbsY7QgcaR-x9YGDXXKvgkn-RDeuxbekI5ZQBXlEcHEm6ynUvBkkuvPHfdE0e5_1E7L65',
    // Eyelander
    '6527;6;uncraftable;kt-1;td-132':
        'y1FVJiPh0Ht_YNpgOdnBxUus8LGPSiKgOGSUenmJRAg9RLNfYGyI-Gbw5evGS27BSbt-Q1gEKKsF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pWTRBhcA',
    // Frontier Justice
    '6527;6;uncraftable;kt-1;td-141':
        'y1FQOC32yX1od-95K9_PwwDEreOfG3G5am6SfSOJTFw5TecLZ2HYqjGk4-XBQGvIFOwvEV9QeaJV8mZKO8vabgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkIJD1o8COg',
    '5751;6;uncraftable;kt-1;td-141':
        'y1FQOC32yX1od-95K9_PwwDEreOfG3G5am6SfSOJTFw5TecLZ2HYqjGk4-XBQGvIFOwvEV9QeaJV8mZKO8vabgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkIJD1o8COg',
    // Gunslinger
    '6527;6;uncraftable;kt-1;td-142':
        'z3tYOS7x03Nod9pgOdnBxUuvpOaISyfyO2XHfHaKSlxuTeIINWyLqmb04u_CQD7BQuEuQlpQKfYF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pcIhyEK7',
    // Homewrecker
    '6527;6;uncraftable;kt-1;td-153':
        'y1FFJif82nFlZOhhPdn5zATppufDHiKmP2CXKnGMGA09ReIKNm7c_Tui7OuXFmqaQL4oSglXfvMGoDFJPdfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8ZodG4-FDg',
    // Pain Train
    '6527;6;uncraftable;kt-1;td-154':
        'y1FGKyv2yWZsbOtTNMrUxwC1pbXYSnfzMG6cdnOIHgo_GLdcNWuKr2WjtruSQmqdQrkkQQwNf_QF8noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPWQxQxUug',
    // Southern Hospitality
    '6527;6;uncraftable;kt-1;td-155':
        'y1FFOivz2GN_YOtvMPTKwRf8pKzZRCXxOW_AKXSOGQc-TbAPNDnd_jb0s-uSETvJQ7ouEV1WK6tVp2IbI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-MvpftOl',
    // Lugermorph
    '6527;6;uncraftable;kt-1;td-160':
        'y1FCPiXH0HV1WuJ5NvTKwRf8pKyMGnD2OmOVfHePS1s6HrteZGHf-WCg7LiTQG6bELt4EQ1QL6cB9mEfI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-LK8U4cr',
    // Lugermorph (second one?)
    '6527;6;uncraftable;kt-1;td-294':
        'y1FCPiXH0HV1WuJ5NvTKwRf8pKyMGnD2OmOVfHePS1s6HrteZGHf-WCg7LiTQG6bELt4EQ1QL6cB9mEfI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-LK8U4cr',
    // Big Kill
    '6527;6;uncraftable;kt-1;td-161':
        'y1FCPiXHznVgWuJ5NvTKwRf8pKzfSCOuOmPCfSCMGlwxG7ALMmyK_TLx5-qSSj_JFLwoEV1Qe_cM9TFPI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-O642yZB',
    // Tribalman's Shiv
    '6527;6;uncraftable;kt-1;td-171':
        'y1FBJS384nlsZu1pLM75zATppufDSXGua2OTKyXbTgY_TbFbYW_d_jPw5u_BRTrBQOF6F1sMLqBV8GBBaNfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8Zow4KqSCg',
    // Scotsman's Skullcutter
    '6527;6;uncraftable;kt-1;td-172':
        'y1FUKzbs0XFsfeBTNMrUxwC19LvYS3euMTGdfnjcHVg_TuVaY2yIrDXz5uyXF23IE74kFQ4GfaVRoXoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPWkg4ccQg',
    // Vita-Saw
    '6527;6;uncraftable;kt-1;td-173':
        'y1FDKCfq03FoYelpB8fH0gL-77XVHyX0PG7CdiOKHVtqG7cKM2mK_2Gt4-_BEz-dEOp_Q1gGf6sE-2NXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFbL_2cXA',
    // Bat
    '6527;6;uncraftable;kt-1;td-190':
        'y1FUKzbH0XV_YuAiPJuVlgf-87HYTHGjP2DAKyOKTAs_S-FaNDrR_WKj4-uTETjLE-gkERdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjXJwtwpx5t5_gvAgNbdFkHQhJQux3M2HTU6jmyi2QXbG6PuFctMhYUQ8cTR68z317CB0h7ueZNFpjY4Lghg',
    // Bottle
    '6527;6;uncraftable;kt-1;td-191':
        '31FUJTbs0XFSaeR-P86IlFH99LWOGCLyMTKcLHiORAxqTrZfNWDe_mb35u2SRGzISL4kQg0GdbxErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgByZ5Vsp3NtwxRbI1zHQdFF-97ZmyIAvG1xC-ZV7C6PLMB5MEFBlASTBm7nCV6W0Ap763RbBMA7imuNH7pRg',
    // Fire Axe
    '6527;6;uncraftable;kt-1;td-192':
        'y1FQIzD93GxoWvV1KsT5zATppufDHnGgMG-UfiTdRFpuSucNYWndq2Gt7LiUFm2fQ-8uRwkMfaMG8mFINNfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8ZqvRkMNkQ',
    // Kukri
    '6527;6;uncraftable;kt-1;td-193':
        '31FbKyHw2GBoWultKszDjgT5-LLcSSCvODSRLXXaGFhpT-JWM23e-TSg7bnCRm2bQbsqFQwCffYasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479J1HqJfxhAFCeY84VVhFSL94YGqEXa_vkXnJX-rhN-Jb7cBQAggTQknrnXMqDh0g6P6NYgte8CBxOS3bjIk',
    // Knife
    '6527;6;uncraftable;kt-1;td-194':
        '31FdJCv-2EthZPdrPYWUkgf6-OOLGSHzOmWSeSWKGAdpG7MIMjyKqDqsseuTFj3BSbt-SwABY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKrXZe610J6ho8cSL6FEASsAPW6I8yoxPuKH-uh9EbsY7QgcaR-x9YGDXXKvgkn-RDeuxbekI5ZQBXlEcHEm6ynUvBkkuvPHfdE0e55_tEmtj',
    // Fists
    '6527;6;uncraftable;kt-1;td-195':
        '3lFQIzHs4nxoZPN1B8fH0gL-77qMTXGka2PHfiKBTFtrSLFWPTrY_Tui5r-WRD2cSe4vEAsEL6MH-mNXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFo5NPN6M',
    // Shovel
    '6527;6;uncraftable;kt-1;td-196':
        '31FFIi3u2HhSaeR-P86IxVKs97bcGXHzOzSXfnndRAk8RLpZM27e92GksOiWQmnIFegtEgkDf7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgByZ5Vsp3NtwxRbI1zHQdFF-97ZmyIAvG1xC-ZV7C6PLMB5MEFBlASTBm7nCV6W0Ap763RbBMA7ikXgBdeIg',
    // Wrench
    '6527;6;uncraftable;kt-1;td-197':
        '31FBOCf23nxSaeR-P86IkFL-8uSPRXajPWfGd3aKTwo5TLNYPGrZ_DGns-2cRW7LFb5_RF0Fe7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgByZ5Vsp3NtwxRbI1zHQdFF-97ZmyIAvG1xC-ZV7C6PLMB5MEFBlASTBm7nCV6W0Ap763RbBMA7imZ_hPyfQ',
    '5794;6;uncraftable;kt-1;td-197':
        '31FBOCf23nxSaeR-P86IkFL-8uSPRXajPWfGd3aKTwo5TLNYPGrZ_DGns-2cRW7LFb5_RF0Fe7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgByZ5Vsp3NtwxRbI1zHQdFF-97ZmyIAvG1xC-ZV7C6PLMB5MEFBlASTBm7nCV6W0Ap763RbBMA7imZ_hPyfQ',
    // Bonesaw
    '6527;6;uncraftable;kt-1;td-198':
        'y1FUJSz9znV6WultKszDjgT-p-OJSiWgPWCUeHffSgw-ReELMTzY-2KhtO6QS2yfFO8tEVgAdfMasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479J1HqJfxhAFCeY84VVhFSL94YGqEXa_vkXnJX-rhN-Jb7cBQAggTQknrnXMqDh0g6P6NYgte8CBxJCZZWDM',
    // Shotgun
    '6527;6;uncraftable;kt-1;td-199':
        '31FFIi3s2mFjWultKszDjlz_-ebfT3ClPGbBfCSIH109SbBfMGyP_Geis-mXEzDMQbx9QQxRfaAasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479J1HqJfxhAFCeY84VVhFSL94YGqEXa_vkXnJX-rhN-Jb7cBQAggTQknrnXMqDh0g6P6NYgte8CBxDNXFDug',
    '5729;6;uncraftable;kt-1;td-199':
        '31FFIi3s2mFjWultKszDjlz_-ebfT3ClPGbBfCSIH109SbBfMGyP_Geis-mXEzDMQbx9QQxRfaAasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479J1HqJfxhAFCeY84VVhFSL94YGqEXa_vkXnJX-rhN-Jb7cBQAggTQknrnXMqDh0g6P6NYgte8CBxDNXFDug',
    // Scattergun
    '6527;6;uncraftable;kt-1;td-200':
        'y1FFKSPsyXF_YvBiB8fH0gL-77fcTHWuOW-Vf3mBRA49TuJYMW6L9jut7LyUF2zPROguRwEMevZSpzBXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFFEuZ0ds',
    '5727;6;uncraftable;kt-1;td-200':
        'y1FFKSPsyXF_YvBiB8fH0gL-77fcTHWuOW-Vf3mBRA49TuJYMW6L9jut7LyUF2zPROguRwEMevZSpzBXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFFEuZ0ds',
    // Sniper Rifle
    '6527;6;uncraftable;kt-1;td-201':
        '31FFJCvo2GZ_bONgPfTKwRf8pKzeTnKmP2LGfXeATAhtGeFbYGzdqjug5-3GR26cEL59EA8BLvMN9TdAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-NMvvufd',
    '5728;6;uncraftable;kt-1;td-201':
        '31FFJCvo2GZ_bONgPfTKwRf8pKzeTnKmP2LGfXeATAhtGeFbYGzdqjug5-3GR26cEL59EA8BLvMN9TdAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-NMvvufd',
    // Minigun
    '6527;6;uncraftable;kt-1;td-202':
        '31FbIyzx2mFjWultKszDjl3_-LaOH3ela2DBLnbdTwk9GbNdPGDY-TLw4OqXSj_IF7skFwsBe6EasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479J1HqJfxhAFCeY84VVhFSL94YGqEXa_vkXnJX-rhN-Jb7cBQAggTQknrnXMqDh0g6P6NYgte8CBxYbsBTec',
    '5744;6;uncraftable;kt-1;td-202':
        '31FbIyzx2mFjWultKszDjl3_-LaOH3ela2DBLnbdTwk9GbNdPGDY-TLw4OqXSj_IF7skFwsBe6EasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479J1HqJfxhAFCeY84VVhFSL94YGqEXa_vkXnJX-rhN-Jb7cBQAggTQknrnXMqDh0g6P6NYgte8CBxYbsBTec',
    // SMG
    '6527;6;uncraftable;kt-1;td-203':
        '31FFJyXH0XV_YuAibpvExAOp8rfbGiWjPWSUf3mORVowRLIKZmuP9zqmt-iTEDDIRu4sRBdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjXJwtwpx5t5_gvAgNbdFkHQhJQux3M2HTU6jmyi2QXbG6PuFctMhYUQ8cTR68z317CB0h7ueZNFo13LB4WQ',
    // Syringe Gun
    '6527;6;uncraftable;kt-1;td-204':
        '31FFMzDx03NoYvBiB8fH0gL-7-fVSy2ibmbHfXCLTQ0_SeEIYTze_Tus4-qQFmmfQrl-Q1tQdaYE82xXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFKUpM3DI',
    // Rocket Launcher
    '6527;6;uncraftable;kt-1;td-205':
        '31FEJSHz2GBhZPBiO8PD0jr3oPCKGTqkP2HBeneNSw05TLcKN2CI-Dui4uidED3PSbp-FVsEfvFVoWVLNcuKIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umUR30DNl',
    '5726;6;uncraftable;kt-1;td-205':
        '31FEJSHz2GBhZPBiO8PD0jr3oPCKGTqkP2HBeneNSw05TLcKN2CI-Dui4uidED3PSbp-FVsEfvFVoWVLNcuKIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umUR30DNl',
    // Grenade Launcher
    '6527;6;uncraftable;kt-1;td-206':
        '31FROCf23HBoaeR5NsjOxRfEreOfG3G5OTKSKneJSl0-HLRYNmHbrGGs7bySEzjKReAtEFxXLKYN9GZMPcuOOAx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkIKGN7nzvw',
    // Stickybomb Launcher
    '6527;6;uncraftable;kt-1;td-207':
        '31FFPiv71m1vauhuB8fH1Qv4qeefI3j2ejDBYSDcSAppHOcNMG_Z_TWl5bvFQGvMRLp6RA4AKKQC9zIabMGLbUA90oQVu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkCXc4aW44twpBIupLNvB9Gaps4JFwdArAtCjXQFq6y3SiRV7W0OuIM7JdYBV5LS0buk3cpB0gpvajQYgsWtnl38_abr8rkxtPxDx5wxSzuC7Y',
    '5743;6;uncraftable;kt-1;td-207':
        '31FFPiv71m1vauhuB8fH1Qv4qeefI3j2ejDBYSDcSAppHOcNMG_Z_TWl5bvFQGvMRLp6RA4AKKQC9zIabMGLbUA90oQVu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkCXc4aW44twpBIupLNvB9Gaps4JFwdArAtCjXQFq6y3SiRV7W0OuIM7JdYBV5LS0buk3cpB0gpvajQYgsWtnl38_abr8rkxtPxDx5wxSzuC7Y',
    // Flame Thrower
    '6527;6;uncraftable;kt-1;td-208':
        'y1FQJiP12GBld-p7Pdn5zATppufDRHGjODPFfySPGA5rGbFXZj7f_zSk4eiVQDrJRrslQwADf_EF8jVMa9fJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8Zrhr2UVGw',
    // Pistol
    '6527;6;uncraftable;kt-1;td-209':
        'y1FGIzHs0nhSaeR-P86IlwGq9rraRHX0MGHBeSLYTQtrSLFfMj7a-DL2sbucS27PEL5-EgoEfLxErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgByZ5Vsp3NtwxRbI1zHQdFF-97ZmyIAvG1xC-ZV7C6PLMB5MEFBlASTBm7nCV6W0Ap763RbBMA7ill68n2Ag',
    // Revolver
    '6527;6;uncraftable;kt-1;td-210':
        '31FELzT30WJod9pgOdnBxUuj97DfSnX2OjTBf3bbTw0wS7cMPWzRr2fx4byQFzyfRe8rQl9SLqMM7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pZtZqoWD',
    '5795;6;uncraftable;kt-1;td-210':
        '31FELzT30WJod9pgOdnBxUuj97DfSnX2OjTBf3bbTw0wS7cMPWzRr2fx4byQFzyfRe8rQl9SLqMM7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pZtZqoWD',
    // Medi Gun
    '6527;6;uncraftable;kt-1;td-211':
        'y1FbLybx2mFjWultKszDjgCo-LuOGHX2PGKdeiSKTA1qTbdaYG2L-2H3sO-XFmuYReB4S1sNKaMasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479J1HqJfxhAFCeY84VVhFSL94YGqEXa_vkXnJX-rhN-Jb7cBQAggTQknrnXMqDh0g6P6NYgte8CBxwAHkyVI',
    // Powerjack
    '6527;6;uncraftable;kt-1;td-214':
        'y1FGJTX9z35sZu5TNMrUxwC187reHyekbTSVdiDcRFppTbYKNDnRqGKmsOzCFzyfSO8qRQEEe6pV-noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPVxpwtTPg',
    // Degreaser
    '6527;6;uncraftable;kt-1;td-215':
        'y1FSLyXq2HV-YPdTNMrUxwC187XYTyKja27HfHLdS106SOEMMTyM_TGktu_ARG7NQrksFQxQdaoM93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPW5L8nizg',
    // Shortstop
    '6527;6;uncraftable;kt-1;td-220':
        'y1FFIi3qyWd5avVTNMrUxwC1o7DaSiekPzSQdnmARA5uHLYNMW6N_jXwtrucQjidQusoRwkBfPcM8noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPU0Up2WZg',
    // Holy Mackerel
    '6527;6;uncraftable;kt-1;td-221':
        'y1FeJS7h0HVubuB-Pcf5zATppufDHXamMGTHLiKPSQs_TuYLMm7Z_TOg4byWETvBRuEvQwwDLqMB8TJJP9fJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8Zpxae41sQ',
    // L'Etranger
    '6527;6;uncraftable;kt-1;td-224':
        'y1FaLzbq3HpqYPdTNMrUxwC1oLGLRXGhODaRe3OMGlo5ReJbNmmK_zWs7ejFS2zMFeslQwECfaoD8XoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPURMpvDqg',
    // Your Eternal Reward
    '6527;6;uncraftable;kt-1;td-225':
        'y1FTPifq03VhWvdpL8rUxDr3oPCKGTqlMGOWeSfbT18xH7oNMTuKqjH05eiTFzGYQuEqRAsFdKUC-2JPPMyMIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umXHOSway',
    // Black Box
    '6527;6;uncraftable;kt-1;td-228':
        'y1FUJiP71nZifdpgOdnBxUv-p-bbGS3ybmfGLieKHQ1qS7ZfYDrf_zr3tO3AETDAR7opRgBQf6MM7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pfaKs_gy',
    // Sydney Sleeper
    '6527;6;uncraftable;kt-1;td-230':
        'y1FFMyb22G1SdulpPdvD0jr3oPCKGTqnPzSVfHDbRAhtH-VWNGraqzT34OTHR2ycEukpEglWf6dW9mxBNcjaIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umcyTeD4x',
    // Bushwacka
    '6527;6;uncraftable;kt-1;td-232':
        'y1FVOC374n9jbONpB8fH0gL-7-HVHSOiazTGfCOAGVw9H7tcZDzbq2HwtO2QS23OEO4vRwEFdaAG9GRXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzF2ZfLfQQ',
    // Gloves of Running Urgently
    '6527;6;uncraftable;kt-1;td-239':
        'y1FUJTrx03NSYuljLs7V_xDppueDH23IZDbWKCSXRQw_HOFWMGqM92an5OqVRTrIRet6QV0FK6cD-jcdaJ2IaRFrhYdYriuomUM7FxsvI_peIFLrhCZLZPssxSZDGtNTlCTuIJfckwY_P0cFE7jqVqLGbIGzyXJzXHUuHq0aeoyduDO9uNeoPvqCKfghPaxgosyE2FgBANEOUZs72IxPtJDztzJEeY08CFsjE7g9PDruCKillCuGCOq7aecM5sRZAVFITR68kidzDBsh6fmMOwRItigg9fOT-8SwyYHnSV5nzrqnk5Gqjw',
    '5731;6;uncraftable;kt-1;td-239':
        'y1FUJTrx03NSYuljLs7V_xDppueDH23IZDbWKCSXRQw_HOFWMGqM92an5OqVRTrIRet6QV0FK6cD-jcdaJ2IaRFrhYdYriuomUM7FxsvI_peIFLrhCZLZPssxSZDGtNTlCTuIJfckwY_P0cFE7jqVqLGbIGzyXJzXHUuHq0aeoyduDO9uNeoPvqCKfghPaxgosyE2FgBANEOUZs72IxPtJDztzJEeY08CFsjE7g9PDruCKillCuGCOq7aecM5sRZAVFITR68kidzDBsh6fmMOwRItigg9fOT-8SwyYHnSV5nzrqnk5Gqjw',
    // Frying Pan
    '6527;6;uncraftable;kt-1;td-264':
        'yWJaFTL500thZPdrPYWelwf69LDbSXegOzPCeHPfT1w7GOYLMD6L_jGn5LiXQDrKQ716RA8BY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKrXZe610J6ho8cSL6FEASsAPW6I8yoxPuKH-uh9EbsY7QgcaR-x9YGDXXKvgkn-RDeuxbekI5ZQBXlEcHEm6ynUvBkkuvPHfdE0e5xZDpUt4',
    // Iron Curtain
    '6527;6;uncraftable;kt-1;td-298':
        'y1FfOC324nd4d_FtMcX5zATppufDSib0bGHGeSOBRQ9sG-BaMTvQrDem7O2cQj_AEOgkFQ0MKaMM9TJJNdfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8ZoSMKl13g',
    // Amputator
    '6527;6;uncraftable;kt-1;td-304':
        'y1FXJzLtyXV5avdTNMrUxwC1o7XbGiGhPWGVdiLaHVoxHrMKNGqPrzGm7bnAQDvKSespSgEBf6oA9XoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPU1eWW8wA',
    // Crusader's Crossbow
    '6527;6;uncraftable;kt-1;td-305':
        'y1FVODfr3HBod_ZTO9nJ0xb5rvWyEHXlbzKKLSWATA07SbNXMm-M-jGntO6VEzjKFeguEltWKfQM9WYbOpvcbhM1gplLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEYAQMcZTY43xJFHt6H1qQhCeI0CGV8PGLoROTjDA6z5lXeRCOW3POQAs8kCUAgbQxy1mCZzDkl8ufDRbFtGty8npquSqJm4yMuvERdzO6yJwA',
    // Ullapool Caber
    '6527;6;uncraftable;kt-1;td-307':
        'y1FVKyD9z0thZPdrPYWVklf58-SIGHf0bGaQLHDcSwZsTOEPN2zR_TGi4umTFjHBEOwtF11XY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKrXZe610J6ho8cSL6FEASsAPW6I8yoxPuKH-uh9EbsY7QgcaR-x9YGDXXKvgkn-RDeuxbekI5ZQBXlEcHEm6ynUvBkkuvPHfdE0e5_DNuHob',
    // Loch-n-Load
    '6527;6;uncraftable;kt-1;td-308':
        'y1FaJSHw03hiZOFTNMrUxwC1-LLUGiSiODaRK3OORVxuT7EMYD2L-zal4--dSzCYR-B-QgsGL6cAp3oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPXWXS6fSw',
    // Warrior's Spirit
    '6527;6;uncraftable;kt-1;td-310':
        'y1FULyPq4ndhZPJTNMrUxwC1-LSPHiGhbWHAfXmJSwxqTrNaPW3e_jKs5OWQRm6dRb0rFwgDe6AH-noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPWdhraV8w',
    // Brass Beast
    '6527;6;uncraftable;kt-1;td-312':
        'y1FRKzb01HpqWuJ5NvTKwRf8pKzeHS3zMWaTd3mBHltqHrEKMD2K_zWjtLiRFDDOFL0pRwgGdfcH82wcI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-MteMLxR',
    // Candy Cane
    '6527;6;uncraftable;kt-1;td-317':
        'y1FVKyz8xEtuZOtpB8fH0gL-77XfGCTxPzKUdiSNHgptG-VZN2GLqDunse3BSj3KSL5-EgANeKsApjFXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFABl-KpY',
    // Boston Basher
    '6527;6;uncraftable;kt-1;td-325':
        'y1FUJTHs0npSZ-R_MM7U_wn6s-WIUieuPjTALXXfRAo9ROFeMD6NrGX3trnCFmrAROolQFpVe6IFpjBPNcCXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75PnAbzU_MA',
    // Back Scratcher
    '6527;6;uncraftable;kt-1;td-326':
        'y1FUKyHz4mdud-R4O8PD0jr3oPCKGTr1PG_HK3eITFo_S7BZNTnRqmKhtrudEDyfEut4RQAEffEApmMYaJjfIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umaVVLoFT',
    // Claidheamh Mòr
    '6527;6;uncraftable;kt-1;td-327':
        'y1FVJiPx2XxoZOhjMMbJ0jr3oPCKGTqkPzaVenCLGgwwSeFcNGHa-TrztOrBSznIQe8uQ10CeKJQoTYYPJqLIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umcpQ3pAH',
    // Jag
    '6527;6;uncraftable;kt-1;td-329':
        'y1FcKyXH0XV_YuAiPsqQmFyv8OTaGi32MGDALSPdSg04HuFXZjvb_jKntO-SSznBSOwrQhdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjXJwtwpx5t5_gvAgNbdFkHQhJQux3M2HTU6jmyi2QXbG6PuFctMhYUQ8cTR68z317CB0h7ueZNFqfB0O6hA',
    // Fists of Steel
    '6527;6;uncraftable;kt-1;td-331':
        'y1FQIzHszktiY9p_LM7DzDr3oPCKGTrxP2OQenaMRAw6SbcLZG2K-WWl4u-dSzrLSLwtElhSffQNo21BO52JIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umTwu9Klj',
    // Sharpened Volcano Fragment
    '6527;6;uncraftable;kt-1;td-348':
        'y1FEIyTs4nJkd-BTOdPD_wn6s-WIUnakamXBLnGKRQs-GbdYPGzZ_2agsOmRR27PSO8pQApSK6FX9TJNOsiXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75PnfmFzvuE',
    // Sun-on-a-Stick
    '6527;6;uncraftable;kt-1;td-349':
        'y1FEIyTs4nJkd-BTNcrFxTr3oPCKGTr0ajWRenbcGQ86SOFZZmyM9zOg7euUQDDJSeElQgEFeqZVoWJANJ_aIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umaU_4JVg',
    // Detonator
    '6527;6;uncraftable;kt-1;td-351':
        'y1FSLzb303V5avdTNMrUxwC1oLWPHSXzMWKTe3eKSlppSLZaMWDZ-Dui5byRQDvASLp6FQoEdPBS8noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPV5Y_zETQ',
    // Fan O'War
    '6527;6;uncraftable;kt-1;td-355':
        'y1FFIi3_yHpScuR-PsrI_wn6s-WIUiOjbmWSdnLfTV87S7sLMGHR-mCi5uuXRDrOSeAvQggMeaBVoDFLaJ2Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75Pn-CC29ZY',
    // Conniver's Kunai
    '6527;6;uncraftable;kt-1;td-356':
        'y1FFIi3_yHpSbvBiOcL5zATppufDGCL2OWWdfXbdGQZtRLVfMj3R-DPzs7nFS2rLSLwoFQFRffYHpjdJbtfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8ZpX2LuGXA',
    // Half-Zatoichi
    '6527;6;uncraftable;kt-1;td-357':
        'y1FFIi3_yHpSbuR4OcXH_wn6s-WIUiH2OmbAfnSKSAk6TeIKMmjYrzKlsLvBF27LQLp9FggGfKUE-2RJacGXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75Pn9CfXp5I',
    // Shahanshah
    '6527;6;uncraftable;kt-1;td-401':
        'y1FFKSv11GBsd9pgOdnBxUuuo7fURXH2bGaRKieOTl87H7tYND2Mqzqk5rvBQjHJQbssEAhQf6sC7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pXbZXdT5',
    // Bazaar Bargain
    '6527;6;uncraftable;kt-1;td-402':
        'y1FUKzj53GZSdutlKM7U_wn6s-WIUiXzbTTCf3COSwxpTrUNMm2P-GWs5ruQQTnNFLp-RlhQKasM82Eaa52Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75Pn2iQe5BA',
    // Persian Persuader
    '6527;6;uncraftable;kt-1;td-404':
        'y1FSLy_34md4afFtNvTV1wrppd2BHWbwbXmSKnCBTlwwHrcKZGDRrDDz4OuSQ23PQOgqQQ1XfPYA-mVLOMmNPhc8ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIx0QdScQPTZQxxZ5KhJngvgxQbrc_Gk0VEoYiNCvWAeexynfOWOaxOuhf7ZNXBlgTGUe-yXx6Dxx44fHfPAtH4X9y-6KV-8W20JWxGJ87vD-u',
    // Splendid Screen
    '6527;6;uncraftable;kt-1;td-406':
        'y1FGLzDr1HVjWvZkMc7KxDr3oPCKGTrxOzGQLHPbGVhsG-JaYD7e-mLx4-idF2vISLsuQQsFLKRQ82JBOc3cIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umcIhDRPO',
    // Quick-Fix
    '6527;6;uncraftable;kt-1;td-411':
        'y1FGOC3s0ktgYOFlP97I_wn6s-WIUnf1a2SceXTYRAg-SrVXNjyP_2L0s-6TQ2vLELx4SlgGdKYA-mFPb8uXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75Pnq3L0UQA',
    // Overdose
    '6527;6;uncraftable;kt-1;td-412':
        'y1FGOC3s0kt-fPdlNszDxxD1nu6MDnPyJmfBeXWAGgsxSOVYNG3e_jHws-_HFGnLQu0pFwgHK_AN-2RJb5qIahAjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVIo8CFcfLrUvJz7USq_uyiieW-C3NrcBt8YBVlBJQkzvk3V7Whgg4P-PbAoRsSov8qXGp8uujou4eBRAGbM',
    // Solemn Vow
    '6527;6;uncraftable;kt-1;td-413':
        'y1FeIzLo0nd_ZPFpK_TE1Rbvnu6MDnPyJmHFeXfdGVg7RLUMN2zQ-mGjsO7FET-fR-8oEQ1VKKJR-2VJbsjbNhYjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVIo8CFcfLrUvJz7USq_uyiieW-C3NrcBt8YBVlBJQkzvk3V7Whgg4P-PbAoRsSov8qXGp8uujou4YPRcJ54',
    // Liberty Launcher
    '6527;6;uncraftable;kt-1;td-414':
        'y1FaIyD9z2B0WultLcXFyADpnu6MDnPyJmDAdnKATFhqSOZXNznf9zah4LiVFzHMRL0pRQoMevFQ9WwfbpqIOxUjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVIo8CFcfLrUvJz7USq_uyiieW-C3NrcBt8YBVlBJQkzvk3V7Whgg4P-PbAoRsSov8qXGp8uujou4ARHtwYQ',
    // Reserve Shooter
    '6527;6;uncraftable;kt-1;td-415':
        'y1FELzH9z2JoWvZkN8TSxRfEreOfG3G5P27FfiPaSw8-HrNbMDmL9zX04OjCSzCaFLwlS10GdKcC9mxNOsqNawx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkILZ-x-Kog',
    // Market Gardener
    '6527;6;uncraftable;kt-1;td-416':
        'y1FbKzDz2GBSYuR-PM7IxRfEreOfG3G5PmSVLXWNSQxqG-BbZm2MqzT05unFED3LR-goRAEAfvdW92IfacDbPQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkILDDkfn7A',
    // Tomislav
    '6527;6;uncraftable;kt-1;td-424':
        'y1FCJS_xznhsc9pgOdnBxUuipeDeGCz0bmOXdnHbSgpqS7ENYGve_DPxse3GFj3BQb4kRl8GfKMF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pZ3cvyoZ',
    // Family Business
    '6527;6;uncraftable;kt-1;td-425':
        'y1FEPzHr1HVjWvdlN9_5zATppufDTy3xaWKXfCXdHVhrTrIPYDvb-mDz4biVQTvKRL0sQ1sCfaNQpjVKONfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8ZoCOEk20g',
    // Eviction Notice
    '6527;6;uncraftable;kt-1;td-426':
        'y1FTPCv7yX1ia9piN9_PwwDEreOfG3G5PjXAeXXdHgY-G7JeMWGM_TGm5O-RQmycQbouRFwNKKsFoDcaaZ2BbQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkIIT-joiqA',
    // Cow Mangler 5000
    '6527;6;uncraftable;kt-1;td-441':
        'y1FSOCXH3nt6aORiP8fD0jr3oPCKGTqhPDGdeHKIHg1uROZWPDqK-TvztujGQjnOEOh6Rg1QeaoH8jdBaZjYIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umc7xkVV9',
    // Righteous Bison
    '6527;6;uncraftable;kt-1;td-442':
        'y1FSOCXHz31qbfFpN97VwgzoruyyEHXlbzKKfnOLHgw7G7oNZmDf-zei4-nCRD2YEO59Q1sBf6RQoDZLbMCJNkdphZlLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEYAQMcZTY43xJFHt6H1qQhCeI0CGV8PGLoROTjDA6z5lXeRCOW3POQAs8kCUAgbQxy1mCZzDkl8ufDRbFtGty8npquSqJm4yMuvERe8yEGIHA',
    // Mantreads
    '6527;6;uncraftable;kt-1;td-444':
        'xW9YPjD93HB-WultKszDjlypp7GJGnD2bmfBfSONTQdsGbcKYTzcqGD25bmVE2vMQuApEABXefEasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479J1HqJfxhAFCeY84VVhFSL94YGqEXa_vkXnJX-rhN-Jb7cBQAggTQknrnXMqDh0g6P6NYgte8CBxdQgjt2U',
    // Disciplinary Action
    '6527;6;uncraftable;kt-1;td-447':
        'y1FEIybx03NSZvdjKPTKwRf8pKzdT3DxbWaVeXeARAZuGbYNNDqM-DTw5umTRj_AQeksSw8DffdW8jYfI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-Po2HEar',
    // Soda Popper
    '6527;6;uncraftable;kt-1;td-448':
        'y1FFJSb54mRidfVpKvTKwRf8pKzVRCCmP2GSfHGAS1o7TeYNNmyKrWbz5-WXETCbQ-orFVwFKKIE9mxBI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-O1fTw9C',
    // Winger
    '6527;6;uncraftable;kt-1;td-449':
        'y1FBIyz_2GZSdex_LMTK_wn6s-WIUnGmaTXCdnncHwkxGbBXPWrcqDGit7-QQGzOQu8pSw9QLKVV9GZPbsuXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75PniNmeDqw',
    // Atomizer
    '6527;6;uncraftable;kt-1;td-450':
        'y1FUJSzz4nZscdpgOdnBxUuj8ubaGXClMGLHKiSOGl09GLFYNmzc92Wg4unGFm7JQO14FV9QLvcF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pQKDeVuI',
    // Three-Rune Blade
    '6527;6;uncraftable;kt-1;td-452':
        'y1FFKS3tyUt-cup-PPTKwRf8pKzVSnKgam-SLCDcGgxqG-APMTmPr2ass77BET3OEukrQl0Af6AF-zEYI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-IzxlfqO',
    // Postal Pummeler
    '6527;6;uncraftable;kt-1;td-457':
        'y1FbKyv033t1WultKszDjgP4-LSMTXahPGTCfiKKTlg6G7INYWiP-Wen5OicEDifF7ovF18FefEasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479J1HqJfxhAFCeY84VVhFSL94YGqEXa_vkXnJX-rhN-Jb7cBQAggTQknrnXMqDh0g6P6NYgte8CBxRkplfJo',
    // Enforcer
    '6527;6;uncraftable;kt-1;td-460':
        'y1FFJDf64npiduBTNMrUxwC1-bGMGiyiO2LHdiCBTw49RLcMMW7brGGh5LyTEzjIR-p6QwhSePYCoXoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPVjv1UHYg',
    // Big Earner
    '6527;6;uncraftable;kt-1;td-461':
        'y1FFPSvs3nxvaeRoPfTKwRf8pKzfTXemazaSeXbaTFwwH7BYYzzb-mXw7emSEz6cE7x6QV0HKfZV8jdPI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-KcjP3FZ',
    // Maul
    '6527;6;uncraftable;kt-1;td-466':
        'y1FELCPH1XVgaOB-B8fH0gL-77TeTnL0OG6XLHDfTAtpRLtfPG6M9mGmsO2cRDmbQ7woFwANf_QApmxXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFapopBGk',
    // Conscientious Objector
    '6527;6;uncraftable;kt-1;td-474':
        'y1FGIyHz2GBSaeR-P86ImFyu97OOGXKuPDOWfnWOT1xsRLENYT6P-jqgs7jHRj-fFbx4RlwGfrxErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgByZ5Vsp3NtwxRbI1zHQdFF-97ZmyIAvG1xC-ZV7C6PLMB5MEFBlASTBm7nCV6W0Ap763RbBMA7inMLDiDyQ',
    // Nessie's Nine Iron
    '6527;6;uncraftable;kt-1;td-482':
        'y1FRJS7-3nh4Z9pgOdnBxUuu8LXdRCLzbGOdfCWJRQs9SeILMmCK-zX07ejGQT7PQukpS18Df6dR7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pYyos62F',
    // Original
    '6527;6;uncraftable;kt-1;td-513':
        'y1FULzbHz3tubuB4NMrTzgbzpPCyEHXlbzKKeCLfTA4wSLReNGze9zaj5riWFz_MQ-l5RgBVKaIG8G0dOJrYbRI1gJlLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEYAQMcZTY43xJFHt6H1qQhCeI0CGV8PGLoROTjDA6z5lXeRCOW3POQAs8kCUAgbQxy1mCZzDkl8ufDRbFtGty8npquSqJm4yMuvERfgCQ_mHQ',
    // Diamondback
    '6527;6;uncraftable;kt-1;td-525':
        'y1FSLzrHz3F7aul6Pdn5zATppufDTy32aW6SKnLdS1o7S7tXPWja9zT37LjHRz_BR7soFwtReKpS8DVLOdfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8Zrhevhwgw',
    // Machina
    '6527;6;uncraftable;kt-1;td-526':
        'y1FSLzrHznpkdeB-KsLAzADEreOfG3G5bTSVf3PbHlxuSrtaN2ra-jL2sbvAFD6aFb55QA4EK_ZWpzBLaMqAawx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkIK95TLxMA',
    '5796;6;uncraftable;kt-1;td-526':
        'y1FSLzrHznpkdeB-KsLAzADEreOfG3G5bTSVf3PbHlxuSrtaN2ra-jL2sbvAFD6aFb55QA4EK_ZWpzBLaMqAawx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkIK95TLxMA',
    // Widowmaker
    '6527;6;uncraftable;kt-1;td-527':
        'y1FSLzrHznxiceJ5NvTKwRf8pKzYGiLzMG-cLHmASQk_HLoNZjuLqGDw5--dSjqaQ-gqEQFRdPcE9jFAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-EVuMvyP',
    // Short Circuit
    '6527;6;uncraftable;kt-1;td-528':
        'y1FSLzrH3GZgWultKszDjlSroOeLGHKuOGGReCDbRVw4G7JWYG-N-jWj5b-cFz7PRekkFwkAe_casjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479J1HqJfxhAFCeY84VVhFSL94YGqEXa_vkXnJX-rhN-Jb7cBQAggTQknrnXMqDh0g6P6NYgte8CBxgKUMnEI',
    // Unarmed Combat
    '6527;6;uncraftable;kt-1;td-572':
        'y1FDJCPq0HFpWuZjNcnH1Dr3oPCKGTqgPmCQe3SLRFxrH7FeYW2I_Tqn4eucET2YRO8tF19QevQDoDVAPMmIIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umVnCtimH',
    // Wanga Prick
    '6527;6;uncraftable;kt-1;td-574':
        'y1FAJS380ntSdexiB8fH0gL-77PYTSX2bG_HKnmJSgs5RLcKZ2Hf-zCj5bzBETrLF7wkFQxQevYF8GZXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFGFSVp9k',
    // Apoco-Fists
    '6527;6;uncraftable;kt-1;td-587':
        'y1FFOHHHzWFjZu1TNMrUxwC1pLqLTSL1OGfCf3fYGQdsHLEPNj2N9jPztruTSzHOFex6RAkEeqcE93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPU5xjC6gA',
    // Pomson 6000
    '6527;6;uncraftable;kt-1;td-588':
        'y1FSOCXHzXtgdupiB8fH0gL-7-fUGCymOWLCdiSOHQowTbFdPGver2bxse6QETzLELt_Sw0DeaEA9TJXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFXeWkDxA',
    // Eureka Effect
    '6527;6;uncraftable;kt-1;td-589':
        'y1FSOCXHymZoa-ZkNcTS0gr1nu6MDnPyJmDFLCPcSww9SLRXMDnfr2Ws4rnBQzybSbwuEQkGevEE9zVMOc3YbRIjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVIo8CFcfLrUvJz7USq_uyiieW-C3NrcBt8YBVlBJQkzvk3V7Whgg4P-PbAoRsSov8qXGp8uujou40fNIrOg',
    // Third Degree
    '6527;6;uncraftable;kt-1;td-593':
        'y1FSOCXHyXxkd-FoPczUxQDEreOfG3G5PWeUenaKRQ49SeVWZ2yI_2Cs5OSdFGzMFekoQ19ReqNS9GZPOpvcPgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkILTMY7A-Q',
    // Phlogistinator
    '6527;6;uncraftable;kt-1;td-594':
        'y1FSOCXHzXxhauJlK9_PzgTvrvCyEHXlbzKKKieMTgk7SOEMN26N-jv35biWFmrNQLsqEglRfasCoG1OOpuAOBU10plLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEYAQMcZTY43xJFHt6H1qQhCeI0CGV8PGLoROTjDA6z5lXeRCOW3POQAs8kCUAgbQxy1mCZzDkl8ufDRbFtGty8npquSqJm4yMuvERfF0ZPg3Q',
    // Manmelter
    '6527;6;uncraftable;kt-1;td-595':
        'y1FSOCXH0HVjaOBgLM7U_wn6s-WIUnbxO2GQfCLaGAtrG7JYNm7Z_jb37OSQET7LRu16RF9QfqoN-2RNaJ-Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75PnSrCD6-g',
    // Scottish Handshake
    '6527;6;uncraftable;kt-1;td-609':
        'y1FFKS3s0XVjYdp_MMrUxDr3oPCKGTryPDOTeieNSV09HrpeMDzd_juh4OyURW2bQuEoQw0MefNR8W1IbMDYIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umblko_Nk',
    // Sharp Dresser
    '6527;6;uncraftable;kt-1;td-638':
        'y1FXKTDH1XtibudgOc_D_wn6s-WIUnXxbmGReHeLHgY6SbJdZGnf_Drws76cQz-cROwrEAwEf_FSpjcdO8uXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75PnWscgmKA',
    // Wrap Assassin
    '6527;6;uncraftable;kt-1;td-648':
        'y1FOJzHH2n1rcfJ-Odv5zATppufDTiakbWeULSWPSlhsT7ZYNTzf9jb37L6cETjPEuElQgkCeKMG9jBLbtfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8ZqKxa3ttg',
    // Spy-cicle
    '6527;6;uncraftable;kt-1;td-649':
        'y1FOJzHH3nthYdp_MMTTzAH-s92BHWbwbXnGKnaJHgk-ROVaMWCL9jL0s--WEDDKQO9-RgAHf_RV92dINc2NPRY_ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIx0QdScQPTZQxxZ5KhJngvgxQbrc_Gk0VEoYiNCvWAeexynfOWOaxOuhf7ZNXBlgTGUe-yXx6Dxx44fHfPAtH4X9y-6KV-8W20JWxGK_xHfIR',
    '5732;6;uncraftable;kt-1;td-649':
        'y1FOJzHH3nthYdp_MMTTzAH-s92BHWbwbXnGKnaJHgk-ROVaMWCL9jL0s--WEDDKQO9-RgAHf_RV92dINc2NPRY_ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIx0QdScQPTZQxxZ5KhJngvgxQbrc_Gk0VEoYiNCvWAeexynfOWOaxOuhf7ZNXBlgTGUe-yXx6Dxx44fHfPAtH4X9y-6KV-8W20JWxGK_xHfIR',
    // Holiday Punch
    '6527;6;uncraftable;kt-1;td-656':
        'y1FOJzHH2nhic-B_B8fH0gL-77HeSHKvbTXFKXeBGAwxS7cMNDne-Dqi4unCEz2cQugvFg4DffAF-m1XfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFChr0gZ4',
    // Black Rose
    '6527;6;uncraftable;kt-1;td-727':
        'y1FXPCPHz3t-YO5iMc3D_xPEreOfG3G5bW6TfnndSAk_H7oKPGDdqjf2seqdQjzPFLx4QQkDfKANoTUfOp2OOgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkIL33qlmcw',
    // Beggar's Bazooka
    '6527;6;uncraftable;kt-1;td-730':
        'y1FSPy_ozmBod9poPd3PwwDEreOfG3G5aWHFeyOMGQZpSeJXMGCMqGX0t7icRGvJSOEtQwpSdPAB8WNIP8vbbQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkIIPImIwmQ',
    // Lollichop
    '6527;6;uncraftable;kt-1;td-739':
        'y1FaJS701HdlavVTNMrUxwC187CITXenPmGVLHaPRVo9T-ZcNjuMqjDxsOTFFD6YSboqFwoEdfYC93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPWkU9_ktA',
    // Scorch Shot
    '6527;6;uncraftable;kt-1;td-740':
        'y1FFKS3q3nxSdu1jLPTKwRf8pKzbHnWgbjSRdnaNRQpqTrNXPDvb-DP25b-URT3NQL0qRAwEf6QApmIfI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-HSLwcjW',
    // Rainblower
    '6527;6;uncraftable;kt-1;td-741':
        'y1FEKyv233hicuB-B8fH0gL-77bYHXGhO2aWf3CMTA06H-VePW6Krzus5buVSzvIELwqEV0BeaFS9TdXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzF8BiPZrc',
    // Cleaner's Carbine
    '6527;6;uncraftable;kt-1;td-751':
        'y1FGOC3HznlqWultKszDjgb987WMRHDyOWeSe3aJTg5sSrMPNWja-DX24unCF2maSeEvFw0EK_YasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479J1HqJfxhAFCeY84VVhFSL94YGqEXa_vkXnJX-rhN-Jb7cBQAggTQknrnXMqDh0g6P6NYgte8CBxUA_vhsI',
    // Hitman's Heatmaker
    '6527;6;uncraftable;kt-1;td-752':
        'y1FGOC3Hz31raeBTNMrUxwC1o7LaRXHyOWfGLSfbRVxrG7pZNGzf-zumtL7HFD_ISb4pSwkMeKtV9HoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPX9v1kazA',
    // Baby Face's Blaster
    '6527;6;uncraftable;kt-1;td-772':
        'y1FGLzLHzndscfFpKszTzjr3oPCKGTqmMGTHfiXbGgc-G7ULNmjbq2as7OWUQz7BSLl4EF8GKfMN9TBPOMiJIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umVZodjMI',
    '5797;6;uncraftable;kt-1;td-772':
        'y1FGLzLHzndscfFpKszTzjr3oPCKGTqmMGTHfiXbGgc-G7ULNmjbq2as7OWUQz7BSLl4EF8GKfMN9TBPOMiJIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umVZodjMI',
    // Pretty Boy's Pocket Pistol
    '6527;6;uncraftable;kt-1;td-773':
        'y1FGLzLHzX1-cepgB8fH0gL-77vfHy30OTPCLnmIHws_HLoPZzra9zek57nHFjmaR-p5RAhRdPcA8WNXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFgdGjt3s',
    // Escape Plan
    '6527;6;uncraftable;kt-1;td-775':
        'y1FGIyHz3GxoWultKszDjlSs8ObYTC2mMTKWeiXbTgprGOEPMmzb_GCn4OmRFDHIQLx-S1gEKfEasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479J1HqJfxhAFCeY84VVhFSL94YGqEXa_vkXnJX-rhN-Jb7cBQAggTQknrnXMqDh0g6P6NYgte8CBxQ6ZqMEA',
    // Huo-Long Heater
    '6527;6;uncraftable;kt-1;td-811':
        'y1FVKyzs0npSaeR-P86IwVH_pOTaRSSvOmaTenmBTF85TbtYYz3frzX0tOSXFD3KF-oqSw4Hf7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgByZ5Vsp3NtwxRbI1zHQdFF-97ZmyIAvG1xC-ZV7C6PLMB5MEFBlASTBm7nCV6W0Ap763RbBMA7imbYcENKg',
    '5798;6;uncraftable;kt-1;td-811':
        'y1FVKyzs0npSaeR-P86IwVH_pOTaRSSvOmaTenmBTF85TbtYYz3frzX0tOSXFD3KF-oqSw4Hf7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgByZ5Vsp3NtwxRbI1zHQdFF-97ZmyIAvG1xC-ZV7C6PLMB5MEFBlASTBm7nCV6W0Ap763RbBMA7imbYcENKg',
    '6527;6;uncraftable;kt-1;td-832':
        'y1FVKyzs0npSaeR-P86IwVH_pOTaRSSvOmaTenmBTF85TbtYYz3frzX0tOSXFD3KF-oqSw4Hf7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgByZ5Vsp3NtwxRbI1zHQdFF-97ZmyIAvG1xC-ZV7C6PLMB5MEFBlASTBm7nCV6W0Ap763RbBMA7imbYcENKg',
    '5798;6;uncraftable;kt-1;td-832':
        'y1FVKyzs0npSaeR-P86IwVH_pOTaRSSvOmaTenmBTF85TbtYYz3frzX0tOSXFD3KF-oqSw4Hf7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgByZ5Vsp3NtwxRbI1zHQdFF-97ZmyIAvG1xC-ZV7C6PLMB5MEFBlASTBm7nCV6W0Ap763RbBMA7imbYcENKg',
    // Flying Guillotine
    '6527;6;uncraftable;kt-1;td-812':
        'y1FFLh370XFsc-B-B8fH0gL-77GLRXKibmHFfyCBH1w4SbcIYGvQ9zPx7bmcR2vMRet9EgsBfapXo2JXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFsqbZlH0',
    '6527;6;uncraftable;kt-1;td-833':
        'y1FFLh370XFsc-B-B8fH0gL-77GLRXKibmHFfyCBH1w4SbcIYGvQ9zPx7bmcR2vMRet9EgsBfapXo2JXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFsqbZlH0',
    // Neon Annihilator
    '6527;6;uncraftable;kt-1;td-813':
        'y1FFLh322HtjduxrNvTKwRf8pKyISnKvO2WSenffTg49HrsKYzyM9jussOWUEzDPR70rEAsHK6pX-mZAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-MN7kWss',
    '6527;6;uncraftable;kt-1;td-834':
        'y1FFLh322HtjduxrNvTKwRf8pKyISnKvO2WSenffTg49HrsKYzyM9jussOWUEzDPR70rEAsHK6pX-mZAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-MN7kWss',
    // AWPer Hand
    '6527;6;uncraftable;kt-1;td-851':
        'y1FVOSX34nV6ddpgOdnBxUv5-LPUGHWkMWWTKSWNSQ89TeBWY2GL-Gfws-zFRj3KRr15EA9VKPAC7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pSe82Nxi',
    // Freedom Staff
    '6527;6;uncraftable;kt-1;td-880':
        'y1FCPR393HNhYNpgOdnBxUv_pbGJTiKiMGeTf3GLGQ44RbYPNWve-Dr2sbidRzHBQ7woRAkFfPZW7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pZm5cEI-',
    // Bat Outta Hell
    '6527;6;uncraftable;kt-1;td-939':
        'y1FFITf00XZscdpgOdnBxUv4oLfYHnL0MWWReXjbSgw7GeVdMmrbrTOltOSVRD7JQ-96SgEMfvFV7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pea4Xq5g',
    // Loose Cannon
    '6527;6;uncraftable;kt-1;td-996':
        'y1FSLy_34ndsa-tjNvTKwRf8pKyPHi3yam_GeiXaHl9qHrJYZmHYrDGj4-SQS27IEuwkEg8AK_QNoTYdI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-AOUGsJX',
    '5799;6;uncraftable;kt-1;td-996':
        'y1FSLy_34ndsa-tjNvTKwRf8pKyPHi3yam_GeiXaHl9qHrJYZmHYrDGj4-SQS27IEuwkEg8AK_QNoTYdI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-AOUGsJX',
    // Rescue Ranger
    '6527;6;uncraftable;kt-1;td-997':
        'y1FCLy794mdlavFrLcX5zATppufDTifxajaRfnmATwg8H7VfN2nf_TKj7O2XFzzLErl6QwsCL_cG8TdJPdfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8Zrkbi4W8w',
    // Vaccinator
    '6527;6;uncraftable;kt-1;td-998':
        'y1FbLybx2mFjWuFpPs7I0wDEreOfG3G5OmXCdnSMSVtrTroIMjnZ-Dqs5uWTF27AQrokEg8MeaYD8WJJaMDdPgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkIIwrO4JpQ',
    '5800;6;uncraftable;kt-1;td-998':
        'y1FbLybx2mFjWuFpPs7I0wDEreOfG3G5OmXCdnSMSVtrTroIMjnZ-Dqs5uWTF27AQrokEg8MeaYD8WJJaMDdPgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkIIwrO4JpQ',
    // Ham Shank
    '6527;6;uncraftable;kt-1;td-1013':
        'y1FeKy_H0XV_YuAiYJKfwlOv9bOMGiDxPTKReXmAGls7TeVZMmmK_DWisOrHQDCdSO8rShdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjXJwtwpx5t5_gvAgNbdFkHQhJQux3M2HTU6jmyi2QXbG6PuFctMhYUQ8cTR68z317CB0h7ueZNFpHSFQWYQ',
    // Fortified Compound
    '6527;6;uncraftable;kt-1;td-1092':
        'y1FUJTXHyXxkYONTNMrUxwC18-PVTHKlOWaSeXSPRV0xSLsLZmGN9jantOqTFjjPSb5-Fg9SKaQH93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPVhA72C-g',
    // Classic
    '6527;6;uncraftable;kt-1;td-1098':
        'y1FCLCHHznpkdeB-KsLAzADEreOfG3G5PGeQdnaAGQ9tROFbPWHY_TemtLnBR27PROAtR1pXKacN8zBPP8zYbQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkIKM7kL1rw',
    // Tide Turner
    '6527;6;uncraftable;kt-1;td-1099':
        'y1FBIif90Ut-bexpNM_5zATppufDTyylamaTLXbaGlg-S7FZNGDaqDCj4rmXSjnBR70rElgDeqBW92cfOtfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8Zrk7aM7OA',
    // Bread Bite
    '6527;6;uncraftable;kt-1;td-1100':
        'y1FUOCf52Xlia_Z4Pdn5xwn0t-eeI3j2ejDBYXDbGAg9H-JWMW3bqzL34ezGETHBFL19F10BKaYHozYaOsDcbRtu3dEVu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkCXc4aW44twpBIupLNvB9Gaps4JFwdArAtCjXQFq6y3SiRV7W0OuIM7JdYBV5LS0buk3cpB0gpvajQYgsWtnl38_abr8rkxtPxDx5wGB2quK4',
    // Back Scatter
    '6527;6;uncraftable;kt-1;td-1103':
        'y1FFKSPsyXF_Yfd5NfTKwRf8pKzYSyOiOWOcKXKIH1ttTrpdYWGN_Teh5L6SRW3BFe0lQg0MKfQCpGFLI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-I026Afp',
    '5748;6;uncraftable;kt-1;td-1103':
        'y1FFKSPsyXF_Yfd5NfTKwRf8pKzYSyOiOWOcKXKIH1ttTrpdYWGN_Teh5L6SRW3BFe0lQg0MKfQCpGFLI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-I026Afp',
    // Air Strike
    '6527;6;uncraftable;kt-1;td-1104':
        'y1FXPi314nhscOtvMM7U_wn6s-WIUiz2PzLCd3eKTgk5HLcLPGHQrDLz5OjGRjubRbx-EQsNevEDoTYfPs2Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75Pn50Frmu0',
    '5801 ;6;uncraftable;kt-1;td-1104':
        'y1FXPi314nhscOtvMM7U_wn6s-WIUiz2PzLCd3eKTgk5HLcLPGHQrDLz5OjGRjubRbx-EQsNevEDoTYfPs2Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75Pn50Frmu0',
    // Necro Smasher
    '6527;6;uncraftable;kt-1;td-1123':
        'y1FVKzD21GJsadphOcfKxRHEreOfG3G5OGWWf3HbHwdtG7dfZGzf_zSssO6RRjDPRO4rSgwHK6UBo2cYOZ3baQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkIK6MWhiwQ',
    // Quickiebomb Launcher
    '6527;6;uncraftable;kt-1;td-1150':
        'y1FdIyz_0HVmYPdTK9_Pww7inu6MDnPyJmCVLHWKRAxrRbpWNzvYqjWgseTCQzvBQLwrSwhRe6RV8GxObsvYPEMjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVIo8CFcfLrUvJz7USq_uyiieW-C3NrcBt8YBVlBJQkzvk3V7Whgg4P-PbAoRsSov8qXGp8uujou4KIDABag',
    // Iron Bomber
    '6527;6;uncraftable;kt-1;td-1151':
        'y1FHPyP833VhadpgOdnBxUv997bYRHCkamCQLHWBTl1uGLRfNzuN-2ah4-nGSmuYF7p6QwkFdaMF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pevquAvM',
    // Panic Attack
    '6527;6;uncraftable;kt-1;td-1153':
        'y1FCOCf23nxqcOtTNMrUxwC19OaOGS2hOWaXfHLdSQc_SbBYYTrYqDX0t-iUET-fR-5-FQ9Re6YCpnoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPXuIEe7fw',
    // Dragon's Fury
    '6527;6;uncraftable;kt-1;td-1178':
        'y1FQJiP12HZsaelTNMrUxwC19uaMTCyhPTaRLnSKTQ9rSLMKNWDdqGemsLjHRDCfFLokQg8HfKUF9HoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPUiPAafqg',
    // Hot Hand
    '6527;6;uncraftable;kt-1;td-1181':
        '31FFJiPozX1jYtprNMTQxTr3oPCKGTr0ODbFdySASl9rG7JcMGzZq2eituTFRGmYQOouRQ1WfacC9TZJPJ-KIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umVuY9VSw',
    // Shooting Star
    '6527;6;uncraftable;kt-1;td-30665':
        'y1FfJDT5zn1ia9p_NsLWxRfpqOSBGUv7aSXDKm_YH1s5SuELZmuMrzrzsL_CFGvLF-p5Sg4NdaQApmBJPJ_caho80NEC5XW2kAJ0ExF5Td0WLV_1mCxGd7Qoz3AtPZpfmTr2JZHP3AI1aSkjWrXnSLjBb5f8zXglMlNmEqAEY4OVrnSsuM6lZ_OCLe5uOaY69saI2UVdX9MTWJgt2JZJtZ_-hApRbokuHmEeEKonNgbdBbuwlmDOV-rkOeQK4MgGXwsdG060yHx4XUEo6KyIYwVG5ngho6PGps23mt3pUQB5x86g4XiZ',
    // C.A.P.P.E.R
    '6527;6;uncraftable;kt-1;td-30666':
        'y1FfJDT5zn1ia9p8MdjSzwnEreOfG3G5OTLFfieAGgcwSrddZ22I_2Ggt7vFFj-aQrsrFQ4Ce6sN92VBNMrabgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkII1ldUA3Q',
    // Batsaber
    '6527;6;uncraftable;kt-1;td-30667':
        'y1FfJDT5zn1ia9puOd_5zATppufDHyL0amWReniJSFg_HrYINT7Q_jH34L-QFDufRbssElgCf6MG-zAaOtfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8ZqHTEk8ug'
    /*
        Don't have:
        - Sandvich (42)
        - Razorback (57)
        - Jarate (58)
        - Dead Ringer (59)
        - Cloak and Dagger (60)
        - Buff Banner (129)
        - Gunboats (133)
        - Wrangler (140)
        - Dalokohs Bar (159)
        - Crit-a-Cola (163)
        - Golden Wrench (169)
        - Invis Watch (212)
        - Mad Milk (222)
        - Battalion's Backup (226)
        - Darwin's Danger Shield (231)
        - Rocket Jumper (237)
        - Stickybomb Jumper (265)
        - Horseless Headless Horseman's Headtaker (266)
        - Buffalo Steak Sandvich (311)
        - Concheror (354)
        - Ali Baba's Wee Booties (405)
        - Fishcake (433)
        - Bootlegger (608)
        - Cozy Camper (642)
        - Festive Minigun (654)
        - Festive Rocket Launcher (658)
        - Festive Flame Thrower (659)
        - Festive Bat (660)
        - Festive Stickybomb Launcher (661)
        - Festive Wrench (662)
        - Festive Medi Gun (663)
        - Festive Sniper Rifle (664)
        - Festive Knife (665)
        - Festive Scattergun (669)
        - Sapper (736)
        - Construction PDA (737)
        - Silver Botkiller Sniper Rifle Mk.I (792)
        - Silver Botkiller Minigun Mk.I (793)
        - Silver Botkiller Knife Mk.I (794)
        - Silver Botkiller Wrench Mk.I (795)
        - Silver Botkiller Medi Gun Mk.I (796)
        - Silver Botkiller Stickybomb Launcher Mk.I (797)
        - Silver Botkiller Flame Thrower Mk.I (798)
        - Silver Botkiller Scattergun Mk.I (799)
        - Silver Botkiller Rocket Launcher Mk.I (800)
        - Gold Botkiller Sniper Rifle Mk.I (801)
        - Gold Botkiller Minigun Mk.I (802)
        - Gold Botkiller Knife Mk.I (803)
        - Gold Botkiller Wrench Mk.I (804)
        - Gold Botkiller Medi Gun Mk.I (805)
        - Gold Botkiller Stickybomb Launcher Mk.I (806)
        - Gold Botkiller Flame Thrower Mk.I (807)
        - Gold Botkiller Scattergun Mk.I (808)
        - Gold Botkiller Rocket Launcher Mk.I (809)
        - Red-Tape Recorder (810)
        - Deflector (850) - MvM
        - Rust Botkiller Sniper Rifle Mk.I (881)
        - Rust Botkiller Minigun Mk.I (882)
        - Rust Botkiller Knife Mk.I (883)
        - Rust Botkiller Wrench Mk.I (884)
        - Rust Botkiller Medi Gun Mk.I (885)
        - Rust Botkiller Stickybomb Launcher Mk.I (886)
        - Rust Botkiller Flame Thrower Mk.I (887)
        - Rust Botkiller Scattergun Mk.I (888)
        - Rust Botkiller Rocket Launcher Mk.I (889)
        - Blood Botkiller Sniper Rifle Mk.I (890)
        - Blood Botkiller Minigun Mk.I (891)
        - Blood Botkiller Knife Mk.I (892)
        - Blood Botkiller Wrench Mk.I (893)
        - Blood Botkiller Medi Gun Mk.I (894)
        - Blood Botkiller Stickybomb Launcher Mk.I (895)
        - Blood Botkiller Flame Thrower Mk.I (896)
        - Blood Botkiller Scattergun Mk.I (897)
        - Blood Botkiller Rocket Launcher Mk.I (898)
        - Carbonado Botkiller Sniper Rifle Mk.I (899)
        - Carbonado Botkiller Minigun Mk.I (900)
        - Carbonado Botkiller Knife Mk.I (901)
        - Carbonado Botkiller Wrench Mk.I (902)
        - Carbonado Botkiller Medi Gun Mk.I (903)
        - Carbonado Botkiller Stickybomb Launcher Mk.I (904)
        - Carbonado Botkiller Flame Thrower Mk.I (905)
        - Carbonado Botkiller Scattergun Mk.I (906)
        - Carbonado Botkiller Rocket Launcher Mk.I (907)
        - Diamond Botkiller Sniper Rifle Mk.I (908)
        - Diamond Botkiller Minigun Mk.I (909)
        - Diamond Botkiller Knife Mk.I (910)
        - Diamond Botkiller Wrench Mk.I (911)
        - Diamond Botkiller Medi Gun Mk.I (912)
        - Diamond Botkiller Stickybomb Launcher Mk.I (913)
        - Diamond Botkiller Flame Thrower Mk.I (914)
        - Diamond Botkiller Scattergun Mk.I (915)
        - Diamond Botkiller Rocket Launcher Mk.I (916)
        - Ap-Sap (933)
        - Quäckenbirdt (947)
        - Silver Botkiller Sniper Rifle Mk.II (957)
        - Silver Botkiller Minigun Mk.II (958)
        - Silver Botkiller Knife Mk.II (959)
        - Silver Botkiller Wrench Mk.II (960)
        - Silver Botkiller Medi Gun Mk.II (961)
        - Silver Botkiller Stickybomb Launcher Mk.II (962)
        - Silver Botkiller Flame Thrower Mk.II (963)
        - Silver Botkiller Scattergun Mk.II (964)
        - Silver Botkiller Rocket Launcher Mk.II (965)
        - Gold Botkiller Sniper Rifle Mk.II (966)
        - Gold Botkiller Minigun Mk.II (967)
        - Gold Botkiller Knife Mk.II (968)
        - Gold Botkiller Wrench Mk.II (969)
        - Gold Botkiller Medi Gun Mk.II (970)
        - Gold Botkiller Stickybomb Launcher Mk.II (971)
        - Gold Botkiller Flame Thrower Mk.II (972)
        - Gold Botkiller Scattergun Mk.II (973)
        - Gold Botkiller Rocket Launcher Mk.II (974)
        - Festive Holy Mackerel (999)
        - Festive Axtinguisher (1000)
        - Festive Buff Banner (1001)
        - Festive Sandvich (1002)
        - Festive Ubersaw (1003)
        - Festive Frontier Justice (1004)
        - Festive Huntsman (1005)
        - Festive Ambassado (1006)
        - Festive Grenade Launcher (1007)
        - Golden Frying Pan (1071)
        - Festive Force-A-Nature (1078)
        - Festive Crusader's Crossbow (1079)
        - Festive Sapper (1080)
        - Festive Flare Gun (1081)
        - Festive Eyelander (1082)
        - Festive Jarate (1083)
        - Festive Gloves of Running Urgently (1084)
        - Festive Black Box (1085)
        - Festive Wrangler (1086)
        - B.A.S.E. Jumper (1101)
        - Snack Attack (1102)
        - Self-Aware Beauty Mark (1105)
        - Mutated Milk (1121)
        - Crossing Guard (1127)
        - Festive Shotgun (1141)
        - Festive Revolver (1142)
        - Festive Bonesaw (1143)
        - Festive Chargin' Targe (1144)
        - Festive Bonk! Atomic Punch (1145)
        - Festive Backburner (1146)
        - Festive SMG (1149)
        - Thermal Thruster (1179)
        - Gas Passer (1180)
        - Second Banana (1190)
        - Nostromo Napalmer (30474)
        - Giger Counter (30668)
        - Prinny Machete (30758)
        */
};

const ks2Images: { [sku: string]: string } = {
    // Specialized Killstreak Kit

    // Kritzkrieg
    '6523;6;uncraftable;kt-2;td-35':
        'y1FZPCfq1XFsaeB-B8fH0gL-7-OISHauPTOUeiDYRQ1qTOBaN2vZ_jSt5eWVEGnKQu0rRwwFfqIE92xXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXOt_xzn8',
    // Blutsauger
    '6523;6;uncraftable;kt-2;td-36':
        'y1FaLyf71XN4a9pgOdnBxUv5ouHaTS31bmDCd3iBH1g_SeINMj6Ir2H3sbiTE2rJQ-4oR1sHe_AF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPS3h5Ays',
    // Ubersaw
    '6523;6;uncraftable;kt-2;td-37':
        'y1FDKCfqznV6WultKszDjgSsp7GMSy30OjPHfSeLT1g4GLZeM2iL_TTx4OWVETmfQb0lFw8BfvQasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479JNHqZn39QsQaItuT1xLEr1-Yj-HVKjhkn2ZC-e2P7UM4JMEAQxMTh7vm3J_DE03qKeOI5jad_M',
    // Axtinguisher
    '6523;6;uncraftable;kt-2;td-38':
        'y1FXMjbx03N4bPZkPdn50Bzprt2BHWbwbXnHeXbfGQ0wSOdfZDnc_mWssb-cED7JQeksQwgNevFXpm1PbMqANhA_ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIx0QdScQPTZQxxZ5KhJngvgxQbrcxGkwbFPcoZjrSV_21xC3MXuTkOeFY45BTVgweTk_pnnEpWx98vv2IOA1GtH0i7OLM-BT7bFeC',
    // Flare Gun
    '6523;6;uncraftable;kt-2;td-39':
        'y1FQJiPq2HN4a9p8IdnJ_wn6s-WIUnGhPmSVfXSNGgo6TLNZY2iP_Tuk4r_AQTrISO8tFw0CfPRWoGUbbsyXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBxG6FlXmU',
    // Backburner
    '6523;6;uncraftable;kt-2;td-40':
        'y1FUKyHz32F_a-B-B8fH0gL-77SIGCDyOG6VfHGJSVwwGbdWN26I9zun4-rHSzGcSespRVhQf_MGpmFXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXsI5QXnY',
    // Natascha
    '6523;6;uncraftable;kt-2;td-41':
        'y1FBFS7t2XlkaeRTNMrUxwC187aLS3WibGWdfHbaRVxrHrpdNWqMrGL37b-QR2vPEroqFQ4HLKtR8HoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFo4tjVkLg',
    // Killing Gloves of Boxing
    '6523;6;uncraftable;kt-2;td-43':
        'y1FUJTrx03NSYuljLs7V_wn6s-WIUnegaW6TdniBGVhsSrNaMWDc-TDw5rnARmufROl5R18GL6FX8WAdacCXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBxgyb3-po',
    // Sandman
    '6523;6;uncraftable;kt-2;td-44':
        'y1FBJS382HpSZ-R4B8fH0gL-77aMHS2nMTOWKXPfS1xqGLQLYTnZ-TLx4u-cRmvNEuouEV9XdaZQ8jJXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMX-y95lLQ',
    // Force-A-Nature
    '6523;6;uncraftable;kt-2;td-45':
        'y1FSJTf60XFSZ-R-Ks7K_wn6s-WIUi32amScLniNTlpuH7dWPW7b9meltunAEDCbQb0pSl9ReKVWozVMbJyXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBxdEVWMXU',
    // Huntsman
    '6523;6;uncraftable;kt-2;td-56':
        'y1FUJTXH0XV_YuAiapvFkFKq87TaGCajOWWceiCOTw08TbddNj6M_2WhtL6SQzvMFO1-FRdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjUpwszJoIvc3xuF4Xad8-Hw5LF-9-NG_QV_iyx3qYCua3bbVfsJdUBgsaTEu-n2o7UR4RzbFKSQ',
    // Ambassador
    '6523;6;uncraftable;kt-2;td-61':
        'y1FXJyD5zmdsYep-B8TW1Dr3oPCKGTrzOjXALXSNSAtqRbFaNGvdrDDw4-vBFzjPQewpRgxSfqsBpzUaNM6AIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pX9N5Tl3',
    // Direct Hit
    '6523;6;uncraftable;kt-2;td-127':
        'y1FSIzD93mBlbPFTNMrUxwC18rOJS3GhOWfHK3fdRVw5TuBeYT7f-Tf34buXRjybQOkvQAkHf6ED9noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFr1GesOdA',
    // Equalizer
    '6523;6;uncraftable;kt-2;td-128':
        'y1FGIyHz3GxoWvY-B8fH0gL-77vbH3LyOmaWKSWPHwlpH-FXMGGM-2Wj5urGQTydE-h4Rl8NfqVRo2NXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMX39hdoSk',
    // Scottish Resistance
    '6523;6;uncraftable;kt-2;td-130':
        '31FFPiv71m1vauhuB8_DxgD1peefI3j2ejDBYXTcHg08RLBfPGqK_DSt57idEzjKSLp_FVxSLqsMoWEbaJuJPENv3YAVu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkCXc4aW44twpBIupLNvB9Gaps4JFIdA74rez-CB6rkxyyfDbeyOLcP5ZBWBlobH0u5myB-Cht9vqyPblwSsHgi8aaM75PnZVBFHfg',
    // Chargin' Targe
    '6523;6;uncraftable;kt-2;td-131':
        'y1FCKzD_2EthZPdrPYWexFf58ObbTnCnbWOXLnKJT1puReVbNW_Yqzf04uyUF2ybRbt6F18AY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKrXZe610J6ho8cSL6FEASsAPW6Iyyo1BvtD06A5AONw_TF0YQe4oY2nQUqjkwiucWuPmOuRbsZcFAV1LGE-7n3d_EQl3v9-wa3Xl',
    // Eyelander
    '6523;6;uncraftable;kt-2;td-132':
        'y1FVJiPh0Ht_YNpgOdnBxUus8LGPSiKgOGSUenmJRAg9RLNfYGyI-Gbw5evGS27BSbt-Q1gEKKsF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPW-_RqMn',
    // Frontier Justice
    '6523;6;uncraftable;kt-2;td-141':
        'y1FQOC32yX1od-95K9_PwwDEreOfG3G5am6SfSOJTFw5TecLZ2HYqjGk4-XBQGvIFOwvEV9QeaJV8mZKO8vabgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPVd5cfvWg',
    // Gunslinger
    '6523;6;uncraftable;kt-2;td-142':
        'z3tYOS7x03Nod9pgOdnBxUuvpOaISyfyO2XHfHaKSlxuTeIINWyLqmb04u_CQD7BQuEuQlpQKfYF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPZJr6dGu',
    // Homewrecker
    '6523;6;uncraftable;kt-2;td-153':
        'y1FFJif82nFlZOhhPdn5zATppufDHiKmP2CXKnGMGA09ReIKNm7c_Tui7OuXFmqaQL4oSglXfvMGoDFJPdfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7inHU3-v-A',
    // Pain Train
    '6523;6;uncraftable;kt-2;td-154':
        'y1FGKyv2yWZsbOtTNMrUxwC1pbXYSnfzMG6cdnOIHgo_GLdcNWuKr2WjtruSQmqdQrkkQQwNf_QF8noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFoNV4ZgAg',
    // Southern Hospitality
    '6523;6;uncraftable;kt-2;td-155':
        'y1FFOivz2GN_YOtvMPTKwRf8pKzZRCXxOW_AKXSOGQc-TbAPNDnd_jb0s-uSETvJQ7ouEV1WK6tVp2IbI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e56OVjcx7',
    // Lugermorph
    '6523;6;uncraftable;kt-2;td-160':
        'y1FCPiXH0HV1WuJ5NvTKwRf8pKyMGnD2OmOVfHePS1s6HrteZGHf-WCg7LiTQG6bELt4EQ1QL6cB9mEfI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e56GpZyUr',
    // Lugermorph (second one?)
    '6523;6;uncraftable;kt-2;td-294':
        'y1FCPiXH0HV1WuJ5NvTKwRf8pKyMGnD2OmOVfHePS1s6HrteZGHf-WCg7LiTQG6bELt4EQ1QL6cB9mEfI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e56GpZyUr',
    // Big Kill
    '6523;6;uncraftable;kt-2;td-161':
        'y1FCPiXHznVgWuJ5NvTKwRf8pKzfSCOuOmPCfSCMGlwxG7ALMmyK_TLx5-qSSj_JFLwoEV1Qe_cM9TFPI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e5wcCwkyy',
    // Tribalman's Shiv
    '6523;6;uncraftable;kt-2;td-171':
        'y1FBJS384nlsZu1pLM75zATppufDSXGua2OTKyXbTgY_TbFbYW_d_jPw5u_BRTrBQOF6F1sMLqBV8GBBaNfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7ikx5bmquA',
    // Scotsman's Skullcutter
    '6523;6;uncraftable;kt-2;td-172':
        'y1FUKzbs0XFsfeBTNMrUxwC19LvYS3euMTGdfnjcHVg_TuVaY2yIrDXz5uyXF23IE74kFQ4GfaVRoXoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFoa0J7cmw',
    // Vita-Saw
    '6523;6;uncraftable;kt-2;td-173':
        'y1FDKCfq03FoYelpB8fH0gL-77XVHyX0PG7CdiOKHVtqG7cKM2mK_2Gt4-_BEz-dEOp_Q1gGf6sE-2NXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMX8urJ7aU',
    // Bat
    '6523;6;uncraftable;kt-2;td-190':
        'y1FUKzbH0XV_YuAiPJuVlgf-87HYTHGjP2DAKyOKTAs_S-FaNDrR_WKj4-uTETjLE-gkERdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjUpwszJoIvc3xuF4Xad8-Hw5LF-9-NG_QV_iyx3qYCua3bbVfsJdUBgsaTEu-n2o7UR6CTh6Fqw',
    // Bottle
    '6523;6;uncraftable;kt-2;td-191':
        '31FUJTbs0XFSaeR-P86IlFH99LWOGCLyMTKcLHiORAxqTrZfNWDe_mb35u2SRGzISL4kQg0GdbxErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgBx55UvJu8vV5AaNtpGQkfFel5M2-BBf-2wH_NWueya-QMt5UGAg8eGx29nXB4C1dptq5ZULhmDA',
    // Fire Axe
    '6523;6;uncraftable;kt-2;td-192':
        'y1FQIzD93GxoWvV1KsT5zATppufDHnGgMG-UfiTdRFpuSucNYWndq2Gt7LiUFm2fQ-8uRwkMfaMG8mFINNfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7ikQcFSvpQ',
    // Kukri
    '6523;6;uncraftable;kt-2;td-193':
        '31FbKyHw2GBoWultKszDjgT5-LLcSSCvODSRLXXaGFhpT-JWM23e-TSg7bnCRm2bQbsqFQwCffYasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479JNHqZn39QsQaItuT1xLEr1-Yj-HVKjhkn2ZC-e2P7UM4JMEAQxMTh7vm3J_DE03qKeO0KEHoZU',
    // Knife
    '6523;6;uncraftable;kt-2;td-194':
        '31FdJCv-2EthZPdrPYWUkgf6-OOLGSHzOmWSeSWKGAdpG7MIMjyKqDqsseuTFj3BSbt-SwABY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKrXZe610J6ho8cSL6FEASsAPW6Iyyo1BvtD06A5AONw_TF0YQe4oY2nQUqjkwiucWuPmOuRbsZcFAV1LGE-7n3d_EQl3v8opPbei',
    // Fists
    '6523;6;uncraftable;kt-2;td-195':
        '3lFQIzHs4nxoZPN1B8fH0gL-77qMTXGka2PHfiKBTFtrSLFWPTrY_Tui5r-WRD2cSe4vEAsEL6MH-mNXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXdH11i0g',
    // Shovel
    '6523;6;uncraftable;kt-2;td-196':
        '31FFIi3u2HhSaeR-P86IxVKs97bcGXHzOzSXfnndRAk8RLpZM27e92GksOiWQmnIFegtEgkDf7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgBx55UvJu8vV5AaNtpGQkfFel5M2-BBf-2wH_NWueya-QMt5UGAg8eGx29nXB4C1dptq7eIFjrkQ',
    // Wrench
    '6523;6;uncraftable;kt-2;td-197':
        '31FBOCf23nxSaeR-P86IkFL-8uSPRXajPWfGd3aKTwo5TLNYPGrZ_DGns-2cRW7LFb5_RF0Fe7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgBx55UvJu8vV5AaNtpGQkfFel5M2-BBf-2wH_NWueya-QMt5UGAg8eGx29nXB4C1dptq6wRYg0dA',
    // Bonesaw
    '6523;6;uncraftable;kt-2;td-198':
        'y1FUJSz9znV6WultKszDjgT-p-OJSiWgPWCUeHffSgw-ReELMTzY-2KhtO6QS2yfFO8tEVgAdfMasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479JNHqZn39QsQaItuT1xLEr1-Yj-HVKjhkn2ZC-e2P7UM4JMEAQxMTh7vm3J_DE03qKeOhN-kDxA',
    // Shotgun
    '6523;6;uncraftable;kt-2;td-199':
        '31FFIi3s2mFjWultKszDjlz_-ebfT3ClPGbBfCSIH109SbBfMGyP_Geis-mXEzDMQbx9QQxRfaAasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479JNHqZn39QsQaItuT1xLEr1-Yj-HVKjhkn2ZC-e2P7UM4JMEAQxMTh7vm3J_DE03qKeOq92s0m8',
    // Scattergun
    '6523;6;uncraftable;kt-2;td-200':
        'y1FFKSPsyXF_YvBiB8fH0gL-77fcTHWuOW-Vf3mBRA49TuJYMW6L9jut7LyUF2zPROguRwEMevZSpzBXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXIUfOVOo',
    // Sniper Rifle
    '6523;6;uncraftable;kt-2;td-201':
        '31FFJCvo2GZ_bONgPfTKwRf8pKzeTnKmP2LGfXeATAhtGeFbYGzdqjug5-3GR26cEL59EA8BLvMN9TdAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e5zLCpGFr',
    // Minigun
    '6523;6;uncraftable;kt-2;td-202':
        '31FbIyzx2mFjWultKszDjl3_-LaOH3ela2DBLnbdTwk9GbNdPGDY-TLw4OqXSj_IF7skFwsBe6EasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479JNHqZn39QsQaItuT1xLEr1-Yj-HVKjhkn2ZC-e2P7UM4JMEAQxMTh7vm3J_DE03qKeO0ZvHwkY',
    // SMG
    '6523;6;uncraftable;kt-2;td-203':
        '31FFJyXH0XV_YuAibpvExAOp8rfbGiWjPWSUf3mORVowRLIKZmuP9zqmt-iTEDDIRu4sRBdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjUpwszJoIvc3xuF4Xad8-Hw5LF-9-NG_QV_iyx3qYCua3bbVfsJdUBgsaTEu-n2o7UR4miCddzQ',
    // Syringe Gun
    '6523;6;uncraftable;kt-2;td-204':
        '31FFMzDx03NoYvBiB8fH0gL-7-fVSy2ibmbHfXCLTQ0_SeEIYTze_Tus4-qQFmmfQrl-Q1tQdaYE82xXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXbN748-U',
    // Rocket Launcher
    '6523;6;uncraftable;kt-2;td-205':
        '31FEJSHz2GBhZPBiO8PD0jr3oPCKGTqkP2HBeneNSw05TLcKN2CI-Dui4uidED3PSbp-FVsEfvFVoWVLNcuKIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54peYqjIdj',
    // Grenade Launcher
    '6523;6;uncraftable;kt-2;td-206':
        '31FROCf23HBoaeR5NsjOxRfEreOfG3G5OTKSKneJSl0-HLRYNmHbrGGs7bySEzjKReAtEFxXLKYN9GZMPcuOOAx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPWHBVvcAw',
    // Stickybomb Launcher
    '6523;6;uncraftable;kt-2;td-207':
        '31FFPiv71m1vauhuB8fH1Qv4qeefI3j2ejDBYSDcSAppHOcNMG_Z_TWl5bvFQGvMRLp6RA4AKKQC9zIabMGLbUA90oQVu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkCXc4aW44twpBIupLNvB9Gaps4JFIdA74rez-CB6rkxyyfDbeyOLcP5ZBWBlobH0u5myB-Cht9vqyPblwSsHgi8aaM75Pn8hDHDdo',
    // Flame Thrower
    '6523;6;uncraftable;kt-2;td-208':
        'y1FQJiP12GBld-p7Pdn5zATppufDRHGjODPFfySPGA5rGbFXZj7f_zSk4eiVQDrJRrslQwADf_EF8jVMa9fJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7in8YLEqDA',
    // Pistol
    '6523;6;uncraftable;kt-2;td-209':
        'y1FGIzHs0nhSaeR-P86IlwGq9rraRHX0MGHBeSLYTQtrSLFfMj7a-DL2sbucS27PEL5-EgoEfLxErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgBx55UvJu8vV5AaNtpGQkfFel5M2-BBf-2wH_NWueya-QMt5UGAg8eGx29nXB4C1dptq51VG8NlA',
    // Revolver
    '6523;6;uncraftable;kt-2;td-210':
        '31FELzT30WJod9pgOdnBxUuj97DfSnX2OjTBf3bbTw0wS7cMPWzRr2fx4byQFzyfRe8rQl9SLqMM7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPbRRf7Kp',
    // Medi Gun
    '6523;6;uncraftable;kt-2;td-211':
        'y1FbLybx2mFjWultKszDjgCo-LuOGHX2PGKdeiSKTA1qTbdaYG2L-2H3sO-XFmuYReB4S1sNKaMasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479JNHqZn39QsQaItuT1xLEr1-Yj-HVKjhkn2ZC-e2P7UM4JMEAQxMTh7vm3J_DE03qKeOmrsC7No',
    // Powerjack
    '6523;6;uncraftable;kt-2;td-214':
        'y1FGJTX9z35sZu5TNMrUxwC187reHyekbTSVdiDcRFppTbYKNDnRqGKmsOzCFzyfSO8qRQEEe6pV-noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFpVtWFnrg',
    // Degreaser
    '6523;6;uncraftable;kt-2;td-215':
        'y1FSLyXq2HV-YPdTNMrUxwC187XYTyKja27HfHLdS106SOEMMTyM_TGktu_ARG7NQrksFQxQdaoM93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFrugnh3UA',
    // Shortstop
    '6523;6;uncraftable;kt-2;td-220':
        'y1FFIi3qyWd5avVTNMrUxwC1o7DaSiekPzSQdnmARA5uHLYNMW6N_jXwtrucQjidQusoRwkBfPcM8noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFqTQPfMmg',
    // Holy Mackerel
    '6523;6;uncraftable;kt-2;td-221':
        'y1FeJS7h0HVubuB-Pcf5zATppufDHXamMGTHLiKPSQs_TuYLMm7Z_TOg4byWETvBRuEvQwwDLqMB8TJJP9fJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7in8dXeDFw',
    // L'Etranger
    '6523;6;uncraftable;kt-2;td-224':
        'y1FaLzbq3HpqYPdTNMrUxwC1oLGLRXGhODaRe3OMGlo5ReJbNmmK_zWs7ejFS2zMFeslQwECfaoD8XoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFpdBFKNdQ',
    // Your Eternal Reward
    '6523;6;uncraftable;kt-2;td-225':
        'y1FTPifq03VhWvdpL8rUxDr3oPCKGTqlMGOWeSfbT18xH7oNMTuKqjH05eiTFzGYQuEqRAsFdKUC-2JPPMyMIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pVGa_prS',
    // Black Box
    '6523;6;uncraftable;kt-2;td-228':
        'y1FUJiP71nZifdpgOdnBxUv-p-bbGS3ybmfGLieKHQ1qS7ZfYDrf_zr3tO3AETDAR7opRgBQf6MM7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPfYp-1kn',
    // Sydney Sleeper
    '6523;6;uncraftable;kt-2;td-230':
        'y1FFMyb22G1SdulpPdvD0jr3oPCKGTqnPzSVfHDbRAhtH-VWNGraqzT34OTHR2ycEukpEglWf6dW9mxBNcjaIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pY3cxKk1',
    // Bushwacka
    '6523;6;uncraftable;kt-2;td-232':
        'y1FVOC374n9jbONpB8fH0gL-7-HVHSOiazTGfCOAGVw9H7tcZDzbq2HwtO2QS23OEO4vRwEFdaAG9GRXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXsz-Zz-M',
    // Gloves of Running Urgently
    '6523;6;uncraftable;kt-2;td-239':
        'y1FUJTrx03NSYuljLs7V_xDppueDH23IZDbWKCSXRQw_HOFWMGqM92an5OqVRTrIRet6QV0FK6cD-jcdaJ2IaRFrhYdYriuomUM7FxsvI_peIFLrhCZLZPssxSZDGtNTlCTuIJfckwY_P0cFE7jqVqLGbIGzyXJzXHUuHq0aeoyduDO9uNeoPvqCKfghPaxgosyE2FgBANEOUZs72IxPtJDztzJEeY08CFsjHbg8MjyfAvq0kH2cDOTha-EOs8dQBl9LSU7on3B7W0wsuq2PP1tE4Swm9KaRq9PwkIJgCtEZCA',
    // Frying Pan
    '6523;6;uncraftable;kt-2;td-264':
        'yWJaFTL500thZPdrPYWelwf69LDbSXegOzPCeHPfT1w7GOYLMD6L_jGn5LiXQDrKQ716RA8BY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKrXZe610J6ho8cSL6FEASsAPW6Iyyo1BvtD06A5AONw_TF0YQe4oY2nQUqjkwiucWuPmOuRbsZcFAV1LGE-7n3d_EQl3vx6yRpJx',
    // Iron Curtain
    '6523;6;uncraftable;kt-2;td-298':
        'y1FfOC324nd4d_FtMcX5zATppufDSib0bGHGeSOBRQ9sG-BaMTvQrDem7O2cQj_AEOgkFQ0MKaMM9TJJNdfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7ikmr4R27w',
    // Amputator
    '6523;6;uncraftable;kt-2;td-304':
        'y1FXJzLtyXV5avdTNMrUxwC1o7XbGiGhPWGVdiLaHVoxHrMKNGqPrzGm7bnAQDvKSespSgEBf6oA9XoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFrrV5ZPew',
    // Crusader's Crossbow
    '6523;6;uncraftable;kt-2;td-305':
        'y1FVODfr3HBod_ZTO9nJ0xb5rvWyEHXlbzKKLSWATA07SbNXMm-M-jGntO6VEzjKFeguEltWKfQM9WYbOpvcbhM1gplLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEYAQMcZTY43xJFHt6H1qQhCeI0CF18OFrxgM2rSB_rjkXnLCuO1aecJtMcBVFhPTku9z3F-XR1_va_dO19Atnol9rzS8ZqXY8KvAw',
    // Ullapool Caber
    '6523;6;uncraftable;kt-2;td-307':
        'y1FVKyD9z0thZPdrPYWVklf58-SIGHf0bGaQLHDcSwZsTOEPN2zR_TGi4umTFjHBEOwtF11XY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKrXZe610J6ho8cSL6FEASsAPW6Iyyo1BvtD06A5AONw_TF0YQe4oY2nQUqjkwiucWuPmOuRbsZcFAV1LGE-7n3d_EQl3v0YR7VXZ',
    // Loch-n-Load
    '6523;6;uncraftable;kt-2;td-308':
        'y1FaJSHw03hiZOFTNMrUxwC1-LLUGiSiODaRK3OORVxuT7EMYD2L-zal4--dSzCYR-B-QgsGL6cAp3oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFpA187RUg',
    // Warrior's Spirit
    '6523;6;uncraftable;kt-2;td-310':
        'y1FULyPq4ndhZPJTNMrUxwC1-LSPHiGhbWHAfXmJSwxqTrNaPW3e_jKs5OWQRm6dRb0rFwgDe6AH-noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFryVtT43Q',
    // Brass Beast
    '6523;6;uncraftable;kt-2;td-312':
        'y1FRKzb01HpqWuJ5NvTKwRf8pKzeHS3zMWaTd3mBHltqHrEKMD2K_zWjtLiRFDDOFL0pRwgGdfcH82wcI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e54HcTtDJ',
    // Candy Cane
    '6523;6;uncraftable;kt-2;td-317':
        'y1FVKyz8xEtuZOtpB8fH0gL-77XfGCTxPzKUdiSNHgptG-VZN2GLqDunse3BSj3KSL5-EgANeKsApjFXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMX5xBqIn4',
    // Boston Basher
    '6523;6;uncraftable;kt-2;td-325':
        'y1FUJTHs0npSZ-R_MM7U_wn6s-WIUieuPjTALXXfRAo9ROFeMD6NrGX3trnCFmrAROolQFpVe6IFpjBPNcCXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBxIKqZaF0',
    // Back Scratcher
    '6523;6;uncraftable;kt-2;td-326':
        'y1FUKyHz4mdud-R4O8PD0jr3oPCKGTr1PG_HK3eITFo_S7BZNTnRqmKhtrudEDyfEut4RQAEffEApmMYaJjfIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pePjXJQD',
    // Claidheamh Mòr
    '6523;6;uncraftable;kt-2;td-327':
        'y1FVJiPx2XxoZOhjMMbJ0jr3oPCKGTqkPzaVenCLGgwwSeFcNGHa-TrztOrBSznIQe8uQ10CeKJQoTYYPJqLIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pbDCf-sg',
    // Jag
    '6523;6;uncraftable;kt-2;td-329':
        'y1FcKyXH0XV_YuAiPsqQmFyv8OTaGi32MGDALSPdSg04HuFXZjvb_jKntO-SSznBSOwrQhdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjUpwszJoIvc3xuF4Xad8-Hw5LF-9-NG_QV_iyx3qYCua3bbVfsJdUBgsaTEu-n2o7UR4NzGxwnA',
    // Fists of Steel
    '6523;6;uncraftable;kt-2;td-331':
        'y1FQIzHszktiY9p_LM7DzDr3oPCKGTrxP2OQenaMRAw6SbcLZG2K-WWl4u-dSzrLSLwtElhSffQNo21BO52JIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pdGTQDQG',
    // Sharpened Volcano Fragment
    '6523;6;uncraftable;kt-2;td-348':
        'y1FEIyTs4nJkd-BTOdPD_wn6s-WIUnakamXBLnGKRQs-GbdYPGzZ_2agsOmRR27PSO8pQApSK6FX9TJNOsiXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBxz5y3x9o',
    // Sun-on-a-Stick
    '6523;6;uncraftable;kt-2;td-349':
        'y1FEIyTs4nJkd-BTNcrFxTr3oPCKGTr0ajWRenbcGQ86SOFZZmyM9zOg7euUQDDJSeElQgEFeqZVoWJANJ_aIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pbbeVe25',
    // Detonator
    '6523;6;uncraftable;kt-2;td-351':
        'y1FSLzb303V5avdTNMrUxwC1oLWPHSXzMWKTe3eKSlppSLZaMWDZ-Dui5byRQDvASLp6FQoEdPBS8noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFoV8KI8zw',
    // Fan O'War
    '6523;6;uncraftable;kt-2;td-355':
        'y1FFIi3_yHpScuR-PsrI_wn6s-WIUiOjbmWSdnLfTV87S7sLMGHR-mCi5uuXRDrOSeAvQggMeaBVoDFLaJ2Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBxyQPUQLQ',
    // Conniver's Kunai
    '6523;6;uncraftable;kt-2;td-356':
        'y1FFIi3_yHpSbvBiOcL5zATppufDGCL2OWWdfXbdGQZtRLVfMj3R-DPzs7nFS2rLSLwoFQFRffYHpjdJbtfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7inXhNloEA',
    // Half-Zatoichi
    '6523;6;uncraftable;kt-2;td-357':
        'y1FFIi3_yHpSbuR4OcXH_wn6s-WIUiH2OmbAfnSKSAk6TeIKMmjYrzKlsLvBF27LQLp9FggGfKUE-2RJacGXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBx6rr-ecU',
    // Shahanshah
    '6523;6;uncraftable;kt-2;td-401':
        'y1FFKSv11GBsd9pgOdnBxUuuo7fURXH2bGaRKieOTl87H7tYND2Mqzqk5rvBQjHJQbssEAhQf6sC7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPW-ANHwz',
    // Bazaar Bargain
    '6523;6;uncraftable;kt-2;td-402':
        'y1FUKzj53GZSdutlKM7U_wn6s-WIUiXzbTTCf3COSwxpTrUNMm2P-GWs5ruQQTnNFLp-RlhQKasM82Eaa52Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBxecNUqYw',
    // Persian Persuader
    '6523;6;uncraftable;kt-2;td-404':
        'y1FSLy_34md4afFtNvTV1wrppd2BHWbwbXmSKnCBTlwwHrcKZGDRrDDz4OuSQ23PQOgqQQ1XfPYA-mVLOMmNPhc8ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIx0QdScQPTZQxxZ5KhJngvgxQbrcxGkwbFPcoZjrSV_21xC3MXuTkOeFY45BTVgweTk_pnnEpWx98vv2IOA1GtH0i7OLM-As58GQp',
    // Splendid Screen
    '6523;6;uncraftable;kt-2;td-406':
        'y1FGLzDr1HVjWvZkMc7KxDr3oPCKGTrxOzGQLHPbGVhsG-JaYD7e-mLx4-idF2vISLsuQQsFLKRQ82JBOc3cIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pU6Uk9Bs',
    // Quick-Fix
    '6523;6;uncraftable;kt-2;td-411':
        'y1FGOC3s0ktgYOFlP97I_wn6s-WIUnf1a2SceXTYRAg-SrVXNjyP_2L0s-6TQ2vLELx4SlgGdKYA-mFPb8uXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBx2tqxUB0',
    // Overdose
    '6523;6;uncraftable;kt-2;td-412':
        'y1FGOC3s0kt-fPdlNszDxxD1nu6MDnPyJmfBeXWAGgsxSOVYNG3e_jHws-_HFGnLQu0pFwgHK_AN-2RJb5qIahAjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVIQ8CVkZX799NjqCUKvgkCqYWbW0P7APtMJRAl0eShu4niYvWRx_7KiLagtEs3o4svzFAOSCnVo',
    // Solemn Vow
    '6523;6;uncraftable;kt-2;td-413':
        'y1FeIzLo0nd_ZPFpK_TE1Rbvnu6MDnPyJmHFeXfdGVg7RLUMN2zQ-mGjsO7FET-fR-8oEQ1VKKJR-2VJbsjbNhYjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVIQ8CVkZX799NjqCUKvgkCqYWbW0P7APtMJRAl0eShu4niYvWRx_7KiLagtEs3o4svzF27UFEmY',
    // Liberty Launcher
    '6523;6;uncraftable;kt-2;td-414':
        'y1FaIyD9z2B0WultLcXFyADpnu6MDnPyJmDAdnKATFhqSOZXNznf9zah4LiVFzHMRL0pRQoMevFQ9WwfbpqIOxUjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVIQ8CVkZX799NjqCUKvgkCqYWbW0P7APtMJRAl0eShu4niYvWRx_7KiLagtEs3o4svzFqmKHKN0',
    // Reserve Shooter
    '6523;6;uncraftable;kt-2;td-415':
        'y1FELzH9z2JoWvZkN8TSxRfEreOfG3G5P27FfiPaSw8-HrNbMDmL9zX04OjCSzCaFLwlS10GdKcC9mxNOsqNawx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPUItzg8Uw',
    // Market Gardener
    '6523;6;uncraftable;kt-2;td-416':
        'y1FbKzDz2GBSYuR-PM7IxRfEreOfG3G5PmSVLXWNSQxqG-BbZm2MqzT05unFED3LR-goRAEAfvdW92IfacDbPQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPUz09QUrw',
    // Tomislav
    '6523;6;uncraftable;kt-2;td-424':
        'y1FCJS_xznhsc9pgOdnBxUuipeDeGCz0bmOXdnHbSgpqS7ENYGve_DPxse3GFj3BQb4kRl8GfKMF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPYcD5Ckh',
    // Family Business
    '6523;6;uncraftable;kt-2;td-425':
        'y1FEPzHr1HVjWvdlN9_5zATppufDTy3xaWKXfCXdHVhrTrIPYDvb-mDz4biVQTvKRL0sQ1sCfaNQpjVKONfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7ikT1rOWGA',
    // Eviction Notice
    '6523;6;uncraftable;kt-2;td-426':
        'y1FTPCv7yX1ia9piN9_PwwDEreOfG3G5PjXAeXXdHgY-G7JeMWGM_TGm5O-RQmycQbouRFwNKKsFoDcaaZ2BbQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPXogofKmg',
    // Cow Mangler 5000
    '6523;6;uncraftable;kt-2;td-441':
        'y1FSOCXH3nt6aORiP8fD0jr3oPCKGTqhPDGdeHKIHg1uROZWPDqK-TvztujGQjnOEOh6Rg1QeaoH8jdBaZjYIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pb3U0GMp',
    // Righteous Bison
    '6523;6;uncraftable;kt-2;td-442':
        'y1FSOCXHz31qbfFpN97VwgzoruyyEHXlbzKKfnOLHgw7G7oNZmDf-zei4-nCRD2YEO59Q1sBf6RQoDZLbMCJNkdphZlLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEYAQMcZTY43xJFHt6H1qQhCeI0CF18OFrxgM2rSB_rjkXnLCuO1aecJtMcBVFhPTku9z3F-XR1_va_dO19Atnol9rzS8Zo0wObqDw',
    // Mantreads
    '6523;6;uncraftable;kt-2;td-444':
        'xW9YPjD93HB-WultKszDjlypp7GJGnD2bmfBfSONTQdsGbcKYTzcqGD25bmVE2vMQuApEABXefEasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479JNHqZn39QsQaItuT1xLEr1-Yj-HVKjhkn2ZC-e2P7UM4JMEAQxMTh7vm3J_DE03qKeOZvZJQJk',
    // Disciplinary Action
    '6523;6;uncraftable;kt-2;td-447':
        'y1FEIybx03NSZvdjKPTKwRf8pKzdT3DxbWaVeXeARAZuGbYNNDqM-DTw5umTRj_AQeksSw8DffdW8jYfI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e504r7i68',
    // Soda Popper
    '6523;6;uncraftable;kt-2;td-448':
        'y1FFJSb54mRidfVpKvTKwRf8pKzVRCCmP2GSfHGAS1o7TeYNNmyKrWbz5-WXETCbQ-orFVwFKKIE9mxBI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e5zPhBXYn',
    // Winger
    '6523;6;uncraftable;kt-2;td-449':
        'y1FBIyz_2GZSdex_LMTK_wn6s-WIUnGmaTXCdnncHwkxGbBXPWrcqDGit7-QQGzOQu8pSw9QLKVV9GZPbsuXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBxCXTkEgk',
    // Atomizer
    '6523;6;uncraftable;kt-2;td-450':
        'y1FUJSzz4nZscdpgOdnBxUuj8ubaGXClMGLHKiSOGl09GLFYNmzc92Wg4unGFm7JQO14FV9QLvcF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPTzYo7qt',
    // Three-Rune Blade
    '6523;6;uncraftable;kt-2;td-452':
        'y1FFKS3tyUt-cup-PPTKwRf8pKzVSnKgam-SLCDcGgxqG-APMTmPr2ass77BET3OEukrQl0Af6AF-zEYI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e58ir5qWn',
    // Postal Pummeler
    '6523;6;uncraftable;kt-2;td-457':
        'y1FbKyv033t1WultKszDjgP4-LSMTXahPGTCfiKKTlg6G7INYWiP-Wen5OicEDifF7ovF18FefEasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479JNHqZn39QsQaItuT1xLEr1-Yj-HVKjhkn2ZC-e2P7UM4JMEAQxMTh7vm3J_DE03qKeOxI0yhTw',
    // Enforcer
    '6523;6;uncraftable;kt-2;td-460':
        'y1FFJDf64npiduBTNMrUxwC1-bGMGiyiO2LHdiCBTw49RLcMMW7brGGh5LyTEzjIR-p6QwhSePYCoXoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFoqSEko3w',
    // Big Earner
    '6523;6;uncraftable;kt-2;td-461':
        'y1FFPSvs3nxvaeRoPfTKwRf8pKzfTXemazaSeXbaTFwwH7BYYzzb-mXw7emSEz6cE7x6QV0HKfZV8jdPI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e55S1ofkh',
    // Maul
    '6523;6;uncraftable;kt-2;td-466':
        'y1FELCPH1XVgaOB-B8fH0gL-77TeTnL0OG6XLHDfTAtpRLtfPG6M9mGmsO2cRDmbQ7woFwANf_QApmxXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXcX-TvE8',
    // Conscientious Objector
    '6523;6;uncraftable;kt-2;td-474':
        'y1FGIyHz2GBSaeR-P86ImFyu97OOGXKuPDOWfnWOT1xsRLENYT6P-jqgs7jHRj-fFbx4RlwGfrxErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgBx55UvJu8vV5AaNtpGQkfFel5M2-BBf-2wH_NWueya-QMt5UGAg8eGx29nXB4C1dptq5MpzP4JQ',
    // Nessie's Nine Iron
    '6523;6;uncraftable;kt-2;td-482':
        'y1FRJS7-3nh4Z9pgOdnBxUuu8LXdRCLzbGOdfCWJRQs9SeILMmCK-zX07ejGQT7PQukpS18Df6dR7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPcSHd7kr',
    // Original
    '6523;6;uncraftable;kt-2;td-513':
        'y1FULzbHz3tubuB4NMrTzgbzpPCyEHXlbzKKeCLfTA4wSLReNGze9zaj5riWFz_MQ-l5RgBVKaIG8G0dOJrYbRI1gJlLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEYAQMcZTY43xJFHt6H1qQhCeI0CF18OFrxgM2rSB_rjkXnLCuO1aecJtMcBVFhPTku9z3F-XR1_va_dO19Atnol9rzS8Zr0bT06Uw',
    // Diamondback
    '6523;6;uncraftable;kt-2;td-525':
        'y1FSLzrHz3F7aul6Pdn5zATppufDTy32aW6SKnLdS1o7S7tXPWja9zT37LjHRz_BR7soFwtReKpS8DVLOdfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7imlXLenxw',
    // Machina
    '6523;6;uncraftable;kt-2;td-526':
        'y1FSLzrHznpkdeB-KsLAzADEreOfG3G5bTSVf3PbHlxuSrtaN2ra-jL2sbvAFD6aFb55QA4EK_ZWpzBLaMqAawx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPWIUJLbZw',
    // Widowmaker
    '6523;6;uncraftable;kt-2;td-527':
        'y1FSLzrHznxiceJ5NvTKwRf8pKzYGiLzMG-cLHmASQk_HLoNZjuLqGDw5--dSjqaQ-gqEQFRdPcE9jFAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e52iUnj4K',
    // Short Circuit
    '6523;6;uncraftable;kt-2;td-528':
        'y1FSLzrH3GZgWultKszDjlSroOeLGHKuOGGReCDbRVw4G7JWYG-N-jWj5b-cFz7PRekkFwkAe_casjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479JNHqZn39QsQaItuT1xLEr1-Yj-HVKjhkn2ZC-e2P7UM4JMEAQxMTh7vm3J_DE03qKeOgvzUpQs',
    // Unarmed Combat
    '6523;6;uncraftable;kt-2;td-572':
        'y1FDJCPq0HFpWuZjNcnH1Dr3oPCKGTqgPmCQe3SLRFxrH7FeYW2I_Tqn4eucET2YRO8tF19QevQDoDVAPMmIIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pVzLu5Sy',
    // Wanga Prick
    '6523;6;uncraftable;kt-2;td-574':
        'y1FAJS380ntSdexiB8fH0gL-77PYTSX2bG_HKnmJSgs5RLcKZ2Hf-zCj5bzBETrLF7wkFQxQevYF8GZXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXMOzXEag',
    // Apoco-Fists
    '6523;6;uncraftable;kt-2;td-587':
        'y1FFOHHHzWFjZu1TNMrUxwC1pLqLTSL1OGfCf3fYGQdsHLEPNj2N9jPztruTSzHOFex6RAkEeqcE93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFqRfH8pGg',
    // Pomson 6000
    '6523;6;uncraftable;kt-2;td-588':
        'y1FSOCXHzXtgdupiB8fH0gL-7-fUGCymOWLCdiSOHQowTbFdPGver2bxse6QETzLELt_Sw0DeaEA9TJXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXMAbiKoM',
    // Eureka Effect
    '6523;6;uncraftable;kt-2;td-589':
        'y1FSOCXHymZoa-ZkNcTS0gr1nu6MDnPyJmDFLCPcSww9SLRXMDnfr2Ws4rnBQzybSbwuEQkGevEE9zVMOc3YbRIjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVIQ8CVkZX799NjqCUKvgkCqYWbW0P7APtMJRAl0eShu4niYvWRx_7KiLagtEs3o4svzFlnPB8ww',
    // Third Degree
    '6523;6;uncraftable;kt-2;td-593':
        'y1FSOCXHyXxkd-FoPczUxQDEreOfG3G5PWeUenaKRQ49SeVWZ2yI_2Cs5OSdFGzMFekoQ19ReqNS9GZPOpvcPgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPWVkYZouw',
    // Phlogistinator
    '6523;6;uncraftable;kt-2;td-594':
        'y1FSOCXHzXxhauJlK9_PzgTvrvCyEHXlbzKKKieMTgk7SOEMN26N-jv35biWFmrNQLsqEglRfasCoG1OOpuAOBU10plLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEYAQMcZTY43xJFHt6H1qQhCeI0CF18OFrxgM2rSB_rjkXnLCuO1aecJtMcBVFhPTku9z3F-XR1_va_dO19Atnol9rzS8Zp4qYzNwg',
    // Manmelter
    '6523;6;uncraftable;kt-2;td-595':
        'y1FSOCXH0HVjaOBgLM7U_wn6s-WIUnbxO2GQfCLaGAtrG7JYNm7Z_jb37OSQET7LRu16RF9QfqoN-2RNaJ-Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBxRV9AonY',
    // Scottish Handshake
    '6523;6;uncraftable;kt-2;td-609':
        'y1FFKS3s0XVjYdp_MMrUxDr3oPCKGTryPDOTeieNSV09HrpeMDzd_juh4OyURW2bQuEoQw0MefNR8W1IbMDYIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pTZli03L',
    // Sharp Dresser
    '6523;6;uncraftable;kt-2;td-638':
        'y1FXKTDH1XtibudgOc_D_wn6s-WIUnXxbmGReHeLHgY6SbJdZGnf_Drws76cQz-cROwrEAwEf_FSpjcdO8uXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBx1ixgCvY',
    // Wrap Assassin
    '6523;6;uncraftable;kt-2;td-648':
        'y1FOJzHH2n1rcfJ-Odv5zATppufDTiakbWeULSWPSlhsT7ZYNTzf9jb37L6cETjPEuElQgkCeKMG9jBLbtfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7inLpYlGZg',
    // Spy-cicle
    '6523;6;uncraftable;kt-2;td-649':
        'y1FOJzHH3nthYdp_MMTTzAH-s92BHWbwbXnGKnaJHgk-ROVaMWCL9jL0s--WEDDKQO9-RgAHf_RV92dINc2NPRY_ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIx0QdScQPTZQxxZ5KhJngvgxQbrcxGkwbFPcoZjrSV_21xC3MXuTkOeFY45BTVgweTk_pnnEpWx98vv2IOA1GtH0i7OLM-MO-Dttu',
    // Holiday Punch
    '6523;6;uncraftable;kt-2;td-656':
        'y1FOJzHH2nhic-B_B8fH0gL-77HeSHKvbTXFKXeBGAwxS7cMNDne-Dqi4unCEz2cQugvFg4DffAF-m1XfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXoCUcdOs',
    // Black Rose
    '6523;6;uncraftable;kt-2;td-727':
        'y1FXPCPHz3t-YO5iMc3D_xPEreOfG3G5bW6TfnndSAk_H7oKPGDdqjf2seqdQjzPFLx4QQkDfKANoTUfOp2OOgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPW2zqsmVQ',
    // Beggar's Bazooka
    '6523;6;uncraftable;kt-2;td-730':
        'y1FSPy_ozmBod9poPd3PwwDEreOfG3G5aWHFeyOMGQZpSeJXMGCMqGX0t7icRGvJSOEtQwpSdPAB8WNIP8vbbQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPU2DYbSHg',
    // Lollichop
    '6523;6;uncraftable;kt-2;td-739':
        'y1FaJS701HdlavVTNMrUxwC187CITXenPmGVLHaPRVo9T-ZcNjuMqjDxsOTFFD6YSboqFwoEdfYC93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFoJleEoNQ',
    // Scorch Shot
    '6523;6;uncraftable;kt-2;td-740':
        'y1FFKS3q3nxSdu1jLPTKwRf8pKzbHnWgbjSRdnaNRQpqTrNXPDvb-DP25b-URT3NQL0qRAwEf6QApmIfI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e5z7I_3B4',
    // Rainblower
    '6523;6;uncraftable;kt-2;td-741':
        'y1FEKyv233hicuB-B8fH0gL-77bYHXGhO2aWf3CMTA06H-VePW6Krzus5buVSzvIELwqEV0BeaFS9TdXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXtNsQyno',
    // Cleaner's Carbine
    '6523;6;uncraftable;kt-2;td-751':
        'y1FGOC3HznlqWultKszDjgb987WMRHDyOWeSe3aJTg5sSrMPNWja-DX24unCF2maSeEvFw0EK_YasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479JNHqZn39QsQaItuT1xLEr1-Yj-HVKjhkn2ZC-e2P7UM4JMEAQxMTh7vm3J_DE03qKeONi33NV0',
    // Hitman's Heatmaker
    '6523;6;uncraftable;kt-2;td-752':
        'y1FGOC3Hz31raeBTNMrUxwC1o7LaRXHyOWfGLSfbRVxrG7pZNGzf-zumtL7HFD_ISb4pSwkMeKtV9HoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFqYGHD2hw',
    // Baby Face's Blaster
    '6523;6;uncraftable;kt-2;td-772':
        'y1FGLzLHzndscfFpKszTzjr3oPCKGTqmMGTHfiXbGgc-G7ULNmjbq2as7OWUQz7BSLl4EF8GKfMN9TBPOMiJIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pU8h-GtT',
    // Pretty Boy's Pocket Pistol
    '6523;6;uncraftable;kt-2;td-773':
        'y1FGLzLHzX1-cepgB8fH0gL-77vfHy30OTPCLnmIHws_HLoPZzra9zek57nHFjmaR-p5RAhRdPcA8WNXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMX1WmPrgQ',
    // Escape Plan
    '6523;6;uncraftable;kt-2;td-775':
        'y1FGIyHz3GxoWultKszDjlSs8ObYTC2mMTKWeiXbTgprGOEPMmzb_GCn4OmRFDHIQLx-S1gEKfEasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479JNHqZn39QsQaItuT1xLEr1-Yj-HVKjhkn2ZC-e2P7UM4JMEAQxMTh7vm3J_DE03qKeO9YuTTjw',
    // Huo-Long Heater
    '6523;6;uncraftable;kt-2;td-811':
        'y1FVKyzs0npSaeR-P86IwVH_pOTaRSSvOmaTenmBTF85TbtYYz3frzX0tOSXFD3KF-oqSw4Hf7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgBx55UvJu8vV5AaNtpGQkfFel5M2-BBf-2wH_NWueya-QMt5UGAg8eGx29nXB4C1dptq4_Qq1f9A',
    '6523;6;uncraftable;kt-2;td-832':
        'y1FVKyzs0npSaeR-P86IwVH_pOTaRSSvOmaTenmBTF85TbtYYz3frzX0tOSXFD3KF-oqSw4Hf7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgBx55UvJu8vV5AaNtpGQkfFel5M2-BBf-2wH_NWueya-QMt5UGAg8eGx29nXB4C1dptq4_Qq1f9A',
    // Flying Guillotine
    '6523;6;uncraftable;kt-2;td-812':
        'y1FFLh370XFsc-B-B8fH0gL-77GLRXKibmHFfyCBH1w4SbcIYGvQ9zPx7bmcR2vMRet9EgsBfapXo2JXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXRiL1NZU',
    '6523;6;uncraftable;kt-2;td-833':
        'y1FFLh370XFsc-B-B8fH0gL-77GLRXKibmHFfyCBH1w4SbcIYGvQ9zPx7bmcR2vMRet9EgsBfapXo2JXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXRiL1NZU',
    // Neon Annihilator
    '6523;6;uncraftable;kt-2;td-813':
        'y1FFLh322HtjduxrNvTKwRf8pKyISnKvO2WSenffTg49HrsKYzyM9jussOWUEzDPR70rEAsHK6pX-mZAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e56AgoO6U',
    '6523;6;uncraftable;kt-2;td-834':
        'y1FFLh322HtjduxrNvTKwRf8pKyISnKvO2WSenffTg49HrsKYzyM9jussOWUEzDPR70rEAsHK6pX-mZAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e56AgoO6U',
    // AWPer Hand
    '6523;6;uncraftable;kt-2;td-851':
        'y1FVOSX34nV6ddpgOdnBxUv5-LPUGHWkMWWTKSWNSQ89TeBWY2GL-Gfws-zFRj3KRr15EA9VKPAC7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPfhOa_U1',
    // Freedom Staff
    '6523;6;uncraftable;kt-2;td-880':
        'y1FCPR393HNhYNpgOdnBxUv_pbGJTiKiMGeTf3GLGQ44RbYPNWve-Dr2sbidRzHBQ7woRAkFfPZW7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPcbTi5_Y',
    // Bat Outta Hell
    '6523;6;uncraftable;kt-2;td-939':
        'y1FFITf00XZscdpgOdnBxUv4oLfYHnL0MWWReXjbSgw7GeVdMmrbrTOltOSVRD7JQ-96SgEMfvFV7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPexBMvvm',
    // Loose Cannon
    '6523;6;uncraftable;kt-2;td-996':
        'y1FSLy_34ndsa-tjNvTKwRf8pKyPHi3yam_GeiXaHl9qHrJYZmHYrDGj4-SQS27IEuwkEg8AK_QNoTYdI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e5zWlpsJk',
    // Rescue Ranger
    '6523;6;uncraftable;kt-2;td-997':
        'y1FCLy794mdlavFrLcX5zATppufDTifxajaRfnmATwg8H7VfN2nf_TKj7O2XFzzLErl6QwsCL_cG8TdJPdfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7ikI3orWCQ',
    // Vaccinator
    '6523;6;uncraftable;kt-2;td-998':
        'y1FbLybx2mFjWuFpPs7I0wDEreOfG3G5OmXCdnSMSVtrTroIMjnZ-Dqs5uWTF27AQrokEg8MeaYD8WJJaMDdPgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPWjZjiD8w',
    // Ham Shank
    '6523;6;uncraftable;kt-2;td-1013':
        'y1FeKy_H0XV_YuAiYJKfwlOv9bOMGiDxPTKReXmAGls7TeVZMmmK_DWisOrHQDCdSO8rShdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjUpwszJoIvc3xuF4Xad8-Hw5LF-9-NG_QV_iyx3qYCua3bbVfsJdUBgsaTEu-n2o7UR7N8wq-Lw',
    // Fortified Compound
    '6523;6;uncraftable;kt-2;td-1092':
        'y1FUJTXHyXxkYONTNMrUxwC18-PVTHKlOWaSeXSPRV0xSLsLZmGN9jantOqTFjjPSb5-Fg9SKaQH93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFqyXSboUw',
    // Classic
    '6523;6;uncraftable;kt-2;td-1098':
        'y1FCLCHHznpkdeB-KsLAzADEreOfG3G5PGeQdnaAGQ9tROFbPWHY_TemtLnBR27PROAtR1pXKacN8zBPP8zYbQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPUgtbJ0Sw',
    // Tide Turner
    '6523;6;uncraftable;kt-2;td-1099':
        'y1FBIif90Ut-bexpNM_5zATppufDTyylamaTLXbaGlg-S7FZNGDaqDCj4rmXSjnBR70rElgDeqBW92cfOtfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7ilIdICHPw',
    // Bread Bite
    '6523;6;uncraftable;kt-2;td-1100':
        'y1FUOCf52Xlia_Z4Pdn5xwn0t-eeI3j2ejDBYXDbGAg9H-JWMW3bqzL34ezGETHBFL19F10BKaYHozYaOsDcbRtu3dEVu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkCXc4aW44twpBIupLNvB9Gaps4JFIdA74rez-CB6rkxyyfDbeyOLcP5ZBWBlobH0u5myB-Cht9vqyPblwSsHgi8aaM75PniYWV6UI',
    // Back Scatter
    '6523;6;uncraftable;kt-2;td-1103':
        'y1FFKSPsyXF_Yfd5NfTKwRf8pKzYSyOiOWOcKXKIH1ttTrpdYWGN_Teh5L6SRW3BFe0lQg0MKfQCpGFLI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e59qKbagh',
    // Air Strike
    '6523;6;uncraftable;kt-2;td-1104':
        'y1FXPi314nhscOtvMM7U_wn6s-WIUiz2PzLCd3eKTgk5HLcLPGHQrDLz5OjGRjubRbx-EQsNevEDoTYfPs2Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBxEog_sIQ',
    // Necro Smasher
    '6523;6;uncraftable;kt-2;td-1123':
        'y1FVKzD21GJsadphOcfKxRHEreOfG3G5OGWWf3HbHwdtG7dfZGzf_zSssO6RRjDPRO4rSgwHK6UBo2cYOZ3baQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPX4rRQosQ',
    // Quickiebomb Launcher
    '6523;6;uncraftable;kt-2;td-1150':
        'y1FdIyz_0HVmYPdTK9_Pww7inu6MDnPyJmCVLHWKRAxrRbpWNzvYqjWgseTCQzvBQLwrSwhRe6RV8GxObsvYPEMjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVIQ8CVkZX799NjqCUKvgkCqYWbW0P7APtMJRAl0eShu4niYvWRx_7KiLagtEs3o4svzF4L7S2oo',
    // Iron Bomber
    '6523;6;uncraftable;kt-2;td-1151':
        'y1FHPyP833VhadpgOdnBxUv997bYRHCkamCQLHWBTl1uGLRfNzuN-2ah4-nGSmuYF7p6QwkFdaMF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPXomeND4',
    // Panic Attack
    '6523;6;uncraftable;kt-2;td-1153':
        'y1FCOCf23nxqcOtTNMrUxwC19OaOGS2hOWaXfHLdSQc_SbBYYTrYqDX0t-iUET-fR-5-FQ9Re6YCpnoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFpu2LbFEA',
    // Dragon's Fury
    '6523;6;uncraftable;kt-2;td-1178':
        'y1FQJiP12HZsaelTNMrUxwC19uaMTCyhPTaRLnSKTQ9rSLMKNWDdqGemsLjHRDCfFLokQg8HfKUF9HoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFogjgnKEA',
    // Hot Hand
    '6523;6;uncraftable;kt-2;td-1181':
        '31FFJiPozX1jYtprNMTQxTr3oPCKGTr0ODbFdySASl9rG7JcMGzZq2eituTFRGmYQOouRQ1WfacC9TZJPJ-KIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pXh2v_k6',
    // Shooting Star
    '6523;6;uncraftable;kt-2;td-30665':
        'y1FfJDT5zn1ia9p_NsLWxRfpqOSBGUv7aSXDKm_YH1s5SuELZmuMrzrzsL_CFGvLF-p5Sg4NdaQApmBJPJ_caho80NEC5XW2kAJ0ExF5Td0WLV_1mCxGd7Qoz3AtPZpfmTr2JZHP3AI1aSkjWrXnSLjBb5f8zXglMlNmEqAEY4OVrnSsuM6lZ_OCLe5uOaY69saI2UVdX9MTWJgt2JZJtZ_-hApRbokuHmEQEKspMHfXV6q0wHrKWbDmP-Zf48EBUQgZSxq5n3QvCkx7vK-MPAkR4n4g9qGWsY3umYGayLcp',
    // C.A.P.P.E.R
    '6523;6;uncraftable;kt-2;td-30666':
        'y1FfJDT5zn1ia9p8MdjSzwnEreOfG3G5OTLFfieAGgcwSrddZ22I_2Ggt7vFFj-aQrsrFQ4Ce6sN92VBNMrabgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPVZFtZhjQ',
    // Batsaber
    '6523;6;uncraftable;kt-2;td-30667':
        'y1FfJDT5zn1ia9puOd_5zATppufDHyL0amWReniJSFg_HrYINT7Q_jH34L-QFDufRbssElgCf6MG-zAaOtfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7inKI5ZAtw'
};

const ks3Images: { [sku: string]: string } = {
    // Professional Killstreak Kit
    // Kritzkrieg
    '6526;6;uncraftable;kt-3;td-35':
        'y1FZPCfq1XFsaeB-B8fH0gL-7-OISHauPTOUeiDYRQ1qTOBaN2vZ_jSt5eWVEGnKQu0rRwwFfqIE92xXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPWuN_4KQA',
    // Blutsauger
    '6526;6;uncraftable;kt-3;td-36':
        'y1FaLyf71XN4a9pgOdnBxUv5ouHaTS31bmDCd3iBH1g_SeINMj6Ir2H3sbiTE2rJQ-4oR1sHe_AF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBUuoz3hAFCeY84VQ1IQr16N2mGUvvuxH2QX-KxO-MA4ZMCA14dG0m7nXx8Xkh66azYPlle8CBxJ7dIt4k',
    // Ubersaw
    '6526;6;uncraftable;kt-3;td-37':
        'y1FDKCfqznV6WultKszDjgSsp7GMSy30OjPHfSeLT1g4GLZeM2iL_TTx4OWVETmfQb0lFw8BfvQasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479I1HqZvNtwxRbI1zSApPFe0sZW6HVvDgwHaZX-C2PegNt5MEUF5LTEm7k3MqDhoovfiNPhMA7ikXVbgfWw',
    // Axtinguisher
    '6526;6;uncraftable;kt-3;td-38':
        'y1FXMjbx03N4bPZkPdn50Bzprt2BHWbwbXnHeXbfGQ0wSOdfZDnc_mWssb-cED7JQeksQwgNevFXpm1PbMqANhA_ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIx0QdScQPTZQxxZ5KhJngvgxQbrcvGkwZLrUvJz7USvrjwCqcDOO1OeMA4sJYVlgZTk20nyYpW04uuf_fbAVH4X918_eT-5mujou4q1NKmYk',
    // Flare Gun
    '6526;6;uncraftable;kt-3;td-39':
        'y1FQJiPq2HN4a9p8IdnJ_wn6s-WIUnGhPmSVfXSNGgo6TLNZY2iP_Tuk4r_AQTrISO8tFw0CfPRWoGUbbsyXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8ZpxM4sKfw',
    // Backburner
    '6526;6;uncraftable;kt-3;td-40':
        'y1FUKyHz32F_a-B-B8fH0gL-77SIGCDyOG6VfHGJSVwwGbdWN26I9zun4-rHSzGcSespRVhQf_MGpmFXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPWAm3bf0A',
    // Natascha
    '6526;6;uncraftable;kt-3;td-41':
        'y1FBFS7t2XlkaeRTNMrUxwC187aLS3WibGWdfHbaRVxrHrpdNWqMrGL37b-QR2vPEroqFQ4HLKtR8HoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pb8j2Dlv',
    // Killing Gloves of Boxing
    '6526;6;uncraftable;kt-3;td-43':
        'y1FUJTrx03NSYuljLs7V_wn6s-WIUnegaW6TdniBGVhsSrNaMWDc-TDw5rnARmufROl5R18GL6FX8WAdacCXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8ZrKD5xpvg',
    // Sandman
    '6526;6;uncraftable;kt-3;td-44':
        'y1FBJS382HpSZ-R4B8fH0gL-77aMHS2nMTOWKXPfS1xqGLQLYTnZ-TLx4u-cRmvNEuouEV9XdaZQ8jJXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPWoXARMWg',
    // Force-A-Nature
    '6526;6;uncraftable;kt-3;td-45':
        'y1FSJTf60XFSZ-R-Ks7K_wn6s-WIUi32amScLniNTlpuH7dWPW7b9meltunAEDCbQb0pSl9ReKVWozVMbJyXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8ZpsxfpcDQ',
    // Huntsman
    '6526;6;uncraftable;kt-3;td-56':
        'y1FUJTXH0XV_YuAiapvFkFKq87TaGCajOWWceiCOTw08TbddNj6M_2WhtL6SQzvMFO1-FRdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjTJwszqBKuoz1vkMQP9s5T1xMRu98bG6CXPjmwHqaV-fgbbUO4pBWUV8STR68yHUuDh199rmHPbwNmEcO',
    // Ambassador
    '6526;6;uncraftable;kt-3;td-61':
        'y1FXJyD5zmdsYep-B8TW1Dr3oPCKGTrzOjXALXSNSAtqRbFaNGvdrDDw4-vBFzjPQewpRgxSfqsBpzUaNM6AIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75Pn-Lry_Gk',
    // Direct Hit
    '6526;6;uncraftable;kt-3;td-127':
        'y1FSIzD93mBlbPFTNMrUxwC18rOJS3GhOWfHK3fdRVw5TuBeYT7f-Tf34buXRjybQOkvQAkHf6ED9noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54patYk1xD',
    // Equalizer
    '6526;6;uncraftable;kt-3;td-128':
        'y1FGIyHz3GxoWvY-B8fH0gL-77vbH3LyOmaWKSWPHwlpH-FXMGGM-2Wj5urGQTydE-h4Rl8NfqVRo2NXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPWCpuOO0w',
    // Scottish Resistance
    '6526;6;uncraftable;kt-3;td-130':
        '31FFPiv71m1vauhuB8_DxgD1peefI3j2ejDBYXTcHg08RLBfPGqK_DSt57idEzjKSLp_FVxSLqsMoWEbaJuJPENv3YAVu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkCXc4aW44twpBIupLNvB9Gaps4JEwdA7wROTjDA6z5wHqbCufgP-YP58hXVFEbS0y5mX1_XRt97_6IbAtGuHl38_GT-szkmsuvERcrcw85WQ',
    // Chargin' Targe
    '6526;6;uncraftable;kt-3;td-131':
        'y1FCKzD_2EthZPdrPYWexFf58ObbTnCnbWOXLnKJT1puReVbNW_Yqzf04uyUF2ybRbt6F18AY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKrXZe610J6ho8cSL6FEASsAPW6Isyo1DhJLzqQpGJdtpSFpIE-l5Y2uIU_rvwn-bWuG7O7NbscZXBl8cTEe6ynUoDhwovK3HKlMXQXuU-Ac',
    // Eyelander
    '6526;6;uncraftable;kt-3;td-132':
        'y1FVJiPh0Ht_YNpgOdnBxUus8LGPSiKgOGSUenmJRAg9RLNfYGyI-Gbw5evGS27BSbt-Q1gEKKsF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBUuoz3hAFCeY84VQ1IQr16N2mGUvvuxH2QX-KxO-MA4ZMCA14dG0m7nXx8Xkh66azYPlle8CBxZeldLTc',
    // Frontier Justice
    '6526;6;uncraftable;kt-3;td-141':
        'y1FQOC32yX1od-95K9_PwwDEreOfG3G5am6SfSOJTFw5TecLZ2HYqjGk4-XBQGvIFOwvEV9QeaJV8mZKO8vabgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umT6ylaQx',
    // Gunslinger
    '6526;6;uncraftable;kt-3;td-142':
        'z3tYOS7x03Nod9pgOdnBxUuvpOaISyfyO2XHfHaKSlxuTeIINWyLqmb04u_CQD7BQuEuQlpQKfYF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBUuoz3hAFCeY84VQ1IQr16N2mGUvvuxH2QX-KxO-MA4ZMCA14dG0m7nXx8Xkh66azYPlle8CBxZTLtpM0',
    // Homewrecker
    '6526;6;uncraftable;kt-3;td-153':
        'y1FFJif82nFlZOhhPdn5zATppufDHiKmP2CXKnGMGA09ReIKNm7c_Tui7OuXFmqaQL4oSglXfvMGoDFJPdfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-K4tlfC2',
    // Pain Train
    '6526;6;uncraftable;kt-3;td-154':
        'y1FGKyv2yWZsbOtTNMrUxwC1pbXYSnfzMG6cdnOIHgo_GLdcNWuKr2WjtruSQmqdQrkkQQwNf_QF8noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pUX6antM',
    // Southern Hospitality
    '6526;6;uncraftable;kt-3;td-155':
        'y1FFOivz2GN_YOtvMPTKwRf8pKzZRCXxOW_AKXSOGQc-TbAPNDnd_jb0s-uSETvJQ7ouEV1WK6tVp2IbI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFNpKuHUQ',
    // Lugermorph
    '6526;6;uncraftable;kt-3;td-160':
        'y1FCPiXH0HV1WuJ5NvTKwRf8pKyMGnD2OmOVfHePS1s6HrteZGHf-WCg7LiTQG6bELt4EQ1QL6cB9mEfI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFKp7R8Mg',
    // Lugermorph (second one?)
    '6526;6;uncraftable;kt-3;td-294':
        'y1FCPiXH0HV1WuJ5NvTKwRf8pKyMGnD2OmOVfHePS1s6HrteZGHf-WCg7LiTQG6bELt4EQ1QL6cB9mEfI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFKp7R8Mg',
    // Big Kill
    '6526;6;uncraftable;kt-3;td-161':
        'y1FCPiXHznVgWuJ5NvTKwRf8pKzfSCOuOmPCfSCMGlwxG7ALMmyK_TLx5-qSSj_JFLwoEV1Qe_cM9TFPI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFqxwfTLE',
    // Tribalman's Shiv
    '6526;6;uncraftable;kt-3;td-171':
        'y1FBJS384nlsZu1pLM75zATppufDSXGua2OTKyXbTgY_TbFbYW_d_jPw5u_BRTrBQOF6F1sMLqBV8GBBaNfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-BJgg0Px',
    // Scotsman's Skullcutter
    '6526;6;uncraftable;kt-3;td-172':
        'y1FUKzbs0XFsfeBTNMrUxwC19LvYS3euMTGdfnjcHVg_TuVaY2yIrDXz5uyXF23IE74kFQ4GfaVRoXoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pSNQLzUS',
    // Vita-Saw
    '6526;6;uncraftable;kt-3;td-173':
        'y1FDKCfq03FoYelpB8fH0gL-77XVHyX0PG7CdiOKHVtqG7cKM2mK_2Gt4-_BEz-dEOp_Q1gGf6sE-2NXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPWHtsFD6g',
    // Bat
    '6526;6;uncraftable;kt-3;td-190':
        'y1FUKzbH0XV_YuAiPJuVlgf-87HYTHGjP2DAKyOKTAs_S-FaNDrR_WKj4-uTETjLE-gkERdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjTJwszqBKuoz1vkMQP9s5T1xMRu98bG6CXPjmwHqaV-fgbbUO4pBWUV8STR68yHUuDh199rmHPdYmIp1Z',
    // Bottle
    '6526;6;uncraftable;kt-3;td-191':
        '31FUJTbs0XFSaeR-P86IlFH99LWOGCLyMTKcLHiORAxqTrZfNWDe_mb35u2SRGzISL4kQg0GdbxErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgB2Z5UvqH-uh9EbsZuTw0YRbt-Ym-DXf7ky3-ZXeewNuVbt5VXUAgcTEm1nCV6XEh86a2NdE0e5yO7TuUT',
    // Fire Axe
    '6526;6;uncraftable;kt-3;td-192':
        'y1FQIzD93GxoWvV1KsT5zATppufDHnGgMG-UfiTdRFpuSucNYWndq2Gt7LiUFm2fQ-8uRwkMfaMG8mFINNfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-BgCmh7p',
    // Kukri
    '6526;6;uncraftable;kt-3;td-193':
        '31FbKyHw2GBoWultKszDjgT5-LLcSSCvODSRLXXaGFhpT-JWM23e-TSg7bnCRm2bQbsqFQwCffYasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479I1HqZvNtwxRbI1zSApPFe0sZW6HVvDgwHaZX-C2PegNt5MEUF5LTEm7k3MqDhoovfiNPhMA7im8Fqi5ew',
    // Knife
    '6526;6;uncraftable;kt-3;td-194':
        '31FdJCv-2EthZPdrPYWUkgf6-OOLGSHzOmWSeSWKGAdpG7MIMjyKqDqsseuTFj3BSbt-SwABY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKrXZe610J6ho8cSL6FEASsAPW6Isyo1DhJLzqQpGJdtpSFpIE-l5Y2uIU_rvwn-bWuG7O7NbscZXBl8cTEe6ynUoDhwovK3HKlMXpGBfv1I',
    // Fists
    '6526;6;uncraftable;kt-3;td-195':
        '3lFQIzHs4nxoZPN1B8fH0gL-77qMTXGka2PHfiKBTFtrSLFWPTrY_Tui5r-WRD2cSe4vEAsEL6MH-mNXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPVJ_DwCJQ',
    // Shovel
    '6526;6;uncraftable;kt-3;td-196':
        '31FFIi3u2HhSaeR-P86IxVKs97bcGXHzOzSXfnndRAk8RLpZM27e92GksOiWQmnIFegtEgkDf7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgB2Z5UvqH-uh9EbsZuTw0YRbt-Ym-DXf7ky3-ZXeewNuVbt5VXUAgcTEm1nCV6XEh86a2NdE0e52L2MIm2',
    // Wrench
    '6526;6;uncraftable;kt-3;td-197':
        '31FBOCf23nxSaeR-P86IkFL-8uSPRXajPWfGd3aKTwo5TLNYPGrZ_DGns-2cRW7LFb5_RF0Fe7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgB2Z5UvqH-uh9EbsZuTw0YRbt-Ym-DXf7ky3-ZXeewNuVbt5VXUAgcTEm1nCV6XEh86a2NdE0e53-nnEBg',
    // Bonesaw
    '6526;6;uncraftable;kt-3;td-198':
        'y1FUJSz9znV6WultKszDjgT-p-OJSiWgPWCUeHffSgw-ReELMTzY-2KhtO6QS2yfFO8tEVgAdfMasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479I1HqZvNtwxRbI1zSApPFe0sZW6HVvDgwHaZX-C2PegNt5MEUF5LTEm7k3MqDhoovfiNPhMA7inlnFaFvQ',
    // Shotgun
    '6526;6;uncraftable;kt-3;td-199':
        '31FFIi3s2mFjWultKszDjlz_-ebfT3ClPGbBfCSIH109SbBfMGyP_Geis-mXEzDMQbx9QQxRfaAasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479I1HqZvNtwxRbI1zSApPFe0sZW6HVvDgwHaZX-C2PegNt5MEUF5LTEm7k3MqDhoovfiNPhMA7ikU6heOYg',
    // Scattergun
    '6526;6;uncraftable;kt-3;td-200':
        'y1FFKSPsyXF_YvBiB8fH0gL-77fcTHWuOW-Vf3mBRA49TuJYMW6L9jut7LyUF2zPROguRwEMevZSpzBXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPWV_gHUhQ',
    // Sniper Rifle
    '6526;6;uncraftable;kt-3;td-201':
        '31FFJCvo2GZ_bONgPfTKwRf8pKzeTnKmP2LGfXeATAhtGeFbYGzdqjug5-3GR26cEL59EA8BLvMN9TdAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFTaguNug',
    // Minigun
    '6526;6;uncraftable;kt-3;td-202':
        '31FbIyzx2mFjWultKszDjl3_-LaOH3ela2DBLnbdTwk9GbNdPGDY-TLw4OqXSj_IF7skFwsBe6EasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479I1HqZvNtwxRbI1zSApPFe0sZW6HVvDgwHaZX-C2PegNt5MEUF5LTEm7k3MqDhoovfiNPhMA7inJweLAnw',
    // SMG
    '6526;6;uncraftable;kt-3;td-203':
        '31FFJyXH0XV_YuAibpvExAOp8rfbGiWjPWSUf3mORVowRLIKZmuP9zqmt-iTEDDIRu4sRBdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjTJwszqBKuoz1vkMQP9s5T1xMRu98bG6CXPjmwHqaV-fgbbUO4pBWUV8STR68yHUuDh199rmHPd8cFe-V',
    // Syringe Gun
    '6526;6;uncraftable;kt-3;td-204':
        '31FFMzDx03NoYvBiB8fH0gL-7-fVSy2ibmbHfXCLTQ0_SeEIYTze_Tus4-qQFmmfQrl-Q1tQdaYE82xXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPXNFeROog',
    // Rocket Launcher
    '6526;6;uncraftable;kt-3;td-205':
        '31FEJSHz2GBhZPBiO8PD0jr3oPCKGTqkP2HBeneNSw05TLcKN2CI-Dui4uidED3PSbp-FVsEfvFVoWVLNcuKIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75PnImLOu10',
    // Grenade Launcher
    '6526;6;uncraftable;kt-3;td-206':
        '31FROCf23HBoaeR5NsjOxRfEreOfG3G5OTKSKneJSl0-HLRYNmHbrGGs7bySEzjKReAtEFxXLKYN9GZMPcuOOAx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umVPLaNtI',
    // Stickybomb Launcher
    '6526;6;uncraftable;kt-3;td-207':
        '31FFPiv71m1vauhuB8fH1Qv4qeefI3j2ejDBYSDcSAppHOcNMG_Z_TWl5bvFQGvMRLp6RA4AKKQC9zIabMGLbUA90oQVu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkCXc4aW44twpBIupLNvB9Gaps4JEwdA7wROTjDA6z5wHqbCufgP-YP58hXVFEbS0y5mX1_XRt97_6IbAtGuHl38_GT-szkmsuvERd9HXYLWQ',
    // Flame Thrower
    '6526;6;uncraftable;kt-3;td-208':
        'y1FQJiP12GBld-p7Pdn5zATppufDRHGjODPFfySPGA5rGbFXZj7f_zSk4eiVQDrJRrslQwADf_EF8jVMa9fJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-AmSwu1Q',
    // Pistol
    '6526;6;uncraftable;kt-3;td-209':
        'y1FGIzHs0nhSaeR-P86IlwGq9rraRHX0MGHBeSLYTQtrSLFfMj7a-DL2sbucS27PEL5-EgoEfLxErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgB2Z5UvqH-uh9EbsZuTw0YRbt-Ym-DXf7ky3-ZXeewNuVbt5VXUAgcTEm1nCV6XEh86a2NdE0e53vojYqK',
    // Revolver
    '6526;6;uncraftable;kt-3;td-210':
        '31FELzT30WJod9pgOdnBxUuj97DfSnX2OjTBf3bbTw0wS7cMPWzRr2fx4byQFzyfRe8rQl9SLqMM7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBUuoz3hAFCeY84VQ1IQr16N2mGUvvuxH2QX-KxO-MA4ZMCA14dG0m7nXx8Xkh66azYPlle8CBx_bq4rV4',
    // Medi Gun
    '6526;6;uncraftable;kt-3;td-211':
        'y1FbLybx2mFjWultKszDjgCo-LuOGHX2PGKdeiSKTA1qTbdaYG2L-2H3sO-XFmuYReB4S1sNKaMasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479I1HqZvNtwxRbI1zSApPFe0sZW6HVvDgwHaZX-C2PegNt5MEUF5LTEm7k3MqDhoovfiNPhMA7ilKNud5gg',
    // Powerjack
    '6526;6;uncraftable;kt-3;td-214':
        'y1FGJTX9z35sZu5TNMrUxwC187reHyekbTSVdiDcRFppTbYKNDnRqGKmsOzCFzyfSO8qRQEEe6pV-noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54peRawaia',
    // Degreaser
    '6526;6;uncraftable;kt-3;td-215':
        'y1FSLyXq2HV-YPdTNMrUxwC187XYTyKja27HfHLdS106SOEMMTyM_TGktu_ARG7NQrksFQxQdaoM93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pcoRdN3C',
    // Shortstop
    '6526;6;uncraftable;kt-3;td-220':
        'y1FFIi3qyWd5avVTNMrUxwC1o7DaSiekPzSQdnmARA5uHLYNMW6N_jXwtrucQjidQusoRwkBfPcM8noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pYElYnId',
    // Holy Mackerel
    '6526;6;uncraftable;kt-3;td-221':
        'y1FeJS7h0HVubuB-Pcf5zATppufDHXamMGTHLiKPSQs_TuYLMm7Z_TOg4byWETvBRuEvQwwDLqMB8TJJP9fJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-Iqc_KcX',
    // L'Etranger
    '6526;6;uncraftable;kt-3;td-224':
        'y1FaLzbq3HpqYPdTNMrUxwC1oLGLRXGhODaRe3OMGlo5ReJbNmmK_zWs7ejFS2zMFeslQwECfaoD8XoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pcA4DRQE',
    // Your Eternal Reward
    '6526;6;uncraftable;kt-3;td-225':
        'y1FTPifq03VhWvdpL8rUxDr3oPCKGTqlMGOWeSfbT18xH7oNMTuKqjH05eiTFzGYQuEqRAsFdKUC-2JPPMyMIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75PnaOgq7-A',
    // Black Box
    '6526;6;uncraftable;kt-3;td-228':
        'y1FUJiP71nZifdpgOdnBxUv-p-bbGS3ybmfGLieKHQ1qS7ZfYDrf_zr3tO3AETDAR7opRgBQf6MM7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBUuoz3hAFCeY84VQ1IQr16N2mGUvvuxH2QX-KxO-MA4ZMCA14dG0m7nXx8Xkh66azYPlle8CBxkF2y2dI',
    // Sydney Sleeper
    '6526;6;uncraftable;kt-3;td-230':
        'y1FFMyb22G1SdulpPdvD0jr3oPCKGTqnPzSVfHDbRAhtH-VWNGraqzT34OTHR2ycEukpEglWf6dW9mxBNcjaIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75PnhjWbPfg',
    // Bushwacka
    '6526;6;uncraftable;kt-3;td-232':
        'y1FVOC374n9jbONpB8fH0gL-7-HVHSOiazTGfCOAGVw9H7tcZDzbq2HwtO2QS23OEO4vRwEFdaAG9GRXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPXjFEFX1g',
    // Gloves of Running Urgently
    '6526;6;uncraftable;kt-3;td-239':
        'y1FUJTrx03NSYuljLs7V_xDppueDH23IZDbWKCSXRQw_HOFWMGqM92an5OqVRTrIRet6QV0FK6cD-jcdaJ2IaRFrhYdYriuomUM7FxsvI_peIFLrhCZLZPssxSZDGtNTlCTuIJfckwY_P0cFE7jqVqLGbIGzyXJzXHUuHq0aeoyduDO9uNeoPvqCKfghPaxgosyE2FgBANEOUZs72IxPtJDztzJEeY08CFsjA7g8MAbdBbuwlmCbWuDmO7MJ4sdSXl4ZQk68mHB5Bk17uq3ebVxGtngu9fOT_Mzlz4G7UQB5x27ihdVM',
    // Frying Pan
    '6526;6;uncraftable;kt-3;td-264':
        'yWJaFTL500thZPdrPYWelwf69LDbSXegOzPCeHPfT1w7GOYLMD6L_jGn5LiXQDrKQ716RA8BY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKrXZe610J6ho8cSL6FEASsAPW6Isyo1DhJLzqQpGJdtpSFpIE-l5Y2uIU_rvwn-bWuG7O7NbscZXBl8cTEe6ynUoDhwovK3HKlMXEipImF4',
    // Iron Curtain
    '6526;6;uncraftable;kt-3;td-298':
        'y1FfOC324nd4d_FtMcX5zATppufDSib0bGHGeSOBRQ9sG-BaMTvQrDem7O2cQj_AEOgkFQ0MKaMM9TJJNdfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-ByOfbNf',
    // Amputator
    '6526;6;uncraftable;kt-3;td-304':
        'y1FXJzLtyXV5avdTNMrUxwC1o7XbGiGhPWGVdiLaHVoxHrMKNGqPrzGm7bnAQDvKSespSgEBf6oA9XoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pdYkshlS',
    // Crusader's Crossbow
    '6526;6;uncraftable;kt-3;td-305':
        'y1FVODfr3HBod_ZTO9nJ0xb5rvWyEHXlbzKKLSWATA07SbNXMm-M-jGntO6VEzjKFeguEltWKfQM9WYbOpvcbhM1gplLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEYAQMcZTY43xJFHt6H1qQhCeI0CCV8OFIYiNCvWAefkx33MWrGyOOcL7MZTX1gbSUu_knApXR0u76jfbAtIty8noaPHrpnk0JWxGAssumDu',
    // Ullapool Caber
    '6526;6;uncraftable;kt-3;td-307':
        'y1FVKyD9z0thZPdrPYWVklf58-SIGHf0bGaQLHDcSwZsTOEPN2zR_TGi4umTFjHBEOwtF11XY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKrXZe610J6ho8cSL6FEASsAPW6Isyo1DhJLzqQpGJdtpSFpIE-l5Y2uIU_rvwn-bWuG7O7NbscZXBl8cTEe6ynUoDhwovK3HKlMXrEMaM0Q',
    // Loch-n-Load
    '6526;6;uncraftable;kt-3;td-308':
        'y1FaJSHw03hiZOFTNMrUxwC1-LLUGiSiODaRK3OORVxuT7EMYD2L-zal4--dSzCYR-B-QgsGL6cAp3oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pb_-E2Ok',
    // Warrior's Spirit
    '6526;6;uncraftable;kt-3;td-310':
        'y1FULyPq4ndhZPJTNMrUxwC1-LSPHiGhbWHAfXmJSwxqTrNaPW3e_jKs5OWQRm6dRb0rFwgDe6AH-noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pfn_Jzzl',
    // Brass Beast
    '6526;6;uncraftable;kt-3;td-312':
        'y1FRKzb01HpqWuJ5NvTKwRf8pKzeHS3zMWaTd3mBHltqHrEKMD2K_zWjtLiRFDDOFL0pRwgGdfcH82wcI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzF9HrTrgg',
    // Candy Cane
    '6526;6;uncraftable;kt-3;td-317':
        'y1FVKyz8xEtuZOtpB8fH0gL-77XfGCTxPzKUdiSNHgptG-VZN2GLqDunse3BSj3KSL5-EgANeKsApjFXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPUzknPqEw',
    // Boston Basher
    '6526;6;uncraftable;kt-3;td-325':
        'y1FUJTHs0npSZ-R_MM7U_wn6s-WIUieuPjTALXXfRAo9ROFeMD6NrGX3trnCFmrAROolQFpVe6IFpjBPNcCXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8ZrU_taL7Q',
    // Back Scratcher
    '6526;6;uncraftable;kt-3;td-326':
        'y1FUKyHz4mdud-R4O8PD0jr3oPCKGTr1PG_HK3eITFo_S7BZNTnRqmKhtrudEDyfEut4RQAEffEApmMYaJjfIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75PncpwZTrU',
    // Claidheamh Mòr
    '6526;6;uncraftable;kt-3;td-327':
        'y1FVJiPx2XxoZOhjMMbJ0jr3oPCKGTqkPzaVenCLGgwwSeFcNGHa-TrztOrBSznIQe8uQ10CeKJQoTYYPJqLIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75PnDBPvApI',
    // Jag
    '6526;6;uncraftable;kt-3;td-329':
        'y1FcKyXH0XV_YuAiPsqQmFyv8OTaGi32MGDALSPdSg04HuFXZjvb_jKntO-SSznBSOwrQhdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjTJwszqBKuoz1vkMQP9s5T1xMRu98bG6CXPjmwHqaV-fgbbUO4pBWUV8STR68yHUuDh199rmHPYk5dzEB',
    // Fists of Steel
    '6526;6;uncraftable;kt-3;td-331':
        'y1FQIzHszktiY9p_LM7DzDr3oPCKGTrxP2OQenaMRAw6SbcLZG2K-WWl4u-dSzrLSLwtElhSffQNo21BO52JIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75Pn7lhw264',
    // Sharpened Volcano Fragment
    '6526;6;uncraftable;kt-3;td-348':
        'y1FEIyTs4nJkd-BTOdPD_wn6s-WIUnakamXBLnGKRQs-GbdYPGzZ_2agsOmRR27PSO8pQApSK6FX9TJNOsiXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8ZrcEn6blw',
    // Sun-on-a-Stick
    '6526;6;uncraftable;kt-3;td-349':
        'y1FEIyTs4nJkd-BTNcrFxTr3oPCKGTr0ajWRenbcGQ86SOFZZmyM9zOg7euUQDDJSeElQgEFeqZVoWJANJ_aIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75PnoOs2NXs',
    // Detonator
    '6526;6;uncraftable;kt-3;td-351':
        'y1FSLzb303V5avdTNMrUxwC1oLWPHSXzMWKTe3eKSlppSLZaMWDZ-Dui5byRQDvASLp6FQoEdPBS8noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pY-wDnKg',
    // Fan O'War
    '6526;6;uncraftable;kt-3;td-355':
        'y1FFIi3_yHpScuR-PsrI_wn6s-WIUiOjbmWSdnLfTV87S7sLMGHR-mCi5uuXRDrOSeAvQggMeaBVoDFLaJ2Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8ZogbW96CQ',
    // Conniver's Kunai
    '6526;6;uncraftable;kt-3;td-356':
        'y1FFIi3_yHpSbvBiOcL5zATppufDGCL2OWWdfXbdGQZtRLVfMj3R-DPzs7nFS2rLSLwoFQFRffYHpjdJbtfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-JJBUrxF',
    // Half-Zatoichi
    '6526;6;uncraftable;kt-3;td-357':
        'y1FFIi3_yHpSbuR4OcXH_wn6s-WIUiH2OmbAfnSKSAk6TeIKMmjYrzKlsLvBF27LQLp9FggGfKUE-2RJacGXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8ZoBIDyKdA',
    // Shahanshah
    '6526;6;uncraftable;kt-3;td-401':
        'y1FFKSv11GBsd9pgOdnBxUuuo7fURXH2bGaRKieOTl87H7tYND2Mqzqk5rvBQjHJQbssEAhQf6sC7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBUuoz3hAFCeY84VQ1IQr16N2mGUvvuxH2QX-KxO-MA4ZMCA14dG0m7nXx8Xkh66azYPlle8CBxjkRjEtk',
    // Bazaar Bargain
    '6526;6;uncraftable;kt-3;td-402':
        'y1FUKzj53GZSdutlKM7U_wn6s-WIUiXzbTTCf3COSwxpTrUNMm2P-GWs5ruQQTnNFLp-RlhQKasM82Eaa52Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8ZoWX6sp-A',
    // Persian Persuader
    '6526;6;uncraftable;kt-3;td-404':
        'y1FSLy_34md4afFtNvTV1wrppd2BHWbwbXmSKnCBTlwwHrcKZGDRrDDz4OuSQ23PQOgqQQ1XfPYA-mVLOMmNPhc8ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIx0QdScQPTZQxxZ5KhJngvgxQbrcvGkwZLrUvJz7USvrjwCqcDOO1OeMA4sJYVlgZTk20nyYpW04uuf_fbAVH4X918_eT-5mujou4LKSB4E8',
    // Splendid Screen
    '6526;6;uncraftable;kt-3;td-406':
        'y1FGLzDr1HVjWvZkMc7KxDr3oPCKGTrxOzGQLHPbGVhsG-JaYD7e-mLx4-idF2vISLsuQQsFLKRQ82JBOc3cIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75Pn-xIydWk',
    // Quick-Fix
    '6526;6;uncraftable;kt-3;td-411':
        'y1FGOC3s0ktgYOFlP97I_wn6s-WIUnf1a2SceXTYRAg-SrVXNjyP_2L0s-6TQ2vLELx4SlgGdKYA-mFPb8uXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8ZoY5Iy_Qw',
    // Overdose
    '6526;6;uncraftable;kt-3;td-412':
        'y1FGOC3s0kt-fPdlNszDxxD1nu6MDnPyJmfBeXWAGgsxSOVYNG3e_jHws-_HFGnLQu0pFwgHK_AN-2RJb5qIahAjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVJo8CVsjHbg8MjyfV_3kl3rKXuS0PegO5slRVloeSEa5ySYvCE547v_fYgoRsS0np6PG-9PwkIIOiCzrnA',
    // Solemn Vow
    '6526;6;uncraftable;kt-3;td-413':
        'y1FeIzLo0nd_ZPFpK_TE1Rbvnu6MDnPyJmHFeXfdGVg7RLUMN2zQ-mGjsO7FET-fR-8oEQ1VKKJR-2VJbsjbNhYjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVJo8CVsjHbg8MjyfV_3kl3rKXuS0PegO5slRVloeSEa5ySYvCE547v_fYgoRsS0np6PG-9PwkII6WPI6Zg',
    // Liberty Launcher
    '6526;6;uncraftable;kt-3;td-414':
        'y1FaIyD9z2B0WultLcXFyADpnu6MDnPyJmDAdnKATFhqSOZXNznf9zah4LiVFzHMRL0pRQoMevFQ9WwfbpqIOxUjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVJo8CVsjHbg8MjyfV_3kl3rKXuS0PegO5slRVloeSEa5ySYvCE547v_fYgoRsS0np6PG-9PwkIKfYLQCrw',
    // Reserve Shooter
    '6526;6;uncraftable;kt-3;td-415':
        'y1FELzH9z2JoWvZkN8TSxRfEreOfG3G5P27FfiPaSw8-HrNbMDmL9zX04OjCSzCaFLwlS10GdKcC9mxNOsqNawx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umfY0LFnH',
    // Market Gardener
    '6526;6;uncraftable;kt-3;td-416':
        'y1FbKzDz2GBSYuR-PM7IxRfEreOfG3G5PmSVLXWNSQxqG-BbZm2MqzT05unFED3LR-goRAEAfvdW92IfacDbPQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umYO7shNO',
    // Tomislav
    '6526;6;uncraftable;kt-3;td-424':
        'y1FCJS_xznhsc9pgOdnBxUuipeDeGCz0bmOXdnHbSgpqS7ENYGve_DPxse3GFj3BQb4kRl8GfKMF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBUuoz3hAFCeY84VQ1IQr16N2mGUvvuxH2QX-KxO-MA4ZMCA14dG0m7nXx8Xkh66azYPlle8CBxfiN8EjU',
    // Family Business
    '6526;6;uncraftable;kt-3;td-425':
        'y1FEPzHr1HVjWvdlN9_5zATppufDTy3xaWKXfCXdHVhrTrIPYDvb-mDz4biVQTvKRL0sQ1sCfaNQpjVKONfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-IodopgY',
    // Eviction Notice
    '6526;6;uncraftable;kt-3;td-426':
        'y1FTPCv7yX1ia9piN9_PwwDEreOfG3G5PjXAeXXdHgY-G7JeMWGM_TGm5O-RQmycQbouRFwNKKsFoDcaaZ2BbQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umbMCR7kg',
    // Cow Mangler 5000
    '6526;6;uncraftable;kt-3;td-441':
        'y1FSOCXH3nt6aORiP8fD0jr3oPCKGTqhPDGdeHKIHg1uROZWPDqK-TvztujGQjnOEOh6Rg1QeaoH8jdBaZjYIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75Pn_ONQY8w',
    // Righteous Bison
    '6526;6;uncraftable;kt-3;td-442':
        'y1FSOCXHz31qbfFpN97VwgzoruyyEHXlbzKKfnOLHgw7G7oNZmDf-zei4-nCRD2YEO59Q1sBf6RQoDZLbMCJNkdphZlLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEYAQMcZTY43xJFHt6H1qQhCeI0CCV8OFIYiNCvWAefkx33MWrGyOOcL7MZTX1gbSUu_knApXR0u76jfbAtIty8noaPHrpnk0JWxGGijvpxj',
    // Mantreads
    '6526;6;uncraftable;kt-3;td-444':
        'xW9YPjD93HB-WultKszDjlypp7GJGnD2bmfBfSONTQdsGbcKYTzcqGD25bmVE2vMQuApEABXefEasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479I1HqZvNtwxRbI1zSApPFe0sZW6HVvDgwHaZX-C2PegNt5MEUF5LTEm7k3MqDhoovfiNPhMA7ilQSQnlUw',
    // Disciplinary Action
    '6526;6;uncraftable;kt-3;td-447':
        'y1FEIybx03NSZvdjKPTKwRf8pKzdT3DxbWaVeXeARAZuGbYNNDqM-DTw5umTRj_AQeksSw8DffdW8jYfI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzF9kVqkO8',
    // Soda Popper
    '6526;6;uncraftable;kt-3;td-448':
        'y1FFJSb54mRidfVpKvTKwRf8pKzVRCCmP2GSfHGAS1o7TeYNNmyKrWbz5-WXETCbQ-orFVwFKKIE9mxBI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFxRZIv7U',
    // Winger
    '6526;6;uncraftable;kt-3;td-449':
        'y1FBIyz_2GZSdex_LMTK_wn6s-WIUnGmaTXCdnncHwkxGbBXPWrcqDGit7-QQGzOQu8pSw9QLKVV9GZPbsuXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8ZqJAk9ihA',
    // Atomizer
    '6526;6;uncraftable;kt-3;td-450':
        'y1FUJSzz4nZscdpgOdnBxUuj8ubaGXClMGLHKiSOGl09GLFYNmzc92Wg4unGFm7JQO14FV9QLvcF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBUuoz3hAFCeY84VQ1IQr16N2mGUvvuxH2QX-KxO-MA4ZMCA14dG0m7nXx8Xkh66azYPlle8CBx5_Vg-Nw',
    // Three-Rune Blade
    '6526;6;uncraftable;kt-3;td-452':
        'y1FFKS3tyUt-cup-PPTKwRf8pKzVSnKgam-SLCDcGgxqG-APMTmPr2ass77BET3OEukrQl0Af6AF-zEYI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFo2wpSpk',
    // Postal Pummeler
    '6526;6;uncraftable;kt-3;td-457':
        'y1FbKyv033t1WultKszDjgP4-LSMTXahPGTCfiKKTlg6G7INYWiP-Wen5OicEDifF7ovF18FefEasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479I1HqZvNtwxRbI1zSApPFe0sZW6HVvDgwHaZX-C2PegNt5MEUF5LTEm7k3MqDhoovfiNPhMA7imHt1MBBw',
    // Enforcer
    '6526;6;uncraftable;kt-3;td-460':
        'y1FFJDf64npiduBTNMrUxwC1-bGMGiyiO2LHdiCBTw49RLcMMW7brGGh5LyTEzjIR-p6QwhSePYCoXoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pZqGGPyb',
    // Big Earner
    '6526;6;uncraftable;kt-3;td-461':
        'y1FFPSvs3nxvaeRoPfTKwRf8pKzfTXemazaSeXbaTFwwH7BYYzzb-mXw7emSEz6cE7x6QV0HKfZV8jdPI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzF2PxWFhg',
    // Maul
    '6526;6;uncraftable;kt-3;td-466':
        'y1FELCPH1XVgaOB-B8fH0gL-77TeTnL0OG6XLHDfTAtpRLtfPG6M9mGmsO2cRDmbQ7woFwANf_QApmxXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPVyCEdKrg',
    // Conscientious Objector
    '6526;6;uncraftable;kt-3;td-474':
        'y1FGIyHz2GBSaeR-P86ImFyu97OOGXKuPDOWfnWOT1xsRLENYT6P-jqgs7jHRj-fFbx4RlwGfrxErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgB2Z5UvqH-uh9EbsZuTw0YRbt-Ym-DXf7ky3-ZXeewNuVbt5VXUAgcTEm1nCV6XEh86a2NdE0e54tv2_u2',
    // Nessie's Nine Iron
    '6526;6;uncraftable;kt-3;td-482':
        'y1FRJS7-3nh4Z9pgOdnBxUuu8LXdRCLzbGOdfCWJRQs9SeILMmCK-zX07ejGQT7PQukpS18Df6dR7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBUuoz3hAFCeY84VQ1IQr16N2mGUvvuxH2QX-KxO-MA4ZMCA14dG0m7nXx8Xkh66azYPlle8CBxJzDyq5k',
    // Original
    '6526;6;uncraftable;kt-3;td-513':
        'y1FULzbHz3tubuB4NMrTzgbzpPCyEHXlbzKKeCLfTA4wSLReNGze9zaj5riWFz_MQ-l5RgBVKaIG8G0dOJrYbRI1gJlLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEYAQMcZTY43xJFHt6H1qQhCeI0CCV8OFIYiNCvWAefkx33MWrGyOOcL7MZTX1gbSUu_knApXR0u76jfbAtIty8noaPHrpnk0JWxGFfXzCe1',
    // Diamondback
    '6526;6;uncraftable;kt-3;td-525':
        'y1FSLzrHz3F7aul6Pdn5zATppufDTy32aW6SKnLdS1o7S7tXPWja9zT37LjHRz_BR7soFwtReKpS8DVLOdfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-CKcOfbb',
    // Machina
    '6526;6;uncraftable;kt-3;td-526':
        'y1FSLzrHznpkdeB-KsLAzADEreOfG3G5bTSVf3PbHlxuSrtaN2ra-jL2sbvAFD6aFb55QA4EK_ZWpzBLaMqAawx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umV-LcGha',
    // Widowmaker
    '6526;6;uncraftable;kt-3;td-527':
        'y1FSLzrHznxiceJ5NvTKwRf8pKzYGiLzMG-cLHmASQk_HLoNZjuLqGDw5--dSjqaQ-gqEQFRdPcE9jFAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFbx-E1-4',
    // Short Circuit
    '6526;6;uncraftable;kt-3;td-528':
        'y1FSLzrH3GZgWultKszDjlSroOeLGHKuOGGReCDbRVw4G7JWYG-N-jWj5b-cFz7PRekkFwkAe_casjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479I1HqZvNtwxRbI1zSApPFe0sZW6HVvDgwHaZX-C2PegNt5MEUF5LTEm7k3MqDhoovfiNPhMA7ikNTXbd_w',
    // Unarmed Combat
    '6526;6;uncraftable;kt-3;td-572':
        'y1FDJCPq0HFpWuZjNcnH1Dr3oPCKGTqgPmCQe3SLRFxrH7FeYW2I_Tqn4eucET2YRO8tF19QevQDoDVAPMmIIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75PnMbGeTr8',
    // Wanga Prick
    '6526;6;uncraftable;kt-3;td-574':
        'y1FAJS380ntSdexiB8fH0gL-77PYTSX2bG_HKnmJSgs5RLcKZ2Hf-zCj5bzBETrLF7wkFQxQevYF8GZXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPVZ9yhlEg',
    // Apoco-Fists
    '6526;6;uncraftable;kt-3;td-587':
        'y1FFOHHHzWFjZu1TNMrUxwC1pLqLTSL1OGfCf3fYGQdsHLEPNj2N9jPztruTSzHOFex6RAkEeqcE93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pVSoNj-P',
    // Pomson 6000
    '6526;6;uncraftable;kt-3;td-588':
        'y1FSOCXHzXtgdupiB8fH0gL-7-fUGCymOWLCdiSOHQowTbFdPGver2bxse6QETzLELt_Sw0DeaEA9TJXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPVK4PwXSQ',
    // Eureka Effect
    '6526;6;uncraftable;kt-3;td-589':
        'y1FSOCXHymZoa-ZkNcTS0gr1nu6MDnPyJmDFLCPcSww9SLRXMDnfr2Ws4rnBQzybSbwuEQkGevEE9zVMOc3YbRIjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVJo8CVsjHbg8MjyfV_3kl3rKXuS0PegO5slRVloeSEa5ySYvCE547v_fYgoRsS0np6PG-9PwkIIm1q97ww',
    // Third Degree
    '6526;6;uncraftable;kt-3;td-593':
        'y1FSOCXHyXxkd-FoPczUxQDEreOfG3G5PWeUenaKRQ49SeVWZ2yI_2Cs5OSdFGzMFekoQ19ReqNS9GZPOpvcPgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umeNw5uez',
    // Phlogistinator
    '6526;6;uncraftable;kt-3;td-594':
        'y1FSOCXHzXxhauJlK9_PzgTvrvCyEHXlbzKKKieMTgk7SOEMN26N-jv35biWFmrNQLsqEglRfasCoG1OOpuAOBU10plLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEYAQMcZTY43xJFHt6H1qQhCeI0CCV8OFIYiNCvWAefkx33MWrGyOOcL7MZTX1gbSUu_knApXR0u76jfbAtIty8noaPHrpnk0JWxGBQRhZZm',
    // Manmelter
    '6526;6;uncraftable;kt-3;td-595':
        'y1FSOCXH0HVjaOBgLM7U_wn6s-WIUnbxO2GQfCLaGAtrG7JYNm7Z_jb37OSQET7LRu16RF9QfqoN-2RNaJ-Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8Zpzg5Nmyg',
    // Scottish Handshake
    '6526;6;uncraftable;kt-3;td-609':
        'y1FFKS3s0XVjYdp_MMrUxDr3oPCKGTryPDOTeieNSV09HrpeMDzd_juh4OyURW2bQuEoQw0MefNR8W1IbMDYIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75PnEfue1z8',
    // Sharp Dresser
    '6526;6;uncraftable;kt-3;td-638':
        'y1FXKTDH1XtibudgOc_D_wn6s-WIUnXxbmGReHeLHgY6SbJdZGnf_Drws76cQz-cROwrEAwEf_FSpjcdO8uXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8ZpvXRonPg',
    // Wrap Assassin
    '6526;6;uncraftable;kt-3;td-648':
        'y1FOJzHH2n1rcfJ-Odv5zATppufDTiakbWeULSWPSlhsT7ZYNTzf9jb37L6cETjPEuElQgkCeKMG9jBLbtfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-OoSaEeN',
    // Spy-cicle
    '6526;6;uncraftable;kt-3;td-649':
        'y1FOJzHH3nthYdp_MMTTzAH-s92BHWbwbXnGKnaJHgk-ROVaMWCL9jL0s--WEDDKQO9-RgAHf_RV92dINc2NPRY_ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIx0QdScQPTZQxxZ5KhJngvgxQbrcvGkwZLrUvJz7USvrjwCqcDOO1OeMA4sJYVlgZTk20nyYpW04uuf_fbAVH4X918_eT-5mujou4Xl5HQsg',
    // Holiday Punch
    '6526;6;uncraftable;kt-3;td-656':
        'y1FOJzHH2nhic-B_B8fH0gL-77HeSHKvbTXFKXeBGAwxS7cMNDne-Dqi4unCEz2cQugvFg4DffAF-m1XfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPUjxu7GAQ',
    // Black Rose
    '6526;6;uncraftable;kt-3;td-727':
        'y1FXPCPHz3t-YO5iMc3D_xPEreOfG3G5bW6TfnndSAk_H7oKPGDdqjf2seqdQjzPFLx4QQkDfKANoTUfOp2OOgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umR3Tip1v',
    // Beggar's Bazooka
    '6526;6;uncraftable;kt-3;td-730':
        'y1FSPy_ozmBod9poPd3PwwDEreOfG3G5aWHFeyOMGQZpSeJXMGCMqGX0t7icRGvJSOEtQwpSdPAB8WNIP8vbbQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umdbfRHGu',
    // Lollichop
    '6526;6;uncraftable;kt-3;td-739':
        'y1FaJS701HdlavVTNMrUxwC187CITXenPmGVLHaPRVo9T-ZcNjuMqjDxsOTFFD6YSboqFwoEdfYC93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pQp9qJhg',
    // Scorch Shot
    '6526;6;uncraftable;kt-3;td-740':
        'y1FFKS3q3nxSdu1jLPTKwRf8pKzbHnWgbjSRdnaNRQpqTrNXPDvb-DP25b-URT3NQL0qRAwEf6QApmIfI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFDqrUiQI',
    // Rainblower
    '6526;6;uncraftable;kt-3;td-741':
        'y1FEKyv233hicuB-B8fH0gL-77bYHXGhO2aWf3CMTA06H-VePW6Krzus5buVSzvIELwqEV0BeaFS9TdXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPV707Tl_g',
    // Cleaner's Carbine
    '6526;6;uncraftable;kt-3;td-751':
        'y1FGOC3HznlqWultKszDjgb987WMRHDyOWeSe3aJTg5sSrMPNWja-DX24unCF2maSeEvFw0EK_YasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479I1HqZvNtwxRbI1zSApPFe0sZW6HVvDgwHaZX-C2PegNt5MEUF5LTEm7k3MqDhoovfiNPhMA7inM1lajDw',
    // Hitman's Heatmaker
    '6526;6;uncraftable;kt-3;td-752':
        'y1FGOC3Hz31raeBTNMrUxwC1o7LaRXHyOWfGLSfbRVxrG7pZNGzf-zumtL7HFD_ISb4pSwkMeKtV9HoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pfNzAvT9',
    // Baby Face's Blaster
    '6526;6;uncraftable;kt-3;td-772':
        'y1FGLzLHzndscfFpKszTzjr3oPCKGTqmMGTHfiXbGgc-G7ULNmjbq2as7OWUQz7BSLl4EF8GKfMN9TBPOMiJIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75PnaZFmhlQ',
    // Pretty Boy's Pocket Pistol
    '6526;6;uncraftable;kt-3;td-773':
        'y1FGLzLHzX1-cepgB8fH0gL-77vfHy30OTPCLnmIHws_HLoPZzra9zek57nHFjmaR-p5RAhRdPcA8WNXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPVLzZoIpA',
    // Escape Plan
    '6526;6;uncraftable;kt-3;td-775':
        'y1FGIyHz3GxoWultKszDjlSs8ObYTC2mMTKWeiXbTgprGOEPMmzb_GCn4OmRFDHIQLx-S1gEKfEasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479I1HqZvNtwxRbI1zSApPFe0sZW6HVvDgwHaZX-C2PegNt5MEUF5LTEm7k3MqDhoovfiNPhMA7ilzbWBdKA',
    // Huo-Long Heater
    '6526;6;uncraftable;kt-3;td-811':
        'y1FVKyzs0npSaeR-P86IwVH_pOTaRSSvOmaTenmBTF85TbtYYz3frzX0tOSXFD3KF-oqSw4Hf7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgB2Z5UvqH-uh9EbsZuTw0YRbt-Ym-DXf7ky3-ZXeewNuVbt5VXUAgcTEm1nCV6XEh86a2NdE0e51wE5y3Q',
    '6526;6;uncraftable;kt-3;td-832':
        'y1FVKyzs0npSaeR-P86IwVH_pOTaRSSvOmaTenmBTF85TbtYYz3frzX0tOSXFD3KF-oqSw4Hf7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgB2Z5UvqH-uh9EbsZuTw0YRbt-Ym-DXf7ky3-ZXeewNuVbt5VXUAgcTEm1nCV6XEh86a2NdE0e51wE5y3Q',
    // Flying Guillotine
    '6526;6;uncraftable;kt-3;td-812':
        'y1FFLh370XFsc-B-B8fH0gL-77GLRXKibmHFfyCBH1w4SbcIYGvQ9zPx7bmcR2vMRet9EgsBfapXo2JXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPUTTXP_dA',
    '6526;6;uncraftable;kt-3;td-833':
        'y1FFLh370XFsc-B-B8fH0gL-77GLRXKibmHFfyCBH1w4SbcIYGvQ9zPx7bmcR2vMRet9EgsBfapXo2JXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPUTTXP_dA',
    // Neon Annihilator
    '6526;6;uncraftable;kt-3;td-813':
        'y1FFLh322HtjduxrNvTKwRf8pKyISnKvO2WSenffTg49HrsKYzyM9jussOWUEzDPR70rEAsHK6pX-mZAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFkqomn9Q',
    '6526;6;uncraftable;kt-3;td-834':
        'y1FFLh322HtjduxrNvTKwRf8pKyISnKvO2WSenffTg49HrsKYzyM9jussOWUEzDPR70rEAsHK6pX-mZAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFkqomn9Q',
    // AWPer Hand
    '6526;6;uncraftable;kt-3;td-851':
        'y1FVOSX34nV6ddpgOdnBxUv5-LPUGHWkMWWTKSWNSQ89TeBWY2GL-Gfws-zFRj3KRr15EA9VKPAC7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBUuoz3hAFCeY84VQ1IQr16N2mGUvvuxH2QX-KxO-MA4ZMCA14dG0m7nXx8Xkh66azYPlle8CBxEWVeYJA',
    // Freedom Staff
    '6526;6;uncraftable;kt-3;td-880':
        'y1FCPR393HNhYNpgOdnBxUv_pbGJTiKiMGeTf3GLGQ44RbYPNWve-Dr2sbidRzHBQ7woRAkFfPZW7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBUuoz3hAFCeY84VQ1IQr16N2mGUvvuxH2QX-KxO-MA4ZMCA14dG0m7nXx8Xkh66azYPlle8CBxumNLUTw',
    // Bat Outta Hell
    '6526;6;uncraftable;kt-3;td-939':
        'y1FFITf00XZscdpgOdnBxUv4oLfYHnL0MWWReXjbSgw7GeVdMmrbrTOltOSVRD7JQ-96SgEMfvFV7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPexBMvvm',
    // Loose Cannon
    '6526;6;uncraftable;kt-3;td-996':
        'y1FSLy_34ndsa-tjNvTKwRf8pKyPHi3yam_GeiXaHl9qHrJYZmHYrDGj4-SQS27IEuwkEg8AK_QNoTYdI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFmJmvrfc',
    // Rescue Ranger
    '6526;6;uncraftable;kt-3;td-997':
        'y1FCLy794mdlavFrLcX5zATppufDTifxajaRfnmATwg8H7VfN2nf_TKj7O2XFzzLErl6QwsCL_cG8TdJPdfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-KUffWrz',
    // Vaccinator
    '6526;6;uncraftable;kt-3;td-998':
        'y1FbLybx2mFjWuFpPs7I0wDEreOfG3G5OmXCdnSMSVtrTroIMjnZ-Dqs5uWTF27AQrokEg8MeaYD8WJJaMDdPgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umVZwoIXY',
    // Ham Shank
    '6526;6;uncraftable;kt-3;td-1013':
        'y1FeKy_H0XV_YuAiYJKfwlOv9bOMGiDxPTKReXmAGls7TeVZMmmK_DWisOrHQDCdSO8rShdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjTJwszqBKuoz1vkMQP9s5T1xMRu98bG6CXPjmwHqaV-fgbbUO4pBWUV8STR68yHUuDh199rmHPfptlhnK',
    // Fortified Compound
    '6526;6;uncraftable;kt-3;td-1092':
        'y1FUJTXHyXxkYONTNMrUxwC18-PVTHKlOWaSeXSPRV0xSLsLZmGN9jantOqTFjjPSb5-Fg9SKaQH93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pSwUaXjd',
    // Classic
    '6526;6;uncraftable;kt-3;td-1098':
        'y1FCLCHHznpkdeB-KsLAzADEreOfG3G5PGeQdnaAGQ9tROFbPWHY_TemtLnBR27PROAtR1pXKacN8zBPP8zYbQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umQTLeqEM',
    // Tide Turner
    '6526;6;uncraftable;kt-3;td-1099':
        'y1FBIif90Ut-bexpNM_5zATppufDTyylamaTLXbaGlg-S7FZNGDaqDCj4rmXSjnBR70rElgDeqBW92cfOtfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-DdxU-IK',
    // Bread Bite
    '6526;6;uncraftable;kt-3;td-1100':
        'y1FUOCf52Xlia_Z4Pdn5xwn0t-eeI3j2ejDBYXDbGAg9H-JWMW3bqzL34ezGETHBFL19F10BKaYHozYaOsDcbRtu3dEVu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkCXc4aW44twpBIupLNvB9Gaps4JEwdA7wROTjDA6z5wHqbCufgP-YP58hXVFEbS0y5mX1_XRt97_6IbAtGuHl38_GT-szkmsuvERedU7PA4g',
    // Back Scatter
    '6526;6;uncraftable;kt-3;td-1103':
        'y1FFKSPsyXF_Yfd5NfTKwRf8pKzYSyOiOWOcKXKIH1ttTrpdYWGN_Teh5L6SRW3BFe0lQg0MKfQCpGFLI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFQ3jy-aE',
    // Air Strike
    '6526;6;uncraftable;kt-3;td-1104':
        'y1FXPi314nhscOtvMM7U_wn6s-WIUiz2PzLCd3eKTgk5HLcLPGHQrDLz5OjGRjubRbx-EQsNevEDoTYfPs2Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8ZqlfadugQ',
    // Necro Smasher
    '6526;6;uncraftable;kt-3;td-1123':
        'y1FVKzD21GJsadphOcfKxRHEreOfG3G5OGWWf3HbHwdtG7dfZGzf_zSssO6RRjDPRO4rSgwHK6UBo2cYOZ3baQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umTtoKE-c',
    // Quickiebomb Launcher
    '6526;6;uncraftable;kt-3;td-1150':
        'y1FdIyz_0HVmYPdTK9_Pww7inu6MDnPyJmCVLHWKRAxrRbpWNzvYqjWgseTCQzvBQLwrSwhRe6RV8GxObsvYPEMjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVJo8CVsjHbg8MjyfV_3kl3rKXuS0PegO5slRVloeSEa5ySYvCE547v_fYgoRsS0np6PG-9PwkIIl2pwhXA',
    // Iron Bomber
    '6526;6;uncraftable;kt-3;td-1151':
        'y1FHPyP833VhadpgOdnBxUv997bYRHCkamCQLHWBTl1uGLRfNzuN-2ah4-nGSmuYF7p6QwkFdaMF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBUuoz3hAFCeY84VQ1IQr16N2mGUvvuxH2QX-KxO-MA4ZMCA14dG0m7nXx8Xkh66azYPlle8CBx9b4fDTk',
    // Panic Attack
    '6526;6;uncraftable;kt-3;td-1153':
        'y1FCOCf23nxqcOtTNMrUxwC19OaOGS2hOWaXfHLdSQc_SbBYYTrYqDX0t-iUET-fR-5-FQ9Re6YCpnoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pXrf_kIk',
    // Dragon's Fury
    '6526;6;uncraftable;kt-3;td-1178':
        'y1FQJiP12HZsaelTNMrUxwC19uaMTCyhPTaRLnSKTQ9rSLMKNWDdqGemsLjHRDCfFLokQg8HfKUF9HoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pThvjhGr',
    // Hot Hand
    '6526;6;uncraftable;kt-3;td-1181':
        '31FFJiPozX1jYtprNMTQxTr3oPCKGTr0ODbFdySASl9rG7JcMGzZq2eituTFRGmYQOouRQ1WfacC9TZJPJ-KIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75PnVlSzHbE',
    // Shooting Star
    '6526;6;uncraftable;kt-3;td-30665':
        'y1FfJDT5zn1ia9p_NsLWxRfpqOSBGUv7aSXDKm_YH1s5SuELZmuMrzrzsL_CFGvLF-p5Sg4NdaQApmBJPJ_caho80NEC5XW2kAJ0ExF5Td0WLV_1mCxGd7Qoz3AtPZpfmTr2JZHP3AI1aSkjWrXnSLjBb5f8zXglMlNmEqAEY4OVrnSsuM6lZ_OCLe5uOaY69saI2UVdX9MTWJgt2JZJtZ_-hApRbokuHmEOEKsrCjXQFq6y3X2cXbe2beEO48NZUFoSS06-n3ZyCxt7vP7eOwtGtnYho6PBrpixmoHxDx5w6AhlCnM',
    // C.A.P.P.E.R
    '6526;6;uncraftable;kt-3;td-30666':
        'y1FfJDT5zn1ia9p8MdjSzwnEreOfG3G5OTLFfieAGgcwSrddZ22I_2Ggt7vFFj-aQrsrFQ4Ce6sN92VBNMrabgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umeDq3Fn-',
    // Batsaber
    '6526;6;uncraftable;kt-3;td-30667':
        'y1FfJDT5zn1ia9puOd_5zATppufDHyL0amWReniJSFg_HrYINT7Q_jH34L-QFDufRbssElgCf6MG-zAaOtfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-CRiV0it'
};

const strangifierImages: { [sku: string]: string } = {
    // Reference: https://wiki.teamfortress.com/wiki/Template:Strangifiers_table & tf2 schema
    // Pomson 6000 Strangifier
    '6522;6;td-588':
        'y1FSOCXHzXtgdupiB8fH0gL-7-fUGCymOWLCdiSOHQowTbFdPGver2bxse6QETzLELt_Sw0DeaEA9TJXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud0ILNm8cKC6FEXQcQOV54Bx55UvJu8614WO94_Sg9KFeh_YjuCAf_uwnaZXeTnOeRbs8AFVFpOSknvmSF4Xldptq71lTT6Gg',
    '5661;6;td-588':
        'y1FSOCXHzXtgdupiB8fH0gL-7-fUGCymOWLCdiSOHQowTbFdPGver2bxse6QETzLELt_Sw0DeaEA9TJXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud0ILNm8cKC6FEXQcQOV54Bx55UvJu8614WO94_Sg9KFeh_YjuCAf_uwnaZXeTnOeRbs8AFVFpOSknvmSF4Xldptq71lTT6Gg',
    // Pretty Boy's Pocket Pistol Strangifier
    '6522;6;td-773':
        'y1FGLzLHzX1-cepgB8fH0gL-77vfHy30OTPCLnmIHws_HLoPZzra9zek57nHFjmaR-p5RAhRdPcA8WNXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud0ILNm8cKC6FEXQcQOV54Bx55UvJu8614WO94_Sg9KFeh_YjuCAf_uwnaZXeTnOeRbs8AFVFpOSknvmSF4Xldptq5kc-XNmA',
    '5721;6;td-773':
        'y1FGLzLHzX1-cepgB8fH0gL-77vfHy30OTPCLnmIHws_HLoPZzra9zek57nHFjmaR-p5RAhRdPcA8WNXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud0ILNm8cKC6FEXQcQOV54Bx55UvJu8614WO94_Sg9KFeh_YjuCAf_uwnaZXeTnOeRbs8AFVFpOSknvmSF4Xldptq5kc-XNmA',
    // Phlogistinator Strangifier
    '6522;6;td-594':
        'y1FSOCXHzXxhauJlK9_PzgTvrvCyEHXlbzKKKieMTgk7SOEMN26N-jv35biWFmrNQLsqEglRfasCoG1OOpuAOBU10plLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEUGXcASWZgBzJpIvoz7uDJPapo6HhBMQux-YzuAVf-zwn-fDODnOegI7cBTUAwcTx3rmiF4DB0p7qvbPw4Rrj54pY2xSYgx',
    '5722;6;td-594':
        'y1FSOCXHzXxhauJlK9_PzgTvrvCyEHXlbzKKKieMTgk7SOEMN26N-jv35biWFmrNQLsqEglRfasCoG1OOpuAOBU10plLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEUGXcASWZgBzJpIvoz7uDJPapo6HhBMQux-YzuAVf-zwn-fDODnOegI7cBTUAwcTx3rmiF4DB0p7qvbPw4Rrj54pY2xSYgx',
    // Cleaner's Carbine Strangifier
    '6522;6;td-751':
        'y1FGOC3HznlqWultKszDjgb987WMRHDyOWeSe3aJTg5sSrMPNWja-DX24unCF2maSeEvFw0EK_YasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejFabpmOqZiwMKC2VMARsIjUpwszJoI682n61tBOtlrHw9NRrt9MG-IVfHmwHnNWObgaeBc5sIEV19ISBq-ymo7UR5df1B87w',
    '5723;6;td-751':
        'y1FGOC3HznlqWultKszDjgb987WMRHDyOWeSe3aJTg5sSrMPNWja-DX24unCF2maSeEvFw0EK_YasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejFabpmOqZiwMKC2VMARsIjUpwszJoI682n61tBOtlrHw9NRrt9MG-IVfHmwHnNWObgaeBc5sIEV19ISBq-ymo7UR5df1B87w',
    // Private Eye Strangifier
    '6522;6;td-388':
        '235PFTLq1GJsceBTPdLD_wn6s-WIUiXzPTWWf3OJSws-GOUMPWHYrWXx4OyXFjCaFel5EQEAeatW-2NMaZqXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-5069eG2VEXcMYZUJgswpx5t5_gvAgNO9toSwgeQOh4MWiAU6vklniRX-uzPOZc48QCAVhPSUzpm3IpDRwqueeZNFo4dWLn1Q',
    '5724;6;td-388':
        '235PFTLq1GJsceBTPdLD_wn6s-WIUiXzPTWWf3OJSws-GOUMPWHYrWXx4OyXFjCaFel5EQEAeatW-2NMaZqXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-5069eG2VEXcMYZUJgswpx5t5_gvAgNO9toSwgeQOh4MWiAU6vklniRX-uzPOZc48QCAVhPSUzpm3IpDRwqueeZNFo4dWLn1Q',
    // Big Chief Strangifier
    '6522;6;td-309':
        'wGtXPDvH331qWuZkMc7A_wn6s-WIUiamMTHFfnCATA5uHOBbZ2_c_mak5-jAR27OFO14RgkBK6sA-jdJaZ-Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-5069eG2VEXcMYZUJgswpx5t5_gvAgNO9toSwgeQOh4MWiAU6vklniRX-uzPOZc48QCAVhPSUzpm3IpDRwqueeZNFqXGUWhig',
    '5725;6;td-309':
        'wGtXPDvH331qWuZkMc7A_wn6s-WIUiamMTHFfnCATA5uHOBbZ2_c_mak5-jAR27OFO14RgkBK6sA-jdJaZ-Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-5069eG2VEXcMYZUJgswpx5t5_gvAgNO9toSwgeQOh4MWiAU6vklniRX-uzPOZc48QCAVhPSUzpm3IpDRwqueeZNFqXGUWhig',
    // Air Strike Strangifier
    '6522;6;td-1104':
        'y1FXPi314nhscOtvMM7U_wn6s-WIUiz2PzLCd3eKTgk5HLcLPGHQrDLz5OjGRjubRbx-EQsNevEDoTYfPs2Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-5069eG2VEXcMYZUJgswpx5t5_gvAgNO9toSwgeQOh4MWiAU6vklniRX-uzPOZc48QCAVhPSUzpm3IpDRwqueeZNFryVcUbRQ',
    '5753;6;td-1104':
        'y1FXPi314nhscOtvMM7U_wn6s-WIUiz2PzLCd3eKTgk5HLcLPGHQrDLz5OjGRjubRbx-EQsNevEDoTYfPs2Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-5069eG2VEXcMYZUJgswpx5t5_gvAgNO9toSwgeQOh4MWiAU6vklniRX-uzPOZc48QCAVhPSUzpm3IpDRwqueeZNFryVcUbRQ',
    // Classic Strangifier
    '6522;6;td-1098':
        'y1FCLCHHznpkdeB-KsLAzADEreOfG3G5PGeQdnaAGQ9tROFbPWHY_TemtLnBR27PROAtR1pXKacN8zBPP8zYbQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNaTxVccSMQjWZgwzo1PuKH-uh9EbsZtSAtMR7t_ZG_VVfjgkX3NWOqzN-AK4pRWUgtMSxq-mCB7CRsrvfqIdE0e5-cVmfXp',
    '5754;6;td-1098':
        'y1FCLCHHznpkdeB-KsLAzADEreOfG3G5PGeQdnaAGQ9tROFbPWHY_TemtLnBR27PROAtR1pXKacN8zBPP8zYbQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNaTxVccSMQjWZgwzo1PuKH-uh9EbsZtSAtMR7t_ZG_VVfjgkX3NWOqzN-AK4pRWUgtMSxq-mCB7CRsrvfqIdE0e5-cVmfXp',
    // Manmelter Strangifier
    '6522;6;td-595':
        'y1FSOCXH0HVjaOBgLM7U_wn6s-WIUnbxO2GQfCLaGAtrG7JYNm7Z_jb37OSQET7LRu16RF9QfqoN-2RNaJ-Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-5069eG2VEXcMYZUJgswpx5t5_gvAgNO9toSwgeQOh4MWiAU6vklniRX-uzPOZc48QCAVhPSUzpm3IpDRwqueeZNFoNLjGUwg',
    '5755;6;td-595':
        'y1FSOCXH0HVjaOBgLM7U_wn6s-WIUnbxO2GQfCLaGAtrG7JYNm7Z_jb37OSQET7LRu16RF9QfqoN-2RNaJ-Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-5069eG2VEXcMYZUJgswpx5t5_gvAgNO9toSwgeQOh4MWiAU6vklniRX-uzPOZc48QCAVhPSUzpm3IpDRwqueeZNFoNLjGUwg',
    // Vaccinator Strangifier
    '6522;6;td-998':
        'y1FbLybx2mFjWuFpPs7I0wDEreOfG3G5OmXCdnSMSVtrTroIMjnZ-Dqs5uWTF27AQrokEg8MeaYD8WJJaMDdPgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNaTxVccSMQjWZgwzo1PuKH-uh9EbsZtSAtMR7t_ZG_VVfjgkX3NWOqzN-AK4pRWUgtMSxq-mCB7CRsrvfqIdE0e5w1n3f2Q',
    '5756;6;td-998':
        'y1FbLybx2mFjWuFpPs7I0wDEreOfG3G5OmXCdnSMSVtrTroIMjnZ-Dqs5uWTF27AQrokEg8MeaYD8WJJaMDdPgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNaTxVccSMQjWZgwzo1PuKH-uh9EbsZtSAtMR7t_ZG_VVfjgkX3NWOqzN-AK4pRWUgtMSxq-mCB7CRsrvfqIdE0e5w1n3f2Q',
    // Widowmaker Strangifier
    '6522;6;td-527':
        'y1FSLzrHznxiceJ5NvTKwRf8pKzYGiLzMG-cLHmASQk_HLoNZjuLqGDw5--dSjqaQ-gqEQFRdPcE9jFAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJ7V1_suA0mkVSs8ZTJQ99JNHqZn39V0QPthrGQ9NR71_ZG7TV6zhyn-QX-C1aucMt5dRAloZHk-7yXYuDBg3qKeO4nSV3sk',
    '5757;6;td-527':
        'y1FSLzrHznxiceJ5NvTKwRf8pKzYGiLzMG-cLHmASQk_HLoNZjuLqGDw5--dSjqaQ-gqEQFRdPcE9jFAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJ7V1_suA0mkVSs8ZTJQ99JNHqZn39V0QPthrGQ9NR71_ZG7TV6zhyn-QX-C1aucMt5dRAloZHk-7yXYuDBg3qKeO4nSV3sk',
    // Anger Strangifier
    '6522;6;td-518':
        'y1FULzbH32Zka-5kN8TC_wn6s-WIUiyva27Be3XYSVw6ReZaMWCMqmfztuSTFDnIRr0tRggCLqEApzIaa5-Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-5069eG2VEXcMYZUJgswpx5t5_gvAgNO9toSwgeQOh4MWiAU6vklniRX-uzPOZc48QCAVhPSUzpm3IpDRwqueeZNFohYLRXUQ',
    '5758;6;td-518':
        'y1FULzbH32Zka-5kN8TC_wn6s-WIUiyva27Be3XYSVw6ReZaMWCMqmfztuSTFDnIRr0tRggCLqEApzIaa5-Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-5069eG2VEXcMYZUJgswpx5t5_gvAgNO9toSwgeQOh4MWiAU6vklniRX-uzPOZc48QCAVhPSUzpm3IpDRwqueeZNFohYLRXUQ',
    // Apparition's Aspect Strangifier
    '6522;6;td-571':
        'z2ZZOTbH3Gd9YOZ4B8fH0gL-7-HeGXeiOG-Te3PaHwkwSLYPPDne_2f04--VSjDBR-95Fl8GK6VXozdXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud0ILNm8cKC6FEXQcQOV54Bx55UvJu8614WO94_Sg9KFeh_YjuCAf_uwnaZXeTnOeRbs8AFVFpOSknvmSF4Xldptq6EC8Dtxg',
    '5759;6;td-571':
        'z2ZZOTbH3Gd9YOZ4B8fH0gL-7-HeGXeiOG-Te3PaHwkwSLYPPDne_2f04--VSjDBR-95Fl8GK6VXozdXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud0ILNm8cKC6FEXQcQOV54Bx55UvJu8614WO94_Sg9KFeh_YjuCAf_uwnaZXeTnOeRbs8AFVFpOSknvmSF4Xldptq6EC8Dtxg',
    // Cow Mangler 5000 Strangifier
    '6522;6;td-441':
        'y1FSOCXH3nt6aORiP8fD0jr3oPCKGTqhPDGdeHKIHg1uROZWPDqK-TvztujGQjnOEOh6Rg1QeaoH8jdBaZjYIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo7NGV1lgVSv4bW5M72ZZFhJLzqQpGJdhuTg5KE-h_Yz2AVf61wCueV-K6PuIOsMdVBQ8bH0y-z3R9XUt866jHKlMXjPy0Lr4',
    '5783;6;td-441':
        'y1FSOCXH3nt6aORiP8fD0jr3oPCKGTqhPDGdeHKIHg1uROZWPDqK-TvztujGQjnOEOh6Rg1QeaoH8jdBaZjYIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo7NGV1lgVSv4bW5M72ZZFhJLzqQpGJdhuTg5KE-h_Yz2AVf61wCueV-K6PuIOsMdVBQ8bH0y-z3R9XUt866jHKlMXjPy0Lr4',
    // Third Degree Strangifier
    '6522;6;td-593':
        'y1FSOCXHyXxkd-FoPczUxQDEreOfG3G5PWeUenaKRQ49SeVWZ2yI_2Cs5OSdFGzMFekoQ19ReqNS9GZPOpvcPgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNaTxVccSMQjWZgwzo1PuKH-uh9EbsZtSAtMR7t_ZG_VVfjgkX3NWOqzN-AK4pRWUgtMSxq-mCB7CRsrvfqIdE0e53GjJztD',
    '5784;6;td-593':
        'y1FSOCXHyXxkd-FoPczUxQDEreOfG3G5PWeUenaKRQ49SeVWZ2yI_2Cs5OSdFGzMFekoQ19ReqNS9GZPOpvcPgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNaTxVccSMQjWZgwzo1PuKH-uh9EbsZtSAtMR7t_ZG_VVfjgkX3NWOqzN-AK4pRWUgtMSxq-mCB7CRsrvfqIdE0e53GjJztD',
    // Righteous Bison Strangifier
    '6522;6;td-442':
        'y1FSOCXHz31qbfFpN97VwgzoruyyEHXlbzKKfnOLHgw7G7oNZmDf-zei4-nCRD2YEO59Q1sBf6RQoDZLbMCJNkdphZlLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEUGXcASWZgBzJpIvoz7uDJPapo6HhBMQux-YzuAVf-zwn-fDODnOegI7cBTUAwcTx3rmiF4DB0p7qvbPw4Rrj54pS_Iw4mp',
    '5804;6;td-442':
        'y1FSOCXHz31qbfFpN97VwgzoruyyEHXlbzKKfnOLHgw7G7oNZmDf-zei4-nCRD2YEO59Q1sBf6RQoDZLbMCJNkdphZlLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEUGXcASWZgBzJpIvoz7uDJPapo6HhBMQux-YzuAVf-zwn-fDODnOegI7cBTUAwcTx3rmiF4DB0p7qvbPw4Rrj54pS_Iw4mp',
    // ---
    // Bonk Boy
    '6522;6;td-451':
        'ymFYIR313GdmWultKszDjgSv9rCJTyD1O2eXeHWKTwk5GbFXNWna9mast-SdRz_KE-glQwoEevYasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejFabpmOqZiwMKC2VMARsIjUpwszJoI682n61tBOtlrHw9NRrt9MG-IVfHmwHnNWObgaeBc5sIEV19ISBq-ymo7UR4svlK1Ew',
    // Boston Boom-Bringer
    '6522;6;td-707':
        'ymFZJyD3xUthZPdrPYXFwlD4-brVTXKnMG-ceiePSgg8T-EKZmjfrzak5OvGQG3LQbp-SlwAY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKbPEfKZgMZ5g-suCxV8RcM0dTJo7hc8V7s6kuVwSPYxsSgkeQrx4bGiJVfrglnidDLWzauIKscFWBVtPSR6j2yosDrnqyY0',
    // Sole Saviors
    '6522;6;td-30358':
        '22xZMnCojCBSZPdhN9n50w30pPGyEHXlbzKKfCeMTgowTLMNZmjd-TX3sezBFm6dELx4RAgAeqQD8G1BPMrdbhJo0plLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEUGXcASWZgBzJpIvoz7uDJPapo6HhBMQux-YzuAVf-zwn-fDODnOegI7cBTUAwcTx3rmiF4DB0p7qvbPw4Rrj54pS4sWWFK',
    // Ticket Boy
    '6522;6;td-30376':
        '22xZMnCojCBScexvM87S_wf0uN2BHWbwbXmWeyOASw0wGOJdMGvb-2Wh5enAE2vBF-klQVxXdPZR9GxMPZyBOhppysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIxEIATs8bW6I5zpFDqZfxhAFCeY84VQ5PROl4N2iAUq3mwnnKXba0NuAB5MJXAl8fGBm8znd4W0kvuvuMaVxe8CBxp1vheNc',
    // Fancy Dress Uniform
    '6522;6;td-446':
        'zmpDFS75z3NoK7VvbciekAf5-bXeSnenbGOcLCLcGgtpRLVYMW3erzCi4LnGFz_JRe4yA1dTa_tZpWUmdcmEPww_3IIdomi_xntlT0t4PJMVJUmyx3NCDqR1lXFccZhSj32tcZW2zF5vaFhtUrjxB_yCNtWolCskS0M6SK1DN9TL-zqvvNWgNKDTQq9iOqR19sa421cASMRSDs5rm8lE6s-kv1wSPIpuHghFQOF_Zm7UUvy1lX_NXeDmP-db55RTBkdaFBhIUBdMEQ',
    // Lord Cockswain's Novelty Mutton Chops and Pipe
    '6522;6;td-440':
        'zHxRFSr51GZSZ-BtKs_5yQb0r92BHWbwbXmWdnSKHwsxGbsPZzrY_2LztL_GRTiYSOEoRQkBdKFR8GEaP8HaOxQ_ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIxEIATs8bW6I5zpFDqZfxhAFCeY84VQ5PROl4N2iAUq3mwnnKXba0NuAB5MJXAl8fGBm8znd4W0kvuvuMaVxe8CBxoK33u5w',
    // All-Father
    '6522;6;td-647':
        '0GNFFSD93GZpWultKszDjgGj97fUTHWnOGOXeCXdHl1sGLdePTrb-mWts7ycRDvAQbopRV8AL6sasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejFabpmOqZiwMKC2VMARsIjUpwszJoI682n61tBOtlrHw9NRrt9MG-IVfHmwHnNWObgaeBc5sIEV19ISBq-ymo7UR4SkHgL8Q',
    // Killer's Kit
    '6522;6;td-30339':
        '22xZMnCojCBSbuxgNM7U0zrwqPayEHXlbzKKe3DfTAYwT7RWMDvd-mGl5--dQD2dEL14QggFf_cCoDYcb8CBPUZu3ZlLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEUGXcASWZgBzJpIvoz7uDJPapo6HhBMQux-YzuAVf-zwn-fDODnOegI7cBTUAwcTx3rmiF4DB0p7qvbPw4Rrj54pR8THNYv',
    // Ground Control
    '6522;6;td-30338':
        '22xZMnCojCBSdupgPMLD0jr2oOiCDkv7aSXDKm-JH1xuHOFcYTnZr2ek4ruTEDCcRu55FwxVfPYN8jdNPsqPORs91YML5XW2kAJ0ExF5Td0WLV_1mCxGd7Qoz3AtPZpfmTr2JZHP3AI1aSkjWrXnSLjBb5f8zXglMlNmEqAEY4OVrnSsuM6lZ_OCLe5uOaY69saI2UVdXNUOX5M5zqBBvpD3qQRAVIQ8CVkZX-l9YGmHBvjmxSqZX-TgPLQP7MBYVlodH0m4ySJ6WkoqvPnfOA8Vsy84svzFQO9HCAo',
    // Stockbroker's Scarf
    '6522;6;td-336':
        '2HdEJR3sz319cux-PfTSyQDEreOfG3G5am-VKiTdSl8_TOIPM2mMrWajtO6RFzzPF7kvFglVLPYC8DBOPc7dPwx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNaTxVccSMQjWZgwzo1PuKH-uh9EbsZtSAtMR7t_ZG_VVfjgkX3NWOqzN-AK4pRWUgtMSxq-mCB7CRsrvfqIdE0e5xtR8z-a',
    // Sight for Sore Eyes
    '6522;6;td-387':
        '22FELx39xHF-WultKszDjlOrp7rZGCyvazXAKiKKTAZqSLsNYWuL-mf24LiXF27ORbwlR1pRe6UasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejFabpmOqZiwMKC2VMARsIjUpwszJoI682n61tBOtlrHw9NRrt9MG-IVfHmwHnNWObgaeBc5sIEV19ISBq-ymo7UR5Est7Iig',
    // Cute Suit
    '6522;6;td-30367':
        '22xZMnCojCBSf-x8KM7U_xbuqPayEHXlbzKKKySBRQZpSLcLMWHc_TehtuWcFzqaRLx9RwBVe6MG-m1KaJiIbkE0h5lLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEUGXcASWZgBzJpIvoz7uDJPapo6HhBMQux-YzuAVf-zwn-fDODnOegI7cBTUAwcTx3rmiF4DB0p7qvbPw4Rrj54pfbOlLVG',
    // Sole Mate
    '6522;6;td-30355':
        '22xZMnCojCBSdupgPfTLwRH-nu6MDnPyJjWdeXiOS1swSLFWPGDQqGKntOyQSmyYEOt5QAkCeacB8GZNbM6PO0EjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqUw0QTQcYZYZo7xZpUsp3NtwxRbI1zSw1JQe8sZGiHAPjmxCybC-W7PukI5sYFUVxIHE7omHcvD0976qzaOxMA7ilw2qtZLQ',
    // Horseless Headless Horsemann's Headtaker
    '6522;6;td-266':
        'y1FeLyP8yXVmYPdTNMrUxwC1-LvaHiGvam7Ge3XfRQkwTrINZGGNqjL05rjFRWzIErx6EQoHK6ME83oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrtzJqBp-MC40FMcStMVXaIyyo1BvtCi6FgTPYpsSggYQOh5N2rUUvDmy3-bWba0OrNf5JRTVA0aTB2_zncqEQl3v3kBkZBA',
    // Bird-Man of Aberdeen
    '6522;6;td-776':
        'zGtbJR3o3GZ_avFTNMrUxwC18rXVGCWuaTKcLnSPSQgxHrpcNmuKqDHwsOrBFDHBQ-ouFVgGKKQF93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrtzJqBp-MC40FMcStMVXaIyyo1BvtCi6FgTPYpsSggYQOh5N2rUUvDmy3-bWba0OrNf5JRTVA0aTB2_zncqEQl3v3HOBRPu',
    // Dark Age Defender
    '6522;6;td-30073':
        'xW9fJh360nlvYPdTNMrUxwC19LaOSCGmOjSSfSKKGQ1qGbZXZGuK-TWiseyUETufSO0vQQEFe_QH8noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrtzJqBp-MC40FMcStMVXaIyyo1BvtCi6FgTPYpsSggYQOh5N2rUUvDmy3-bWba0OrNf5JRTVA0aTB2_zncqEQl3v_qHNRj4',
    // Bushi-Dou
    '6522;6;td-30348':
        '22xZMnCojCBSYeBhN_TVwQjus-OEI3XlZTjRPR7VHUxvGK0NZG3Q_jas4rnFEGyaEu59FwpWf6VV-2RKPsDaO0E40IIC_mfqlBEsUAYmdYNPfQjq9WxDbO1rmnlHY8IPziWfbpXUhUFka0N8A-WwV9OLb4yljisnXQw-QvcbC8KUtSXy_5_xfKbGbaFjafUzr4OO2lFPRsITUI5x2ItUupD1vjJEboY4CVcfLrUvJz7USvnkxn6eDOKzObUI5MYCVAwcQ061mnd8Wk8suq_YPw5D5H4goKDHrJyujou4OnEXFCo',
    // Juggernaut Jacket
    '6522;6;td-30363':
        '22xZMnCojCBSb_BrP87UzgTutd2HHXf8bSP7IyDLG1smG7tfYWnb-Tujt-jCE22cRb4pQAxRdfFSpjdIacHYbkc_hYFY8jXslQptEBFue8hBITCjmilDf-99nWcbKMxT9mzxK5THg1xnfh83DbmIH7zPb5-hky8yBEcwHs9TZYaVpiLk-IGgKrffefUzYPEh9siAil8RQM8PEY4q2Z5IvJvNvAhNbpo0GGEQEKspMHeBV_znxSyZX-XmPuAOt8IFUVAbQk6-nCF9Cht_6azaaVlAtiwkp6HDsY3umYWIGPD9',
    // Sangu Sleeves
    '6522;6;td-30366':
        '22xZMnCojCBSYeBhN_TVwQjus-OEI2f7bTLSKjLmEF96GuZANzra_Gaj7e6cSjHIF-x_Sg8MLqdRpjAaPMGBakM_h4QKqWe7xxAtTFg4fMIAeQK8m0sLYeB1hnNKcI0LxHPxSdzYiF98bkVvTOG6Ab2tJoGokDEgXhpxRv1NZeTcuSjs5pD5auHXbbhuMPwzq5XB3lsVEsgfUZMthIxSqZ_8vAh8bI0zHkwVEoYiNCvWAefnwHuYWLGzPudd5MBXBVpPTEa8k3V4CBwv7auPa1hDsyom9PCQ-s7h0JWxGGUifx33',
    // Stylish DeGroot
    '6522;6;td-30340':
        '22xZMnCojCBSdvF1NMLVyDr_pOWfE3vjVzvFPSbcUlptRbYINGHZ-2bw4-6XEGvBE-8pFQ4Mf_BXoWYdO8uNPxY4hdZZqTb2h0p6WB8ldZR5aF_mmjpBaehjwSwVdPQamCnwOJLagEk7NRFrNfHnW7zca4KlhnZ5ChsIVqEXZJWSsCX6qdexM6OLKfw3cqhq-JiO1FkcXI4PSo8_xZhDhJn3tQhRYosCF18OFrxgZWqEVP-1wn-eCuKzOLMKsMdZVlEbSUjonXEpWUh86_qNagsSsislo7zS8ZqQWzLM0A',
    // Toowoomba Tunic
    '6522;6;td-30373':
        '22xZMnCojCBScepjL8TJzQf6nvaYEn30VzvFPSbcUghrT-VfPWGP_jKjsOidSjmfQe0tFwkEfaUMoTFLbsuINhs70IMM_TL2h0p6WB8ldZR5aF_mmjpBaehjwSwVdPQamCnwOJLagEk7NRFrNfHnW7zca4KlhnZ5ChsIVqEXZJWSsCX6qdexM6OLKfw3cqhq-JiO1FkcXI4PSo8_xZhDhJn3tQhRYosCF18OFrxgZWqEVP-1wn-eCuKzOLMKsMdZVlEbSUjonXEpWUh86_qNagsSsislo7zS8Zr3_CJiKg',
    // Sandvich Safe
    '6522;6;td-643':
        '0GNFFSr93GJ0WvZtNs_QyQbzsuOLGUv7aSXDKm-OGgYwSOEMYT7a-jP0triSRjycRO0kQwEFdKEG9jZJbsmPNxY8gIYI5XW2kAJ0ExF5Td0WLV_1mCxGd7Qoz3AtPZpfmTr2JZHP3AI1aSkjWrXnSLjBb5f8zXglMlNmEqAEY4OVrnSsuM6lZ_OCLe5uOaY69saI2UVdXNUOX5M5zqBBvpD3qQRAVIQ8CVkZX-l9YGmHBvjmxSqZX-TgPLQP7MBYVlodH0m4ySJ6WkoqvPnfOA8Vsy84svzFQaSB4gs',
    // Toss-Proof Towel
    '6522;6;td-757':
        'wGtXPDvH33t1bOtrLMTRxQnEreOfG3G5OG_BKnXaRQcwS-YNNmDa-2L37O2WQjmfErspFglRdfZSp2JOOpuKPgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNaTxVccSMQjWZgwzo1PuKH-uh9EbsZtSAtMR7t_ZG_VVfjgkX3NWOqzN-AK4pRWUgtMSxq-mCB7CRsrvfqIdE0e5zuA4tei',
    // Bullet Buzz
    '6522;6;td-30344':
        '22xZMnCojCBSbeBtLtL5whDhu-GYCEv7aSXDKm_bHQhsT-BbYWqLr2Ks4OWdS2yYRuEpF1wMeaUDoDFOa8zYbUFp0dYI5XW2kAJ0ExF5Td0WLV_1mCxGd7Qoz3AtPZpfmTr2JZHP3AI1aSkjWrXnSLjBb5f8zXglMlNmEqAEY4OVrnSsuM6lZ_OCLe5uOaY69saI2UVdXNUOX5M5zqBBvpD3qQRAVIQ8CVkZX-l9YGmHBvjmxSqZX-TgPLQP7MBYVlodH0m4ySJ6WkoqvPnfOA8Vsy84svzFpGvf-1A',
    // Combat Slacks
    '6522;6;td-30372':
        '22xZMnCojCBScuR-B9vHzhHonu6MDnPyJjGSfnbdHQlsTbUMZGHf9zGh5O_ARmzAF-5-RVsAe6oB-m1AaciOO0cjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqUw0QTQcYZYZo7xZpUsp3NtwxRbI1zSw1JQe8sZGiHAPjmxCybC-W7PukI5sYFUVxIHE7omHcvD0976qzaOxMA7ikRknV1HQ',
    // Eliminator's Safeguard
    '6522;6;td-30369':
        '22xZMnCojCBScuR-B8PDzAj-td2BHWbwbXmVLXOMRQoxRbNdN23dqzOt4u2QS27IRut_ElwFL6oAo2YcPsGKNhQ7ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIxEIATs8bW6I5zpFDqZfxhAFCeY84VQ5PROl4N2iAUq3mwnnKXba0NuAB5MJXAl8fGBm8znd4W0kvuvuMaVxe8CBxcfr_jqQ',
    // Gone Commando
    '6522;6;td-30343':
        '22xZMnCojCBSbeBtLtL5wwT2rvKMEmDkVzvFPSbcUgtsSLUKZzmK9jb2sLjFQj-cFe19QwoGdKBW9WwcPJ-AaUE90NJaqjD2h0p6WB8ldZR5aF_mmjpBaehjwSwVdPQamCnwOJLagEk7NRFrNfHnW7zca4KlhnZ5ChsIVqEXZJWSsCX6qdexM6OLKfw3cqhq-JiO1FkcXI4PSo8_xZhDhJn3tQhRYosCF18OFrxgZWqEVP-1wn-eCuKzOLMKsMdZVlEbSUjonXEpWUh86_qNagsSsislo7zS8ZqNKY7i3A',
    // Heavy Lifter
    '6522;6;td-30342':
        '22xZMnCojCBSbeBtLtL5xxD1suqCC0v7aSXDKm-BH1xqHucLPGGL_DKjsLnBRDnPELwuFQEBKaAB9GUYOcqPbho0gtMP5XW2kAJ0ExF5Td0WLV_1mCxGd7Qoz3AtPZpfmTr2JZHP3AI1aSkjWrXnSLjBb5f8zXglMlNmEqAEY4OVrnSsuM6lZ_OCLe5uOaY69saI2UVdXNUOX5M5zqBBvpD3qQRAVIQ8CVkZX-l9YGmHBvjmxSqZX-TgPLQP7MBYVlodH0m4ySJ6WkoqvPnfOA8Vsy84svzFM1L5zgk',
    // Leftover Trap
    '6522;6;td-30345':
        '22xZMnCojCBSaeBqLMTQxRfEtfCMDEv7aSXDKm-KSwg4G7dfMW3drGf057_BQm2aQr0lRVwCLKMMpzAbPs-LaUc-hYVY5XW2kAJ0ExF5Td0WLV_1mCxGd7Qoz3AtPZpfmTr2JZHP3AI1aSkjWrXnSLjBb5f8zXglMlNmEqAEY4OVrnSsuM6lZ_OCLe5uOaY69saI2UVdXNUOX5M5zqBBvpD3qQRAVIQ8CVkZX-l9YGmHBvjmxSqZX-TgPLQP7MBYVlodH0m4ySJ6WkoqvPnfOA8Vsy84svzFTkJSPwI',
    // Rat Stompers
    '6522;6;td-30354':
        '22xZMnCojCBSd-R4B9jSzwjrpPCeI3j2ejDBYXHbTV9uG7pePGnQ_mes5ejHEGnKQL0vQwsEdKQBp2VMbMyPPxY5htUVu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkBW9MdUJo79JhDtZvgsg58Z4kvHFtSQep7ZW_TVfjhl3-ZWbGxaucA5MlRVF5PTErvzXUuDEp96P-LaFhD4WBmrPV9mZZfCg',
    // Sammy Cap
    '6522;6;td-30374':
        '22xZMnCojCBSduRhNdL5wwTrnu6MDnPyJmfAKyXaHgZsSroPZzzb_zuk4LmVQ2ycSewtS1oFLqVVpGUYO86LPREjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqUw0QTQcYZYZo7xZpUsp3NtwxRbI1zSw1JQe8sZGiHAPjmxCybC-W7PukI5sYFUVxIHE7omHcvD0976qzaOxMA7imCnlZQYg',
    // Trash Man
    '6522;6;td-30346':
        '22xZMnCojCBScfdtK8P5zQT1nu6MDnPyJjKdLHHaTwxtS-UIMmqP9zCt57vARTrMQL56Rw8HffEF9WYYPpuMbUEjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqUw0QTQcYZYZo7xZpUsp3NtwxRbI1zSw1JQe8sZGiHAPjmxCybC-W7PukI5sYFUVxIHE7omHcvD0976qzaOxMA7imUppVoqw',
    // War Goggles
    '6522;6;td-30368':
        '22xZMnCojCBScuR-B8zJxwL3pPGyEHXlbzKKdnfYTw05S7VcN2uPqjLz4-nAEG2fF70uQwlQK6YE-zFBO8_abRc-0plLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEUGXcASWZgBzJpIvoz7uDJPapo6HhBMQux-YzuAVf-zwn-fDODnOegI7cBTUAwcTx3rmiF4DB0p7qvbPw4Rrj54peiDCfSB',
    // Warmth Preserver
    '6522;6;td-30364':
        '22xZMnCojCBScuR-Nd_O_xXppPGIDmLyegjILjPeGRBqTuENZz6Pr2Dws-nHR2zJSbt_FgxXLKEC8zJBPc_aOUA13NUO-2G82VRzGVAhf8IXTxfrlyRdY-VwjigfIpo90SX9Jorfhlp0MRs9W9euVrHCcYWmkDl9AE1mcOkbaYuLvy3s7saxKq7SIPwzZOdu8sLa3lUdQdJTTYksypFBvqH1vgNGeYE-JFIdA74re2mCUfnhkX-ZWLezPuZb5pRWXlgSS0y6znJ-XR8ovfraPg1G4nxz8fOM75Pn-hcSMHs',
    // Teddy Roosebelt
    '6522;6;td-386':
        '3GtSLjvHz3tiduBuPcfS_wn6s-WIUnf2bWfGfiPcGg1sHLRWYGyNqDX25eqdRD2aROgvQAxSKKEM8mMfbM-Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-5069eG2VEXcMYZUJgswpx5t5_gvAgNO9toSwgeQOh4MWiAU6vklniRX-uzPOZc48QCAVhPSUzpm3IpDRwqueeZNFo8tsdOIA',
    // Antarctic Researcher
    '6522;6;td-30377':
        '22xZMnCojCBSZOt4OdnF1Az4nvCID3H2ejTMKjPmEF96GuZANG3Zr2Hw5OrFRG6cSb4kFQANL_BX8GFOa8GMNhE809RerT3okxMsTVg4fMIAeQK8m0sLYeB1hnNKcI0LxHPxSdzYiF98bkVvTOG6Ab2tJoGokDEgXhpxRv1NZeTcuSjs5pD5auHXbbhuMPwzq5XB3lsVEsgfUZMthIxSqZ_8vAh8bI0zHkwVEoYiNCvWAefnwHuYWLGzPudd5MBXBVpPTEa8k3V4CBwv7auPa1hDsyom9PCQ-s7h0JWxGHnuBQJO',
    // Ein
    '6522;6;td-30341':
        '22xZMnCojCBSYOxiK9_DyQvEreOfG3G5P2WRdiWLSFxqRLpWNW2LrzKjsL6dQW2dFe15QVwBdKQN8TFMPc3dPAx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNaTxVccSMQjWZgwzo1PuKH-uh9EbsZtSAtMR7t_ZG_VVfjgkX3NWOqzN-AK4pRWUgtMSxq-mCB7CRsrvfqIdE0e5y6a1-8v',
    // Scotch Saver
    '6522;6;td-30347':
        '22xZMnCojCBSduZjLMjO_xb6t-efI3j2ejDBYXfcGFhsT7QNZGHd_zKn5b6XS2zKQuApQF0HKKoDp2FLPMHfORM7048Vu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkBW9MdUJo79JhDtZvgsg58Z4kvHFtSQep7ZW_TVfjhl3-ZWbGxaucA5MlRVF5PTErvzXUuDEp96P-LaFhD4WBmrPVTOVgKkw',
    // Trencher's Topper
    '6522;6;td-30336':
        '22xZMnCojCBScfdpNsjOxRfonvaCDGTyegjILjPeGRA_H7dXPGDa_zuksLiWSj3BEOl-FVxQffBSp2BONczYOkM03YIC-GPu2VRzGVAhf8IXTxfrlyRdY-VwjigfIpo90SX9Jorfhlp0MRs9W9euVrHCcYWmkDl9AE1mcOkbaYuLvy3s7saxKq7SIPwzZOdu8sLa3lUdQdJTTYksypFBvqH1vgNGeYE-JFIdA74re2mCUfnhkX-ZWLezPuZb5pRWXlgSS0y6znJ-XR8ovfraPg1G4nxz8fOM75PnSjWl0v8',
    // Trencher's Tunic
    '6522;6;td-30337':
        '22xZMnCojCBScfdpNsjOxRfonvaYEn30VzvFPSbcUg4xGbNaNW3b_mWt7buWEW3NF-AvEV8Nf6EEo21BbMiNPxM1145e8jP2h0p6WB8ldZR5aF_mmjpBaehjwSwVdPQamCnwOJLagEk7NRFrNfHnW7zca4KlhnZ5ChsIVqEXZJWSsCX6qdexM6OLKfw3cqhq-JiO1FkcXI4PSo8_xZhDhJn3tQhRYosCF18OFrxgZWqEVP-1wn-eCuKzOLMKsMdZVlEbSUjonXEpWUh86_qNagsSsislo7zS8ZqeI29CvQ',
    // Archimedes
    '6522;6;td-828':
        'yXxVIiv12HBodtpgOdnBxUuup7GOGHb0MGeXfXGKTAY-S-EIZmGP_DCm5-rHRjjLRO0sQggCfPZQ7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbrx1Na9g-vqA0lgXXcgfYZE_2ZhD9c6h7l0VadlsTVpNQO4sZjyHXfjvwn2fC-W3bbcIsMJTA1kcGE3omCVlTxd-z0EZecM',
    '6522;6;td-2061':
        'yXxVIiv12HBodtpgOdnBxUuup7GOGHb0MGeXfXGKTAY-S-EIZmGP_DCm5-rHRjjLRO0sQggCfPZQ7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbrx1Na9g-vqA0lgXXcgfYZE_2ZhD9c6h7l0VadlsTVpNQO4sZjyHXfjvwn2fC-W3bbcIsMJTA1kcGE3omCVlTxd-z0EZecM',
    // Foppish Physician
    '6522;6;td-878':
        '3HlpKS35yUtgYOFlO_TIxQbwteuII3j2ejDBYSWMTA8wTOdWMD7YrDuk4-uQSzvPSbl4QwwBefMM9zVNaMyLbhc7hoMVu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkBW9MdUJo79JhDtZvgsg58Z4kvHFtSQep7ZW_TVfjhl3-ZWbGxaucA5MlRVF5PTErvzXUuDEp96P-LaFhD4WBmrPVOiaSNMA',
    // Colonel's Coat
    '6522;6;td-30361':
        '22xZMnCojCBSaOBoMcj5wwr3ruyIEEv0ZzbQEC3YDlltU-dXYWyP92L35L-SSz3IRrwkS19WKaINpjJBOZ-LbBtv0tUI-DK8k0AzDhgvNMxLd16E0iROYfN3kHRULMYFmEu4J5nZm1lhbVAzB-_mOfXCYoG7lCwkS0M6SKF1LYqYuDvr8JfnO7fGdKw6YPU3ucyK0AsbTM4STdIt341HtZn3hApGZY0vEl0jHbg8MjyfVPriw3jKX-K0a-AI4pNTAl8TS0e8mHMuCUx7vviMaQ4UsHh08PeR_tPwkIIfBRYatQ',
    // Dough Puncher
    '6522;6;td-30350':
        '22xZMnCojCBSZu1pPtj5wwr6td2BHWbwbXmTKnGLRQswH-IPYGHZ-GHz7LvHQD6aFbotEQ8Ne_QC8GYYb53YPUQ_ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIxEIATs8bW6I5zpFDqZfxhAFCeY84VQ5PROl4N2iAUq3mwnnKXba0NuAB5MJXAl8fGBm8znd4W0kvuvuMaVxe8CBx6Q1GjYY',
    // Fashionable Megalomaniac
    '6522;6;td-30349':
        '22xZMnCojCBSY-R_MMLJzgT5reeyEXHwaTvLIiDXFV9rIu8Pdz-M4DOg7LycSj6YQux6RQ0GeqYG9WUYb52MPBI-1IEPqjHskkItTE94J5IIYAG8jH0eNuwa0HFPdYVQkSHmf8mOhDAqaUtqRL7kU6qbMtak_2YkUBp5G6MactLI7ySDsZb8aumBJfghNbF39sHagwJCCcgRWcA3yJBIqNHhrx9CZY84JFkZH7w8PDruCKillCuGXuC3P-db5MBWA1gbTR2-znJyDkEo6_6MbAgS5n9z8aHGr8vizIDsHl5nzroaFHMaWQ',
    // Gaiter Guards
    '6522;6;td-30379':
        '22xZMnCojCBSaOBoMcj51wz1teefG3XlagjDLijNGUxXEeIcYj3HrDCtsOuXEDDBE7l-RQ0CeKZXpGcbO86Ba0RpgNYMqTK-wEEoSEQrcItWfgj9w3kUYII9mHxCa5lanDKpe8PY6hdjZUZ0XLviQOWfOIDK2S8pXQRjHKAMPdbCuUql-ZrxdPCOLe5mJLFu-5jTgwZURswbA5Q9xJFV9I3mqQxNbI0CHFsSFKsnNgbdBbuwlmCYXeayObMI5McEVlgdGEzonX16B0gq76zfb18WsSsl8faSqZ-ym9a-UQB5x8GZeNbs',
    // Heat of Winter
    '6522;6;td-30356':
        '22xOJXCojCBSaOBoMcj51wz1teefG3XlagjHICDNI1JpD-QLKz2NqDPz4-qRRjjNSep-RglWf6UAoTBJP5uPbUFvgoADqWfhlEErGBVmYstBNga2zSUsKe14mG9AfZ5EwHmnJ_uRhFJidkBpX66-C-vDAMilnS86WRlnCflHM4r68STh-In2YveQfLh3PaU6q5HXkV8fSJwVXZIw2NBVr4zztQpGVI84FVsOGLoROTjDA6z5w32dXuXgPuAPscBRUAsZH0m0mnx6DE587vyLPAwVs31y8qTArZizn8uvERfJadovYA',
    // Heer's Helmet
    '6522;6;td-30378':
        '22xZMnCojCBSaOBoMcj51wz1teefG3XlagjMKi3UGUpXEeIcYj3H_DGl4-_GQDyYQOl_QAwEeaUG9zYcOsHYOEQ9goEJ-DfokhwtH057JYtWfgj9w3kUYII9mHxCa5lanDKpe8PY6hdjZUZ0XLviQOWfOIDK2S8pXQRjHKAMPdbCuUql-ZrxdPCOLe5mJLFu-5jTgwZURswbA5Q9xJFV9I3mqQxNbI0CHFsSFKsnNgbdBbuwlmCYXeayObMI5McEVlgdGEzonX16B0gq76zfb18WsSsl8faSqZ-ym9a-UQB5x4v0gCtw',
    // Smock Surgeon
    '6522;6;td-30365':
        '22xZMnCojCBSaOBoMcj5wRXpruyyEHXlbzKKK3mLSAc-TOdeZDze-mH35eTFE23LQ7t-FwgFeqQD8mcaNZ2Pa0Q11plLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEUGXcASWZgBzJpIvoz7uDJPapo6HhBMQux-YzuAVf-zwn-fDODnOegI7cBTUAwcTx3rmiF4DB0p7qvbPw4Rrj54pSLLSrNE',
    // Teutonic Toque
    '6522;6;td-30351':
        '22xZMnCojCBSceB5LMTIyQbEte2cCXHIZDbWKCSXHg4-TrFdMTyLrzCl5eiWQW7OQuwsRQEAKaFR8GJNOMvYPBtohdMJriuomUM7FxsvI_peIFLrhCZLZPssxSZDGtNTlCTuIJfckwY_P0cFE7jqVqLGbIGzyXJzXHUuHq0aeoyduDO9uNeoPvqCKfghPaxgosyE2FgBANIITJwwzJp5vJv8vh9KaLcxGkwbFPd-ZmyBUqvmwnjMX-K1beJc48hRX1gZTRq7niYtDhwq663ZbF9C5X137OLM-JbSmsh5',
    // Villain's Veil
    '6522;6;td-393':
        'w2tEKSrH0XV_YuAiPZ3CkFSpoLPeSXGuOzGRKSKITAg8SrcPZm7d_GHx4rvFQWzOQu0tRBdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59S1KKbYeq1YM6Rp-teO1GkeTtMbW9NumMoW7Zyj6ltHOtlqGQ0ZR-B_bWiCU6zhxizOX7axPLUJ45NSAlpLVA_jzE3xbz6R',
    // Outback Intellectual
    '6522;6;td-645':
        '0GNFFTH21GRod9p_L87H1ADpnvSID2DIZDbWKCSXS1ttGLILZ2GM-2amt-ucSzudROAvRAhXfKsGpzBKOcuAOEE5gdYI-iuomUM7FxsvI_peIFLrhCZLZPssxSZDGtNTlCTuIJfckwY_P0cFE7jqVqLGbIGzyXJzXHUuHq0aeoyduDO9uNeoPvqCKfghPaxgosyE2FgBANIITJwwzJp5vJv8vh9KaLcxGkwbFPd-ZmyBUqvmwnjMX-K1beJc48hRX1gZTRq7niYtDhwq663ZbF9C5X137OLM-BQ4s6CY',
    // Archer's Groundings
    '6522;6;td-30371':
        '22xZMnCojCBSZPdvMM7U0zr8s-2YEnD-ZjDXEC3YDlltU7AMZ2CL_zHx5O3FS2uYSLl4SgpWKfACp2xKbsyMbEc-19NY-T3hzhYzDhgvNMxLd16E0iROYfN3kHRULMYFmEu4J5nZm1lhbVAzB-_mOfXCYoG7lCwkS0M6SKF1LYqYuDvr8JfnO7fGdKw6YPU3ucyK0AsbTM4STdIt341HtZn3hApGZY0vEl0jHbg8MjyfVPriw3jKX-K0a-AI4pNTAl8TS0e8mHMuCUx7vviMaQ4UsHh08PeR_tPwkILXjqlZuw',
    // Huntsman's Essentials
    '6522;6;td-30359':
        '22xZMnCojCBSdutlKM7U_xTuqPSIDkv7aSXDKm_dTwkwRLNWMzyL-GKt5ryQQ2nKFeooRVsFLKpWpmFAa5-OaRA40I9Z5XW2kAJ0ExF5Td0WLV_1mCxGd7Qoz3AtPZpfmTr2JZHP3AI1aSkjWrXnSLjBb5f8zXglMlNmEqAEY4OVrnSsuM6lZ_OCLe5uOaY69saI2UVdXNUOX5M5zqBBvpD3qQRAVIQ8CVkZX-l9YGmHBvjmxSqZX-TgPLQP7MBYVlodH0m4ySJ6WkoqvPnfOA8Vsy84svzFXQ_7dQk',
    // Deep Cover Operator
    '6522;6;td-30375':
        '22xZMnCojCBSZuRhN_TOxQT_o-ODGEv7aSXDKm_fGgYwTboKPGmLr2Wh5r7CFjHNQux6F1oBeqsN8mEYOMDabRJrhY8C5XW2kAJ0ExF5Td0WLV_1mCxGd7Qoz3AtPZpfmTr2JZHP3AI1aSkjWrXnSLjBb5f8zXglMlNmEqAEY4OVrnSsuM6lZ_OCLe5uOaY69saI2UVdXNUOX5M5zqBBvpD3qQRAVIQ8CVkZX-l9YGmHBvjmxSqZX-TgPLQP7MBYVlodH0m4ySJ6WkoqvPnfOA8Vsy84svzFmcnYGh0',
    // Camera Beard
    '6522;6;td-103':
        '235PFSH50HF_ZNpuPcrUxDr3oPCKGTrxPTKUd3KMHgkwGeJXPDvfqjr25u2SR2nPQLsqRQ1QKPEB9TAbbs2IIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo7NGV1lgVSv4bW5M72ZZFhJLzqQpGJdhuTg5KE-h_Yz2AVf61wCueV-K6PuIOsMdVBQ8bH0y-z3R9XUt866jHKlMX9G4NsWo',
    // Blood Banker
    '6522;6;td-30132':
        'wntae3HH33hiauFTOsrIywDpnu6MDnPyJmHCf3jYTQ47ROVYPG7dqDag5u2TRGzAF7t4Q10EdKpS-2JLa8_daUcjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqUw0QTQcYZYZo7xZpUsp3NtwxRbI1zSw1JQe8sZGiHAPjmxCybC-W7PukI5sYFUVxIHE7omHcvD0976qzaOxMA7inPI11IOA',
    // Backstabber's Boomslang
    '6522;6;td-30353':
        '22xZMnCojCBSdvV1B9jIwQ7-nu6MDnPyJmaceiKNGglqH7ZWYG6Kr2at4OmQSj2dSL4uRVwDdKpV8zZBbM-IakAjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqUw0QTQcYZYZo7xZpUsp3NtwxRbI1zSw1JQe8sZGiHAPjmxCybC-W7PukI5sYFUVxIHE7omHcvD0976qzaOxMA7ikac6QkFA',
    // Napoleon Complex
    '6522;6;td-30360':
        '22xZMnCojCBSa-R8N8fDwQvEou2ADHjycAjILjPeGRBrTuALPDrQqDLxsOSUQmzJRb4oQw8FeKUB8DdKbpvcbhY4048C-WPr2VRzGVAhf8IXTxfrlyRdY-VwjigfIpo90SX9Jorfhlp0MRs9W9euVrHCcYWmkDl9AE1mcOkbaYuLvy3s7saxKq7SIPwzZOdu8sLa3lUdQdJTTYksypFBvqH1vgNGeYE-JFIdA74re2mCUfnhkX-ZWLezPuZb5pRWXlgSS0y6znJ-XR8ovfraPg1G4nxz8fOM75PnX6vKDKw',
    // Necro Smasher
    '6522;6;td-1123':
        'y1FVKzD21GJsadphOcfKxRHEreOfG3G5OGWWf3HbHwdtG7dfZGzf_zSssO6RRjDPRO4rSgwHK6UBo2cYOZ3baQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNaTxVccSMQjWZgwzo1PuKH-uh9EbsZtSAtMR7t_ZG_VVfjgkX3NWOqzN-AK4pRWUgtMSxq-mCB7CRsrvfqIdE0e52WIPwBz',
    // Ghastly Gibus
    '6522;6;td-584':
        'yWJaFSb30H1jZPFlN8X5zATppufDHXGjbG6TdneKTAxqTOJcZjuN-zLzs7ySQjuaQesrFQ0NLqRVoTcba9fJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7Jz7cSJ0FMtSMQSW483yKBKuoz1vkMTON1tTVxNQO8qZGiGBvqyxXeZVuKxOLQP4JMGVgwZSRu9nSZ5Wkp49rmHPXEvtbEE',
    // Mildly Disturbing Halloween Mask
    '6522;6;td-115':
        'yWJaFSr50XhicuBpNvTKwRf8pKzdHSGhP2HBeCWBTwtqTroPNGGI-mamsO2SQjCdSLouRA4De6ANpjJII4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJ7V1_suA0mkVSs8ZTJQ99JNHqZn39V0QPthrGQ9NR71_ZG7TV6zhyn-QX-C1aucMt5dRAloZHk-7yXYuDBg3qKeOBfVZUNk',
    // Ghastlier Gibus
    '6522;6;td-279':
        'yWJaFSb30H1jZPFlN8X5klWr-N2BHWbwbXnGeSSNGg4-TLZfMDre_DWitrydSmvBR-56QF0NKaYC8jJMbp3dOEY_ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIxEIATs8bW6I5zpFDqZfxhAFCeY84VQ5PROl4N2iAUq3mwnnKXba0NuAB5MJXAl8fGBm8znd4W0kvuvuMaVxe8CBx2hhiK40',
    // Horseless Headless Horsemann's Head
    '6522;6;td-278':
        '2HtbISv24nxscdpgOdnBxUv-9rGITSDxPGeVd3GIGg4-H-cIZGmI_DX0sLiQED6bSOspRFtSfvcH7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbrx1Na9g-vqA0lgXXcgfYZE_2ZhD9c6h7l0VadlsTVpNQO4sZjyHXfjvwn2fC-W3bbcIsMJTA1kcGE3omCVlTxd-qcMet7U',
    // Spine-Chilling Skull
    '6522;6;td-287':
        '22VDJi7H0XV_YuAiYJmQlFz5o-TVTSzybWaTe3DbSQZqTLALYT7d-2ag7LvFSmzIFOx_EhdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59S1KKbYeq1YM6Rp-teO1GkeTtMbW9NumMoW7Zyj6ltHOtlqGQ0ZR-B_bWiCU6zhxizOX7axPLUJ45NSAlpLVA_jzMzdnSGY',
    // Voodoo Juju
    '6522;6;td-289':
        '3mFZLi3312FncNpkOd_5zATppufDHnGjOGGUdiSJGVo8TbJZZmqK9zOk5r-VSzvOR7t6RAxVK_cM-mdIbNfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7Jz7cSJ0FMtSMQSW483yKBKuoz1vkMTON1tTVxNQO8qZGiGBvqyxXeZVuKxOLQP4JMGVgwZSRu9nSZ5Wkp49rmHPXXKaNh9',
    // Professor Speks
    '6522;6;td-343':
        '2HxZLCfrznt_WvZ8PcDV_wn6s-WIUiLxa2PBd3LfHgprRLsNMj3dqjvzseWVRm7KFeApFwxQe_EBpmcdPs6Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-5069eG2VEXcMYZUJgswpx5t5_gvAgNO9toSwgeQOh4MWiAU6vklniRX-uzPOZc48QCAVhPSUzpm3IpDRwqueeZNFpoZiySxw',
    // Summer Shades
    '6522;6;td-486':
        '23tbJyfq4mdlZOFpK_TKwRf8pKzdRXWjOWLBfnaJHgkwGOENM2jaqzf05b-SRD_LFLspRwgNL_YFpDIbI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJ7V1_suA0mkVSs8ZTJQ99JNHqZn39V0QPthrGQ9NR71_ZG7TV6zhyn-QX-C1aucMt5dRAloZHk-7yXYuDBg3qKeOqK6gR_w',
    // Merc's Pride Scarf
    '6522;6;td-541':
        '221XOCTHzntuZuB-B8fH0gL-77XdGiahMDGRdnCBHQk9HLZXNzvZ_Dun47idF27KF-t5QFoAKfBR-jVXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud0ILNm8cKC6FEXQcQOV54Bx55UvJu8614WO94_Sg9KFeh_YjuCAf_uwnaZXeTnOeRbs8AFVFpOSknvmSF4Xldptq4XMowsJg',
    // Ghastlierest Gibus
    '6522;6;td-116':
        'yWJaFSb30H1jZPFlN8X5wjr_pO-CI3j2ejDBYXGPGlpqRbMMMzmK-WD37b6WSmzOQ-goEF0Bf_cHpm1INJqNahM-gNIVu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkBW9MdUJo79JhDtZvgsg58Z4kvHFtSQep7ZW_TVfjhl3-ZWbGxaucA5MlRVF5PTErvzXUuDEp96P-LaFhD4WBmrPUCXMSgAQ',
    // MONOCULUS!
    '6522;6;td-581':
        'wG9DJDb92UtofOBuOcfK_w36td2BHWbwbXnAfXmBRV87SrJaYGmPqjPzt-vHQj_KRroqEQxVfaVSoWUaPcyKaxo-ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIxEIATs8bW6I5zpFDqZfxhAFCeY84VQ5PROl4N2iAUq3mwnnKXba0NuAB5MJXAl8fGBm8znd4W0kvuvuMaVxe8CBx9HZyTOA',
    // Spine-Chilling Skull 2011
    '6522;6;td-576':
        '22VDJi7H1Xt_a_ZTOvTKwRf8pKzbHnf0aTOVLniNSAc8RLMPZG6K-mXw4-zAEWyfFespEFtQeaEGoGAcI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJ7V1_suA0mkVSs8ZTJQ99JNHqZn39V0QPthrGQ9NR71_ZG7TV6zhyn-QX-C1aucMt5dRAloZHk-7yXYuDBg3qKeOs5jNmRs',
    // RoBro 3000
    '6522;6;td-733':
        '2GtCFTD332ZiWultKszDjgT-p-DaGCzyMWSXeiWIS11pS-JfNT7Y-DSgtL6cFzzLSLx4RFoMKKAasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejFabpmOqZiwMKC2VMARsIjUpwszJoI682n61tBOtlrHw9NRrt9MG-IVfHmwHnNWObgaeBc5sIEV19ISBq-ymo7UR4e15UqXg',
    // Ghostly Gibus
    '6522;6;td-940':
        'z2ZZOTb0xEtqbOd5K_TCxQj0nu6MDnPyJm-TdnCAGAlqTOYPMW7Z_jrz4LyVF26YEOouQwwNevBWpDYcP8GJPRMjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqUw0QTQcYZYZo7xZpUsp3NtwxRbI1zSw1JQe8sZGiHAPjmxCybC-W7PukI5sYFUVxIHE7omHcvD0976qzaOxMA7imGu9UvAw',
    // Skull Island Topper
    '6522;6;td-941':
        'xWtEKzH1yGdSdu55NMf5zATppufDRXX1amGdLSCASgxsTbULNzve-jWi5-mWQTzOR-99QlsNKaYN-m1MbNfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7Jz7cSJ0FMtSMQSW483yKBKuoz1vkMTON1tTVxNQO8qZGiGBvqyxXeZVuKxOLQP4JMGVgwZSRu9nSZ5Wkp49rmHPV94_930',
    // Dark Falkirk Helm
    '6522;6;td-30357':
        '22xZMnCojCBSbutlP8PS_w3-re-ICEv7aSXDKm-AH18_T-AMPWrd-mb05e2QEzrJQrt6FlxRLvRXpmBMNcuNOkE1h9MP5XW2kAJ0ExF5Td0WLV_1mCxGd7Qoz3AtPZpfmTr2JZHP3AI1aSkjWrXnSLjBb5f8zXglMlNmEqAEY4OVrnSsuM6lZ_OCLe5uOaY69saI2UVdXNUOX5M5zqBBvpD3qQRAVIQ8CVkZX-l9YGmHBvjmxSqZX-TgPLQP7MBYVlodH0m4ySJ6WkoqvPnfOA8Vsy84svzFMO-HQJ4',
    // Law
    '6522;6;td-30362':
        '22xZMnCojCBSaeR7B8fH0gL-77qLTi2iOWKQLSLcTlg_SLReMDnR-TOj4--UQWzMFbt6RFpSf6EBoGxXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud0ILNm8cKC6FEXQcQOV54Bx55UvJu8614WO94_Sg9KFeh_YjuCAf_uwnaZXeTnOeRbs8AFVFpOSknvmSF4Xldptq7OKH7iUQ',
    // Mustachioed Mann
    '6522;6;td-30352':
        '22xZMnCojCBSaPB_LMrFyAz0pOayEXX5ZgjILjPeGRA_SrcMM2_fq2X34-qcQjnIFb19RwwCL6oH9GNIbsiKPkc81YUIrze82VRzGVAhf8IXTxfrlyRdY-VwjigfIpo90SX9Jorfhlp0MRs9W9euVrHCcYWmkDl9AE1mcOkbaYuLvy3s7saxKq7SIPwzZOdu8sLa3lUdQdJTTYksypFBvqH1vgNGeYE-JFIdA74re2mCUfnhkX-ZWLezPuZb5pRWXlgSS0y6znJ-XR8ovfraPg1G4nxz8fOM75PnqvzY_ms',
    // Spine-Tingling Skull
    '6522;6;td-578':
        '22VDJi7H1Xt_a_ZTOvTKwRf8pKzbHnf0aTOVLniNSAc8RLMPZG6K-mXw4-zAEWyfFespEFtQeaEGoGAcI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJ7V1_suA0mkVSs8ZTJQ99JNHqZn39V0QPthrGQ9NR71_ZG7TV6zhyn-QX-C1aucMt5dRAloZHk-7yXYuDBg3qKeOs5jNmRs'
};

const qualityColor: { [name: string]: string } = {
    '0': '11711154', // Normal - #B2B2B2
    '1': '5076053', // Genuine - #4D7455
    '3': '4678289', // Vintage - #476291
    '5': '8802476', // Unusual - #8650AC
    '6': '16766720', // Unique - #FFD700
    '7': '7385162', // Community - #70B04A
    '8': '10817401', // Valve - #A50F79
    '9': '7385162', //Self-Made - #70B04A
    '11': '13593138', //Strange - #CF6A32
    '13': '3732395', //Haunted - #38F3AB
    '14': '11141120', //Collector's - #AA0000
    '15': '16711422' // Decorated Weapon
};

export default function sendWebHookPriceUpdateV1(
    sku: string,
    itemName: string,
    newPrice: Entry,
    time: string,
    schema: SchemaManager.Schema,
    options: Options,
    currentStock: number,
    oldPrice: { buy: Currencies; sell: Currencies },
    buyChangesValue: number,
    sellChangesValue: number,
    isCustomPricer: boolean
): void {
    const parts = sku.split(';');
    const newItem = SKU.fromString(`${parts[0]};6`);
    const name = schema.getName(newItem, false);

    const itemImageUrl = schema.getItemByItemName(name);

    let itemImageUrlPrint: string;
    const item = SKU.fromString(sku);

    if (!itemImageUrl || !item) {
        if (item?.defindex === 266) {
            itemImageUrlPrint =
                'https://steamcommunity-a.akamaihd.net/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEIUw8UXB_2uTNGmvfqDOCLDa5Zwo03sMhXgDQ_xQciY7vmYTRmKwDGUKENWfRt8FnvDSEwu5RlBYfnuasILma6aCYE/512fx512f';
        } else {
            itemImageUrlPrint = 'https://jberlife.com/wp-content/uploads/2019/07/sorry-image-not-available.jpg';
        }
    } else if (
        itemName.includes('Non-Craftable') &&
        itemName.includes('Killstreak') &&
        itemName.includes('Kit') &&
        !itemName.includes('Fabricator')
    ) {
        // Get image for Non-Craftable Killstreak/Specialized Killstreak/Professional Killstreak [Weapon] Kit
        const front =
            'https://community.cloudflare.steamstatic.com/economy/image/IzMF03bi9WpSBq-S-ekoE33L-iLqGFHVaU25ZzQNQcXdEH9myp0du1AHE66AL6lNU5Fw_2yIWtaMjIpQmjAT';

        const url = itemName.includes('Specialized')
            ? ks2Images[sku]
            : itemName.includes('Professional')
            ? ks3Images[sku]
            : ks1Images[sku];

        if (url) {
            itemImageUrlPrint = `${front}${url}/520fx520f`;
        }

        if (!itemImageUrlPrint) {
            itemImageUrlPrint = itemImageUrl.image_url_large;
        }
    } else if (itemName.includes('Strangifier') && !itemName.includes('Chemistry Set')) {
        const front =
            'https://community.cloudflare.steamstatic.com/economy/image/IzMF03bi9WpSBq-S-ekoE33L-iLqGFHVaU25ZzQNQcXdEH9myp0du1AHE66AL6lNU5Fw_2yIWtaMjIpQmjAT';
        const url = strangifierImages[sku];

        if (url) {
            itemImageUrlPrint = `${front}${url}/520fx520f`;
        }

        if (!itemImageUrlPrint) {
            itemImageUrlPrint = itemImageUrl.image_url_large;
        }
    } else if (Object.keys(paintCan).includes(`${parts[0]};6`)) {
        itemImageUrlPrint = `https://steamcommunity-a.akamaihd.net/economy/image/IzMF03bi9WpSBq-S-ekoE33L-iLqGFHVaU25ZzQNQcXdEH9myp0erksICf${
            paintCan[`${parts[0]};6`]
        }512fx512f`;
    } else if (item.australium === true) {
        const australiumSKU = parts[0] + ';11;australium';
        itemImageUrlPrint = `https://steamcommunity-a.akamaihd.net/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgE${australiumImageURL[australiumSKU]}512fx512f`;
    } else if (item.paintkit !== null) {
        itemImageUrlPrint = `https://scrap.tf/img/items/warpaint/${encodeURIComponent(name)}_${item.paintkit}_${
            item.wear
        }_${item.festive === true ? 1 : 0}.png`;
    } else {
        itemImageUrlPrint = itemImageUrl.image_url_large;
    }

    let effectsId: string;
    if (parts[2]) {
        effectsId = parts[2].replace('u', '');
    }

    let effectURL: string;
    if (!effectsId) {
        effectURL = '';
    } else effectURL = `https://marketplace.tf/images/particles/${effectsId}_94x94.png`;

    const qualityItem = parts[1];
    const qualityColorPrint = qualityColor[qualityItem];

    const buyChanges = Currencies.toCurrencies(buyChangesValue).toString();
    const sellChanges = Currencies.toCurrencies(sellChangesValue).toString();

    const opt = options.discordWebhook;
    const priceUpdate: Webhook = {
        username: opt.displayName,
        avatar_url: opt.avatarURL,
        content: '',
        embeds: [
            {
                author: {
                    name: itemName,
                    url: `https://www.prices.tf/items/${sku}`,
                    icon_url: isCustomPricer
                        ? 'https://cdn.akamai.steamstatic.com/steamcommunity/public/images/avatars/81/818fb1e235ccf685e8532a17f111f2697451b0d0_full.jpg'
                        : 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/3d/3dba19679c4a689b9d24fa300856cbf3d948d631_full.jpg'
                },
                footer: {
                    text: `${sku} • ${time} • v${process.env.BOT_VERSION}`
                },
                thumbnail: {
                    url: itemImageUrlPrint
                },
                image: {
                    url: effectURL
                },
                title: '',
                fields: [
                    {
                        name: 'Buying for',
                        value: `${oldPrice.buy.toString()} → ${newPrice.buy.toString()} (${
                            buyChangesValue > 0 ? `+${buyChanges}` : buyChangesValue === 0 ? `0 ref` : buyChanges
                        })`
                    },
                    {
                        name: 'Selling for',
                        value: `${oldPrice.sell.toString()} → ${newPrice.sell.toString()} (${
                            sellChangesValue > 0 ? `+${sellChanges}` : sellChangesValue === 0 ? `0 ref` : sellChanges
                        })`
                    }
                ],
                description: `Stock: ${currentStock}${opt.priceUpdate.note ? `\n${opt.priceUpdate.note}` : ''}`,
                color: qualityColorPrint
            }
        ]
    };

    PriceUpdateQueue.setURL(opt.priceUpdate.url);
    PriceUpdateQueue.enqueue(sku, priceUpdate);
}

class PriceUpdateQueue {
    private static priceUpdate: UnknownDictionary<Webhook> = {};

    private static url: string;

    static setURL(url: string) {
        this.url = url;
    }

    private static isProcessing = false;

    static enqueue(sku: string, webhook: Webhook): void {
        this.priceUpdate[sku] = webhook;

        void this.process();
    }

    private static dequeue(): void {
        delete this.priceUpdate[this.first()];
    }

    private static first(): string {
        return Object.keys(this.priceUpdate)[0];
    }

    private static size(): number {
        return Object.keys(this.priceUpdate).length;
    }

    private static async process(): Promise<void> {
        const sku = this.first();

        if (sku === undefined || this.isProcessing) {
            return;
        }

        this.isProcessing = true;

        if (this.size() >= 5) {
            await sleepasync().Promise.sleep(500);
        }

        sendWebhook(this.url, this.priceUpdate[sku], 'pricelist-update')
            .then(() => {
                log.debug(`Sent ${sku} update to Discord.`);
            })
            .catch(err => {
                log.warn(`❌ Failed to send ${sku} price update webhook to Discord: `, err);
            })
            .finally(() => {
                this.isProcessing = false;
                this.dequeue();
                void this.process();
            });
    }
}
