// Server-only usage guard: the single place that decides whether a visitor may
// trigger a paid API call. Every route that reaches Claude (or any other paid
// service) must call reserveQuota() first and refund() if the paid call fails.
//
// Why it is built this way:
//  - Limits are keyed on a signed httpOnly device cookie AND on the network
//    address. Clearing localStorage or inventing a new session id gets nothing.
//  - The check and the increment happen in one atomic database call, before
//    the paid call, so parallel requests cannot all slip under the cap.
//  - A site-wide daily cap bounds the worst case even if someone rotates IPs
//    and cookies.
//  - The admin code is compared in constant time and wrong guesses are
//    rate limited. Admin use still counts against a daily ceiling.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface GuardConfig {
  /** Database prefix for this project, for example "sd" or "ll". */
  prefix: string;
  /** Free uses allowed per device and per network address (lifetime). */
  limit: number;
  /** Word used in messages, for example "messages" or "analyses". */
  noun: string;
  /**
   * Optional separate budget for a second kind of paid action (for example
   * "qa" next to "analyze"). Counted per device and address on its own, but
   * still inside the site-wide daily cap.
   */
  scope?: string;
  /** Visitor uses allowed per UTC day across the whole site. */
  dailyCap?: number;
  /** Admin uses allowed per UTC day across the whole site. */
  adminDailyCeiling?: number;
}

const COOKIE_NAME = "fg_device";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const ADMIN_FAIL_LIMIT = 10; // wrong admin codes per IP per hour

