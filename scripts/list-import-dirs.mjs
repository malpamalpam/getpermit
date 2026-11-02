/**
 * List top-level directories in a source folder — helper for import planning.
 *
 * Usage:
 *   node scripts/list-import-dirs.mjs "C:\Users\gstep\Desktop\Cudzoziemcy ALl\Cudzoziemcy E-J"
 *   node scripts/list-import-dirs.mjs "C:\Users\gstep\Desktop\Cudzoziemcy ALl\Cudzoziemcy K-Z"
 */
import * as fs from "fs";
import * as path from "path";

const sourceDir = process.argv[2];
if (!sourceDir) {
  console.error("Usage: node scripts/list-import-dirs.mjs <path>");
  process.exit(1);
}

function countFiles(dir) {
  let count = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) count += countFiles(path.join(dir, e.name));
      else count++;
    }
  } catch { /* skip */ }
  return count;
}

const dirs = fs.readdirSync(sourceDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort((a, b) => a.localeCompare(b, "pl"));

console.log(`Total directories: ${dirs.length}\n`);
for (const d of dirs) {
  const files = countFiles(path.join(sourceDir, d));
  console.log(`  ${d}  (${files} files)`);
}
