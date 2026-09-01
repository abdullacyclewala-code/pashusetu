import { createClient } from "@/lib/supabase/client";
import { localDb, type PendingReport } from "./db";

export interface SyncResult {
  synced: number;
  failed: number;
}

let inFlight: Promise<SyncResult> | null = null;

/**
 * Replays queued reports to Supabase in capture order.
 * Safe to call from anywhere, any number of times — concurrent calls
 * share one run, offline calls no-op, and every write is idempotent
 * (upsert on the client-generated id).
 */
export function syncPendingReports(): Promise<SyncResult> {
  if (inFlight) return inFlight;
  inFlight = run().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function run(): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, failed: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine) return result;

  const items = await localDb.pendingReports.orderBy("createdAt").toArray();
  if (items.length === 0) return result;

  const supabase = createClient();

  for (const item of items) {
    try {
      await pushOne(supabase, item);
      // delete only after the server confirmed — crash-safe
      await localDb.pendingReports.delete(item.id);
      result.synced++;
    } catch (err) {
      result.failed++;
      await localDb.pendingReports.update(item.id, {
        attempts: item.attempts + 1,
        lastError: err instanceof Error ? err.message : String(err),
      });
      // network-level failure? stop the run, keep order for next attempt
      if (typeof navigator !== "undefined" && !navigator.onLine) break;
    }
  }
  return result;
}

async function pushOne(
  supabase: ReturnType<typeof createClient>,
  item: PendingReport
) {
  let photo_url: string | null = null;

  if (item.photo) {
    const path = `${item.payload.reporter_id}/${item.id}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("report-photos")
      .upload(path, item.photo, {
        contentType: item.photoType ?? "image/jpeg",
        upsert: true, // idempotent retry
      });
    if (uploadError) throw new Error(`photo upload: ${uploadError.message}`);
    photo_url = supabase.storage.from("report-photos").getPublicUrl(path)
      .data.publicUrl;
  }

  const { error } = await supabase
    .from("reports")
    .upsert(
      { id: item.id, ...item.payload, photo_url },
      { onConflict: "id", ignoreDuplicates: true }
    );
  if (error) throw new Error(error.message);
}
