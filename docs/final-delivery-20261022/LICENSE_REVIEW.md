# License and attribution review

This document is a proposal and factual inventory, not a license grant or legal opinion. It does not create a root LICENSE or NOTICE. The existing [licensing boundary](../LICENSING_BOUNDARY.md) remains open until the owner makes an appropriate decision and distribution-specific provenance is checked.

## First-party proposal for review

MIT is a candidate for first-party application code and original project documentation whose rights the owner controls. The owner must choose the covered files, copyright holder and year, exclusions, and intended distribution. The Solidity file's existing MIT SPDX header is preserved but does not license the entire repository.

Do not alter the standard MIT license text to claim third-party brands or assets. A possible future NOTICE should separately identify Studio origin, later independent editing, upstream dependency licenses and retained notices, and the fact that Arc/Circle names or marks do not imply endorsement. That notice must be based on verified scope, not copied in as a blanket grant.

## Observed inventory

[direct-dependency-licenses.json](direct-dependency-licenses.json) records all 27 direct declared dependencies/dev-dependencies, installed versions, their raw package license metadata, top-level license/notice file paths and hashes, plus the two retained forge-std license texts. Its package and lockfile hashes bind the observation to the inspected dependency inputs.

- OpenZeppelin Contracts is installed as 5.1.0 with MIT metadata. No top-level license text was found in that installed package directory by this inventory.
- `@web3icons/react` has MIT metadata; package icons/branding still need asset-specific attention. No top-level license text was found by this inventory.
- `connectkit` reports `BSD-2-Clause license` in package metadata; no top-level license text was found by this inventory. Preserve the raw value rather than silently treating it as a validated SPDX expression.
- `lucide-react` reports ISC; TypeScript reports Apache-2.0 and includes LICENSE and NOTICE.txt. Other direct packages currently report MIT metadata.
- Existing `lib/forge-std/LICENSE-MIT` and `LICENSE-APACHE` remain unchanged.
- The inspected application CSS uses system fonts. The HTML contains an inline favicon and Arc Studio attribution. This limited inspection is not an assertion that all assets or transitive dependencies have been cleared.

## Before an actual distribution

1. Inspect the exact production bundle and vendored/copied sources, not only package.json. Dev-only versus shipped code affects what belongs in a release notice.
2. Verify the applicable exact-version upstream texts where the installed package omits them; preserve all required copyright/license/notice material.
3. Review Studio-generated output rights, brand/media permissions and any non-code material separately. Do not infer endorsement or a repository-wide grant from a badge or SPDX header.
4. Have the owner choose the first-party scope and license. Add only the approved license and correctly scoped notices; keep the original upstream notices intact.

The official round requires rights to submit the work and a public repository. This review found no rule requiring MIT specifically or automatically rejecting a repository merely because AGENTS.md exists. [Official event](https://dorahacks.io/hackathon/arc-microgrants-2/detail)
