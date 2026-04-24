import { createClient } from "@supabase/supabase-js";

import { loadLocalEnv } from "./load-env.mjs";

loadLocalEnv();

const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CHECKIN_STORAGE_BUCKET",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing ${key}.`);
    process.exit(1);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

const schemaProbe = await supabase
  .from("check_ins")
  .select(
    [
      "id",
      "status",
      "extract_request_id",
      "review_status",
      "submission_status",
      "export_status",
      "email_status",
      "error_message",
      "submitted_at",
    ].join(","),
  )
  .limit(1);

if (schemaProbe.error) {
  console.error("Supabase schema probe failed.");
  console.error(schemaProbe.error.message);
  process.exit(1);
}

const buckets = await supabase.storage.listBuckets();

if (buckets.error) {
  console.error("Supabase storage probe failed.");
  console.error(buckets.error.message);
  process.exit(1);
}

const bucketExists = buckets.data.some(
  (bucket) => bucket.name === process.env.CHECKIN_STORAGE_BUCKET,
);

if (!bucketExists) {
  console.error(
    `Storage bucket ${process.env.CHECKIN_STORAGE_BUCKET} was not found.`,
  );
  process.exit(1);
}

console.log("Supabase integration check passed.");
console.log(`Bucket: ${process.env.CHECKIN_STORAGE_BUCKET}`);
console.log("Schema fields for check_ins are available.");
