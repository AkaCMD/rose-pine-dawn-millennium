import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';

const root = new URL('../', import.meta.url);
const check = process.argv.includes('--check');
const manifest = JSON.parse(await readFile(new URL('skin.json', root), 'utf8'));
const paths = [...new Set(manifest.Patches.flatMap(patch => patch.TargetCss))];

// Compile every entry before writing so a Sass error leaves the shipped CSS intact.
const stylesheets = paths.map(path => {
  if (!/^css\/[\w-]+\.css$/.test(path)) throw new Error(`Unsupported CSS output: ${path}`);
  const source = new URL(path.replace(/^css\//, 'scss/').replace(/\.css$/, '.scss'), root);
  const { css } = compile(fileURLToPath(source), { style: 'expanded', charset: false });
  return { path, css: `${css}\n` };
});

if (!check) await mkdir(new URL('css/', root), { recursive: true });
for (const { path, css } of stylesheets) {
  const output = new URL(path, root);
  if (check) {
    const current = await readFile(output, 'utf8').catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (current !== css) {
      console.error(`${path} is out of date. Run npm run build.`);
      process.exitCode = 1;
    }
  } else {
    await writeFile(output, css);
    console.log(`Built ${path}`);
  }
}
