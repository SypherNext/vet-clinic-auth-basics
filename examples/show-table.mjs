// Prints the rows of one table in the portal's SQLite database, so you can
// see what the app really stores. Long values are cut to keep lines short.
//
// Usage (from app/ or a steps/ folder, after npm run seed):
//   node ../examples/show-table.mjs users email,role,password_hash
//   node ../../examples/show-table.mjs sessions
// Options: --db <file> (default: data/vet-clinic.db in the current folder)
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

const MAX_WIDTH = 44;
const args = process.argv.slice(2);
const dbIndex = args.indexOf('--db');
const file = dbIndex >= 0 ? args.splice(dbIndex, 2)[1] : 'data/vet-clinic.db';
const [table, columnList] = args;

if (!table || !/^\w+$/.test(table)) {
  console.error('Usage: node show-table.mjs <table> [column,column,...] [--db file]');
  process.exit(1);
}
if (!fs.existsSync(file)) {
  console.error(`No database at ${file}. Run npm run seed first, in the app folder.`);
  process.exit(1);
}

const db = new DatabaseSync(file, { readOnly: true });
const known = db.prepare(`SELECT name FROM pragma_table_info(?)`).all(table).map((c) => c.name);
if (known.length === 0) {
  console.error(`There is no table called ${table}.`);
  process.exit(1);
}
const columns = columnList ? columnList.split(',').filter((c) => known.includes(c)) : known;
const rows = db.prepare(`SELECT ${columns.join(', ')} FROM ${table}`).all();

const show = (value) => {
  if (value === null || value === undefined) return 'NULL';
  const text = value instanceof Uint8Array ? `<${value.length} bytes>` : String(value);
  return text.length > MAX_WIDTH ? `${text.slice(0, MAX_WIDTH - 3)}...` : text;
};
const cells = rows.map((row) => columns.map((c) => show(row[c])));
const widths = columns.map((c, i) => Math.max(c.length, ...cells.map((r) => r[i].length)));
const line = (values) => values.map((v, i) => v.padEnd(widths[i])).join('  ').trimEnd();

console.log(line(columns));
console.log(line(widths.map((w) => '-'.repeat(w))));
for (const row of cells) console.log(line(row));
console.log(`(${rows.length} row${rows.length === 1 ? '' : 's'})`);
