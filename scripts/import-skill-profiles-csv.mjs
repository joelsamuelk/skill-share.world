#!/usr/bin/env node

import "dotenv/config";
import fs from "fs";
import os from "os";
import path from "path";
import pg from "pg";

const { Client } = pg;

const defaultCsvPath = path.join(os.homedir(), "Downloads", "st-basils-skills-profiles.csv");
const csvPath = process.argv[2] ?? defaultCsvPath;

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

function parseKeySkills(value) {
  const normalized = (value ?? "")
    .split(/[\n,]+/g)
    .map((item) => item.trim())
    .filter(Boolean);

  return [...new Set(normalized)];
}

function splitName(fullName) {
  const trimmed = (fullName ?? "").trim();
  if (!trimmed) {
    return { firstName: null, lastName: null };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

if (!fs.existsSync(csvPath)) {
  throw new Error(`CSV file not found: ${csvPath}`);
}

const csvText = fs.readFileSync(csvPath, "utf8");
const records = parseCsv(csvText);

if (records.length === 0) {
  throw new Error(`No rows found in ${csvPath}`);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

async function ensureUser(email, name) {
  if (!email) {
    return null;
  }

  const existing = await client.query(
    `select id, first_name, last_name
     from public.users
     where lower(trim(email)) = $1
     limit 1`,
    [email],
  );

  if (existing.rows[0]) {
    return existing.rows[0].id;
  }

  const { firstName, lastName } = splitName(name);
  const inserted = await client.query(
    `insert into public.users (
       id,
       email,
       first_name,
       last_name,
       is_admin,
       created_at,
       updated_at
     ) values ($1, $2, $3, $4, false, now(), now())
     returning id`,
    [crypto.randomUUID(), email, firstName, lastName],
  );

  return inserted.rows[0].id;
}

async function run() {
  await client.connect();
  await client.query("begin");

  try {
    let insertedProfiles = 0;
    let updatedProfiles = 0;
    let insertedUsers = 0;

    const initialUsers = await client.query(`select count(*)::int as count from public.users`);

    for (const record of records) {
      const name = normalizeText(record.Name);
      const occupation = normalizeText(record.Occupation);
      const email = normalizeEmail(record.Email);
      const phone = normalizeText(record.Phone);
      const weeklyHours = normalizeText(record["Weekly Hours"]);
      const status = normalizeText(record.Status) ?? "approved";
      const keySkills = parseKeySkills(record["Key Skills"]);

      if (!name || !occupation || !email || keySkills.length === 0) {
        throw new Error(`Missing required fields for record: ${JSON.stringify(record)}`);
      }

      const existingProfileResult = await client.query(
        `select id, user_id
         from public.skill_profiles
         where lower(trim(email)) = $1
         order by created_at asc
         limit 1`,
        [email],
      );

      const existingProfile = existingProfileResult.rows[0];
      let userId = existingProfile?.user_id ?? null;

      if (!userId) {
        const beforeUsers = await client.query(`select count(*)::int as count from public.users`);
        userId = await ensureUser(email, name);
        const afterUsers = await client.query(`select count(*)::int as count from public.users`);
        insertedUsers += afterUsers.rows[0].count - beforeUsers.rows[0].count;
      }

      if (existingProfile) {
        await client.query(
          `update public.skill_profiles
           set user_id = coalesce(user_id, $2),
               name = $3,
               occupation = $4,
               email = $5,
               phone = $6,
               key_skills = $7,
               weekly_hours = $8,
               status = $9::varchar,
               contact_method = coalesce(nullif(contact_method, ''), 'email'),
               agree_to_contact = coalesce(agree_to_contact, true),
               approved_at = case
                 when approved_at is null and $9::varchar = 'approved' then now()
                 else approved_at
               end,
               updated_at = now()
           where id = $1`,
          [
            existingProfile.id,
            userId,
            name,
            occupation,
            email,
            phone,
            keySkills,
            weeklyHours,
            status,
          ],
        );
        updatedProfiles += 1;
        continue;
      }

      await client.query(
        `insert into public.skill_profiles (
           id,
           user_id,
           name,
           is_member,
           occupation,
           key_skills,
           contact_method,
           email,
           phone,
           weekly_hours,
           agree_to_contact,
           status,
           approved_at,
           created_at,
           updated_at
         ) values (
           $1,
           $2,
           $3,
           'yes',
           $4,
           $5,
           'email',
           $6,
           $7,
           $8,
           true,
           $9::varchar,
           case when $9::varchar = 'approved' then now() else null end,
           now(),
           now()
         )`,
        [
          crypto.randomUUID(),
          userId,
          name,
          occupation,
          keySkills,
          email,
          phone,
          weeklyHours,
          status,
        ],
      );
      insertedProfiles += 1;
    }

    await client.query("commit");

    const finalUsers = await client.query(`select count(*)::int as count from public.users`);
    const finalProfiles = await client.query(
      `select count(*)::int as count from public.skill_profiles where status = 'approved'`,
    );

    console.log(
      JSON.stringify(
        {
          csvPath,
          processedRows: records.length,
          insertedProfiles,
          updatedProfiles,
          insertedUsers,
          totalUsersBefore: initialUsers.rows[0].count,
          totalUsersAfter: finalUsers.rows[0].count,
          approvedProfilesAfter: finalProfiles.rows[0].count,
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
