const CATEGORY_ALPHA = {
    'Accesorios': 2.5,
    'accesorios': 2.5,
    'Accesorio': 2.5,
    'accesorio': 2.5,
    'Gadgets': 2.0,
    'gadgets': 2.0,
    'Gadget': 2.0,
    'gadget': 2.0,
    'Electrónica': 1.5,
    'electronica': 1.5,
    'Electronica': 1.5,
    'Computadoras': 1.5,
    'computadoras': 1.5,
    'Hogar': 1.5,
    'hogar': 1.5,
    'Alto Valor': 1.0,
    'alto valor': 1.0,
    'Laptops': 1.0,
    'laptops': 1.0,
    'Consolas': 1.0,
    'consolas': 1.0,
};

const DEFAULT_ALPHA = 1.5;
const MIN_PROFIT = 2000;
const STEP = 100;
const MAX_COST_MULTIPLIER = 3;
const MARKET_CAP_MULTIPLIER = 1.2;
const FALLBACK_MULTIPLIER = 1.6;

function conversionProbability(price, referencePrice, alpha) {
    if (!price || price <= 0 || !referencePrice || referencePrice <= 0) return 0;
    return 1 / (1 + Math.pow(price / referencePrice, alpha));
}

function calculateOptimalPrice(cost, category, marketReferencePrice) {
    if (!cost || cost <= 0) throw new Error('Invalid product cost');

    const alpha = CATEGORY_ALPHA[category] || DEFAULT_ALPHA;

    if (!marketReferencePrice || marketReferencePrice <= 0) {
        const heuristicPrice = Math.round(cost * FALLBACK_MULTIPLIER / 100) * 100;
        return {
            price: heuristicPrice,
            cost: cost,
            profit: heuristicPrice - cost,
            conversionProb: null,
            expectedUtility: heuristicPrice - cost,
            alpha: alpha,
            referencePrice: null,
            method: 'heuristic'
        };
    }

    let bestPrice = cost + MIN_PROFIT;
    let bestUtility = 0;
    const maxPrice = Math.min(cost * MAX_COST_MULTIPLIER, marketReferencePrice * MARKET_CAP_MULTIPLIER);

    if (maxPrice <= cost + MIN_PROFIT) {
        bestPrice = Math.round((cost + MIN_PROFIT) / 100) * 100;
        const prob = conversionProbability(bestPrice, marketReferencePrice, alpha);
        return {
            price: bestPrice,
            cost: cost,
            profit: bestPrice - cost,
            conversionProb: prob,
            expectedUtility: (bestPrice - cost) * prob,
            alpha: alpha,
            referencePrice: marketReferencePrice,
            method: 'fallback-min'
        };
    }

    for (let P = cost + MIN_PROFIT; P <= maxPrice; P += STEP) {
        const convProb = conversionProbability(P, marketReferencePrice, alpha);
        const utility = (P - cost) * convProb;
        if (utility > bestUtility) {
            bestUtility = utility;
            bestPrice = P;
        }
    }

    const roundedPrice = Math.round(bestPrice / 100) * 100;
    const finalProb = conversionProbability(roundedPrice, marketReferencePrice, alpha);

    return {
        price: roundedPrice,
        cost: cost,
        profit: roundedPrice - cost,
        conversionProb: finalProb,
        expectedUtility: roundedPrice > 0 ? (roundedPrice - cost) * finalProb : 0,
        alpha: alpha,
        referencePrice: marketReferencePrice,
        method: 'optimization'
    };
}
