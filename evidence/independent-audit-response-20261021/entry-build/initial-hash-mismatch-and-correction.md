# Initial output hash mismatch and correction

At approximately 2026-10-21 16:05 UTC, independent SHA-256 readback of the first generated production manifest failed. The observed tool transcript reported:

    Error: Mismatch assets/core-CQjy9Kfy.js

The check iterated `manifest.outputs`, hashed each actual `dist/${output.path}` with Node's `createHash('sha256')`, and compared that digest to the manifest entry. This failed check exited nonzero. Its raw standalone stdout file was not retained; this is a faithful excerpt from the execution transcript, not a reconstructed successful log. The preliminary build log was subsequently replaced by the corrected build log, so it is not presented as available evidence.

Cause: hashing `generateBundle` output objects captured intermediate chunk bytes before later Vite/plugin transformations. Corrective implementation: retain the declared input snapshot, then in `writeBundle` independently read each actual written output file and overwrite manifest output hashes using final bytes. The manifest itself is excluded to avoid a circular hash.

A new production build at 2026-10-21T16:05:58.182Z completed. Independent checks immediately afterward and again when persisting evidence found 84 of 84 listed outputs matching. The exact manifest and per-output verification are saved alongside this note. No source validation, remote-host identity, or acceptance claim is inferred solely from these matches.
