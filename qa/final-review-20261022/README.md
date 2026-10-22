# 2026-10-22 final review: browser QA scripts

These scripts produced `evidence/final-review/final-review-20261022T022241Z/{browser,ui-metrics,screenshots}`. They are QA tooling, not application source, and are not part of the Studio sync list.

- `accept.mjs`: 23 real-browser acceptance checks. It blocks and counts every non-localhost request.
- `shoot.mjs`: screenshots plus layout, contrast, target-size and heading metrics at 375/768/1440. It was written by the independent UI reviewer.
- `perf.mjs`: cold-cache localhost timing (median of N runs). This is not a Lighthouse score.
- `sandbox-check.mjs`: prints `chrome://sandbox`.
- `harness/`: builds the real receipt UI with a canned verifier (`stub-testnetClient.ts`), so receipt states can be shown without RPC. The output is a fixture and never evidence of a payment.

## Run (root shell; Chrome keeps its sandbox by running as the unprivileged `ubuntu` user)

```sh
S=$(mktemp -d); R=$(pwd)
VITE_ARCPROOF_NETWORK=testnet bun x vite build --outDir $S/t
VITE_ARCPROOF_NETWORK=mainnet bun x vite build --outDir $S/m
bun x vite preview --outDir $S/t --port 4190 --host 127.0.0.1 --strictPort &
bun x vite preview --outDir $S/m --port 4191 --host 127.0.0.1 --strictPort &
P=$(mktemp -d); chmod 777 $P; D=$(mktemp -d); chmod 777 $D
runuser -u ubuntu -- google-chrome --headless=new --user-data-dir=$P/prof \
  --remote-debugging-port=9334 --remote-debugging-address=127.0.0.1 about:blank &
CDP_PORT=9334 node qa/final-review-20261022/sandbox-check.mjs
CDP_PORT=9334 TESTNET_URL=http://127.0.0.1:4190/ MAINNET_URL=http://127.0.0.1:4191/ \
  node qa/final-review-20261022/accept.mjs $S/accept $D
# optional receipt-state fixtures
HARNESS_ROOT=$R HARNESS_OUT=$S/h bun x vite build --config qa/final-review-20261022/harness/vite.config.mjs
```

Never pass `--no-sandbox`. Stop the preview servers and Chrome when you are done.
