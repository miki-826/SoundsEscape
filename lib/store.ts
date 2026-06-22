import { RunResult } from "./types";
import { HAS_SUPABASE, supabase } from "./supabase";

const KEY = "sound-escape:results";

export interface StoredResult {
  name: string;
  item_name: string;
  score: number;
  rank: string;
  badge: string;
  success: boolean;
  seed: string;
  mode: string;
  demo: boolean;
  created_at: string;
}

function toRow(r: RunResult, name: string): StoredResult {
  return {
    name,
    item_name: r.itemName,
    score: r.score,
    rank: r.rank,
    badge: r.badge,
    success: r.success,
    seed: r.seed,
    mode: r.mode,
    demo: r.demo,
    created_at: new Date(r.createdAt).toISOString(),
  };
}

function readLocal(): StoredResult[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeLocal(rows: StoredResult[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(rows.slice(-100)));
}

/** 結果を保存。Supabaseがあれば送信し、失敗してもLocalStorageへ必ず残す。 */
export async function saveResult(
  r: RunResult,
  name = "ANON"
): Promise<void> {
  const row = toRow(r, name);
  writeLocal([...readLocal(), row]);
  if (HAS_SUPABASE && supabase) {
    try {
      await supabase.from("results").insert({
        name: row.name,
        item_name: row.item_name,
        score: row.score,
        rank: row.rank,
        badge: row.badge,
        success: row.success,
        seed: row.seed,
        mode: row.mode,
        demo: row.demo,
      });
    } catch {
      // ユーザーには見せない。LocalStorage には既に保存済み。
    }
  }
}

/** スコア上位を取得。Supabase優先、無ければLocalStorage。 */
export async function topResults(limit = 8): Promise<StoredResult[]> {
  if (HAS_SUPABASE && supabase) {
    try {
      const { data, error } = await supabase
        .from("results")
        .select("*")
        .order("score", { ascending: false })
        .limit(limit);
      if (!error && data) return data as StoredResult[];
    } catch {
      // フォールバックへ
    }
  }
  return readLocal()
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
