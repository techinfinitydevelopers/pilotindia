// Lists or lifts admin-login IP bans (blocklist.mjs). With DATABASE_URL it works on the production list.
//   DATABASE_URL=... node tools/unblock.mjs --list
//   DATABASE_URL=... node tools/unblock.mjs 203.0.113.7      (an IP, or a device id from --list)
//   DATABASE_URL=... node tools/unblock.mjs --all
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initStore, flush, close } from '../store.mjs';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
await initStore(REPO);
const { listBans, unban } = await import('../blocklist.mjs');
const arg = process.argv[2];
if (!arg || arg === '--list') {
  const bans = listBans();
  console.log(bans.length ? bans.map(b => `${b.type} ${b.id}  until ${b.until}  (${b.reason})`).join('\n') : 'no IPs are blocked');
} else {
  console.log(`removed ${unban(arg)} entr${arg === '--all' ? 'ies' : 'y'} for ${arg}`);
}
await flush(); await close();
