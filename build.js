import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Create dist directory
mkdirSync(resolve(__dirname, 'dist'), { recursive: true });
mkdirSync(resolve(__dirname, 'dist/assets'), { recursive: true });

// Build the app
await esbuild.build({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  minify: true,
  sourcemap: false,
  target: ['es2020'],
  outfile: 'dist/assets/index.js',
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts',
    '.jsx': 'jsx',
    '.js': 'js',
    '.css': 'css',
    '.svg': 'file',
    '.png': 'file',
    '.jpg': 'file',
    '.ico': 'file'
  },
  define: {
    'process.env.NODE_ENV': '"production"',
    'import.meta.env.DEV': 'false',
    'import.meta.env.PROD': 'true'
  },
  jsx: 'automatic',
  jsxImportSource: 'react'
});

// Generate index.html
const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/liberchat/assets/liberchat-logo.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Liberchat - La Commune Numérique</title>
  <link rel="manifest" href="/liberchat/manifest.json">
  <script type="module" crossorigin src="/liberchat/assets/index.js"></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;

writeFileSync(resolve(__dirname, 'dist/index.html'), html);

// Copy public assets
try {
  cpSync(resolve(__dirname, 'public'), resolve(__dirname, 'dist'), { recursive: true });
  cpSync(resolve(__dirname, 'src/assets'), resolve(__dirname, 'dist/assets'), { recursive: true });
} catch (e) {
  console.log('Assets copy warning:', e.message);
}

console.log('✓ Build completed successfully');
