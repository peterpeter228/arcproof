/**
 * Static overview for first-time visitors. No wallet hook, RPC client or storage
 * access: it only explains the product and links to the existing screens.
 */
import { ArrowRight, FileCheck2, ShieldCheck, Wallet } from 'lucide-react';
import { BUILD_NETWORK, networkStage } from '../../arcproof/networkPolicy';
import { MainnetSampleEntry } from './MainnetSampleEntry';

const STEPS = [
  {
    serial: '01',
    title: 'Create a fixed invoice',
    body: 'The merchant sets the amount (up to 1 USDC), an expiry (up to 7 days) and is the payout address. The terms are written on chain and cannot be edited. The invoice ID is derived from chain, contract, merchant and nonce.',
  },
  {
    serial: '02',
    title: 'Pay it exactly once',
    body: 'The payer sends exactly the invoice amount. The contract forwards that invoice principal to the merchant in the same transaction without retaining it. Any pre-existing or forcibly sent balance remains locked and cannot be recovered. A second payment, a wrong amount or a late payment reverts.',
  },
  {
    serial: '03',
    title: 'Anyone re-checks the receipt',
    body: 'Payer, merchant or an accountant opens the same receipt link. The app re-reads Arc: contract code, invoice state, the payment event, both native USDC transfer legs and a finalized block. Anything missing stays “not verified”.',
  },
] as const;

const CHECKS = [
  'The contract at the trusted address runs the reviewed code',
  'The invoice is marked paid, by this payer, in this block',
  'The payment event matches invoice, payer, merchant and amount',
  'USDC moved payer → contract → merchant in that transaction',
  'The RPC’s finalized block covers the payment block',
] as const;

export function HomeScreen() {
  const mainnet = BUILD_NETWORK.key === 'mainnet';
  const stage = networkStage(BUILD_NETWORK);
  return (
    <div className="space-y-10 sm:space-y-12">
      <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]" aria-labelledby="home-title">
        <div className="space-y-5">
          <p className="ap-kicker">USDC invoices on Arc · prototype</p>
          <h2 id="home-title" className="font-display text-3xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-4xl">
            Get paid in USDC. Let anyone verify it from one link.
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-stone-700 sm:text-lg">
            ArcProof turns a payment request into a fixed on-chain invoice. The payer settles it once, in a single
            transaction that forwards USDC straight to the merchant. Afterwards, both sides can check the same receipt
            against Arc chain data instead of trusting a screenshot.
          </p>
          <div className="flex flex-wrap gap-3">
            <a className="ap-btn-primary" href="#/demo">Try the demo — no wallet <ArrowRight size={16} aria-hidden /></a>
            <a className="ap-btn-secondary" href="#/verify">Verify a receipt</a>
          </div>
          <MainnetSampleEntry />
          <p className="text-sm text-stone-600">
            {mainnet
              ? stage === 'U0' ? 'Arc Mainnet has no trusted deployment in this build. Chain reads and wallet actions are disabled.' : stage === 'R1' ? 'Arc Mainnet receipt verification is read-only. Creating and paying remain disabled until release acceptance.' : 'Arc Mainnet is enabled for this release. Real USDC and network fees are involved; review every wallet request.'
              : <>Have a wallet on Arc Testnet? <a className="ap-link ap-inline-link" href="#/invoices">Create a testnet invoice</a> with test USDC.</>}
          </p>
        </div>

        <aside className="ap-card p-5 sm:p-6" aria-labelledby="build-status-title">
          <div className="flex items-center justify-between gap-3">
            <h3 id="build-status-title" className="font-semibold text-stone-900">What this build can do</h3>
            <span className={mainnet ? 'ap-chip-caution' : 'ap-chip-neutral'}>{BUILD_NETWORK.label}</span>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3">
              <dt className="ap-field-label pt-0.5">Network</dt>
              <dd>{mainnet ? 'Arc Mainnet (5042), real USDC' : 'Arc Testnet (5042002), test USDC with no monetary value'}</dd>
            </div>
            <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3">
              <dt className="ap-field-label pt-0.5">Contract</dt>
              <dd>{stage === 'U0' ? 'Not deployed. Creating, paying and verifying are disabled.' : `Trusted ${BUILD_NETWORK.key} deployment ${BUILD_NETWORK.deployment?.deployedAt?.slice(0, 10) ?? '(unknown date)'}. ${stage === 'R1' ? 'Read-only verification; writes disabled.' : 'Wallet actions require your approval.'}`}</dd>
            </div>
            <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3">
              <dt className="ap-field-label pt-0.5">Wallet</dt>
              <dd>{stage !== 'W2' ? 'Never requested in this read-only build' : 'Only for creating or paying; verifying is read-only'}</dd>
            </div>
            <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3">
              <dt className="ap-field-label pt-0.5">Demo data</dt>
              <dd>Simulated and labelled SIMULATED / NOT VERIFIED</dd>
            </div>
            <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3">
              <dt className="ap-field-label pt-0.5">Safety</dt>
              <dd>Unaudited prototype · 1 USDC cap per invoice · no escrow or refunds</dd>
            </div>
          </dl>
          <a className="ap-link mt-3 text-sm" href="#/evidence">See build identity and evidence</a>
        </aside>
      </section>

      <section aria-labelledby="how-title" className="space-y-4">
        <h3 id="how-title" className="font-display text-xl font-semibold text-stone-900">How it works</h3>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.serial} className="ap-card p-5">
              <p className="ap-serial">{step.serial}</p>
              <h4 className="mt-1 font-semibold text-stone-900">{step.title}</h4>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="What verification means">
        <div className="ap-card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-teal-700" aria-hidden />
            <h3 className="font-semibold text-stone-900">“Verified” requires all of these</h3>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-stone-700">
            {CHECKS.map((check) => <li key={check} className="flex gap-2"><span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-700" />{check}</li>)}
          </ul>
          <p className="mt-3 text-sm text-stone-600">A transaction hash, a success status or a matching number on its own is never enough. Checks rely on the Arc RPC’s answers; they are not an independent consensus proof.</p>
        </div>
        <div className="ap-card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <FileCheck2 size={18} className="text-stone-700" aria-hidden />
            <h3 className="font-semibold text-stone-900">What a receipt does not prove</h3>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-stone-700">
            <li>Delivery of goods or services</li>
            <li>A tax invoice, or the legal identity of either party</li>
            <li>Escrow, refunds or dispute handling (none exist)</li>
            <li>Customer revenue or independent parties: controlled_demo identifies same-address self-payment only; two addresses can still have the same operator</li>
          </ul>
        </div>
      </section>

      <section className="ap-card p-5 sm:p-6" aria-labelledby="why-arc-title">
        <div className="flex items-center gap-2">
          <Wallet size={18} className="text-stone-700" aria-hidden />
          <h3 id="why-arc-title" className="font-semibold text-stone-900">Why it is built on Arc</h3>
        </div>
        <ul className="mt-3 grid gap-4 text-sm leading-relaxed text-stone-700 md:grid-cols-3">
          <li><strong className="block text-stone-900">USDC is the native asset</strong>Invoice amount, network fee and settlement are all USDC. Amounts use Arc’s 18-decimal native units, never mixed with the 6-decimal ERC-20 view.</li>
          <li><strong className="block text-stone-900">Deterministic finality</strong>The verifier can require a finalized block instead of guessing from a confirmation count.</li>
          <li><strong className="block text-stone-900">Public, shared facts</strong>Payer and merchant need no shared account or database: the receipt is re-derived from public chain data.</li>
        </ul>
      </section>
    </div>
  );
}
