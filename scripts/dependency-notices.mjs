// Generate reviewable license inventory from the lockfile without running dependency code.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const rows = [];
const texts = ['# Installed dependency license and notice texts\n\nGenerated from locally installed lockfile packages. Dependencies keep their own terms. Missing platform-specific packages must be reviewed from upstream before redistributing their binaries.\n'];
const packagesRoot = resolve('node_modules');
for (const [location, entry] of Object.entries(lock.packages)) {
  if (!location.startsWith('node_modules/')) continue;
  const directory = resolve(location);
  if (!relative(packagesRoot, directory) || relative(packagesRoot, directory).startsWith('..')) throw new Error('Unexpected dependency location');
  const name = entry.name ?? location.split('node_modules/').at(-1);
  const license = typeof entry.license === 'string' ? entry.license : 'Review upstream';
  rows.push([name, entry.version, license, entry.dev ? 'Development' : 'Runtime']);
  let files;
  try { files = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  for (const file of files.filter(file => file.isFile() && /^(licen[cs]e|notice|copying)([.\-_]|$)/i.test(file.name))) {
    const text = await readFile(resolve(directory, file.name), 'utf8');
    texts.push(`\n## ${name}@${entry.version} — ${file.name}\n\n${text.trimEnd()}\n`);
  }
}
rows.sort((a,b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
const intro = `# Third-party dependency notices\n\nProject-authored source is Apache-2.0. Dependencies and assets retain their own terms; this file does not relicense them. Generated from the committed lockfile and installed package metadata. Full available notice texts are in docs/release/dependency-licenses.txt; the CycloneDX inventory is docs/release/sbom.cdx.json.\n\nGSAP uses its separate [Standard no-charge license](https://gsap.com/standard-license). Development-only axe-core uses MPL-2.0 and is not shipped in the application bundle. This checkout does not vendor node_modules; package managers fetch libraries under their own terms. Review those terms before redistribution.\n\n| Package | Version | Declared license | Scope |\n|---|---|---|---|\n`;
await writeFile('THIRD_PARTY_NOTICES.md', intro + rows.map(row => `| ${row.join(' | ')} |`).join('\n') + '\n');
await writeFile('docs/release/dependency-licenses.txt', texts.join('').split('\n').map(line=>line.trimEnd()).join('\n').trimEnd()+'\n');
process.stdout.write(`Updated inventory for ${rows.length} locked packages.\n`);
