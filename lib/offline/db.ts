import Dexie, { type EntityTable } from "dexie";
import type { SkinScreenResult } from "@/lib/image-model/infer";

/**
 * Local offline store (IndexedDB via Dexie).
 *
 * Anchor B (offline sync correctness):
 *  - `id` is the client-generated uuid that becomes reports.id (PK on the
 *    server), so replays are idempotent — retries can never duplicate.
 *  - Reports are replayed in capture order (indexed on createdAt).
 *  - A queued item is deleted ONLY after the server confirms the write, so
 *    killing the app mid-sync loses nothing.
 */

export interface ReportPayload {
  reporter_id: string;
  animal_id: string | null;
  species: string;
  symptoms: string[];
  free_text: string | null;
  sick_count: number;
  dead_count: number;
  geo: string | null; // EWKT "SRID=4326;POINT(lng lat)"
  village: string | null;
  taluka: string | null;
  district: string | null;
  status: "pending";
  offline_ts: string; // capture time (ISO) — survives late sync
}

export interface PendingReport {
  id: string;
  payload: ReportPayload;
  photo: Blob | null;
  photoType: string | null;
  imageScreen?: SkinScreenResult | null;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export const localDb = new Dexie("pashusetu") as Dexie & {
  pendingReports: EntityTable<PendingReport, "id">;
};

localDb.version(1).stores({
  pendingReports: "id, createdAt",
});
