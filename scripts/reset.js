'use strict';
// Reset the local datastore to seed state by OVERWRITING data/db.json
// (overwrite is permitted even when unlink is blocked by a synced-folder lock).
const fs = require('fs');
const path = require('path');
const DATA = path.join(__dirname, '..', 'data');
const seed = JSON.parse(fs.readFileSync(path.join(DATA, 'seed.json'), 'utf8'));
const TABLES = ['ApiKeys','OrgUsers','Accounts','CashBalances','Positions','Orders',
  'Funds','CustomerApplications','RiskSettings','Contracts','Fees','Alerts'];
const db = { _meta: seed._meta || {} };
for (const t of TABLES) db[t] = seed[t] || [];
fs.writeFileSync(path.join(DATA, 'db.json'), JSON.stringify(db, null, 2));
console.log('local db reset to seed (' + db.Accounts.length + ' accounts)');