function envInt(name: string, fallback: number): number {
  const n = parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// ── Network address ─────────────────────────────────────────────────────────

function expandV6(ip: string): string[] | null {
  const halves = ip.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  const groups = [...head, ...Array(Math.max(fill, 0)).fill("0"), ...tail];
  return groups.length === 8 ? groups : null;
}

function normalizeIp(raw: string): string {
  const ip = raw.trim().toLowerCase();
  if (!ip) return "unknown";
  if (!ip.includes(":")) return ip.slice(0, 45);
  if (ip.startsWith("::ffff:") && ip.includes(".")) return ip.slice(7);
  const groups = expandV6(ip);
  if (!groups) return "unknown";
  // One household or carrier hands out a whole /64, so count that as one address.
  return "v6:" + groups.slice(0, 4).map((g) => parseInt(g || "0", 16).toString(16)).join(":");
}

/**
 * Vercel sets x-vercel-forwarded-for itself and callers cannot spoof it.
 * Anything we cannot read becomes the shared "unknown" bucket, which is capped
 * like any other address (fail closed).
 */
export function getClientIp(req: NextRequest): string {
  const raw =
    req.headers.get("x-vercel-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    "";
  return normalizeIp(raw);
}

// ── Device cookie ───────────────────────────────────────────────────────────

function cookieSecret(): Buffer {
  return createHash("sha256")
    .update(
      "fg-device-v1:" +
        (process.env.DEVICE_COOKIE_SECRET || "") +
        ":" +
        (process.env.ADMIN_SECRET || "") +
        ":" +
        (process.env.SUPABASE_SERVICE_ROLE_KEY || "")
    )
    .digest();
}

function sign(id: string): string {
  return createHmac("sha256", cookieSecret()).update(id).digest("base64url").slice(0, 32);
}

function readDeviceId(req: NextRequest): string | null {
  const value = req.cookies.get(COOKIE_NAME)?.value;
  if (!value) return null;
  const [id, sig] = value.split(".");
  if (!id || !sig || !/^[0-9a-f]{32}$/.test(id)) return null;
  const expected = sign(id);
  if (sig.length !== expected.length) return null;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? id : null;
}

function mintDeviceId(): string {
  return randomBytes(16).toString("hex");
}

/** Returns the device id from the request, or null when the cookie is absent or forged. */
export function getDeviceId(req: NextRequest): string | null {
  return readDeviceId(req);
}

export function setDeviceCookie(res: NextResponse, deviceId: string): NextResponse {
  res.cookies.set(COOKIE_NAME, `${deviceId}.${sign(deviceId)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}

// ── Admin code ──────────────────────────────────────────────────────────────

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function isValidAdminCode(code: string): boolean {
  const secret = process.env.ADMIN_SECRET;
  return Boolean(secret) && code.length > 0 && safeEqual(code, secret as string);
}

async function hitLimit(
  supabase: SupabaseClient,
  cfg: GuardConfig,
  key: string,
  limit: number
): Promise<boolean> {
  const { data, error } = await supabase.rpc(`${cfg.prefix}_hit_limit`, {
    p_key: key,
    p_limit: limit,
  });
  if (error) return false; // fail closed
  return data === true;
}

function hourKey(): string {
  return new Date().toISOString().slice(0, 13);
}

/**
 * Throttles guessing of the admin code. Call this from the admin verify route
 * on every attempt. Returns false once an address has used its attempts.
 */
export async function allowAdminAttempt(
  req: NextRequest,
  supabase: SupabaseClient,
  cfg: GuardConfig
): Promise<boolean> {
  return hitLimit(supabase, cfg, `adminfail:${getClientIp(req)}:${hourKey()}`, ADMIN_FAIL_LIMIT);
}

export interface AdminState {
  isAdmin: boolean;
  /** True when this address has sent too many wrong admin codes. */
  locked: boolean;
}

/** Reads the x-admin-key header. Wrong codes are counted and eventually locked out. */
export async function resolveAdmin(
  req: NextRequest,
  supabase: SupabaseClient,
  cfg: GuardConfig
): Promise<AdminState> {
  const key = req.headers.get("x-admin-key") || "";
  if (!key) return { isAdmin: false, locked: false };
  if (isValidAdminCode(key)) return { isAdmin: true, locked: false };
  const allowed = await allowAdminAttempt(req, supabase, cfg);
  return { isAdmin: false, locked: !allowed };
}

/**
 * For admin-only routes (seed, exhaust, reset). Returns a ready 401/429
 * response when the caller is not an admin, otherwise null.
 */
export async function requireAdmin(
  req: NextRequest,
  supabase: SupabaseClient,
  cfg: GuardConfig
): Promise<NextResponse | null> {
  const admin = await resolveAdmin(req, supabase, cfg);
  if (admin.locked) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  if (!admin.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

// ── Quota ───────────────────────────────────────────────────────────────────

export type Reservation =
  | {
      ok: true;
      isAdmin: boolean;
      deviceId: string;
      ip: string;
      /** Uses left for this visitor after this one (999 for admin). */
      remaining: number;
      /** Wrap every successful response so the device cookie is set. */
      respond: (res: NextResponse) => NextResponse;
      /** Give the use back when the paid call failed before producing a result. */
      refund: () => Promise<void>;
    }
  | { ok: false; response: NextResponse };

function limitMessage(cfg: GuardConfig): string {
  return `You've used all ${cfg.limit} free ${cfg.noun}. This is a portfolio demo, reach out on Fiverr for unlimited access!`;
}

/**
 * Atomically checks and consumes one use. Call before any paid API call.
 * Admins skip the per-device and per-address caps but count toward a daily ceiling.
 */
function scoped(cfg: GuardConfig, id: string): string {
  return cfg.scope ? `${cfg.scope}:${id}` : id;
}

export async function reserveQuota(
  req: NextRequest,
  supabase: SupabaseClient,
  cfg: GuardConfig
): Promise<Reservation> {
  const ip = getClientIp(req);
  const existing = readDeviceId(req);
  const deviceId = existing ?? mintDeviceId();
  const withCookie = (res: NextResponse) => (existing ? res : setDeviceCookie(res, deviceId));

  const admin = await resolveAdmin(req, supabase, cfg);
  if (admin.locked) {
    return {
      ok: false,
      response: withCookie(
        NextResponse.json({ error: "Too many attempts. Try again later.", code: "ADMIN_LOCKED" }, { status: 429 })
      ),
    };
  }

  // Admin "Check Block" test: behave exactly like a blocked visitor.
  if (admin.isAdmin && req.headers.get("x-simulate-block") === "true") {
    return {
      ok: false,
      response: withCookie(
        NextResponse.json({ error: limitMessage(cfg), code: "RATE_LIMIT", remaining: 0 }, { status: 429 })
      ),
    };
  }

  const { data, error } = await supabase.rpc(`${cfg.prefix}_consume_quota`, {
    p_device: scoped(cfg, deviceId),
    p_ip: scoped(cfg, ip),
    p_limit: cfg.limit,
    p_global_limit: cfg.dailyCap ?? envInt("DAILY_CAP", 300),
    p_admin: admin.isAdmin,
    p_admin_ceiling: cfg.adminDailyCeiling ?? envInt("ADMIN_DAILY_CEILING", 1000),
  });

  if (error || !data || typeof data !== "object") {
    // Fail closed: if we cannot count, we do not spend money.
    return {
      ok: false,
      response: withCookie(
        NextResponse.json(
          { error: "Usage check is unavailable right now. Please try again shortly.", code: "QUOTA_UNAVAILABLE" },
          { status: 503 }
        )
      ),
    };
  }

  const result = data as { allowed: boolean; reason?: string; device_used?: number; ip_used?: number };

  if (!result.allowed) {
    const capacity = result.reason === "global" || result.reason === "admin_ceiling";
    return {
      ok: false,
      response: withCookie(
        NextResponse.json(
          {
            error: capacity
              ? "The demo has reached its daily capacity. Please come back tomorrow."
              : limitMessage(cfg),
            code: capacity ? "DAILY_CAP" : "RATE_LIMIT",
            remaining: 0,
          },
          { status: 429 }
        )
      ),
    };
  }

  const used = Math.max(result.device_used ?? 0, result.ip_used ?? 0);
  return {
    ok: true,
    isAdmin: admin.isAdmin,
    deviceId,
    ip,
    remaining: admin.isAdmin ? 999 : Math.max(cfg.limit - used, 0),
    respond: withCookie,
    refund: async () => {
      await supabase.rpc(`${cfg.prefix}_refund_quota`, {
        p_device: scoped(cfg, deviceId),
        p_ip: scoped(cfg, ip),
        p_admin: admin.isAdmin,
      });
    },
  };
}

/**
 * Admin helper behind the "exhaust" and "reset" buttons. Sets this device and
 * this address to the full limit (so the real block fires) or back to zero.
 */
export async function setOwnQuota(
  req: NextRequest,
  supabase: SupabaseClient,
  cfg: GuardConfig,
  action: "exhaust" | "reset"
): Promise<NextResponse> {
  const existing = readDeviceId(req);
  const deviceId = existing ?? mintDeviceId();
  const value = action === "reset" ? 0 : cfg.limit;
  const { error } = await supabase.rpc(`${cfg.prefix}_set_quota`, {
    p_device: scoped(cfg, deviceId),
    p_ip: scoped(cfg, getClientIp(req)),
    p_value: value,
  });
  if (error) return NextResponse.json({ error: "Could not update usage" }, { status: 500 });
  const res = NextResponse.json({ ok: true, usage_count: value });
  return existing ? res : setDeviceCookie(res, deviceId);
}
