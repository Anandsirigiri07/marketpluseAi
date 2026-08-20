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

    if (prev.price !== curr.price) {
      diffs.price_changes.push({
        tier: curr.tier_name,
        type: 'PRICE_CHANGED',
        old_price: prev.price,
        new_price: curr.price
      });
    }

    const prevFeats = new Set(prev.features || []);
    const currFeats = new Set(curr.features || []);

    (curr.features || []).forEach(f => {
      if (!prevFeats.has(f)) {
        diffs.added_features.push({ tier: curr.tier_name, feature: f });
      }
    });

    (prev.features || []).forEach(f => {
      if (!currFeats.has(f)) {
        diffs.removed_features.push({ tier: curr.tier_name, feature: f });
      }
    });
  }

  return diffs;
}