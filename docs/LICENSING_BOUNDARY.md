# Licensing and provenance boundary (IP-01)

No repository-wide open-source license has been selected or granted by this work. No root LICENSE or NOTICE was invented, and no material was published. Public release/commercial reuse remains blocked on the owner's decision and an asset-by-asset provenance review. This is a project inventory, not legal advice or a finding of infringement.

| Material | What is established | What remains unresolved |
| --- | --- | --- |
| `contracts/ArcProofInvoices.sol` | Existing source carries `SPDX-License-Identifier: MIT`; its header is retained. | That file's identifier does not license the whole repository or establish rights to unrelated assets. |
| OpenZeppelin contract dependency | Declared dependency and its own upstream license remain separate. | Reconfirm exact shipped version, notices and distribution obligations when choosing a release scope. |
| `lib/forge-std` | Existing `LICENSE-MIT` and `LICENSE-APACHE` remain intact. | Preserve upstream attribution and inspect any copied source in an eventual distributable. |
| Application/frontend and new patches | Original Studio scaffold and later changes are distinguished in source/evidence records. | Owner must decide the license and confirm rights/terms for the intended release, including generated output. No MIT grant is inferred from the Solidity header. |
| Studio/Circle/Arc names, badge, logo or other branding | Existing attribution is not a declaration that the project owns the brands. | Verify applicable branding/usage terms and rights; retaining a badge does not imply endorsement. |
| Documents and original source pack | Historical provenance and original files are retained. | Confirm which text/media may be redistributed and under what license; no blanket reuse grant is assumed. |
| npm packages and fonts/assets | Each third-party component has its own license/notice boundary. | Produce a release-specific dependency and asset inventory, retain required notices, and identify any unverified source. |

Before public release, the owner must choose: which first-party files to license, the license terms, exclusions for brand/media assets, copyright holder/attribution, and whether third-party permissions/terms allow the intended redistribution. Keep current package licenses and upstream notices; do not replace them with a blanket project statement.

This boundary document does not itself accept new terms, change rights, authorize publication, or close IP-01. See the [audit closure matrix](AUDIT_CLOSURE_MATRIX.md).
