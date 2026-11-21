import Database from "better-sqlite3";

const db = new Database("server/tasks.db", { readonly: true });
const rows = db.prepare("SELECT * FROM tasks").all();

console.log(`Rows in tasks table: ${rows.length}`);
console.table(rows);