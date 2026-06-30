import { DATA_BACKEND } from '../config';
import type { Datastore } from '../types';

let store: Datastore;
if (DATA_BACKEND === 'sheets') {
  try {
    if (!process.env.SHEET_ID) throw new Error('SHEET_ID not set');
    store = require('./sheetsStore').store;
    console.log('[store] backend = Google Sheets (SHEET_ID=' + process.env.SHEET_ID + ')');
  } catch (e) {
    console.warn('[store] sheets backend unavailable (' + (e as Error).message + '); falling back to local JSON store.');
    store = require('./localStore').store;
  }
} else {
  store = require('./localStore').store;
  console.log('[store] backend = local JSON (data/db.json)');
}
export { store };
