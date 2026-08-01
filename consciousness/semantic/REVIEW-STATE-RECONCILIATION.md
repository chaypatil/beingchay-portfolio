# Phase 1.5 review-state reconciliation

Date: 2026-08-01

History inspected: `d950665` through production commit `c40fd48`.

## Result

The previous queue reported 34 semantic proposals and described 39 unknown relationships in a way that made them appear to require another review. That was inaccurate.

### Semantic proposals

- Previous count: 34 proposed.
- Previously reviewed and applied but stale-labelled: 31.
- Previously reviewed and intentionally left proposed: 3 (`love`, `c2x`, `sound`).
- New since the completed review: 0.
- Genuinely awaiting Chay: 3 records grouped into two decisions.

The 31 records were all Phase 1.5 audit entries. Chay has confirmed that Phase 1.5 was completed. Their approval state is now reconciled without treating deployment itself as approval.

The three intentional holdouts remain proposed:

1. **Canonical-source batch:** C2X and Sound remain `insufficient_source` until canonical Chay OS evidence is identified or created.
2. **Private-structure batch:** Love remains P2 and proposed until its people, incidents, dates, relationships and source material are reviewed one by one.

### Relationships

- Previous unknown count: 39.
- Previously reviewed and deliberately unknown: 31.
- New graph relationships introduced with the ADHD expansion and reviewed as deliberately unknown: 8.
- Previously approved relationships incorrectly demoted: 0 when tracked by endpoint pair.
- Genuinely awaiting a new Chay decision: 0.

All 39 exact endpoint pairs have no shortest-sufficient evidence span in the current semantic model. They remain visible graph associations but are not approved personal claims. `unknown` is therefore a deliberate evidence status, not a human-review queue.

The former `relation-legacy-NNN` identifiers were positional. Adding edges changed which endpoint pair an identifier referred to, creating misleading history. Relations now use stable endpoint-based IDs and carry an explicit review disposition:

- `reviewed_supported`; or
- `reviewed_deliberately_unknown`.

## Remaining decisions

Only two meaningful batches remain:

1. Provide or create canonical Chay OS evidence for C2X and Sound.
2. Review the private Love structure one record at a time before releasing any detail.

No completed semantic classification or deliberately unknown relationship should be presented to Chay for review again.
