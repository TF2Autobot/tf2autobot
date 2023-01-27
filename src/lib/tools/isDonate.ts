import { TradeOffer } from '@tf2autobot/tradeoffer-manager';

export default function isDonate(offer: TradeOffer) {
    // Check if the message is a donation
    const offerMessage = offer.message.toLowerCase();
    const isGift = [
        'gift',
        'donat', // So that 'donate' or 'donation' will also be accepted
        'tip', // All others are synonyms
        'tribute',
        'souvenir',
        'favor',
        'giveaway',
        'bonus',
        'grant',
        'bounty',
        'present',
        'contribution',
        'award',
        'nice', // Up until here actually
        'happy', // All below people might also use
        'thank',
        'goo', // For 'good', 'goodie' or anything else
        'awesome',
        'rep',
        'joy',
        'cute', // right?
        'enjoy',
        'prize',
        'free',
        'tnx',
        'ty',
        'love',
        '<3'
    ].some(word => offerMessage.includes(word));

    return isGift;
}
