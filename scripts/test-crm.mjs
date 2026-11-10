import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
await build({entryPoints:['tests/crm.test.ts','tests/instagram.test.ts','tests/automation.test.ts','tests/lifecycle.test.ts','tests/success.test.ts'],bundle:true,platform:'node',format:'esm',outdir:'.sites-runtime/tests',outExtension:{'.js':'.mjs'}});
const result=spawnSync(process.execPath,['--test','.sites-runtime/tests/crm.test.mjs','.sites-runtime/tests/instagram.test.mjs','.sites-runtime/tests/automation.test.mjs','.sites-runtime/tests/lifecycle.test.mjs','.sites-runtime/tests/success.test.mjs'],{stdio:'inherit'});
process.exit(result.status??1);
