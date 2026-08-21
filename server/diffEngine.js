function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/,/g, '')
    .replace(/\/month\b/g, '/mo')
    .replace(/\/monthly\b/g, '/mo')
    .replace(/\/year\b/g, '/yr')
    .replace(/\/yearly\b/g, '/yr')
    .replace(/\bgb\b/g, 'gb')
    .replace(/\bmb\b/g, 'mb')
    .replace(/\btb\b/g, 'tb')
    .replace(/\s+/g, ' ')
    .trim();
}

export function computePricingDiff(previousSnapshot, currentSnapshot) {
  const diffs = {
    company: currentSnapshot.company_name,
    timestamp: new Date().toISOString(),
    price_changes: [],
    added_features: [],
    removed_features: []
  };

  const prevTiers = new Map(
    (previousSnapshot.pricing_tiers || []).map(t => [t.tier_name.toLowerCase().trim(), t])
  );
  const currTiers = new Map(
    (currentSnapshot.pricing_tiers || []).map(t => [t.tier_name.toLowerCase().trim(), t])
  );

  for (const [name, curr] of currTiers.entries()) {
    const prev = prevTiers.get(name);
    
    if (!prev) {
      diffs.price_changes.push({
        tier: curr.tier_name,
        type: 'NEW_TIER_INTRODUCED',
        old_price: 'N/A',
        new_price: curr.price
      });
      continue;
    }

    if (normalizeText(prev.price) !== normalizeText(curr.price)) {
      diffs.price_changes.push({
        tier: curr.tier_name,
        type: 'PRICE_CHANGED',
        old_price: prev.price,
        new_price: curr.price
      });
    }

    const prevFeatsNormalized = new Set((prev.features || []).map(f => normalizeText(f)));
    const currFeatsNormalized = new Set((curr.features || []).map(f => normalizeText(f)));

    (curr.features || []).forEach(f => {
      if (!prevFeatsNormalized.has(normalizeText(f))) {
        diffs.added_features.push({ tier: curr.tier_name, feature: f });
      }
    });

    (prev.features || []).forEach(f => {
      if (!currFeatsNormalized.has(normalizeText(f))) {
        diffs.removed_features.push({ tier: curr.tier_name, feature: f });
      }
    });
  }

  return diffs;
}