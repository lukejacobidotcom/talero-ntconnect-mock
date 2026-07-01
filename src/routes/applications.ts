import { route } from '../router';
import { send, fail } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { nowIso } from '../lib/time';
import { provisionFromApplication } from '../services/accounts';
import { AOP, KYC, LIFECYCLE } from '../services/aop';
import { appendEvent } from '../lib/audit';
import { store } from '../store';

// Partner-facing NT Connect "Customer Applications" group — the AOP (Account Opening Process)
// API mock. NinjaTrader Clearing owns the KYC/AML decision; these endpoints model receiving an
// application and relaying approve / reject / documents-required. Talero's customer (/app) and
// back-office (/admin) layers use the same shared AOP model (services/aop.ts).

route('GET', '/v1/customerApplication/list', async (req, res) => {
  if (!requireAuth(req, res)) return;
  send(res, 200, await store.list('CustomerApplications'));
});

route('GET', '/v1/customerApplication/item', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const a = await store.getById('CustomerApplications', ctx.query.id);
  a ? send(res, 200, a) : fail(res, 404, 'Application not found.');
});

route('POST', '/v1/customerApplication/create', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const b = ctx.body || {};
  if (!b.applicantEmail) return fail(res, 400, 'applicantEmail is required.');
  const rec = await store.insert('CustomerApplications', {
    applicantEmail: String(b.applicantEmail).toLowerCase(),
    applicantName: b.applicantName || '',
    legalStatus: b.legalStatus || 'Individual',
    country: b.country || 'United States',
    status: AOP.SUBMITTED,
    kycStatus: KYC.PENDING,
    lifecycle: LIFECYCLE.APPLICATION_STARTED,
    documentsRequired: [],
    submittedAt: nowIso(),
    decisionAt: null,
    accountIdIssued: null,
    method: b.method || 'NT AOP API',
    rejectionReasonInternal: null,
  });
  send(res, 200, rec);
});

route('POST', '/v1/customerApplication/approve', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const b = ctx.body || {};
  const app = await store.getById('CustomerApplications', b.id);
  if (!app) return fail(res, 404, 'Application not found.');
  const { acct } = await provisionFromApplication(app);
  const updated = await store.update('CustomerApplications', app.id, {
    status: AOP.APPROVED, kycStatus: KYC.VERIFIED, lifecycle: LIFECYCLE.AWAITING_FUNDING,
    decisionAt: nowIso(), accountIdIssued: acct.id,
  });
  await appendEvent('application.approve', 'partner', { applicationId: app.id, accountId: acct.id });
  send(res, 200, updated);
});

route('POST', '/v1/customerApplication/reject', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const b = ctx.body || {};
  const app = await store.getById('CustomerApplications', b.id);
  if (!app) return fail(res, 404, 'Application not found.');
  const updated = await store.update('CustomerApplications', app.id, {
    status: AOP.REJECTED, kycStatus: KYC.ACTION_REQUIRED, lifecycle: LIFECYCLE.REJECTED,
    decisionAt: nowIso(), rejectionReasonInternal: b.reason || 'Compliance',
  });
  await appendEvent('application.reject', 'partner', { applicationId: app.id, reason: b.reason || 'Compliance' });
  send(res, 200, updated);
});
