import { route } from '../router';
import { send, fail } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { nowIso } from '../lib/time';
import { nextAccountId, genPassword } from '../services/accounts';
import { store } from '../store';
import type { Row } from '../types';

route('GET', '/v1/customerApplication/list', async (req, res) => { if (!requireAuth(req, res)) return; send(res, 200, await store.list('CustomerApplications')); });
route('GET', '/v1/customerApplication/item', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const a = await store.getById('CustomerApplications', ctx.query.id);
  a ? send(res, 200, a) : fail(res, 404, 'Application not found.');
});
route('POST', '/v1/customerApplication/create', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const b = ctx.body || {};
  if (!b.applicantEmail) return fail(res, 400, 'applicantEmail is required.');
  send(res, 200, await store.insert('CustomerApplications', { applicantEmail: b.applicantEmail, legalStatus: b.legalStatus || 'Individual', status: 'Submitted', submittedAt: nowIso(), decisionAt: null, documentsRequired: '', accountIdIssued: null, method: b.method || 'NT AOP API' }));
});
route('POST', '/v1/customerApplication/approve', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const b = ctx.body || {};
  const app = await store.getById('CustomerApplications', b.id);
  if (!app) return fail(res, 404, 'Application not found.');
  let user: Row | null = await store.findOne('OrgUsers', { email: String(app.applicantEmail) });
  if (!user) user = await store.insert('OrgUsers', { name: String(app.applicantEmail).split('@')[0], email: app.applicantEmail, firstName: '', lastName: '', userStatus: 'Active', organizationId: 5012, roles: 'Trader', professionalStatus: 'NonProfessional', timestamp: nowIso() });
  const id = await nextAccountId();
  await store.insert('Accounts', { id, name: `TAL-${id}`, userId: user.id, accountType: 'Customer', active: false, clearingHouse: 'NinjaTrader Clearing, LLC', riskCategoryId: 1, autoLiqProfileId: 2, marginAccountType: 'Speculator', legalStatus: app.legalStatus, archived: false, nickname: `${app.applicantEmail} — ${app.legalStatus}`, ownerEmail: app.applicantEmail, platformPassword: genPassword(), state: 'pending_funding', provisioning: 'provisioned', primary: false, openedDate: nowIso().slice(0, 10), timestamp: nowIso() });
  send(res, 200, await store.update('CustomerApplications', app.id, { status: 'Approved', decisionAt: nowIso(), accountIdIssued: id }));
});
