import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {mkdir,copyFile,rm} from 'node:fs/promises';
const target=new URL('../public/',import.meta.url),source=new URL('../dist/',import.meta.url);
for(const file of ['market.js','amazon.js','commerce-catalog.js','economics-ui.js','landing.js','partner-onboarding.js'])execFileSync(process.execPath,['--check',fileURLToPath(new URL(file,source))]);
await rm(target,{recursive:true,force:true});await mkdir(new URL('assets/',target),{recursive:true});
for(const file of ['market.html','amazon.js','commerce-catalog.js','market.js','economics-ui.js','market.css','landing.js','landing.css','partner-onboarding.js','assets/affsiwen-logo.svg','assets/switzer-variable.ttf'])await copyFile(new URL(file,source),new URL(file,target));
await copyFile(new URL('market.html',source),new URL('index.html',target));
