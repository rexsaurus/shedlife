---
name: add-vendor-product
description: Add or update real Washington vendor products (sheds, tiny homes, park models, modular homes, ADUs) in the ShedLife shop with sourced sizes and prices. Use when adding vendors, refreshing prices, or fixing a product's size, price or link.
---

# Add a vendor product

Source of truth: `data/wa-vendors.json` (one object per product). After editing run `npm run vendors` to regenerate `src/data/vendors.js`, then `npm test && npm run simulate`.

Fields: `id, vendor, vendorCity ("City, WA"), vendorUrl, product, productUrl, kind (accessory|dwelling|adu|rv), widthFt, depthFt, sqft, heightFt, priceUsd, priceType (listed|starting-at|base-kit|quote-only), includes, conditioned, onWheels, factoryBuilt, lniApproved, leadTimeWeeks, checked (YYYY-MM-DD), status (VERIFIED|UNVERIFIED), notes`.

Rules:
- Read the vendor's own product page. **Never invent a price or dimension**: unknown → `null`. Quote-only items get a game estimate in `src/catalog.js` (`PER_SQFT_EST`) and the shop labels it "game estimate".
- Anything on wheels, and park-model RVs, is `kind: "rv"` (King County treats them as RVs, not dwellings).
- Detached accessory buildings: the shop marks under 200 sq ft unconditioned as permit-exempt automatically — get `sqft` and `conditioned` right.
- Vendor must have a confirmed Washington presence; note the city.
- If the simulator shows a new home is unwinnable or trivial at the default budget, that's information — mention it rather than fudging the price.
