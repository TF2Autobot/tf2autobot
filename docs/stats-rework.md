Proposed Idea

On each trade keys are stored as seperate value compared to ref
This can then be used to display raw profit or use in point in time calcs

pricelist lookup use the buy or sell dependant

Hat A Buys for 1 Key (pricelist lookup Hat A = 1key)
Buy record recored with buying k r
Hat A Sells for 60 Ref (pricelist lookup Hat A = 60ref)
Raw Profit is recorded as -1k +60r
Update current k r records

If the below occurs it equals out

Hat A buys for 1 Key (pricelist lookup Hat A = 1key)
Buy record recored with buying k r
Hat A buys for 1 Key 13 Ref (second copy) (pricelist lookup Hat A = 1key 13ref)
Buy record recored with buying k r
Hat A sell for 60 Ref (pricelist lookup Hat A = 60ref)
Raw profit recorded as -1k +60r
Update k r records
Hat A sell for 60 ref (second copy) (pricelist lookup Hat A = 60ref)
Raw profit recorded as -1k +47ref
Update k r records

idea for this is buys are recorded as a delta sells as a delta and
profit updates on sell based on the two deltas

Would make use of FIFO (First in first out)

In case of multiple items selling

Hat A + Hat B buys for 10 ref (pricelist lookup Hat A = 3ref, Hat B = 7ref)
Buy record recored with buying k r (Hat A)
Buy record recored with buying k r (Hat B)
Hat A sell for 4 ref (pricelist lookup Hat A = 4 ref)
Raw profit recorded as 0k +1r
Update k r records
Hat B sell for 5 ref (pricelist lookup Hat B = 5 ref)
Raw profit recorded as 0k -2r
Update k r records

In case of overpay/underpay

Hat A + Hat B buys for 20 ref (pricelist lookup Hat A = 3ref, Hat B = 7ref)
Buy record recored with buying k r (Hat A)
Buy record recored with buying k r (Hat B)
Overpay recorded as -10r
Hat A sells for 13 ref (pricelist lookup Hat A = 3ref)
Raw profit recorded as 0k 0r
Overpay recorded as +10r
Hat B sells for 20 ref (pricelist lookup Hat B = 7ref)
Raw profit recorded as 0k 0r
Overpay recorded as +13r

This is because the item sale was for the pricelist price but overpay
is the amount over or under we get back +- which can then be combined
with raw profit to give realised profit from overpay

---

Working profit calcs (fix autobot double difference additions)

K∈R - Raw Key
R∈R - Raw Ref
C∈R>0 - Conversion rate

X=⌊(K⋅C+R)/C⌋ - Normalise back to Keys + Ref
Y=(K⋅C+R)−C⋅X - Left over Ref normalised

0<=Y<C - Satification bounds

---

Simplified Algebraic

K∈Z
R∈R
C∈R>0

T=K⋅C+R

X=⌊T/C⌋
Y=T−C⋅X

Z=Xkeys+Yref

---

Example below based on records

Test Set (Corrected for negative agnostic)

-10k +2000r 63c
+5k -333r 57c
+1k +10r 1.33c

Results

Z=21Keys 47Ref
Z=-1Keys 9Ref
Z=8Keys 0.69Ref

---

## PLANNING

Example !stats redesign for profit calcs

All trades (accepted) are recorded from {days ago} days ago 📊
Total accepted trades: {total buy} / {total sell}

--- Last 24 hours ---
• Processed: {total processed 24h buy} / {total processed 24h sell}
• Accepted: {total accepted 24h buy} / {total accepted 24h sell}
• Declined: {total declined 24h buy} / {total declined 24h sell}
• Skipped: {total skipped 24h buy} / {total skipped 24h sell}
• Traded away: {total traded away 24h buy} / {total traded away 24h sell}
• Canceled: {total canceled away 24h buy} / {total canceled away 24h sell}

--- Since beginning of today ---
• Processed: {total processed today buy} / {total processed today sell}
• Accepted: {total accepted today buy} / {total accepted today sell}
• Declined: {total declined today buy} / {total declined today sell}
• Skipped: {total skipped today buy} / {total skipped today sell}
• Traded away: {total traded away today buy} / {total traded away today sell}
• Canceled: {total canceled away today buy} / {total canceled away today sell}

--- Profits ---

Key Rate: {key rate buy} / {key rate sell}

Profit Raw (24h): {profit last 24 raw}
Profit Total Raw: {profit raw}

-- Profits Clean ---

Profit: {profit algebraic}
Profit from overpay: {over pay}
Full Profit: {{profit algebraic} + {over pay}}

---

Implementation Notes

