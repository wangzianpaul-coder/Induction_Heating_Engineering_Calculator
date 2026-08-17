# Three-file Basic Calculator Integration

Date: 2026-08-17
Target: Version 0.9 browser application, Basic Calculator page

## Source artifacts

The compatibility implementation was transcribed from the three files supplied by the user,
not from the older similarly named prototype already present under `references/legacy_prototypes`.

| File | SHA-256 |
|---|---|
| `index.html` | `B96817784FC28D69BB1ED5A85979E144AD3BF0F6622B0C2EDDFCE5B9C1C4175D` |
| `styles.css` | `604A128FDC291756ECB979B2AB6DDB8C9906223D7D010DB28D2CCAD7D1BA1F1A` |
| `app.js` | `B6B22FB093C9B4F92AF0E1D6F96F1660010B976CD7C2A85372289285AB77CDBE` |

## Compatibility boundary

The supplied calculation functions, constants, 14-node Nagaoka table, Simpson integration,
`l / Dm = 0.4` route, default values, fallback messages and output order are implemented in
`src/application/legacyBasicCalculator.ts`. The React page renders that result tree and does
not recompute the equations.

The compatibility Basic Calculator is intentionally separate from formal Case calculation
adapters. Its input-only JSON file is not a formal Case file, and opening or calculating in the
Basic page does not change method-registry activation, Calculation Contracts, or controlled
advanced-calculation records.

## User-visible coverage

- 26 original inputs and original defaults;
- nine original subpages;
- Wheeler single-layer and multilayer equations;
- Nagaoka integral, lookup and manual-coefficient routes;
- Simpson convergence and node tables;
- geometry, skin depth, electrical reverse calculation, loss and water-flow results;
- real-time updates, lookup synchronization, three coil examples, four scenario cards and a
  responsive coil/workpiece canvas;
- application-native help, input-file save/open, CSV export and printing.

## Regression reference

The default compatibility input produces Nagaoka as the selected route and
`22.263032500473702 µH`. The focused test suite locks all default outputs, the long/short/
multilayer cases, the exact `0.4` branch boundary, table interpolation and bounds, manual
fallback, Simpson normalization, all warning ordering, and input immutability.
