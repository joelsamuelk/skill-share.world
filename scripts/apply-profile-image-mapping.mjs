#!/usr/bin/env node

import "dotenv/config";
import fs from "fs";
import os from "os";
import path from "path";
import pg from "pg";

const { Client } = pg;

const defaultMappingPath = path.join(os.homedir(), "Downloads", "image_mapping.csv");
const defaultArchiveDir = path.resolve(process.cwd(), "data/profile_pictures/profile_pictures");

const mappingPath = process.argv[2] ?? defaultMappingPath;
const archiveDir = process.argv[3] ?? defaultArchiveDir;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
      }

      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) {
    return [];
  }

  const [headers, ...dataRows] = rows;

  return dataRows
    .filter((currentRow) => currentRow.some((value) => value.trim().length > 0))
    .map((currentRow) =>
      Object.fromEntries(headers.map((header, i) => [header, currentRow[i] ?? ""])),
    );
}

function normalizeText(value) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEmail(value) {
  const normalized = normalizeText(value);
  return normalized ? normalized.toLowerCase() : null;
}

if (!fs.existsSync(mappingPath)) {
  throw new Error(`Mapping CSV not found: ${mappingPath}`);
}

if (!fs.existsSync(archiveDir)) {
  throw new Error(`Archive directory not found: ${archiveDir}`);
}

const mappingCsv = fs.readFileSync(mappingPath, "utf8");
const rows = parseCsv(mappingCsv);

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

async function run() {
  await client.connect();
  await client.query("begin");

  try {
    let updated = 0;
    let unchanged = 0;
    let skipped = 0;
    const skippedRows = [];

    for (const row of rows) {
      const filename = normalizeText(row.filename);
      const matchedEmail = normalizeEmail(row.matched_email);
      const notes = normalizeText(row.notes) ?? "";

      if (!filename) {
        skipped += 1;
        skippedRows.push({ reason: "missing filename", row });
        continue;
      }

      const filePath = path.join(archiveDir, filename);
      if (!fs.existsSync(filePath)) {
        skipped += 1;
        skippedRows.push({ reason: "archive file missing", filename });
        continue;
      }

      if (!matchedEmail) {
        skipped += 1;
        skippedRows.push({ reason: "no matched email", filename, notes });
        continue;
      }

      const objectId = filename.replace(/\.[^.]+$/, "");
      const objectPath = `/objects/uploads/${objectId}`;

      const result = await client.query(
        `select id, profile_image_url
         from public.skill_profiles
         where lower(trim(email)) = $1
         limit 1`,
        [matchedEmail],
      );

      const profile = result.rows[0];
      if (!profile) {
        skipped += 1;
        skippedRows.push({ reason: "matched email missing in database", filename, matchedEmail });
        continue;
      }

      if (profile.profile_image_url === objectPath) {
        unchanged += 1;
        continue;
      }

      await client.query(
        `update public.skill_profiles
         set profile_image_url = $2,
             updated_at = now()
         where id = $1`,
        [profile.id, objectPath],
      );
      updated += 1;
    }

    await client.query("commit");

    console.log(
      JSON.stringify(
        {
          mappingPath,
          archiveDir,
          processedRows: rows.length,
          updated,
          unchanged,
          skipped,
          skippedRows,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
