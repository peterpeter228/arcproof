#!/usr/bin/env bash
# freeze-candidate.sh — candidate identity only (annotated tag + hash log).
#
# Lists SHA-256 of freeze-critical paths and optionally creates an annotated
# git tag. Does NOTHING destructive by default.
#
# Usage (from the repository root):
#   ./scripts/freeze-candidate.sh
#   ./scripts/freeze-candidate.sh /path/to/arcproof
#   ARCPROOF_FREEZE_EXECUTE=1 ./scripts/freeze-candidate.sh
#
# Safety:
#   - Refuses if repo path missing or dirty (unless ARCPROOF_FREEZE_ALLOW_DIRTY=1)
#   - Tag creation requires ARCPROOF_FREEZE_EXECUTE=1
#   - Never force-moves tags; never commits; never pushes
#   - A candidate tag is not mainnet acceptance, a license grant, or a contest submission
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEFAULT_REPO="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO="${1:-${DEFAULT_REPO}}"
STAMP="$(date +%Y%m%d)"
BASELINE="5ef3a8c75f8a09393783e66694d2c510313bd232"

if [[ ! -d "${REPO}/.git" ]]; then
  echo "ERROR: not a git repo: ${REPO}" >&2
  exit 1
fi

cd "${REPO}"
HEAD="$(git rev-parse HEAD)"
SHORT="$(git rev-parse --short=7 HEAD)"
TAG="candidate/${STAMP}-${SHORT}"
FREEZE_DIR="${REPO}/evidence/freeze-${STAMP}-${SHORT}"
LOG="${FREEZE_DIR}/freeze-log.txt"

DIRTY="$(git status --porcelain)"
if [[ -n "${DIRTY}" && "${ARCPROOF_FREEZE_ALLOW_DIRTY:-0}" != "1" ]]; then
  echo "ERROR: working tree dirty; refuse freeze. Set ARCPROOF_FREEZE_ALLOW_DIRTY=1 to override (not recommended)." >&2
  echo "${DIRTY}" >&2
  exit 2
fi

mkdir -p "${FREEZE_DIR}"

{
  echo "# ArcProof freeze candidate log"
  echo "# generated_at_utc=$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "# generated_at_local=$(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo "# repo=${REPO}"
  echo "# head=${HEAD}"
  echo "# baseline=${BASELINE}"
  echo "# proposed_tag=${TAG}"
  echo "# mainnet_stage=U0"
  echo "# source_snapshot_sha256=not_recomputed"
  echo "# execute=${ARCPROOF_FREEZE_EXECUTE:-0}"
  echo "# note=no mainnet claim; tag is not deploy, publish, or submission"
  echo
} | tee "${LOG}"

PATHS=(
  contracts/ArcProofInvoices.sol
  ArcProofInvoices.abi.json
  src/arcproof/arcproofAbi.ts
  src/arcproof/manifest.ts
  src/arcproof/networkReleasePolicy.ts
  src/arcproof/mainnetSample.ts
  src/arcproof/testnet.ts
  src/arcproof/networkPolicy.ts
  src/arcproof/arcSettlement.ts
  foundry.toml
  remappings.txt
  .foundry-version
  package.json
  bun.lock
  evidence/release-status.json
  evidence/deployments.json
  docs/final-delivery-20261022/submission-state.json
  docs/JUDGE_DEMO_GUIDE.md
  docs/final-delivery-20261022/VIDEO_OUTLINE.md
  docs/final-delivery-20261022/SUBMISSION_DRAFT.md
  README.md
  STATUS.md
  LICENSE
)

echo "## file hashes (sha256)" | tee -a "${LOG}"
for p in "${PATHS[@]}"; do
  if [[ -f "${p}" ]]; then
    sha256sum "${p}" | tee -a "${LOG}"
  else
    echo "MISSING ${p}" | tee -a "${LOG}"
  fi
done

echo | tee -a "${LOG}"
echo "## git" | tee -a "${LOG}"
echo "HEAD ${HEAD}" | tee -a "${LOG}"
git status --short | tee -a "${LOG}" || true

if [[ "${ARCPROOF_FREEZE_EXECUTE:-0}" == "1" ]]; then
  if git rev-parse -q --verify "refs/tags/${TAG}" >/dev/null; then
    echo "ERROR: tag already exists: ${TAG}" | tee -a "${LOG}"
    exit 3
  fi
  git tag -a "${TAG}" -m "ArcProof candidate freeze ${STAMP}; head=${HEAD}; baseline=${BASELINE}; source_snapshot_sha256=not_recomputed; mainnet=U0; no mainnet claim"
  echo "CREATED TAG ${TAG}" | tee -a "${LOG}"
  echo "NOTE: tag is local until pushed. Do not force-move it. Push with: git push origin ${TAG}" | tee -a "${LOG}"
else
  echo | tee -a "${LOG}"
  echo "DRY-RUN: no tag created. Re-run with ARCPROOF_FREEZE_EXECUTE=1 when authorized." | tee -a "${LOG}"
fi

echo "Log written to ${LOG}"
