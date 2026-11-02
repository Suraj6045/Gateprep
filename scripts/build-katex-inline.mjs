#!/usr/bin/env node
/**
 * scripts/build-katex-inline.mjs
 *
 * One-time generation script to produce 100% self-contained KaTeX & branded font assets
 * for server-side HTML result report rendering.
 *
 * It:
 * 1. Reads KaTeX version from frontend/package.json.
 * 2. Inlines all KaTeX woff2 font files into backend/app/static/katex/katex-inline.css as base64 data URIs.
 * 3. Strips unused relative .woff and .ttf fallback references so no broken relative paths remain.
 * 4. Copies katex.min.js and auto-render.min.js verbatim to backend/app/static/katex/.
 * 5. Inlines all branded fonts (Syne, DM Sans, JetBrains Mono) into backend/app/static/fonts/fonts-inline.css.
 *
 * Note on Version-Drift:
 * If the katex dependency in frontend/package.json is updated, this script must be re-run
 * to maintain version parity. Automated tests verify this header in backend/tests/test_result_html.py.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const frontendPkgPath = path.join(rootDir, 'frontend', 'package.json');
const katexDistDir = path.join(rootDir, 'frontend', 'node_modules', 'katex', 'dist');
const katexFontsDir = path.join(katexDistDir, 'fonts');
const katexCssPath = path.join(katexDistDir, 'katex.min.css');
const katexJsPath = path.join(katexDistDir, 'katex.min.js');
const katexAutoRenderJsPath = path.join(katexDistDir, 'contrib', 'auto-render.min.js');

const backendStaticKatexDir = path.join(rootDir, 'backend', 'app', 'static', 'katex');
const backendStaticFontsDir = path.join(rootDir, 'backend', 'app', 'static', 'fonts');

const fontsCssPath = path.join(rootDir, 'frontend', 'src', 'fonts.css');
const publicFontsDir = path.join(rootDir, 'frontend', 'public', 'fonts');

// 1. Verify source files exist
if (!fs.existsSync(frontendPkgPath)) {
  console.error(`Error: frontend/package.json not found at ${frontendPkgPath}`);
  process.exit(1);
}
if (!fs.existsSync(katexCssPath)) {
  console.error(`Error: katex.min.css not found at ${katexCssPath}`);
  process.exit(1);
}
if (!fs.existsSync(fontsCssPath)) {
  console.error(`Error: fonts.css not found at ${fontsCssPath}`);
  process.exit(1);
}

const frontendPkg = JSON.parse(fs.readFileSync(frontendPkgPath, 'utf8'));
const katexVersionRaw = frontendPkg.dependencies?.katex || '0.17.0';
const katexVersion = katexVersionRaw.replace(/^[\^~]/, '');

console.log(`Building airtight inline assets for KaTeX v${katexVersion}...`);

// Ensure destination directories exist
fs.mkdirSync(backendStaticKatexDir, { recursive: true });
fs.mkdirSync(backendStaticFontsDir, { recursive: true });

// 2. Build katex-inline.css with base64 embedded woff2 fonts and stripped dead fallbacks
let katexCss = fs.readFileSync(katexCssPath, 'utf8');

// First: Strip dead relative .woff and .ttf fallback sources (e.g. ",url(fonts/...woff) format("woff")")
katexCss = katexCss.replace(/,url\((['"]?)(?:fonts\/)?[^'")]+?\.(?:woff|ttf)(['"]?)\)\s*format\((['"]?)(?:woff|truetype)(['"]?)\)/g, '');

// Second: Replace remaining url(fonts/...woff2) with base64 data URIs
katexCss = katexCss.replace(/url\((['"]?)(?:fonts\/)?([^'")]+?\.woff2)(['"]?)\)/g, (match, q1, fontFileName) => {
  const cleanName = path.basename(fontFileName);
  const fontFilePath = path.join(katexFontsDir, cleanName);
  if (fs.existsSync(fontFilePath)) {
    const fontBase64 = fs.readFileSync(fontFilePath).toString('base64');
    return `url("data:font/woff2;base64,${fontBase64}")`;
  }
  console.warn(`Warning: KaTeX font file not found: ${fontFilePath}`);
  return match;
});

// Verification check: ensure no relative url(...) remains in KaTeX CSS
const remainingRelativeUrls = katexCss.match(/url\((?!['"]?data:)[^)]+\)/g);
if (remainingRelativeUrls) {
  console.warn('Warning: Remaining relative URLs in KaTeX CSS:', remainingRelativeUrls);
} else {
  console.log('✓ Verified: 0 relative URLs remain in katex-inline.css (100% self-contained data URIs).');
}

// Add KaTeX version header for drift detection
const katexInlineCssContent = `/* KaTeX v${katexVersion} (inlined fonts) */\n` + katexCss;
const outputKatexCssPath = path.join(backendStaticKatexDir, 'katex-inline.css');
fs.writeFileSync(outputKatexCssPath, katexInlineCssContent, 'utf8');
console.log(`✓ Generated ${outputKatexCssPath} (${(katexInlineCssContent.length / 1024).toFixed(1)} KB)`);

// 3. Copy katex.min.js and auto-render.min.js
const outputKatexJsPath = path.join(backendStaticKatexDir, 'katex.min.js');
fs.copyFileSync(katexJsPath, outputKatexJsPath);
console.log(`✓ Copied katex.min.js to ${outputKatexJsPath}`);

const outputAutoRenderJsPath = path.join(backendStaticKatexDir, 'auto-render.min.js');
fs.copyFileSync(katexAutoRenderJsPath, outputAutoRenderJsPath);
console.log(`✓ Copied auto-render.min.js to ${outputAutoRenderJsPath}`);

// 4. Build fonts-inline.css with base64 embedded woff2 fonts for Syne & DM Sans
let fontsCss = fs.readFileSync(fontsCssPath, 'utf8');
fontsCss = fontsCss.replace(/url\((['"]?)(?:\/fonts\/|fonts\/)?([^'")]+?\.woff2)(['"]?)\)/g, (match, q1, fontFileName) => {
  const cleanName = path.basename(fontFileName);
  const fontFilePath = path.join(publicFontsDir, cleanName);
  if (fs.existsSync(fontFilePath)) {
    const fontBase64 = fs.readFileSync(fontFilePath).toString('base64');
    return `url("data:font/woff2;base64,${fontBase64}")`;
  }
  console.warn(`Warning: Brand font file not found: ${fontFilePath}`);
  return match;
});

const remainingBrandRelativeUrls = fontsCss.match(/url\((?!['"]?data:)[^)]+\)/g);
if (remainingBrandRelativeUrls) {
  console.warn('Warning: Remaining relative URLs in fonts CSS:', remainingBrandRelativeUrls);
} else {
  console.log('✓ Verified: 0 relative URLs remain in fonts-inline.css (100% self-contained data URIs).');
}

const outputFontsCssPath = path.join(backendStaticFontsDir, 'fonts-inline.css');
fs.writeFileSync(outputFontsCssPath, fontsCss, 'utf8');
console.log(`✓ Generated ${outputFontsCssPath} (${(fontsCss.length / 1024).toFixed(1)} KB)`);

console.log('✓ All inline assets built successfully.');
