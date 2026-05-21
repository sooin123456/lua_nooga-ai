export const memoryUsage = new Map();
export const freeLimit = 3;

function getDateKey(now) {
  return now.toISOString().slice(0, 10);
}

function getMemoryKey({ anonymousUserKey, dateKey }) {
  return `${dateKey}:${anonymousUserKey}`;
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL?.replace(/\/$/, "");
}

export async function checkAndConsumeFreeUse({
  anonymousUserKey,
  supabaseFetch = fetch,
  now = new Date(),
}) {
  const dateKey = getDateKey(now);
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    const key = getMemoryKey({ anonymousUserKey, dateKey });
    const currentUsage = memoryUsage.get(key) ?? 0;

    if (currentUsage >= freeLimit) {
      return { allowed: false, remainingFreeUses: 0 };
    }

    memoryUsage.set(key, currentUsage + 1);

    return {
      allowed: true,
      remainingFreeUses: freeLimit - currentUsage - 1,
    };
  }

  const response = await supabaseFetch(
    `${supabaseUrl}/rest/v1/rpc/consume_free_judgment_use`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        p_anonymous_user_key: anonymousUserKey,
        p_usage_date: dateKey,
        p_free_limit: freeLimit,
      }),
    },
  );

  if (!response.ok) {
    throw new Error("usage limit request failed");
  }

  const payload = await response.json();
  const row = Array.isArray(payload) ? payload[0] : payload;

  return {
    allowed: Boolean(row?.allowed),
    remainingFreeUses: Number(row?.remaining_free_uses ?? 0),
  };
}
