import type { IncomingMessage, ServerResponse } from 'http';

/** A datastore record. The mock store is schemaless, so records are open maps. */
export type Row = Record<string, unknown>;

/** Per-request context passed to every route handler. */
export interface Ctx {
  query: Record<string, string>;
  body: Record<string, unknown>;
}

export type Handler = (req: IncomingMessage, res: ServerResponse, ctx: Ctx) => void | Promise<void>;

export interface Route {
  method: 'GET' | 'POST';
  path: string;
  handler: Handler;
}

/** JWT claims we issue. */
export interface Claims {
  sub: string | number;
  name?: string;
  email?: string;
  cid?: number;
  orgId?: number;
  env?: string;
  scopes?: string;
  iat?: number;
  exp?: number;
}

export interface Datastore {
  backend: string;
  list(table: string, where?: Row): Promise<Row[]>;
  getById(table: string, id: unknown): Promise<Row | null>;
  findOne(table: string, where: Row): Promise<Row | null>;
  insert(table: string, obj: Row): Promise<Row>;
  update(table: string, id: unknown, patch: Row): Promise<Row | null>;
  meta(): Promise<Row>;
  reset(): Promise<boolean>;
}
