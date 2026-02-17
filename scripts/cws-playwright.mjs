#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

function getArg(name, fallback = '') {
  const withEquals = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (withEquals) {
    return withEquals.slice(name.length + 1);
  }

  const idx = process.argv.indexOf(name);
  if (idx >= 0 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  return fallback;
}

function getPositionalUrl() {
  return process.argv.slice(2).find((arg) => /^https?:\/\//.test(arg)) || '';
}

function buildStartUrl(pageType, publisherId, customUrl) {
  if (customUrl) {
    return customUrl;
  }

  const base = 'https://chrome.google.com/webstore/devconsole/';
  if (pageType === 'account') {
    if (publisherId) {
      return `${base}${publisherId}/account`;
    }
    return `${base}account`;
  }

  return base;
}

function ensureProfileDir() {
  const profileDir = path.resolve(process.cwd(), '.playwright', 'cws-profile');
  fs.mkdirSync(profileDir, { recursive: true });
  return profileDir;
}

async function launchContext(profileDir) {
  try {
    return await chromium.launchPersistentContext(profileDir, {
      channel: 'chrome',
      headless: false,
      viewport: { width: 1440, height: 900 },
      args: ['--start-maximized'],
    });
  } catch (err) {
    console.warn('[CWS] Failed to launch system Chrome channel, fallback to Playwright Chromium.');
    console.warn(`[CWS] Reason: ${err.message}`);
    return chromium.launchPersistentContext(profileDir, {
      headless: false,
      viewport: { width: 1440, height: 900 },
      args: ['--start-maximized'],
    });
  }
}

async function main() {
  const pageType = getArg('--page', 'dashboard');
  const customUrl = getArg('--url', process.env.CWS_OPEN_URL || '') || getPositionalUrl();
  const publisherId = getArg('--publisher', process.env.CWS_PUBLISHER_ID || '');

  const url = buildStartUrl(pageType, publisherId, customUrl);
  const profileDir = ensureProfileDir();

  console.log(`[CWS] Start URL: ${url}`);
  console.log(`[CWS] Profile dir: ${profileDir}`);
  console.log('[CWS] If login is requested, sign in manually once. Session will be reused.');

  const context = await launchContext(profileDir);
  const page = context.pages()[0] || await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  console.log('[CWS] Browser is ready. Press Enter in this terminal to close.');
  process.stdin.resume();
  await new Promise((resolve) => process.stdin.once('data', resolve));

  await context.close();
}

main().catch((err) => {
  console.error('[CWS] Script failed:', err);
  process.exit(1);
});
