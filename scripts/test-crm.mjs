import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
await build({entryPoints:['tests/crm.test.ts','tests/instagram.test.ts'],bundle:true,platform:'node',format:'esm',outdir:'.sites-runtime/tests',outExtension:{'.js':'.mjs'}});
const result=spawnSync(process.execPath,['--test','.sites-runtime/tests/crm.test.mjs','.sites-runtime/tests/instagram.test.mjs'],{stdio:'inherit'});
process.exit(result.status??1);
