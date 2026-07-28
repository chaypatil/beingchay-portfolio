# Phase 1.5 — Semantic integrity and privacy verification

Date: 2026-07-29
Status: review queue ready; no production deploy performed

This is the public-safe review packet. Exact private locators, private evidence hashes, identities, and historical-risk detail are stored only in the canonical private vault.

## 1. Reconciled architecture inventory

The counts describe different layers and must not be treated as competing totals:

| Layer | Exact count | Meaning |
| --- | ---: | --- |
| Canonical Markdown inventory | 111 | Every Markdown artifact currently under `Chay OS/vault` |
| Public-vault structural records | 111 | One P0-safe structural projection for each canonical Markdown artifact |
| Graph records | 57 | Every record in `publicNodes`, including privacy placeholders |
| Public graph nodes | 49 | Display/index nodes with semantic audit records |
| Privacy placeholders | 8 | UI positions without public claims; not aliases for eight people or eight vault files |
| Graph edges | 102 | Legacy visual relations; evidence approval is separate |
| Brain mappings | 49 | Artistic associations for every public node |
| Retrieval source-corpus entries | 37 | The existing Mirror retrieval contract, not the canonical record count |
| Canonical archive mothers | 5 | Self, Work, Creative, Knowledge, Systems |
| Thematic mothers | 2 | Love and the current Four Mahāvākyas display record |
| External-context child nodes | 4 | The four Mahāvākya display children |

Definitions are machine-readable in `semantic-model.json`:

- A **vault record** is one canonical Markdown artifact.
- A **graph record** is one item in `publicNodes`, including locked placeholders.
- A **node** is an index into claims or external context. It is never evidence.
- A **mother node** groups children. Archive mothers, thematic mothers, and external-context collections are distinct roles.
- A **child node** is navigational/contextual and inherits neither evidence nor approval.
- A **placeholder** is a public privacy position with no public claim.
- A **distillation** is a reviewable transformation from evidence and atomic claims into display copy.
- A **source record** is a P0-safe projection of a source artifact, never the raw private artifact.

## 2. Semantic audit ledger

Every one of the 49 public nodes now has:

- a source-artifact status;
- an evidence locator or explicit blocker;
- an atomic claim;
- expression and epistemic classifications;
- status, confidence, importance, privacy, and approval as separate dimensions;
- a verdict;
- supported relationships and preserved variants;
- an immutable current revision;
- a provenance status.

Current 49-node verdicts:

| Verdict | Count |
| --- | ---: |
| Keep | 32 |
| Tighten | 6 |
| Rewrite | 5 |
| Split | 1 |
| Merge | 0 |
| Remove | 0 |
| Insufficient source | 5 |

The completed ten-node audit remains historically represented. Its original result was 6 rewrite, 2 tighten, 2 keep. In the reconciled model, the former Aham Brahmāsmi rewrite is now a **split** proposal, producing 5 rewrite, 2 tighten, 2 keep, 1 split without erasing the original audit history.

Approval state:

| State | Count |
| --- | ---: |
| Approved | 10 |
| Proposed | 39 |

Deployment is not treated as semantic approval. The ten approved records retain the explicit 2026-07-26 Chay approval event; all other classifications remain proposed.

## 3. Proposed revisions awaiting Chay

One review queue in `semantic-model.json` contains every material decision:

1. Split the personal Aham Brahmāsmi slice/ocean belief from the external Four Mahāvākyas collection. Keep the current public title unchanged until approval.
2. Supply or approve canonical sources for C2X and Sound, and verify primary sources for three external Mahāvākya context records.
3. Generalize four privacy-sensitive graph relations and decide whether date/count structure should remain publicly visible.
4. Review the remaining 39 semantic classifications as one batch. No proposal can approve itself.

The original Tathāgatagarbha contamination is a permanent regression fixture. An editorially introduced term without evidence and explicit Chay approval is rejected.

## 4. Contradictions and historical variants

Four sets are preserved rather than resolved for neatness:

- **Multidimensional self:** literal timeline/portal language and a later action/consequence clarification.
- **Love:** distance intensifying desire and the later correction that relationships remain authentic rather than merely instrumental.
- **Hierarchy:** equal constitutive value and an unresolved ambition framed through exceptional/ranked influence.
- **Manifestation:** behavioral attention/action mechanisms and stronger metaphysical language.

## 5. Unsupported-edge report

The 102 visual graph edges remain visually compatible, but they are not automatically semantic evidence.

