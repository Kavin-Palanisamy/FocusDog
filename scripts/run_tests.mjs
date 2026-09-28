import { build } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

async function runTestFile(entryRelPath, outName) {
  const outDir = path.join(root, 'dist');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outFile = path.join(outDir, outName);

  await build({
    root,
    build: {
      lib: {
        entry: path.join(root, entryRelPath),
        formats: ['es'],
        fileName: () => outName,
      },
      outDir,
      emptyOutDir: false,
      minify: false,
      rollupOptions: {
        external: ['path', 'fs', 'child_process', 'crypto'],
      },
    },
    logLevel: 'error',
  });

  const output = execSync('node "' + outFile + '"', { encoding: 'utf8' });
  console.log(output);
}

async function main() {
  console.log('Building and executing test suites...');
  await runTestFile('src/focus/__tests__/FocusEngine.test.ts', 'test_focus_engine.mjs');
  await runTestFile('src/focus/__tests__/BrowserIntegration.test.ts', 'test_browser_integration.mjs');
  await runTestFile('src/focus/__tests__/EnforcementController.test.ts', 'test_enforcement_controller.mjs');
  console.log('✅ ALL TEST SUITES PASSED FLINTLESSLY!\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
