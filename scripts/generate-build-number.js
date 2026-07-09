#!/usr/bin/env node
/**
 * Generates a build number in the format yy-mm-dd-hh-mm from the current UTC
 * time and writes it to a JSON file that can be bundled with the app.
 */

const fs = require('fs');
const path = require('path');

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const buildNumber = `${pad(now.getUTCFullYear() % 100)}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}-${pad(now.getUTCHours())}-${pad(now.getUTCMinutes())}`;

const outputDir = path.resolve(__dirname, '../src/build-info');
const outputFile = path.join(outputDir, 'build-info.json');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const payload = {
  buildNumber,
  generatedAt: now.toISOString(),
};

fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2) + '\n');
console.log(`Build number: ${buildNumber} -> ${outputFile}`);
