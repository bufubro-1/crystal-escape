import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const port = Number(process.argv[2] ?? 4173);
const files = new Map([
  ['/', ['public/index.html', 'text/html']],
  ['/style.css', ['public/style.css', 'text/css']],
  ['/src/ui.js', ['src/ui.js', 'text/javascript']],
  ['/src/game.js', ['src/game.js', 'text/javascript']],
  ['/src/maps.js', ['src/maps.js', 'text/javascript']],
]);

createServer(async (request, response) => {
  const target = files.get(request.url.split('?')[0]);
  if (!target) {
    response.writeHead(404).end('Not found');
    return;
  }

  try {
    const [file, contentType] = target;
    const body = await readFile(new URL(`../${file}`, import.meta.url));
    response.writeHead(200, { 'Content-Type': `${contentType}; charset=utf-8` }).end(body);
  } catch (error) {
    console.error(error.message);
    response.writeHead(500).end('Could not read the game asset.');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Crystal Escape is available at http://127.0.0.1:${port}`);
});
