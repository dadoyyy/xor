import fs from "fs";
import path from "path";

const fullDumpPath = path.resolve("backups/backup_20261108.sql");
const content = fs.readFileSync(fullDumpPath, "utf8");

const splitMarker = "-- 2. Data Records (Exported directly from live remote database)";
const parts = content.split(splitMarker);

const schemaContent = parts[0].trim() + "\n";
const dataContent = "-- Data Only Dump (2026-11-08)\n" + splitMarker + "\n" + (parts[1] || "").trim() + "\n";

fs.writeFileSync(path.resolve("backups/backup_20261108_schema.sql"), schemaContent, "utf8");
fs.writeFileSync(path.resolve("backups/backup_20261108_data.sql"), dataContent, "utf8");

const fullStat = fs.statSync(fullDumpPath);
const schemaStat = fs.statSync("backups/backup_20261108_schema.sql");
const dataStat = fs.statSync("backups/backup_20261108_data.sql");

console.log("Full dump:", fullStat.size, "bytes");
console.log("Schema dump:", schemaStat.size, "bytes");
console.log("Data dump:", dataStat.size, "bytes");

