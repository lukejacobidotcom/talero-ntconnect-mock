import { server, start } from './app';
import { store } from './store';
import * as token from './lib/token';

if (require.main === module) start();

export { server, start, store, token };
