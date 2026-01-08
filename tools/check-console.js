const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const contentTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.bin': 'application/octet-stream'
};

const createServer = () => {
  const server = http.createServer((req, res) => {
    const requestedPath = decodeURIComponent(req.url.split('?')[0]);
    const safePath = requestedPath === '/' ? '/astorb3d.html' : requestedPath;
    const filePath = path.join(rootDir, safePath);

    if (!filePath.startsWith(rootDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
};

const checkConsole = async () => {
  const { server, port } = await createServer();
  let browser;

  try {
    browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-webgl'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    
    const messages = [];
    page.on('console', msg => {
      messages.push(`${msg.type()}: ${msg.text()}`);
    });

    const url = `http://127.0.0.1:${port}/astorb3d.html`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    
    try {
      await page.waitForFunction(
        () => window.__astorbDataLoaded === true && window.__astorbFirstFrameRendered === true,
        { timeout: 60000 }
      );
    } catch (error) {
      console.log('Timeout waiting for render');
    }

    console.log('\n=== Console Messages ===');
    messages.forEach(msg => console.log(msg));
  } finally {
    if (browser) {
      await browser.close();
    }
    server.close();
  }
};

checkConsole().catch(console.error);
