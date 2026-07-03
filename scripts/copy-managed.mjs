// Cross-platform post-tsc copy: managed compiler artifacts + contract source
// into the contract package's dist so the built package is self-contained.
import { cpSync, copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const contractDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'contract');
mkdirSync(join(contractDir, 'dist'), { recursive: true });
cpSync(join(contractDir, 'src', 'managed'), join(contractDir, 'dist', 'managed'), { recursive: true });
copyFileSync(join(contractDir, 'src', 'passport.compact'), join(contractDir, 'dist', 'passport.compact'));
console.log('copied managed artifacts into contract/dist');
