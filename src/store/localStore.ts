import * as fs from 'fs';
import * as path from 'path';
import { DATA_DIR } from '../config';
import type { Datastore, Row } from '../types';

const SEED_PATH = path.join(DATA_DIR, 'seed.json');
const DB_PATH = path.join(DATA_DIR, 'db.json');

export const TABLES = [
  'ApiKeys', 'OrgUsers', 'Accounts', 'CashBalances', 'Positions',
  'Orders', 'Funds', 'CustomerApplications', 'RiskSettings',
  'Contracts', 'Fees', 'Alerts',
] as const;

type DB = Record<string, Row[] | Row>;

function load(): DB {
  if (!fs.existsSync(DB_PATH)) {
    const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
    const db: DB = {};
    for (const t of TABLES) db[t] = seed[t] || [];
    db._meta = seed._meta || {};
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}
function save(db: DB): void { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); }
function rows(db: DB, table: string): Row[] { return (db[table] as Row[]) || []; }

export const store: Datastore = {
  backend: 'local',
  async list(table, where) {
    let out = rows(load(), table);
    if (where) out = out.filter((r) => Object.keys(where).every((k) => String(r[k]) === String(where[k])));
    return out;
  },
  async getById(table, id) {
    return rows(load(), table).find((r) => String(r.id) === String(id)) || null;
  },
  async findOne(table, where) {
    return (await this.list(table, where))[0] || null;
  },
  async insert(table, obj) {
    const db = load();
    const list = rows(db, table);
    if (obj.id == null) {
      const max = list.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
      obj.id = max + 1;
    }
    list.push(obj);
    db[table] = list;
    save(db);
    return obj;
  },
  async update(table, id, patch) {
    const db = load();
    const row = rows(db, table).find((r) => String(r.id) === String(id));
    if (!row) return null;
    Object.assign(row, patch);
    save(db);
    return row;
  },
  async meta() { return (load()._meta as Row) || {}; },
  async reset() {
    const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
    const db: DB = { _meta: seed._meta || {} };
    for (const t of TABLES) db[t] = seed[t] || [];
    save(db);
    return true;
  },
};
