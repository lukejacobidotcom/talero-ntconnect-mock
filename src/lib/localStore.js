'use strict';
// Local JSON-file datastore. Default backend so the mock runs with zero credentials.
// Mirrors the exact tab/column shape of the Google Sheets backend, so swapping
// DATA_BACKEND=sheets changes nothing about the API behaviour.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const SEED_PATH = path.join(DATA_DIR, 'seed.json');
const DB_PATH = path.join(DATA_DIR, 'db.json');

// Tables that hold records (everything in seed.json except the _meta block).
const TABLES = [
  'ApiKeys', 'OrgUsers', 'Accounts', 'CashBalances', 'Positions',
  'Orders', 'Funds', 'CustomerApplications', 'RiskSettings',
  'Contracts', 'Fees', 'Alerts'
];

function load() {
  if (!fs.existsSync(DB_PATH)) {
    const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
    const db = {};
    for (const t of TABLES) db[t] = seed[t] || [];
    db._meta = seed._meta || {};
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function save(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

const api = {
  backend: 'local',

  async list(table, where) {
    const db = load();
    let rows = db[table] || [];
    if (where) {
      rows = rows.filter((r) =>
        Object.keys(where).every((k) => String(r[k]) === String(where[k]))
      );
    }
    return rows;
  },

  async getById(table, id) {
    const db = load();
    return (db[table] || []).find((r) => String(r.id) === String(id)) || null;
  },

  async findOne(table, where) {
    const rows = await api.list(table, where);
    return rows[0] || null;
  },

  async insert(table, obj) {
    const db = load();
    db[table] = db[table] || [];
    if (obj.id == null) {
      const max = db[table].reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
      obj.id = max + 1;
    }
    db[table].push(obj);
    save(db);
    return obj;
  },

  async update(table, id, patch) {
    const db = load();
    const row = (db[table] || []).find((r) => String(r.id) === String(id));
    if (!row) return null;
    Object.assign(row, patch);
    save(db);
    return row;
  },

  async meta() {
    return load()._meta || {};
  },

  // Reset db.json back to seed.json (handy between demos / tests).
  async reset() {
    if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
    load();
    return true;
  }
};

module.exports = { store: api, TABLES };
