import { getServerEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function uploadBucketFile(
  storagePath: string,
  buffer: Buffer,
  contentType: string,
) {
  const env = getServerEnv();
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.storage
    .from(env.CHECKIN_STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }
}

export async function downloadBucketFile(
  storagePath: string,
  options?: { allowMissing?: boolean },
) {
  const env = getServerEnv();
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.storage
    .from(env.CHECKIN_STORAGE_BUCKET)
    .download(storagePath);

  if (error) {
    if (options?.allowMissing && /not found/i.test(error.message)) {
      return null;
    }

    throw new Error(`Storage download failed: ${error.message}`);
  }

  return Buffer.from(await data.arrayBuffer());
}
