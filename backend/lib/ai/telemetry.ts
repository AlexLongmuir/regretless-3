import { supabaseServer } from "../supabaseServer";
import type { SupabaseClient } from "@supabase/supabase-js";

type Usage = { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number; };

export async function saveAIEvent(userId: string, kind: string, model: string, usage?: Usage, latencyMs?: number, client?: SupabaseClient) {
  const sb = client || supabaseServer();
  await sb
    .from("ai_events")
    .insert({
      user_id: userId,
      kind,
      model,
      prompt_tokens: usage?.promptTokenCount ?? null,
      output_tokens: usage?.candidatesTokenCount ?? null,
      total_tokens: usage?.totalTokenCount ?? null,
      latency_ms: latencyMs ?? null,
    });
}
