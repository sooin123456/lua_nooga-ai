export const memoryUsage = new Map();
export const freeLimit = 3;

function getDateKey(now) {
  return now.toISOString().slice(0, 10);
}

function getMemoryKey({ anonymousUserKey, dateKey }) {
  return `${dateKey}:${anonymousUserKey}`;
}

function getSupabaseUrl() {
  return (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL)?.replace(
    /\/$/,
    "",
  );
}

function getMemoryRecord(key) {
  const existingRecord = memoryUsage.get(key);

  if (typeof existingRecord === "number") {
    return { freeUses: existingRecord, shareBonusUses: 0 };
  }

  return existingRecord ?? { freeUses: 0, shareBonusUses: 0 };
}

function setMemoryRecord(key, record) {
  memoryUsage.set(key, record);
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
    const record = getMemoryRecord(key);
    const usageLimit = freeLimit + record.shareBonusUses;

    if (record.freeUses >= usageLimit) {
      return { allowed: false, remainingFreeUses: 0 };
    }

    const nextRecord = { ...record, freeUses: record.freeUses + 1 };
    setMemoryRecord(key, nextRecord);

    return {
      allowed: true,
      remainingFreeUses: usageLimit - nextRecord.freeUses,
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

export async function refundFreeUse({
  anonymousUserKey,
  supabaseFetch = fetch,
  now = new Date(),
}) {
  const dateKey = getDateKey(now);
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    const key = getMemoryKey({ anonymousUserKey, dateKey });
    const record = getMemoryRecord(key);
    const nextRecord = {
      ...record,
      freeUses: Math.max(0, record.freeUses - 1),
    };
    setMemoryRecord(key, nextRecord);
    return {
      refunded: record.freeUses > 0,
      remainingFreeUses: Math.max(
        0,
        freeLimit + nextRecord.shareBonusUses - nextRecord.freeUses,
      ),
    };
  }

  const response = await supabaseFetch(
    `${supabaseUrl}/rest/v1/rpc/refund_free_judgment_use`,
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
    throw new Error("usage refund request failed");
  }

  const payload = await response.json();
  const row = Array.isArray(payload) ? payload[0] : payload;

  return {
    refunded: Boolean(row?.refunded),
    remainingFreeUses: Number(row?.remaining_free_uses ?? 0),
  };
}

export async function grantShareBonusUse({
  anonymousUserKey,
  supabaseFetch = fetch,
  now = new Date(),
}) {
  const dateKey = getDateKey(now);
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    const key = getMemoryKey({ anonymousUserKey, dateKey });
    const record = getMemoryRecord(key);
    const nextRecord = {
      ...record,
      shareBonusUses: Math.max(record.shareBonusUses, 1),
    };
    setMemoryRecord(key, nextRecord);
    return {
      granted: record.shareBonusUses < 1,
      remainingFreeUses: Math.max(
        0,
        freeLimit + nextRecord.shareBonusUses - nextRecord.freeUses,
      ),
    };
  }

  const response = await supabaseFetch(
    `${supabaseUrl}/rest/v1/rpc/grant_free_judgment_share_bonus`,
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
    throw new Error("share bonus request failed");
  }

  const payload = await response.json();
  const row = Array.isArray(payload) ? payload[0] : payload;

  return {
    granted: Boolean(row?.granted),
    remainingFreeUses: Number(row?.remaining_free_uses ?? 0),
  };
}
