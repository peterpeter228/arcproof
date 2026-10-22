# Receipt exports: schema 1.2

JSON is the canonical machine-readable export. It preserves all raw bigint values as decimal strings. Parse these strings with a bigint/decimal library, never a floating-point number. Unknown values are `null`, never zero. Exported flags are historical descriptions, not authority: imports require fresh verification and `importedVerified` remains false.

## Observations versus verification

- `reasonCode`, `message`, and `checks` preserve the verifier outcome, failed/unavailable stage, passed preceding checks, and unrun following checks. A passed individual check is not full settlement verification.
- `readStartedAt` and `readCompletedAt` are local millisecond timestamps around this verification read, not chain timestamps or a trusted timestamp service.
- `source` identifies the injected RPC source with a non-secret label. If the caller does not supply one, the label explicitly says the endpoint is unspecified. It is not an independent provider or consensus attestation. Do not put credentials or authenticated URLs in source labels.
- `observationScope` binds the result to chain, deployment, contract, invoice and requested transaction. The export builder refuses observations/evidence from another scope.
- `observedReceipt` and `observedInvoice` are snapshots populated only after chain/runtime, receipt/transaction identity, event/state/value, block identity, supported policy and all-log provenance gates pass. Unrelated/wrong/malformed provenance results contain no observations. Earlier failures conservatively withhold facts even if some RPC fields were returned.
- The observed receipt's `status: "success"` is the raw execution outcome, NOT settlement/finality verification. Both raw gas inputs and their integer product are preserved independently of finality. Missing/malformed/negative gas inputs remain null; zero is a legitimate known value.
- `verifiedEvidence` is null unless the full verifier succeeds. Its content is the settlement/finality evidence, also exposed under the legacy `settlementEvidence` name only on success. `verificationVerified` is false on every non-VERIFIED result. Missing or conflicting finality never becomes VERIFIED and does not erase already identity-bound observations.
- `factsBasis: "identity_bound_rpc_observation"` means the top-level facts are aliases of the same observed snapshot used by the UI. They are NOT individually relabeled verified. For example `gasFeeNative`, `blockNumber`, `blockHash`, `amountNative`, and payment fields refer to observed facts even when overall verification failed. Missing observations yield `factsBasis: "unavailable"` and null fact aliases. Requested transaction/chain/invoice identifiers remain request context, not proof they exist on chain.

## Backward compatibility

Existing 1.1 records and records without a version remain accepted by the serialization/type surface. Builders emit 1.2. Existing top-level names and CSV columns remain in place; new CSV columns are appended. Older verification objects without diagnostics use the explicit `legacy_caller_supplied` basis and do not manufacture RPC observations, checks, source, or read times. Their legacy inputs are not identity-bound evidence. This is serialization compatibility, not a trusted-import path. Consumers must branch on version/basis and rerun verification rather than trusting imported flags.

## CSV text-import protocol and precision boundary

CSV is for human-readable interchange, not the canonical evidence format. Raw integer strings are emitted byte-for-byte, but spreadsheet auto-detection may convert them to floating-point numbers and lose digits. Quoting a field does not prevent this. Existing tab-prefix escaping for formula/control prefixes remains; no `="..."` formula workaround is used, and no universal spreadsheet formula-safety claim is made.

1. Keep the original JSON as the machine evidence.
2. Use the spreadsheet's explicit text/CSV import flow rather than opening the CSV directly. Set **all columns to Text**, before importing. Disable automatic numeric and date conversion and any formula evaluation/conversion feature. Exact controls vary by application/version; follow the application's current documentation.
3. In particular, preserve amountNative, gasFeeNative, observedGasUsed, observedEffectiveGasPrice, paidAt, paidBlockNumber, blockNumber, finalizedBlockNumber, observedBlockTimestamp, identifiers and hashes as text. Do not convert these cells to numeric types after import.
4. Re-export the sheet and compare raw integer strings with the original JSON. A required regression example is gas `84487` × price `25000000001` = fee `2112175000084487`, which exceeds 15 significant digits. Test formula-prefix cells as inert text too.
5. Reject the spreadsheet round trip if any digits, identifiers, escapes or null/empty meanings change. Do not use the sheet as evidence.

Actual Microsoft Excel / Google Sheets / LibreOffice round-trip acceptance: **NOT_RUN** in this patch. Automated tests verify serializer strings and JSON bigint round trips only, not application precision, actual downloads or spreadsheet execution behavior. No real RPC, wallet action, deployment, or live settlement acceptance is established by fixture tests.

## Offline demo and browser delivery

The actual offline demo uses the same Schema 1.2 public builder as live receipts. Its registered synthetic identity retains chainId, deploymentId, contractAddress/contract and invoiceId only. All standard payment facts (including amount, merchant, payer, transaction, time, block, log index and fee) and RPC observations remain null. The page's example amount and merchant are a display model, not exported observations. No separate demo payload or changed core-field semantics is introduced.

A fixture exports mode=fixture, verificationStatus=SIMULATED_NOT_VERIFIED, verificationVerified=false, verifiedEvidence=null and importedVerified=false. Synthetic results never become proof, even if a caller supplies a success flag, transaction hash or settlement evidence.

JSON and CSV are serialized once per record and reused byte-for-byte for download, clipboard and expandable, selectable read-only text. Download feedback means only that a download was requested, not that a file was saved. When downloading or Clipboard API use is blocked, select the complete text manually. A longer Blob lifetime does not circumvent iframe restrictions. Actual browser acceptance is recorded separately from DOM/component tests.
