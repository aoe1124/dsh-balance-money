import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const result=await build({entryPoints:['src/client.jsx'],bundle:true,format:'cjs',write:false,external:['react'],target:'es2022',legalComments:'inline'});
const css=await readFile('src/style.css','utf8');
// DSH's standard factory wrapper: React is provided by the host module graph.
const prefix=`window.__ModuleLoader__.load({id:"dsh-balance-money",factory:(require)=>{var module={exports:{}};var exports=module.exports;\n`;
const style=`\nif(typeof document!=="undefined"){const style=document.createElement("style");style.dataset.plugin="dsh-balance-money";style.textContent=${JSON.stringify(css)};document.head.append(style);}\n`;
await mkdir('lib',{recursive:true});
await writeFile('lib/client.js',prefix+result.outputFiles[0].text+style+'return module.exports;}});\n');
