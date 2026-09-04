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

  // If GPS was denied but the farmer kept a registered village, use that
  // village's centroid so the officer map still has an honest approximate dot.
  // A real GPS point always wins and is never replaced.
  let payload = item.payload;
  if (!payload.geo && payload.village && payload.district) {
    const { data: villagePoint } = await supabase.rpc("resolve_village_point", {
      p_village: payload.village,
      p_taluka: payload.taluka,
      p_district: payload.district,
    });
    if (typeof villagePoint === "string" && villagePoint.startsWith("SRID=4326;POINT(")) {
      payload = { ...payload, geo: villagePoint };
    }
  }

  const { error } = await supabase
    .from("reports")
    .upsert(
      { id: item.id, ...payload, photo_url },
      { onConflict: "id", ignoreDuplicates: true }
    );
  if (error) throw new Error(error.message);

  // Persist visual inference as its own row only after the report exists.
  // The RPC validates ownership and model output; it never modifies the
  // independently generated rule-engine result or report urgency.
  if (item.imageScreen) {
    const { error: imageError } = await supabase.rpc("save_image_model_result", {
      p_report_id: item.id,
      p_result: item.imageScreen,
    });
    // During a rolling deploy the client may arrive before migration 0015.
    // Do not strand an otherwise-synced health report if PostgREST has not
    // discovered the new RPC yet; all other persistence errors remain retryable.
    if (imageError && imageError.code !== "PGRST202") {
      throw new Error(`image screen: ${imageError.message}`);
    }
  }
}
