// ba-data.jsx — mock datasets for the Talero back office. Exposes window.BAData.
(function () {
  const money = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const FCM = 'NinjaTrader';

  // ---- Customers (TAL-35) ----
  const customers = [
    { id: 'CU-48201', name: 'Jordan Castillo', email: 'jordan.castillo@example.com', joined: 'May 12, 2026', country: 'United States', auth: 'Email', kyc: 'Verified', kycReview: 'Approved', hasFunded: true, hasPurchases: true },
    { id: 'CU-48244', name: 'Amara Okafor', email: 'amara.okafor@example.com', joined: 'May 20, 2026', country: 'United Kingdom', auth: 'Google', kyc: 'Verified', kycReview: 'Approved', hasFunded: true, hasPurchases: true },
    { id: 'CU-48310', name: 'Liang Wei', email: 'liang.wei@example.com', joined: 'May 28, 2026', country: 'Singapore', auth: 'Email', kyc: 'Pending Review', kycReview: 'Pending Review', hasFunded: false, hasPurchases: false },
    { id: 'CU-48355', name: 'Sofia Marchetti', email: 'sofia.m@example.com', joined: 'Jun 01, 2026', country: 'Italy', auth: 'Apple', kyc: 'Verified', kycReview: 'Approved', hasFunded: true, hasPurchases: false },
    { id: 'CU-48390', name: 'Daniel Okwu', email: 'daniel.okwu@example.com', joined: 'Jun 02, 2026', country: 'United States', auth: 'Email', kyc: 'Action Required', kycReview: 'Action Required', hasFunded: false, hasPurchases: false },
    { id: 'CU-48421', name: 'Priya Nair', email: 'priya.nair@example.com', joined: 'Jun 03, 2026', country: 'India', auth: 'Google', kyc: 'Pending Review', kycReview: 'Pending Review', hasFunded: false, hasPurchases: true },
    { id: 'CU-48455', name: 'Marcus Bell', email: 'marcus.bell@example.com', joined: 'Jun 04, 2026', country: 'United States', auth: 'Email', kyc: 'Verified', kycReview: 'Approved', hasFunded: true, hasPurchases: true },
    { id: 'CU-48478', name: 'Elena Volkov', email: 'elena.v@example.com', joined: 'Jun 05, 2026', country: 'Germany', auth: 'Email', kyc: 'Verified', kycReview: 'Approved', hasFunded: true, hasPurchases: false },
    { id: 'CU-48502', name: 'Thomas Nguyen', email: 't.nguyen@example.com', joined: 'Jun 06, 2026', country: 'United States', auth: 'Google', kyc: 'Pending Review', kycReview: 'Pending Review', hasFunded: false, hasPurchases: false },
    { id: 'CU-48533', name: 'Aisha Rahman', email: 'aisha.r@example.com', joined: 'Jun 07, 2026', country: 'United Arab Emirates', auth: 'Email', kyc: 'Verified', kycReview: 'Approved', hasFunded: true, hasPurchases: true },
    { id: 'CU-48560', name: 'Gabriel Santos', email: 'g.santos@example.com', joined: 'Jun 08, 2026', country: 'Brazil', auth: 'Apple', kyc: 'Action Required', kycReview: 'Action Required', hasFunded: false, hasPurchases: false },
    { id: 'CU-48588', name: 'Hannah Kim', email: 'hannah.kim@example.com', joined: 'Jun 09, 2026', country: 'United States', auth: 'Email', kyc: 'Verified', kycReview: 'Approved', hasFunded: true, hasPurchases: false },
  ];

  // ---- Account Applications (TAL-39) ----
  const applications = [
    { id: 'AOP-10231', created: 'Jun 09, 2026', type: 'Individual', user: 'Thomas Nguyen', email: 't.nguyen@example.com', applicant: 'Thomas A. Nguyen', account: '—', status: 'KYC Pending' },
    { id: 'AOP-10230', created: 'Jun 08, 2026', type: 'Entity', user: 'Castillo Capital LLC', email: 'ops@castillocap.com', applicant: 'Jordan Castillo', account: '—', status: 'Agreements Pending' },
    { id: 'AOP-10229', created: 'Jun 08, 2026', type: 'Individual', user: 'Gabriel Santos', email: 'g.santos@example.com', applicant: 'Gabriel Santos', account: '—', status: 'Application Started' },
    { id: 'AOP-10228', created: 'Jun 07, 2026', type: 'Individual', user: 'Priya Nair', email: 'priya.nair@example.com', applicant: 'Priya Nair', account: '—', status: 'Awaiting Funding' },
    { id: 'AOP-10227', created: 'Jun 06, 2026', type: 'Corporate', user: 'Volkov Trading GmbH', email: 'elena.v@example.com', applicant: 'Elena Volkov', account: '1912461', status: 'Active' },
    { id: 'AOP-10226', created: 'Jun 05, 2026', type: 'Individual', user: 'Liang Wei', email: 'liang.wei@example.com', applicant: 'Liang Wei', account: '—', status: 'KYC Pending' },
    { id: 'AOP-10225', created: 'Jun 04, 2026', type: 'Individual', user: 'Daniel Okwu', email: 'daniel.okwu@example.com', applicant: 'Daniel Okwu', account: '—', status: 'Rejected' },
    { id: 'AOP-10224', created: 'Jun 03, 2026', type: 'Joint', user: 'Marcus & Lena Bell', email: 'marcus.bell@example.com', applicant: 'Marcus Bell', account: '1912448', status: 'Active' },
    { id: 'AOP-10223', created: 'Jun 02, 2026', type: 'Individual', user: 'Aisha Rahman', email: 'aisha.r@example.com', applicant: 'Aisha Rahman', account: '1912440', status: 'Active' },
    { id: 'AOP-10222', created: 'Jun 01, 2026', type: 'Individual', user: 'Sofia Marchetti', email: 'sofia.m@example.com', applicant: 'Sofia Marchetti', account: '—', status: 'Awaiting Funding' },
  ];

  // ---- Brokerage Accounts (TAL-36) ----
  const brokerageAccounts = [
    { id: '1912208', created: 'May 12, 2026', accountName: 'Castillo — Individual', name: 'Jordan Castillo', fcm: FCM, status: 'Active', enabled: 'Enabled', cash: 12640.55, type: 'Individual' },
    { id: '1912240', created: 'May 20, 2026', accountName: 'Castillo Capital LLC', name: 'Jordan Castillo', fcm: FCM, status: 'Active', enabled: 'Enabled', cash: 46980.00, type: 'Entity' },
    { id: '1912380', created: 'May 24, 2026', accountName: 'Okafor — Individual', name: 'Amara Okafor', fcm: FCM, status: 'Active', enabled: 'Enabled', cash: 28115.20, type: 'Individual' },
    { id: '1912401', created: 'May 29, 2026', accountName: 'Marchetti — Individual', name: 'Sofia Marchetti', fcm: FCM, status: 'Restricted', enabled: 'Enabled', cash: 4200.00, type: 'Individual' },
    { id: '1912440', created: 'Jun 02, 2026', accountName: 'Rahman — Individual', name: 'Aisha Rahman', fcm: FCM, status: 'Active', enabled: 'Enabled', cash: 19850.75, type: 'Individual' },
    { id: '1912448', created: 'Jun 03, 2026', accountName: 'Bell — Joint', name: 'Marcus Bell', fcm: FCM, status: 'Liquidation Only', enabled: 'Disabled', cash: 980.10, type: 'Joint' },
    { id: '1912461', created: 'Jun 06, 2026', accountName: 'Volkov Trading GmbH', name: 'Elena Volkov', fcm: FCM, status: 'Active', enabled: 'Enabled', cash: 64210.00, type: 'Corporate' },
    { id: '1912470', created: 'Jun 07, 2026', accountName: 'Bell — Individual', name: 'Marcus Bell', fcm: FCM, status: 'Suspended', enabled: 'Disabled', cash: 0.00, type: 'Individual' },
  ];

  // ---- Deposits & Withdrawals (TAL-37) ----
  const deposits = [
    { id: 'DEP-77120', created: 'Jun 09, 2026', client: 'Aisha Rahman', account: '1912440', method: 'ACH', amount: 5000, status: 'Completed', ref: 'ACH-0099120' },
    { id: 'DEP-77119', created: 'Jun 09, 2026', client: 'Elena Volkov', account: '1912461', method: 'Wire', amount: 25000, status: 'Processing', ref: 'WIRE-552011' },
    { id: 'DEP-77118', created: 'Jun 08, 2026', client: 'Amara Okafor', account: '1912380', method: 'UK Faster Payments', amount: 10000, status: 'Completed', ref: 'FPS-882041' },
    { id: 'DEP-77117', created: 'Jun 08, 2026', client: 'Jordan Castillo', account: '1912208', method: 'Debit Card', amount: 1500, status: 'Completed', ref: 'DC-110044' },
    { id: 'DEP-77116', created: 'Jun 07, 2026', client: 'Sofia Marchetti', account: '1912401', method: 'SEPA', amount: 3000, status: 'Pending', ref: 'SEPA-330021' },
    { id: 'DEP-77115', created: 'Jun 06, 2026', client: 'Marcus Bell', account: '1912448', method: 'RTP', amount: 2000, status: 'Failed', ref: 'RTP-440198' },
    { id: 'DEP-77114', created: 'Jun 05, 2026', client: 'Jordan Castillo', account: '1912240', method: 'Wire', amount: 40000, status: 'Completed', ref: 'WIRE-551880' },
  ];
  const withdrawals = [
    { id: 'WDR-30551', created: 'Jun 09, 2026', client: 'Jordan Castillo', account: '1912240', method: 'Wire', amount: 8000, status: 'Pending Review', ref: 'WD-220114' },
    { id: 'WDR-30550', created: 'Jun 08, 2026', client: 'Amara Okafor', account: '1912380', method: 'UK Faster Payments', amount: 3500, status: 'Processing', ref: 'WD-220110' },
    { id: 'WDR-30549', created: 'Jun 07, 2026', client: 'Elena Volkov', account: '1912461', method: 'SEPA', amount: 12000, status: 'Pending Review', ref: 'WD-220104' },
    { id: 'WDR-30548', created: 'Jun 06, 2026', client: 'Aisha Rahman', account: '1912440', method: 'ACH', amount: 1500, status: 'Completed', ref: 'WD-220098' },
    { id: 'WDR-30547', created: 'Jun 04, 2026', client: 'Marcus Bell', account: '1912448', method: 'ACH', amount: 500, status: 'Cancelled', ref: 'WD-220090' },
    { id: 'WDR-30546', created: 'Jun 02, 2026', client: 'Jordan Castillo', account: '1912208', method: 'Wire', amount: 6000, status: 'Completed', ref: 'WD-220081' },
  ];

  // ---- Billing Transactions (TAL-34) ----
  const transactions = [
    { id: 'TX-100501', date: 'Jun 09, 2026', amount: 22.00, category: 'Subscription', payment: 'Visa ••4821', processor: 'Stripe', txid: 'pi_3PQ…a91', client: 'Jordan Castillo', status: 'Pending' },
    { id: 'TX-100499', date: 'Jun 08, 2026', amount: 11.00, category: 'Subscription', payment: 'Mastercard ••7720', processor: 'Stripe', txid: 'pi_3PQ…b02', client: 'Amara Okafor', status: 'Processed' },
    { id: 'TX-100488', date: 'Jun 07, 2026', amount: 40.00, category: 'Add-on', payment: 'Visa ••4821', processor: 'Stripe', txid: 'pi_3PQ…c14', client: 'Jordan Castillo', status: 'Processed' },
    { id: 'TX-100482', date: 'Jun 05, 2026', amount: 22.00, category: 'Subscription', payment: 'Visa ••1180', processor: 'Stripe', txid: 'pi_3PQ…d27', client: 'Elena Volkov', status: 'Processed' },
    { id: 'TX-100477', date: 'Jun 03, 2026', amount: 11.00, category: 'Subscription', payment: 'Amex ••3009', processor: 'Stripe', txid: 'pi_3PQ…e33', client: 'Aisha Rahman', status: 'Refunded' },
    { id: 'TX-100470', date: 'Jun 02, 2026', amount: 11.00, category: 'Subscription', payment: 'Mastercard ••5521', processor: 'Stripe', txid: 'pi_3PQ…f48', client: 'Marcus Bell', status: 'Failed' },
    { id: 'TX-100461', date: 'Jun 01, 2026', amount: 75.00, category: 'Add-on', payment: 'Visa ••4821', processor: 'Stripe', txid: 'pi_3PQ…g59', client: 'Sofia Marchetti', status: 'Disputed' },
  ];

  // ---- Risk flags (TAL-42) ----
  const flagTypes = ['Attempted Add Dup. Card', 'KYC Mismatch', 'IP-Jurisdiction Conflict', 'High-Velocity Withdrawal Request', 'Abnormal Deposit Pattern'];
  const flags = [
    { id: 'FL-5521', created: 'Jun 09, 2026', user: 'Gabriel Santos', email: 'g.santos@example.com', flag: 'IP-Jurisdiction Conflict', desc: 'Login IP geolocated to a restricted jurisdiction; KYC address is Brazil.', review: 'Open', reviewedBy: '—', reviewedAt: '—', notes: '' },
    { id: 'FL-5520', created: 'Jun 09, 2026', user: 'Daniel Okwu', email: 'daniel.okwu@example.com', flag: 'KYC Mismatch', desc: 'Submitted ID name differs from registration name.', review: 'Open', reviewedBy: '—', reviewedAt: '—', notes: '' },
    { id: 'FL-5519', created: 'Jun 08, 2026', user: 'Marcus Bell', email: 'marcus.bell@example.com', flag: 'High-Velocity Withdrawal Request', desc: '3 withdrawal requests within 20 minutes across 2 accounts.', review: 'Open', reviewedBy: '—', reviewedAt: '—', notes: '' },
    { id: 'FL-5518', created: 'Jun 07, 2026', user: 'Liang Wei', email: 'liang.wei@example.com', flag: 'Attempted Add Dup. Card', desc: 'Card ending 7720 already on file under another user (CU-48244).', review: 'Open', reviewedBy: '—', reviewedAt: '—', notes: '' },
    { id: 'FL-5517', created: 'Jun 06, 2026', user: 'Priya Nair', email: 'priya.nair@example.com', flag: 'Abnormal Deposit Pattern', desc: 'Five sub-$1,000 deposits in 24h from distinct funding methods.', review: 'Open', reviewedBy: '—', reviewedAt: '—', notes: '' },
    { id: 'FL-5512', created: 'Jun 03, 2026', user: 'Thomas Nguyen', email: 't.nguyen@example.com', flag: 'Attempted Add Dup. Card', desc: 'Card ending 4821 already on file under CU-48201.', review: 'Cleared', reviewedBy: 'Riley Morgan', reviewedAt: 'Jun 03, 2026 · 14:22', notes: 'Shared household card. Confirmed via support call. No action.' },
    { id: 'FL-5509', created: 'Jun 01, 2026', user: 'Gabriel Santos', email: 'g.santos@example.com', flag: 'KYC Mismatch', desc: 'DOB mismatch between application and document.', review: 'Escalated', reviewedBy: 'Riley Morgan', reviewedAt: 'Jun 01, 2026 · 09:40', notes: 'Escalated to Compliance lead for manual document review.' },
  ];

  // ---- Audit Log (TAL-40) ----
  const auditTypes = ['Withdrawal', 'Deposit', 'Application Approved', 'Application Rejected', 'Account State Change', 'KYC Status Change', 'Risk Flag Reviewed', 'Admin Action'];
  const audit = [
    { id: 'AU-90233', when: 'Jun 09, 2026 · 15:42', type: 'Account State Change', kind: 'trading', user: 'Riley Morgan', action: 'Set account 1912470 → Suspended', target: '1912470' },
    { id: 'AU-90232', when: 'Jun 09, 2026 · 15:10', type: 'Risk Flag Reviewed', kind: 'admin', user: 'Riley Morgan', action: 'Reviewed flag FL-5512 → Cleared', target: 'FL-5512' },
    { id: 'AU-90231', when: 'Jun 09, 2026 · 14:02', type: 'Application Approved', kind: 'admin', user: 'System', action: 'AOP-10227 lifecycle → Active', target: 'AOP-10227' },
    { id: 'AU-90230', when: 'Jun 09, 2026 · 11:55', type: 'KYC Status Change', kind: 'user', user: 'System', action: 'CU-48478 KYC → Approved', target: 'CU-48478' },
    { id: 'AU-90229', when: 'Jun 08, 2026 · 17:33', type: 'Withdrawal', kind: 'trading', user: 'NTC Treasury', action: 'WDR-30548 → Completed', target: 'WDR-30548' },
    { id: 'AU-90228', when: 'Jun 08, 2026 · 16:20', type: 'Account State Change', kind: 'trading', user: 'Avery Chen', action: 'Set account 1912401 → Restricted', target: '1912401' },
    { id: 'AU-90227', when: 'Jun 08, 2026 · 10:11', type: 'Deposit', kind: 'trading', user: 'System', action: 'DEP-77118 → Completed', target: 'DEP-77118' },
    { id: 'AU-90226', when: 'Jun 07, 2026 · 13:45', type: 'Application Rejected', kind: 'admin', user: 'Riley Morgan', action: 'AOP-10225 → Rejected (KYC failed)', target: 'AOP-10225' },
    { id: 'AU-90225', when: 'Jun 07, 2026 · 09:02', type: 'Admin Action', kind: 'admin', user: 'Avery Chen', action: 'Added 203.0.113.44 to Blacklisted IPs', target: 'IP 203.0.113.44' },
    { id: 'AU-90224', when: 'Jun 06, 2026 · 18:30', type: 'KYC Status Change', kind: 'user', user: 'System', action: 'CU-48390 KYC → Action Required', target: 'CU-48390' },
  ];

  // ---- Blacklister (TAL-45) ----
  const blacklist = {
    'bl-ip': [
      { id: 'b1', entity: '203.0.113.44', created: 'Jun 07, 2026' },
      { id: 'b2', entity: '198.51.100.21', created: 'Jun 02, 2026' },
      { id: 'b3', entity: '203.0.113.190', created: 'May 28, 2026' },
    ],
    'bl-user': [
      { id: 'b4', entity: 'flagged.user@example.com', created: 'Jun 05, 2026' },
      { id: 'b5', entity: 'CU-47011 · sanctioned match (OFAC SDN)', created: 'May 30, 2026' },
    ],
    'wl-ip': [{ id: 'b6', entity: '192.0.2.10 (office)', created: 'May 12, 2026' }],
    'wl-user': [{ id: 'b7', entity: 'ops@talero.com', created: 'May 12, 2026' }],
    'proc': [{ id: 'b8', entity: 'Processor: HighRiskPay Ltd', created: 'May 20, 2026' }],
  };

  // ---- IP Auditor (TAL-44) ----
  const ipAudit = [
    { id: 'i1', app: 'web · talero.com', ip: '203.0.113.44', count: 14 },
    { id: 'i2', app: 'web · talero.com', ip: '198.51.100.21', count: 9 },
    { id: 'i3', app: 'mobile · iOS', ip: '192.0.2.55', count: 6 },
    { id: 'i4', app: 'web · talero.com', ip: '203.0.113.190', count: 5 },
    { id: 'i5', app: 'mobile · Android', ip: '198.51.100.77', count: 3 },
    { id: 'i6', app: 'web · talero.com', ip: '192.0.2.10', count: 2 },
  ];

  // ---- Agreements (TAL-48) ----
  const agreements = [
    { id: 'AG-01', title: 'Talero Platform Terms of Service', version: 'v1.0', status: 'Active', trigger: 'On registration', updated: 'Jun 01, 2026', signed: 482 },
    { id: 'AG-02', title: 'Talero Market Data Subscriber Agreement', version: 'v1.1', status: 'Active', trigger: 'On market data signup', updated: 'Jun 04, 2026', signed: 311 },
    { id: 'AG-03', title: 'Talero Electronic Communications Consent', version: 'v1.0', status: 'Active', trigger: 'On AOP submission', updated: 'May 30, 2026', signed: 466 },
    { id: 'AG-04', title: 'Talero Funding Authorization Disclosure', version: 'v0.9', status: 'Draft', trigger: 'On funding initiation', updated: 'Jun 08, 2026', signed: 0 },
  ];
  const fcmAgreements = ['NTC Customer Agreement', 'NFA Risk Disclosure Statement', 'Risk Disclosure Certifications (5)', 'Suitability Questionnaire', 'Non-Professional Market Data Agreement', 'W-8BEN (non-US residents)'];

  // ---- Tournaments (TAL-38) ----
  const tournaments = [
    { id: 'T-2026-06', name: 'June Micro Futures Cup', status: 'Active', prize: '$10,000', contestants: 214, endsIn: '6d 4h', start: 'Jun 01, 2026', balance: 50000 },
    { id: 'T-2026-05B', name: 'Index Sprint — Late May', status: 'Active', prize: '$5,000', contestants: 96, endsIn: '2d 11h', start: 'May 26, 2026', balance: 25000 },
    { id: 'T-2026-07', name: 'July Energy Open', status: 'Upcoming', prize: '$15,000', contestants: 0, endsIn: '—', start: 'Jul 01, 2026', balance: 50000 },
    { id: 'T-2026-05A', name: 'May Micro Futures Cup', status: 'Ended', prize: '$10,000', contestants: 188, endsIn: '—', start: 'May 01, 2026', balance: 50000 },
    { id: 'T-2026-04', name: 'April Index Sprint', status: 'Ended', prize: '$5,000', contestants: 142, endsIn: '—', start: 'Apr 01, 2026', balance: 25000 },
  ];
  const standings = [
    { rank: 1, username: 'falcon_jc', ret: 38.2, behind: 0, prize: '$5,000', country: 'US' },
    { rank: 2, username: 'okafor_a', ret: 31.7, behind: 6.5, prize: '$2,500', country: 'UK' },
    { rank: 3, username: 'volkov_e', ret: 27.4, behind: 10.8, prize: '$1,500', country: 'DE' },
    { rank: 4, username: 'liang_w', ret: 22.0, behind: 16.2, prize: '$700', country: 'SG' },
    { rank: 5, username: 'rahman_a', ret: 18.9, behind: 19.3, prize: '$300', country: 'AE' },
  ];

  // ---- Engagement alerts (TAL-43) — empty at launch ----
  const engagementAlerts = [];

  // ---- Emails (TAL-41) — list empty; action keys from TAL-65 available ----
  const emailTemplates = [];
  const actionKeys = ['on_register', 'on_email_verification', 'on_kyc_submitted', 'on_kyc_approved', 'on_kyc_rejected',
    'on_application_submitted', 'on_application_approved', 'on_application_rejected', 'on_account_state_changed', 'on_password_reset',
    'on_deposit_initiated', 'on_deposit_confirmed', 'on_withdrawal_requested', 'on_withdrawal_approved', 'on_withdrawal_rejected',
    'on_withdrawal_completed', 'on_margin_call_warning', 'on_margin_call', 'on_margin_call_closeout',
    'on_market_data_subscription_started', 'on_market_data_subscription_cancelled', 'on_market_data_subscription_renewed',
    'on_statement_available', 'on_agreement_signature_required'];

  // ---- Shortlinks (TAL-49) — empty at launch ----
  const shortlinks = [];

  // ---- Team Management (TAL-46) ----
  const roles = [
    { id: 'r1', name: 'Super Admin', perms: { 'Full access': 'All', 'Team & roles': 'RW', 'Business admin': 'RW' }, members: 2 },
    { id: 'r2', name: 'Compliance Officer', perms: { 'Risk & flags': 'RW', 'Audit log': 'R', 'Customers / KYC': 'RW' }, members: 3 },
    { id: 'r3', name: 'Ops / Support', perms: { 'Customers': 'RW', 'Applications': 'R', 'Funding queue': 'R' }, members: 6 },
    { id: 'r4', name: 'Finance', perms: { 'Funding & withdrawals': 'R', 'Billing transactions': 'RW', 'Audit log': 'R' }, members: 2 },
    { id: 'r5', name: 'Read-Only', perms: { 'All pages': 'R', 'Actions': 'None', 'Exports': 'R' }, members: 4 },
  ];
  const members = [
    { id: 'm1', name: 'Riley Morgan', email: 'riley.morgan@talero.com', status: 'Active', twofa: 'Yes', role: 'Compliance Officer' },
    { id: 'm2', name: 'Avery Chen', email: 'avery.chen@talero.com', status: 'Active', twofa: 'Yes', role: 'Super Admin' },
    { id: 'm3', name: 'Sam Okoye', email: 'sam.okoye@talero.com', status: 'Active', twofa: 'Yes', role: 'Ops / Support' },
    { id: 'm4', name: 'Dana Brooks', email: 'dana.brooks@talero.com', status: 'Active', twofa: 'Yes', role: 'Finance' },
    { id: 'm5', name: 'Chris Vega', email: 'chris.vega@talero.com', status: 'Invited', twofa: 'No', role: 'Read-Only' },
    { id: 'm6', name: 'Morgan Lee', email: 'morgan.lee@talero.com', status: 'Active', twofa: 'Yes', role: 'Ops / Support' },
  ];

  // ---- Business Admin (TAL-50) ----
  const riskCategories = [
    { id: 'rc1', name: 'Standard Retail', accounts: 612, status: 'Active' },
    { id: 'rc2', name: 'Entity / Corporate', accounts: 48, status: 'Active' },
    { id: 'rc3', name: 'Elevated Monitoring', accounts: 14, status: 'Active' },
  ];
  const restrictedCountries = ['Cuba', 'Iran', 'North Korea', 'Syria', 'Russia', 'Belarus', 'Crimea Region', 'Myanmar'];
  const brokersFCM = [{ name: 'NinjaTrader Clearing (NTC)', role: 'Primary FCM', status: 'Active' }];

  // ---- Entity Search (TAL-33) ----

  // ---- Trading Risk profiles (NT Connect · Risks group; pre/post-trade) ----
  const riskProfiles = [
    { id: 'RP-STD', name: 'Standard Retail', category: 'Standard Retail', accounts: 612, maxPosition: 10, maxOrderQty: 5, dayLossLimit: 2500, trailingDD: 5000, marginMult: 1.0, maxOpenOrders: 20, products: 'Micros + E-minis', autoLiq: 110, mode: 'Pre + Post-trade', updated: 'Jun 04, 2026' },
    { id: 'RP-ENT', name: 'Entity / Corporate', category: 'Entity / Corporate', accounts: 48, maxPosition: 50, maxOrderQty: 25, dayLossLimit: 25000, trailingDD: 40000, marginMult: 1.0, maxOpenOrders: 80, products: 'All listed futures', autoLiq: 115, mode: 'Pre + Post-trade', updated: 'Jun 02, 2026' },
    { id: 'RP-ELV', name: 'Elevated Monitoring', category: 'Elevated Monitoring', accounts: 14, maxPosition: 3, maxOrderQty: 2, dayLossLimit: 750, trailingDD: 1500, marginMult: 1.5, maxOpenOrders: 6, products: 'Micros only', autoLiq: 105, mode: 'Pre + Post-trade', updated: 'Jun 08, 2026' },
  ];

  // ---- Scheduled / holiday halts (NT Connect · Risks group) ----
  const scheduledHalts = [
    { id: 'SH-1', name: 'Independence Day — early close', scope: 'Org-wide', date: 'Jul 03, 2026', window: '12:00 CT → EOD', status: 'Scheduled' },
    { id: 'SH-2', name: 'Elevated Monitoring review freeze', scope: 'Category · Elevated Monitoring', date: 'Jun 14, 2026', window: 'Full day', status: 'Scheduled' },
    { id: 'SH-3', name: 'Thanksgiving — early close', scope: 'Org-wide', date: 'Nov 26, 2026', window: '12:00 CT → EOD', status: 'Scheduled' },
  ];

  // ---- Market-data packages + per-user subscriptions (NT Connect · Fees / entitlements) ----
  const mdPackages = [
    { id: 'MD-CME-NP', name: 'CME Group Bundle', exchange: 'CME · CBOT · NYMEX · COMEX', tier: 'Non-Pro', price: 11, mda: true },
    { id: 'MD-CME-PRO', name: 'CME Group Bundle', exchange: 'CME · CBOT · NYMEX · COMEX', tier: 'Pro', price: 110, mda: true },
    { id: 'MD-EUREX-NP', name: 'Eurex', exchange: 'Eurex', tier: 'Non-Pro', price: 9, mda: true },
    { id: 'MD-ICE-NP', name: 'ICE Futures US', exchange: 'ICE US', tier: 'Non-Pro', price: 110, mda: true },
  ];
  const mdSubscriptions = [
    { id: 'MS-7701', customer: 'Jordan Castillo', cid: 'CU-48201', pkg: 'CME Group Bundle', tier: 'Non-Pro', status: 'Active', mda: 'Signed', started: 'May 12, 2026', renews: 'Jul 01, 2026' },
    { id: 'MS-7702', customer: 'Amara Okafor', cid: 'CU-48244', pkg: 'CME Group Bundle', tier: 'Non-Pro', status: 'Active', mda: 'Signed', started: 'May 21, 2026', renews: 'Jul 01, 2026' },
    { id: 'MS-7703', customer: 'Elena Volkov', cid: 'CU-48478', pkg: 'Eurex', tier: 'Non-Pro', status: 'Active', mda: 'Signed', started: 'Jun 05, 2026', renews: 'Jul 05, 2026' },
    { id: 'MS-7704', customer: 'Aisha Rahman', cid: 'CU-48533', pkg: 'CME Group Bundle', tier: 'Pro', status: 'Active', mda: 'Signed', started: 'Jun 07, 2026', renews: 'Jul 07, 2026' },
    { id: 'MS-7705', customer: 'Priya Nair', cid: 'CU-48421', pkg: 'CME Group Bundle', tier: 'Non-Pro', status: 'MDA Required', mda: 'Required', started: '—', renews: '—' },
    { id: 'MS-7706', customer: 'Marcus Bell', cid: 'CU-48455', pkg: 'ICE Futures US', tier: 'Non-Pro', status: 'Cancelled', mda: 'Signed', started: 'May 30, 2026', renews: '—' },
  ];

  // ---- AOP submission detail (NT Connect · Customer Applications) ----
  // API response per lifecycle status + documents the NTC AOP API flagged as outstanding
  const aopDetail = {
    'Application Started': { method: 'NT AOP API', response: 'Documents Required', docs: ['Government photo ID', 'Proof of address (< 90 days)', 'SSN / ITIN'] },
    'KYC Pending': { method: 'NT AOP API', response: 'Documents Required', docs: ['Government photo ID — resubmit (blurred)', 'Proof of address (< 90 days)'] },
    'Agreements Pending': { method: 'NT AOP API', response: 'Documents Required', docs: ['NTC Customer Agreement signature', 'NFA Risk Disclosure signature'] },
    'Awaiting Funding': { method: 'NT AOP API', response: 'Approved — pending initial funding', docs: [] },
    'Active': { method: 'NT AOP API', response: 'Approved — account issued', docs: [] },
    'Rejected': { method: 'NT AOP API', response: 'Rejected by NTC', docs: [] },
  };
  const entityTypes = [
    { v: 'users', l: 'Users — name, email, basic info' },
    { v: 'phones', l: 'Phone Numbers — number & verification' },
    { v: 'trading', l: 'Trading Accounts' },
    { v: 'payment', l: 'Payment Methods' },
    { v: 'ip', l: 'IP Addresses' },
    { v: 'bank', l: 'Bank Accounts / Funding Methods' },
    { v: 'brokerage', l: 'Brokerage Accounts' },
  ];
  const bankAccounts = [
    { id: 'BA-2201', client: 'Jordan Castillo', holder: 'Jordan Castillo', last4: '4471', routing: '••••1180', state: 'Verified', added: 'May 12, 2026' },
    { id: 'BA-2208', client: 'Amara Okafor', holder: 'Amara Okafor', last4: '8830', routing: '••••2204', state: 'Verified', added: 'May 21, 2026' },
    { id: 'BA-2215', client: 'Priya Nair', holder: 'Priya Nair', last4: '5521', routing: '••••3390', state: 'Pending', added: 'Jun 03, 2026' },
    { id: 'BA-2219', client: 'Elena Volkov', holder: 'Volkov Trading GmbH', last4: '7012', routing: '••••4471', state: 'Verified', added: 'Jun 06, 2026' },
  ];

  window.BAData = {
    money, FCM, customers, applications, brokerageAccounts, deposits, withdrawals, transactions,
    flagTypes, flags, auditTypes, audit, blacklist, ipAudit, agreements, fcmAgreements,
    tournaments, standings, engagementAlerts, emailTemplates, actionKeys, shortlinks,
    roles, members, riskCategories, restrictedCountries, brokersFCM, entityTypes, bankAccounts,
    riskProfiles, scheduledHalts, mdPackages, mdSubscriptions, aopDetail,
  };
})();
