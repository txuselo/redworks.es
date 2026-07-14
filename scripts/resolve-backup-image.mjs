import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BACKUP_ROOT = '/tmp/redworks-web-backup/wp-content/uploads';

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

let indexCache = null;
function index() {
  if (!indexCache) {
    indexCache = new Map();
    for (const path of walk(BACKUP_ROOT)) {
      const name = path.split('/').pop();
      if (!indexCache.has(name)) indexCache.set(name, path);
    }
  }
  return indexCache;
}

export function resolveBackupImage(originalUrlOrPath) {
  const filename = originalUrlOrPath.split('/').pop();
  const found = index().get(filename);
  if (!found) throw new Error(`Image "${filename}" not found anywhere under ${BACKUP_ROOT}`);
  return found;
}
