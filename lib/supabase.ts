import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const HAS_SUPABASE = !!(url && key);

/** 環境変数が無ければ null。呼び出し側は LocalStorage にフォールバックする。 */
export const supabase = HAS_SUPABASE ? createClient(url!, key!) : null;