FIFO - First in first out is how we will match accumulated profits
during the tracking rather than assetid tracking due to the data
difference in storing and tracking. FIFO then helps us make sure 1
in 1 out is always the case.

FIFO will have to be per SKU to function as required. In this case
each price record added to the bucket must record the sku as well
as the buy/sell status and buy/sell price.

FIFO always consumes the first object. Even thoughthe price may have
moved over time this gives us an idea of if the 3rd sold sell for
less than the last buy was it may still be a profitable trade in
overtime terms.

If FIFO doesn't exist (edge case) we would fallback to autobot logic
of using pricelist at the time but tag the entry as estimate and show
profit as containing estimates in final calc. This shouldnt ever occur!

Overpay becomes the effective ledger for differences when a user or
bot overpays and strays from the pricelist as time of trade. Profit
tracks the trading profit +- if the values of buy and sell change
between buy and sell trades.

Overpay must be computed once per trade-side and never injected into
raw (ΔK,ΔR) to avoid double counting.

For currency trades (key to ref or ref to key) treat these are item
trades in terms of the FIFO queue. We do this as keys are sudo currency
and not a real currnecy so when banking they become a real item we
are selling or buying. (Think about currency exchanges IRL this is
the example of currency for SUDO)

We would still have to take the prices for the buy recorded from the
pricelist at the time of the trade being made so that multiple items
can be handled. Then save the difference to overpay no matter if its
overpay or underpay. We would save this to a trade log (polldata)

We would take the prices for the sell from the pricelist at the time
of sale so multiple items can be handled. Then save the difference to
overpay no matter if its overpay or underpay. We would then save this
to a trade log (polldata) & to an overall profit track {k} {r}.

This means profit is only calculated on the sell trade. If any item
is in the inventory it is treated as unrealised profit/loss until
the point of sale/trade rather than profit/loss at its hypothesised
market rate.

Profit for the last 24 hours will use the same last buy and the current
sell at the time. This could be miss leading is 3 buy 1 sell an 1st
buy was lower than 3rd for example however this is best case for 24h
view not being lost. Profit 24h will only show the profit for the last
and may require a new way of storing as we are no longer calculating
profit based on polldata on command use. Timestamps will be important
here for getting this correct!

---

Key files (Current System)

MyHandler.ts - 1244-1250, 1479, 2260 Entry points
Profit.ts - Rewrite
Bot.ts - 55-200
Status.ts - 29-46, 87-92
Index.d.ts - 93-122

---

Clarity revisions

Revision 1

Hat A + Hat B buys for 20 ref (pricelist lookup Hat A = 3ref, Hat B = 7ref)
Buy record recored with buying k r (Hat A)
Buy record recored with buying k r (Hat B)
Overpay recorded as -10r
Hat A sells for 13 ref (pricelist lookup Hat A = 3ref)
Raw profit recorded as 0k 0r
Overpay recorded as +10r

My logic here is the pricelist look up is 3ref and we originally purchased at
3ref the raw profit is 0k 0r as we made nothing

The overpay would be -10 + 10 so also 0

As opposed to

Hat A Buys for 1 Key (pricelist lookup Hat A = 1key)
Buy record recored with buying k r
Hat A Sells for 1key 60 Ref (pricelist lookup Hat A = 1key 60ref)
Raw Profit is recorded as 0k +60r
Update current k r records

Where because pricelist look up has a higher sell than the original buy
we made +60r profit and there was no overpay.

So FIFO stores the the buy k and r when an item is purchased and overpay
stores the difference (usually negative when we buy is we overpay edge
case). When we sell the difference between the current sell and the FIFO
buy is used as a the profit record and anything above the buy sell
difference is overpay (usually positive when we are purchased from)

The inverse to this would be

Hat A Buys for 80 ref (pricelist lookup Hat A = 100 ref)
Buy record recored with buying k r with -20 ref (pricelist diff split)
Hat A Sells for 140 Ref (pricelist lookup Hat A = 120 ref)
Raw Profit is recorded as 0k +40r (pricelist diff add +20)
Update current k r records
Overpay recorded as +20r

Giving us

Technically we purchased 20ref below when its one item we can record as normal
with a new diff column to handle the overpay. However if it was multiple items
as per the below we would have to handle this edge case.

Hat A + Hat B Buys for 180 ref (pricelist lookup Hat A = 100 ref , Hat B = 100 ref)
Buy record recored with buying k r for Hat A with -10 ref (pricelist diff split)
Buy record recored with buying k r for Hat B with -10 ref (pricelist diff split)
Hat A Sells for 140 Ref (pricelist lookup Hat A = 120 ref)
Raw Profit is recorded as 0k +30r (price list diff add +10)
Update current k r records
Overpay recorded as +20r (because they overpayed in this trade sell was 120 they paid 140 and we handle sell overpay same as above)
Hat B Sells for 120 Ref (pricelist lookup Hat B = 120 ref)
Raw Profit is recorded as 0k 30r (price list diff add +10)
Update current k r records