- Four privacy-sensitive legacy relations are excluded from the public semantic relation ledger and retained only as an aggregate finding here.
- Of the remaining 98 public-to-public legacy relations, 60 are `supported` by this pass and 38 remain `unknown`.
- Two new semantic context relations are recorded separately: one documented `resonates_with` relation and one tentative `contextualized_by` relation.
- `unknown` means the current audit did not find a shortest-sufficient evidence span for that edge; it does not mean the relationship is false.
- No unknown edge is promoted to an approved semantic relation.

The exact relation statuses are machine-readable in `semantic-model.json`. Exact privacy-sensitive endpoints are retained only in the private audit.

## 6. External-context separation

The model now distinguishes external context from personal belief:

- Chay's canonical source explicitly invokes Aham Brahmāsmi.
- Prajñānam Brahma, Tat Tvam Asi, and Ayam Ātmā Brahma remain external-context records with unverified primary citations.
- External context has its own entity type and cannot enter a personal node's `claimIds`.
- Typed relations such as `resonates_with` and `contextualized_by` connect context without retroactive attribution.

## 7. Privacy audit summary

The generated output—not only the source generator—was scanned.

Confirmed and fixed:

- The raw-framework path matcher required a leading slash that relative paths never had.
- Raw transcript records were therefore entering the public-vault output.
- A separate pipeline record exposed an absolute Windows user path and raw cookie/transcript locations.
- Raw and pipeline records are now P3 source artifacts represented only by opaque P0 structural placeholders.
- Their filenames, folder placement, and contents no longer enter generated output.
- Public-vault and retrieval-corpus generation are deterministic.

The public-vault distribution changed because 13 previously exposed raw/pipeline records now fail closed:

| Public projection | Before Phase 1.5 | After Phase 1.5 |
| --- | ---: | ---: |
| Public | 25 | 17 |
| Sanitized/redacted extract | 30 | 25 |
| Fully redacted | 56 | 69 |
| Total | 111 | 111 |

The direct scan covers generated JSON, graph data, compiled landing HTML, consciousness HTML/JavaScript, Vault code, Brain mappings, and Codex Map assets. It rejects:

- dynamically derived private-person names;
- employer/internal terms;
- absolute user paths;
- raw/pipeline folder placement;
- forbidden source-corpus fields;
- nondeterministic timestamps.

Aggregate residual risk awaiting Chay:

- redacted structure can reveal chronology, counts, and relationship shape even when content is withheld;
- legacy visible copy is still a deployed display layer, not semantic approval;
- line-level sanitization is not a substitute for approval-based publishing.

No sensitive excerpts or identities are included in this report.

## 8. Test report

Added:

- `scripts/test-semantic-integrity.mjs`
- `scripts/test-public-privacy.mjs`
- `scripts/lib/semantic-policy.mjs`
- `scripts/fixtures/tathagatagarbha-contamination.json`

The tests prove:

- all 49 public nodes are accounted for;
- all required enums and dimensions remain separate;
- agent interpretations cannot approve themselves;
- approval requires an explicit Chay event and evidence;
- P1/P2/P3 material cannot pass the public-output policy;
- privacy inheritance fails closed;
- external context remains distinguishable from personal belief;
- contradictions remain separate;
- revisions are immutable and linked;
- generation is deterministic;
- forbidden fields and private terms do not survive;
- Library, Vault, Mirror, Brain, and interaction counts/contracts remain compatible.

## 9. Remaining blockers

Five nodes have explicit source blockers:

- C2X: public project page exists, but no sufficient canonical Chay OS record was located.
- Sound: distributed influence references do not support the full current thesis.
- Three external Mahāvākya children: primary external citations remain unverified.

The current graph's ten inline provenance objects use legacy field names that do not match the renderer's expected names. The new semantic model is correct and complete, but it was deliberately not wired into production during this no-production-change phase.

## 10. Exit gate and recommended next phase

Phase 1.5's data-layer exit gate passes:

- counts reconcile;
- the completed audit is represented without losing its history;
- all 49 public nodes have a verdict or blocker;
- every visible node has a provenance status;
- external context and personal claims are separate;
- contradictions are preserved;
- approval cannot occur silently;
- generated public artifacts pass privacy tests;
- raw private material did not enter the repository;
- existing interface contracts still pass;
- one review queue contains all material decisions.

The single recommended next action is **Chay reviews the four-item queue once, as a batch**. Do not begin a new feature phase or wire semantic proposals into the public UI before that review.
