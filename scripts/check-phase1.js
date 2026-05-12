#!/usr/bin/env node
/**
 * Stack checks: required files and optional live /api/health probe.
 * Usage: npm run phase1:check
 * With server running: PHASE1_PROBE=1 npm run phase1:check
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const root = path.join(__dirname, '..');
const required = [
  'server/server.js',
  'client/menu/index.html',
  'client/menu/menu.js',
  'client/display/index.html',
  'client/display/display.js',
  'client/vendor/p5.min.js',
  'package.json',
  'Planning.md',
  'assets/asset-manifest.json'
];

let failed = false;
for (const rel of required) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    console.error(`Missing: ${rel}`);
    failed = true;
  }
}

const nmExpress = path.join(root, 'node_modules', 'express', 'package.json');
if (!fs.existsSync(nmExpress)) {
  console.error('Missing: node_modules (run npm install)');
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log('Project file layout: OK');

if (process.env.PHASE1_PROBE === '1') {
  const port = process.env.PORT || 3000;
  const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
    let body = '';
    res.on('data', (c) => (body += c));
    res.on('end', () => {
      try {
        const j = JSON.parse(body);
        if (!j.ok || typeof j.phase !== 'number' || j.phase < 1) {
          console.error('Unexpected health payload:', body);
          process.exit(1);
        }
        console.log('GET /api/health:', JSON.stringify(j));
      } catch (e) {
        console.error('Invalid JSON from /api/health');
        process.exit(1);
      }
    });
  });
  req.on('error', (err) => {
    console.error('Probe failed (is the server running?):', err.message);
    process.exit(1);
  });
}
