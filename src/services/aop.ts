// src/services/aop.ts
// Talero AOP (NinjaTrader Clearing Account Opening Process) — the KYC / onboarding model.
//
// Talero is the introducing broker. NinjaTrader Clearing (NTC) is the FCM and holds FINAL
// KYC/AML authority. Talero COLLECTS the application and SUBMITS it to NTC's AOP API; NTC
// returns approve / reject / documents-required. Talero only relays that outcome — it never
// approves identity and never surfaces KYC/AML reasons to the client.
//
// This module is the single source of truth for that model, shared by the partner `/v1`
// (the NT AOP API mock), the customer `/app`, and the back-office `/admin` layers.
//
// Grounded in the design files:
//   - td-onboarding.jsx        — 5-step AOP + JOURNEY, required capture, agreements
//   - ba-pages-clients.jsx     — AOP queue, lifecycle statuses, "reasons owned by NTC"
//   - docs/FCM-change-list.md  — §4 statuses (pending/incomplete/rejected), §5 KYC NTC-final

import { nowIso } from '../lib/time';

/** AOP API response vocabulary — what NTC's AOP API returns to Talero (partner contract). */
export const AOP = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  DOCUMENTS_REQUIRED: 'Documents required',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
} as const;

/** KYC identity determination — NTC-final (FCM-change-list §5). Copy must not imply Talero decides. */
export const KYC = {
  PENDING: 'Pending Review',
  VERIFIED: 'Verified',
  ACTION_REQUIRED: 'Action Required',
} as const;

/** Lifecycle status for the back-office AOP queue (ba-pages-clients APP_STATUSES). */
export const LIFECYCLE = {
  APPLICATION_STARTED: 'Application Started',
  KYC_PENDING: 'KYC Pending',
  AGREEMENTS_PENDING: 'Agreements Pending',
  AWAITING_FUNDING: 'Awaiting Funding',
  ACTIVE: 'Active',
  REJECTED: 'Rejected',
} as const;

/** Customer-facing journey (td-onboarding JOURNEY). */
export const JOURNEY = ['Submitted', 'Under review', 'Approved', 'Fund', 'Trade'] as const;

/** Required agreement keys (td-onboarding AGREEMENTS minus the optional W-8). */
export const REQUIRED_AGREEMENTS = ['cust', 'nfa', 'risk', 'suit', 'md'] as const;

/**
 * Jurisdictions NTC's AOP will not open a futures account for (sandbox simulation only —
 * the real restricted list is owned by NTC compliance).
 */
export const RESTRICTED_COUNTRIES = new Set(['Cuba', 'Iran', 'North Korea', 'Syria', 'Russia', 'Crimea']);

/** US residents supply SSN/ITIN; non-US residents must file a W-8BEN. */
export function isUS(country?: string): boolean {
  const c = String(country || '').trim().toLowerCase();
  return c === '' || c === 'united states' || c === 'usa' || c === 'us';
}

export interface AopInput {
  applicantEmail: string;
  applicantName?: string;
  legalStatus?: string;         // Individual | Joint | Entity | Corporate | IRA
  country?: string;
  idDocProvided?: boolean;      // government photo ID uploaded
  addressDocProvided?: boolean; // proof of address < 90 days
  ssnProvided?: boolean;        // SSN / ITIN captured (US)
  w8benProvided?: boolean;      // W-8BEN captured (non-US)
  agreements?: Record<string, boolean>; // accepted agreement keys
  eConsent?: boolean;           // electronic-delivery consent
  method?: string;              // 'NT AOP API' | 'Embedded iframe'
}

export interface AopDecision {
  aopResponse: string;          // AOP.* — stored as the record's `status` (partner contract)
  kycStatus: string;            // KYC.* — NTC-final identity determination
  lifecycle: string;            // LIFECYCLE.* — back-office queue status
  documentsRequired: string[];  // outstanding docs NTC needs (never a reason)
  decisionAt: string | null;
  issueAccount: boolean;        // whether a (pending-funding) account should be provisioned now
  rejectionReasonInternal: string | null; // AUDIT ONLY — never returned to the client
}

/**
 * Simulate NTC's AOP decision from the collected application. Deterministic, so demos are
 * predictable. NTC — not Talero — owns this outcome; Talero only relays it.
 */
export function evaluateSubmission(i: AopInput): AopDecision {
  const now = nowIso();
  const empty: string[] = [];

  // 1) Restricted jurisdiction -> hard reject. Client is told only "not approved".
  if (RESTRICTED_COUNTRIES.has(String(i.country || '').trim())) {
    return {
      aopResponse: AOP.REJECTED, kycStatus: KYC.ACTION_REQUIRED, lifecycle: LIFECYCLE.REJECTED,
      documentsRequired: empty, decisionAt: now, issueAccount: false,
      rejectionReasonInternal: 'Restricted jurisdiction',
    };
  }

  // 2) Missing CIP documents -> documents required (KYC pending, action required).
  const docs: string[] = [];
  if (!i.idDocProvided) docs.push('Government photo ID');
  if (!i.addressDocProvided) docs.push('Proof of address (< 90 days)');
  if (isUS(i.country)) { if (!i.ssnProvided) docs.push('SSN / ITIN'); }
  else if (!i.w8benProvided) docs.push('W-8BEN (non-US resident)');
  if (docs.length) {
    return {
      aopResponse: AOP.DOCUMENTS_REQUIRED, kycStatus: KYC.ACTION_REQUIRED, lifecycle: LIFECYCLE.KYC_PENDING,
      documentsRequired: docs, decisionAt: null, issueAccount: false, rejectionReasonInternal: null,
    };
  }

  // 3) Agreements / e-consent incomplete -> agreements pending.
  const agreed = i.agreements || {};
  const agreementsOk = REQUIRED_AGREEMENTS.every((k) => agreed[k]) && i.eConsent !== false;
  if (!agreementsOk) {
    return {
      aopResponse: AOP.UNDER_REVIEW, kycStatus: KYC.PENDING, lifecycle: LIFECYCLE.AGREEMENTS_PENDING,
      documentsRequired: empty, decisionAt: null, issueAccount: false, rejectionReasonInternal: null,
    };
  }

  // 4) Clean application -> NTC verifies, account issued, awaiting first funding.
  return {
    aopResponse: AOP.APPROVED, kycStatus: KYC.VERIFIED, lifecycle: LIFECYCLE.AWAITING_FUNDING,
    documentsRequired: empty, decisionAt: now, issueAccount: true, rejectionReasonInternal: null,
  };
}

/** Customer journey index (0..4) for a stored application. */
export function journeyIndex(app: { lifecycle?: string }): number {
  switch (app.lifecycle) {
    case LIFECYCLE.ACTIVE: return 4;
    case LIFECYCLE.AWAITING_FUNDING: return 2; // approved; next step is Fund
    case LIFECYCLE.REJECTED: return 1;
    case LIFECYCLE.APPLICATION_STARTED: return 0;
    default: return 1;                          // KYC / Agreements pending -> Under review
  }
}

/**
 * Client-safe view of an application: strips the internal rejection reason so KYC/AML
 * detail can never leak to the customer (FCM-change-list §4/§5).
 */
export function clientView(app: Record<string, unknown>): Record<string, unknown> {
  const v = { ...app };
  delete v.rejectionReasonInternal;
  return v;
}