This gives us

Item a = 100
Item b = 100

Buy 1 = A + B = 180ref

Since we buy for -20 of the value we do

Items in trade = 2
Overpay = +20
Diff = Overpay / Items in trade

Buy Record A = A - Diff = 90
Buy Record B = A - Diff = 90

So in this case

Sale of A for 140 when pricelist sale price A is 120 ref

Price list A - Buy record A = +30
Overpay = +20 = 140 - 120
Total = +50

Sale B is

Price list B - Buy record B = +30
Total = +30

and the original buy was 180 and sell was 140 + 120 so 260

Total + total = 80
Sell - buy = 260 - 180 = 80

So this example splits the overpay for multi items across both the item
if its us overpaying we + to the buy price if we underpay we - from the
the buy.

This above would be an edge case and we would have a column called diff
for recording the buy difference if there was over or underpay to be used
when the next buy happens as per above as a one off edge case. This is a
pain but the only way I can see to handle it cleanly with out ignoring it

Outcome

We have to record diff to handle the overpay in the buy section to replace
back in later

---

Mocks for trades

# Interface

interface FIFOEntry {
sku: string;
costKeys: number;
costMetal: number;
diff: number;
tradeId: string;
timestamp: number;
}

interface CumulativeProfitData {
totalRawProfit: {
keys: number;
metal: number;
};
totalOverpay: number;
lastUpdated: number;
tradeCount: number;
}

interface TradeProfitData {
rawProfit: {
keys: number;
metal: number;
};
overpay: number;
timestamp: number;
}

# Single Buy

const pricelistBuy = { keys: 0, metal: 100 };
const actualPaid = { keys: 0, metal: 80 };
const diff = actualPaid.metal - pricelistBuy.metal; // -20 ref (we underpaid)

FIFO.add({
sku: "Hat A",
costKeys: pricelistBuy.keys, // 0
costMetal: pricelistBuy.metal, // 100
diff: diff, // -20
tradeId: offer.id,
timestamp: Date.now()
});

# Multi buy

const pricelistA = { keys: 0, metal: 100 };
const pricelistB = { keys: 0, metal: 100 };
const pricelistTotal = pricelistA.metal + pricelistB.metal; // 200 ref
const actualPaid = { keys: 0, metal: 180 };
const totalDiff = actualPaid.metal - pricelistTotal; // -20 ref (we underpaid)
const itemCount = 2;
const diffPerItem = totalDiff / itemCount; // -10 ref each

// Hat A
FIFO.add({
sku: "Hat A",
costKeys: pricelistA.keys, // 0
costMetal: pricelistA.metal, // 100
diff: diffPerItem, // -10
tradeId: offer.id,
timestamp: Date.now()
});

// Hat B
FIFO.add({
sku: "Hat B",
costKeys: pricelistB.keys, // 0
costMetal: pricelistB.metal, // 100
diff: diffPerItem, // -10
tradeId: offer.id,
timestamp: Date.now()
});

# Sell

const fifoCost = FIFO.remove("Hat A"); // Returns first entry
const pricelistSell = { keys: 0, metal: 120 };
const actualReceived = { keys: 0, metal: 140 };

// Calculate raw profit
const rawProfitKeys = pricelistSell.keys - fifoCost.costKeys;
// = 0 - 0 = 0

const rawProfitMetal = pricelistSell.metal - fifoCost.costMetal + fifoCost.diff;
// = 120 - 100 + (-10) = +10 ref

// Calculate overpay
const overpay = actualReceived.metal - pricelistSell.metal;
// = 140 - 120 = +20 ref

// Store to trade record
offer.data('tradeProfit', {
rawProfit: {
keys: rawProfitKeys, // 0
metal: rawProfitMetal // 10
},
overpay: overpay, // 20
timestamp: Date.now()
});

// Update cumulative totals
cumulativeRawKeys += rawProfitKeys;
cumulativeRawMetal += rawProfitMetal;
cumulativeOverpay += overpay;
cumulativeTradeCount += 1;

Profit.update({
totalRawProfit: {
keys: cumulativeRawKeys,
metal: cumulativeRawMetal
},
totalOverpay: cumulativeOverpay,
lastUpdated: Date.now(),
tradeCount: cumulativeTradeCount
});

// Total profit this trade: 10 + 20 = +30 ref
