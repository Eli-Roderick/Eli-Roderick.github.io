/*
 Postbuild for GitHub Pages SPA:
 - Copy dist/index.html to dist/404.html to support client-side routing
 - Create dist/.nojekyll to prevent Jekyll from processing the output
*/

const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const indexHtml = path.join(dist, 'index.html');
const notFoundHtml = path.join(dist, '404.html');
const noJekyll = path.join(dist, '.nojekyll');

function ensureFileExists(p) {
  if (!fs.existsSync(p)) {
    throw new Error(`Expected file not found: ${p}`);
  }
}

function main() {
  if (!fs.existsSync(dist)) {
    throw new Error('dist directory not found. Did the build step run?');
  }
  ensureFileExists(indexHtml);

  fs.copyFileSync(indexHtml, notFoundHtml);
  fs.writeFileSync(noJekyll, '');

  console.log('Postbuild complete: 404.html and .nojekyll created.');
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
