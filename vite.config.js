import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

// Dev-only endpoint used by tools/export.html: the page POSTs a file and it is written to exports/.
function exportWriter() {
  return {
    name: 'export-writer',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__export', (req, res) => {
        const name = new URL(req.url, 'http://localhost').searchParams.get('name') ?? '';
        if (req.method !== 'POST' || !/^[\w-]+\.(glb|png)$/.test(name)) {
          res.statusCode = 400;
          res.end('expected POST /__export?name=<file>.glb|png');
          return;
        }
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          const dir = path.resolve(server.config.root, 'exports');
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, name), Buffer.concat(chunks));
          res.end('ok');
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [exportWriter()],
  build: {
    // three.js alone is ~600 kB minified; that's expected for this project
    chunkSizeWarningLimit: 900,
  },
});
