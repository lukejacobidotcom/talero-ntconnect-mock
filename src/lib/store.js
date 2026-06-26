'use strict';
// Datastore selector. DATA_BACKEND = 'local' (default) | 'sheets'.
// Falls back to local automatically if 'sheets' is requested without credentials.
const backend = (process.env.DATA_BACKEND || 'local').toLowerCase();

let store;
if (backend === 'sheets') {
  try {
    if (!process.env.SHEET_ID) throw new Error('SHEET_ID not set');
    store = require('./sheetsStore').store;
    console.log('[store] backend = Google Sheets (SHEET_ID=' + process.env.SHEET_ID + ')');
  } catch (e) {
    console.warn('[store] sheets backend unavailable (' + e.message + '); falling back to local JSON store.');
    store = require('./localStore').store;
  }
} else {
  store = require('./localStore').store;
  console.log('[store] backend = local JSON (data/db.json)');
}

module.exports = { store };
