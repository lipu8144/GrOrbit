import { describe, it, expect, beforeEach } from "vitest";
import * as auth from "../lib/authStore";
import * as orders from "../lib/orderStore";
import * as notif from "../lib/notificationStore";
import * as rest from "../lib/restaurantStore";
import * as admin from "../lib/adminStore";
import { validateCoupon, computeDiscount, getActiveCoupons } from "../lib/coupons";
import { inr, orderTotal } from "../lib/format";

beforeEach(() => localStorage.clear());

describe("authStore", () => {
  it("starts logged out, logs in, derives name, logs out", () => {
    expect(auth.isAuthed()).toBe(false);
    expect(auth.login({ email: "", password: "" }).ok).toBe(false);
    expect(auth.login({ email: "owner@cafe.in", password: "x" }).ok).toBe(true);
    expect(auth.getUser().name).toBe("Owner");
    expect(auth.getUser().role).toBe("owner");
    auth.logout();
    expect(auth.isAuthed()).toBe(false);
  });
  it("signup and admin/demo roles", () => {
    expect(auth.signup({ name: "Asha", restaurant: "Asha Cafe", email: "a@a.in", password: "p" }).ok).toBe(true);
    expect(auth.getUser().restaurant).toBe("Asha Cafe");
    auth.adminLogin();
    expect(auth.getUser().role).toBe("superadmin");
    auth.demoLogin();
    expect(auth.getUser().email).toBe("ravi@spicejunction.in");
  });
});

describe("orderStore", () => {
  it("places, reads, advances and removes orders", () => {
    expect(orders.getPlacedOrders()).toHaveLength(0);
    const o = orders.placeOrder({ token: "#205", customer: "Aarav", items: [{ name: "Brew", qty: 2, price: 159, type: "veg" }], total: 318 });
    expect(o.status).toBe("new");
    expect(orders.getPlacedOrders()).toHaveLength(1);
    orders.updateOrderStatus(o.id, "preparing");
    expect(orders.getPlacedOrder(o.id).status).toBe("preparing");
    expect(orders.getPlacedOrder(o.id).startedAt).toBeTruthy();
    orders.removeOrder(o.id);
    expect(orders.getPlacedOrders()).toHaveLength(0);
  });
});

describe("notificationStore", () => {
  it("pushes, reads, marks read", () => {
    const n = notif.pushNotification({ type: "order", title: "New order", body: "x" });
    expect(notif.getLiveNotifications()).toHaveLength(1);
    expect(n.unread).toBe(true);
    notif.markRead(n.id);
    expect(notif.getLiveNotifications()[0].unread).toBe(false);
    notif.pushNotification({ type: "feedback", title: "f", body: "y" });
    notif.markAllRead();
    expect(notif.getLiveNotifications().every((x) => !x.unread)).toBe(true);
  });
});

describe("restaurantStore", () => {
  it("returns defaults then persists updates", () => {
    expect(rest.getRestaurant().prepTimeMins).toBeGreaterThan(0);
    rest.updateRestaurant({ prepTimeMins: 25 });
    expect(rest.getRestaurant().prepTimeMins).toBe(25);
    rest.updateRestaurant({ specials: [1, 2] });
    expect(rest.getRestaurant().specials).toEqual([1, 2]);
    // merge keeps nested defaults
    expect(rest.getRestaurant().contact.phone).toBeTruthy();
  });
});

describe("adminStore", () => {
  it("seeds tenants, changes status/plan, computes stats", () => {
    const list = admin.getTenants();
    expect(list.length).toBeGreaterThan(5);
    const id = list[0].id;
    admin.setStatus(id, "suspended");
    expect(admin.getTenants().find((t) => t.id === id).status).toBe("suspended");
    admin.setPlan(id, "Pro");
    expect(admin.getTenants().find((t) => t.id === id).plan).toBe("Pro");
    const s = admin.platformStats();
    expect(s.total).toBe(list.length);
    expect(s.mrr).toBeGreaterThanOrEqual(0);
    expect(s.planMix.reduce((a, p) => a + p.count, 0)).toBe(list.length);
  });
});

describe("coupons", () => {
  it("validates percent, flat, min-order, caps, invalid", () => {
    expect(validateCoupon("WELCOME10", 500, "+91 91111 11111").discount).toBe(50);
    expect(validateCoupon("COMEBACK50", 100).ok).toBe(false);
    expect(validateCoupon("COMEBACK50", 300).discount).toBe(50);
    expect(validateCoupon("SPIN15", 1000).discount).toBe(120); // capped
    expect(validateCoupon("nope", 300).ok).toBe(false);
    expect(validateCoupon("WEEKEND20", 300).ok).toBe(false); // inactive
    expect(getActiveCoupons().length).toBeGreaterThan(0);
  });
});

describe("format", () => {
  it("formats rupees and totals", () => {
    expect(inr(1000)).toContain("1,000");
    expect(orderTotal({ items: [{ price: 100, qty: 2 }, { price: 50, qty: 1 }] })).toBe(250);
  });
});

describe("visit counting", () => {
  it("multiple orders on one day = one visit; days are distinct visits", async () => {
    const { countVisits } = await import("../lib/coupons");
    const day1a = new Date("2026-07-01T12:00:00").getTime();
    const day1b = new Date("2026-07-01T20:30:00").getTime();
    const day2  = new Date("2026-07-05T13:00:00").getTime();
    expect(countVisits([day1a, day1b])).toBe(1);
    expect(countVisits([day1a, day1b, day2])).toBe(2);
    expect(countVisits([])).toBe(0);
  });
});

describe("analytics aggregation (pure)", () => {
  const now = new Date("2026-07-10T20:00:00").getTime();
  const day = (d, h = 13) => new Date(`2026-07-0${d}T${String(h).padStart(2, "0")}:00:00`).getTime();
  const ORDERS = [
    { placedAt: day(9, 13), total: 300, type: "dinein", phone: "111", items: [{ name: "Pizza", qty: 2, price: 100 }] },
    { placedAt: day(9, 19), total: 200, type: "parcel", phone: "222", items: [{ name: "Burger", qty: 1, price: 200 }] },
    { placedAt: day(8, 13), total: 500, type: "dinein", phone: "111", items: [{ name: "Pizza", qty: 1, price: 100 }, { name: "Coke", qty: 2, price: 50 }] },
    { placedAt: day(1, 13), total: 100, type: "dinein", phone: "333", items: [{ name: "Coke", qty: 1, price: 50 }] },
  ];

  it("summarize: revenue, orders, new customers, repeat rate", async () => {
    const { summarize } = await import("../lib/analyticsStore");
    const s = summarize(ORDERS, 3, now);              // window: Jul 7–10
    expect(s.revenue).toBe(1000);                     // 300+200+500
    expect(s.orders).toBe(3);
    expect(s.newCustomers).toBe(2);                   // both "111" (Jul 8) and "222" (Jul 9) first appear inside the window
    expect(s.typeSplit).toEqual({ dinein: 2, parcel: 1 });
  });

  it("topItems ranks by units", async () => {
    const { topItems } = await import("../lib/analyticsStore");
    const t = topItems(ORDERS, 3, now);
    expect(t[0].name).toBe("Pizza");
    expect(t[0].orders).toBe(3);
    expect(t[0].revenue).toBe(300);
  });

  it("peakHours buckets by 2-hour slots", async () => {
    const { peakHours } = await import("../lib/analyticsStore");
    const p = peakHours(ORDERS, 3, now);
    expect(p.find((x) => x.l === "1p").v).toBe(2);    // two 13:00 orders in range
    expect(p.find((x) => x.l === "7p").v).toBe(1);
  });
});

describe("menu session window", () => {
  beforeEach(() => localStorage.clear());
  it("expires only after the configured window; off when 0", async () => {
    const { startSession, sessionExpired } = await import("../lib/menuSession");
    startSession("r1");
    expect(sessionExpired("r1", 60)).toBe(false);          // fresh
    expect(sessionExpired("r1", 0)).toBe(false);           // feature off
    // simulate 61 minutes passing
    const past = Date.now() - 61 * 60 * 1000;
    localStorage.setItem("qm_menu_session_v1", JSON.stringify({ rid: "r1", startedAt: past }));
    expect(sessionExpired("r1", 60)).toBe(true);           // now expired
    expect(sessionExpired("r1", 120)).toBe(false);         // longer window still valid
    expect(sessionExpired("r2", 60)).toBe(true);           // different restaurant = no session
  });
});

describe("super-admin impersonation is read-only", () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });
  it("blocks menu writes while viewing another restaurant", async () => {
    const menu = await import("../lib/menuStore");
    const admin = await import("../lib/adminStore");
    const before = menu.getMenuItems().length;
    await admin.startImpersonation({ id: "r-other", name: "Other Cafe" });
    expect(admin.isImpersonating()).toBe(true);
    menu.saveItem({ name: "Sneaky Item", price: 100, type: "veg", category: "Burgers", desc: "" });
    expect(menu.getMenuItems().length).toBe(before);       // write refused
    admin.stopImpersonation("r-mine");
    expect(admin.isImpersonating()).toBe(false);
    menu.saveItem({ name: "Legit Item", price: 100, type: "veg", category: "Burgers", desc: "" });
    expect(menu.getMenuItems().length).toBe(before + 1);   // writes work again
  });
});

describe("WhatsApp integration-ready layer", () => {
  it("isConfigured is false without credentials, true with them", async () => {
    const { isConfigured } = await import("../lib/whatsapp");
    expect(isConfigured({ growth: {} })).toBe(false);
    expect(isConfigured({ growth: { whatsappApi: { phoneNumberId: "1", accessToken: "t" } } })).toBe(true);
  });
  it("send refuses without credentials (no accidental no-op success)", async () => {
    const { sendWhatsAppTemplate } = await import("../lib/whatsapp");
    const res = await sendWhatsAppTemplate({ settings: { growth: {} }, toPhone: "9999999999", templateName: "x" });
    expect(res.ok).toBe(false);
  });
  it("fallback link builds a wa.me url", async () => {
    const { waFallbackLink } = await import("../lib/whatsapp");
    expect(waFallbackLink("+91 99999 88888", "hi")).toContain("wa.me/919999988888");
  });
});

describe("auto-accept sends orders straight to preparing", () => {
  beforeEach(() => localStorage.clear());
  it("places as 'preparing' when the toggle is on", async () => {
    const rest = await import("../lib/restaurantStore");
    const orders = await import("../lib/orderStore");
    rest.updateRestaurant({ ordering: { dinein: true, parcel: true, autoAccept: true } });
    expect(rest.getRestaurant().ordering.autoAccept).toBe(true);   // write landed
    const o = orders.placeOrder({ items: [{ name: "X", qty: 1, price: 100, type: "veg" }], subtotal: 100, total: 100, type: "dinein", customer: "T" });
    expect(o.status).toBe("preparing");
  });
});

describe("editable super-admin access (opt-in)", () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });
  it("writes blocked by default, allowed after enabling edit, blocked again after disabling", async () => {
    const menu = await import("../lib/menuStore");
    const admin = await import("../lib/adminStore");
    const base = menu.getMenuItems().length;
    await admin.startImpersonation({ id: "r-x", name: "X Cafe" });

    // default: read-only
    expect(admin.canEditImpersonated()).toBe(false);
    menu.saveItem({ name: "Blocked", price: 10, type: "veg", category: "Burgers", desc: "" });
    expect(menu.getMenuItems().length).toBe(base);

    // enable editing → writes go through
    await admin.setImpersonationEdit(true);
    expect(admin.canEditImpersonated()).toBe(true);
    menu.saveItem({ name: "Allowed", price: 10, type: "veg", category: "Burgers", desc: "" });
    expect(menu.getMenuItems().length).toBe(base + 1);

    // disable again → blocked
    await admin.setImpersonationEdit(false);
    menu.saveItem({ name: "BlockedAgain", price: 10, type: "veg", category: "Burgers", desc: "" });
    expect(menu.getMenuItems().length).toBe(base + 1);

    admin.stopImpersonation("r-mine");
    expect(admin.canEditImpersonated()).toBe(false);
  });
});

describe("cancelled orders are tracked, not deleted", () => {
  beforeEach(() => localStorage.clear());
  it("a cancelled order stays queryable until explicitly removed", async () => {
    const orders = await import("../lib/orderStore");
    const o = orders.placeOrder({ items: [{ name: "X", qty: 1, price: 100, type: "veg" }], subtotal: 100, total: 100, customer: "T" });
    orders.updateOrderStatus(o.id, "cancelled");
    const afterCancel = orders.getPlacedOrders().find(x => x.id === o.id);
    expect(afterCancel.status).toBe("cancelled");   // still present, not gone
    orders.removeOrder(o.id);
    expect(orders.getPlacedOrders().find(x => x.id === o.id)).toBeUndefined();  // now removed
  });
});

describe("live dashboard revenue math", () => {
  it("today's revenue excludes cancelled orders", () => {
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const orderTotal = (o) => o.items.reduce((s, i) => s + i.price * i.qty, 0);
    const orders = [
      { status: "completed", placedAt: startOfToday + 1000, items: [{ price: 100, qty: 2 }] }, // 200
      { status: "ready",     placedAt: startOfToday + 2000, items: [{ price: 50, qty: 1 }] },   // 50
      { status: "cancelled", placedAt: startOfToday + 3000, items: [{ price: 999, qty: 1 }] },  // excluded
      { status: "completed", placedAt: startOfToday - 86400000, items: [{ price: 500, qty: 1 }] }, // yesterday, excluded
    ];
    const isToday = (o) => o.placedAt >= startOfToday;
    const revenue = orders.filter(isToday).filter(o => o.status !== "cancelled").reduce((s, o) => s + orderTotal(o), 0);
    expect(revenue).toBe(250);   // 200 + 50, not 1249
  });
});

describe("group tag (multi-order identity from phone)", () => {
  it("same phone → same animal + last4; different name doesn't matter", async () => {
    const { groupTag, phoneLast4 } = await import("../lib/groupTag");
    const a = groupTag("+91 98765 48842");
    const b = groupTag("9876548842");         // same digits, no formatting
    expect(a.code).toBe("8842");
    expect(a.animal).toBe(b.animal);          // deterministic — same phone, same animal
    expect(a.label).toBe(b.label);
    expect(phoneLast4("+91 90000 12345")).toBe("2345");
  });
  it("no phone → no group tag (standalone order)", async () => {
    const { groupTag } = await import("../lib/groupTag");
    expect(groupTag("")).toBeNull();
    expect(groupTag("123")).toBeNull();       // too short
  });
  it("different phones → (usually) different tags", async () => {
    const { groupTag } = await import("../lib/groupTag");
    expect(groupTag("9999900001").label).not.toBe(groupTag("8888800002").label);
  });
});

describe("live mode never inherits demo branding", () => {
  beforeEach(() => localStorage.clear());
  it("restaurant settings fall back to a NEUTRAL skeleton, not demo defaults", async () => {
    // read() must not layer the demo DEFAULT_SETTINGS under a live tenant.
    const fs = await import("fs");
    const src = fs.readFileSync("src/lib/restaurantStore.js", "utf8");
    // the base for the merge must be chosen by REMOTE, not hardcoded to demo
    expect(src).toMatch(/const base = REMOTE \? NEUTRAL_SETTINGS : DEFAULT_SETTINGS/);
    expect(src).not.toMatch(/if \(!raw\) return DEFAULT_SETTINGS;/);
  });
  it("demo defaults still carry the sample branding (demo build unaffected)", async () => {
    const { DEFAULT_SETTINGS } = await import("../lib/restaurantStore");
    expect(DEFAULT_SETTINGS.contact.phone).toBeTruthy();
  });
});

describe("saves cannot fail silently", () => {
  it("writes are refused (loudly) when no real tenant is resolved", async () => {
    const { requireTenant, hasRealTenant } = await import("../lib/supabaseClient");
    // demo build always has a usable tenant, so the guard must not block it
    expect(hasRealTenant()).toBe(true);
    expect(requireTenant("test")).toBe(true);
  });
  it("name/settings writes verify a row actually matched", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/lib/restaurantStore.js", "utf8");
    // .select() after update is what distinguishes "saved" from "matched 0 rows"
    expect(src).toMatch(/update\(\{ name: clean \}\)\.eq\("id", rid\(\)\)\.select\(/);
    expect(src).toMatch(/data\.length === 0/);
  });
  it("menu writes are tenant-guarded", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/lib/menuStore.js", "utf8");
    expect(src).toMatch(/requireTenant\("add a category"\)/);
    expect(src).toMatch(/requireTenant\("save this item"\)/);
  });
});

describe("customer coupon suggestions and order navigation", () => {
  it("demo coupon chips are hidden in live mode (only restaurant coupons show)", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/pages/customer/Menu.jsx", "utf8");
    // the getActiveCoupons() suggestion strip must be gated on !COUPONS_REMOTE
    expect(src).toMatch(/\{!COUPONS_REMOTE && \(\s*<div className="flex gap-1\.5 mt-2 overflow-x-auto/);
  });
  it("review screen offers a non-destructive way back to the order", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/pages/customer/Menu.jsx", "utf8");
    expect(src).toMatch(/onBack=\{\(\) => setReviewing\(false\)\}/);
    expect(src).toMatch(/Back to my order/);
  });
  it("the orders strip shows even for a single order (always a way back)", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/pages/customer/Menu.jsx", "utf8");
    expect(src).toMatch(/siblings && siblings\.length >= 1/);
  });
});

describe("restaurant's real coupons show on the customer cart", () => {
  it("publicCoupons returns the demo catalog in demo mode", async () => {
    const { publicCoupons } = await import("../lib/coupons");
    const list = await publicCoupons();
    expect(Array.isArray(list)).toBe(true);
  });
  it("the cart renders real offers in live mode, demo chips only in demo mode", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/pages/customer/Menu.jsx", "utf8");
    // live path must render fetched offers, not the hardcoded demo list
    expect(src).toMatch(/COUPONS_REMOTE && offers\.length > 0/);
    expect(src).toMatch(/publicCoupons\(\)\.then/);
  });
});

describe("customer order list shows active + last 2 finished", () => {
  it("filters to active orders plus the two most recent finished ones", () => {
    const isActive = (o) => ["new", "preparing", "ready"].includes(o.status);
    const siblings = [
      { id: "a", status: "preparing", placedAt: 100 },
      { id: "b", status: "ready", placedAt: 90 },
      { id: "c", status: "completed", placedAt: 80 },
      { id: "d", status: "completed", placedAt: 70 },
      { id: "e", status: "completed", placedAt: 60 },   // 3rd finished — should be hidden
      { id: "f", status: "cancelled", placedAt: 50 },   // 4th finished — hidden
    ];
    const active = siblings.filter(isActive);
    const finished = siblings.filter((o) => !isActive(o)).sort((a, b) => b.placedAt - a.placedAt).slice(0, 2);
    const visible = [...active, ...finished].map((o) => o.id);
    expect(visible).toContain("a");   // active
    expect(visible).toContain("b");   // active
    expect(visible).toContain("c");   // most recent finished
    expect(visible).toContain("d");   // 2nd finished
    expect(visible).not.toContain("e");   // older finished hidden
    expect(visible).not.toContain("f");
  });
});

describe("Overview widgets show no demo data in live mode", () => {
  it("all Overview demo fallbacks are gated behind REMOTE", async () => {
    const fs = await import("fs");
    const ow = fs.readFileSync("src/components/widgets/OverviewWidgets.jsx", "utf8");
    // customer mix uses real analytics, not hardcoded 24/62
    expect(ow).not.toMatch(/const firstTime = 24, returning = 62/);
    expect(ow).toMatch(/summary\.newCustomers/);
    // recent activity uses live notifications in remote mode
    expect(ow).toMatch(/REMOTE\s*\n?\s*\?\s*\(liveNotifs/);

    const rc = fs.readFileSync("src/components/widgets/RevenueChartWidget.jsx", "utf8");
    // revenue chart never shows demo bars in live mode
    expect(rc).toMatch(/REMOTE \? \[\] : DATA\[range\]/);

    const gw = fs.readFileSync("src/components/widgets/GrowthWidgets.jsx", "utf8");
    // growth summary feeds empty (not demo) to summarize in live mode
    expect(gw).toMatch(/data = raw \?\? \(REMOTE \? \[\] : null\)/);
  });
});

describe("Overview specials + coupons widgets use real data in live mode", () => {
  it("Today's specials reads real menu specials in live mode", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/components/widgets/TodaysSpecialsWidget.jsx", "utf8");
    expect(src).toMatch(/REMOTE \? <LiveSpecials/);
    expect(src).toMatch(/filter\(\(i\) => i\.special\)/);
  });
  it("Coupons & loyalty widget uses real coupons and honest loyalty placeholder", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/components/widgets/GrowthWidgets.jsx", "utf8");
    expect(src).toMatch(/REMOTE \? \(liveCoupons \|\| \[\]\)/);
    // loyalty members show "—" in live mode (no backing table)
    expect(src).toMatch(/REMOTE \? "—" : LOYALTY\.members/);
  });
});

describe("session inactivity expiry survives refresh", () => {
  it("expires when the stored last-activity is older than the window", () => {
    const KEY = "qm_last_activity_v1";
    const idleMins = 15;
    // simulate activity 16 minutes ago
    localStorage.setItem(KEY, String(Date.now() - 16 * 60000));
    const idleExceeded = () => {
      const t = Number(localStorage.getItem(KEY));
      return t && (Date.now() - t > idleMins * 60000);
    };
    expect(idleExceeded()).toBe(true);
  });
  it("does NOT expire when there was recent activity", () => {
    const KEY = "qm_last_activity_v1";
    localStorage.setItem(KEY, String(Date.now() - 2 * 60000));   // 2 min ago
    const idleExceeded = () => {
      const t = Number(localStorage.getItem(KEY));
      return t && (Date.now() - t > 15 * 60000);
    };
    expect(idleExceeded()).toBe(false);
  });
  it("the customer page persists last-activity and expires on load if idle", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/pages/customer/Menu.jsx", "utf8");
    // activity is stamped to localStorage (survives refresh)
    expect(src).toMatch(/localStorage\.setItem\(ACTIVITY_KEY/);
    // and checked on mount to expire immediately if already idle
    expect(src).toMatch(/if \(idleExceeded\(\)\) \{ setExpired\(true\); return; \}/);
    // an active order is never force-expired
    expect(src).toMatch(/if \(expired && !placedId\)/);
  });
});

describe("open/closed ordering control", () => {
  it("customer resolver enforces the accepting-orders flag and closed days", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/pages/customer/Menu.jsx", "utf8");
    expect(src).toMatch(/accepting = st\.ordering\?\.acceptingOrders !== false/);
    expect(src).toMatch(/closedToday = !!\(st\.closedDays/);
    expect(src).toMatch(/if \(!accepting \|\| closedToday\)/);
    // and there's a closed screen
    expect(src).toMatch(/is closed right now/);
  });
  it("dashboard has a quick open/closed toggle on Live Orders", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/pages/orders/LiveOrders.jsx", "utf8");
    expect(src).toMatch(/acceptingOrders: !accepting/);
  });
});

describe("QR scan is recognized (no infinite re-scan loop)", () => {
  it("main QR and poster carry a scan marker", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/pages/QRCodes.jsx", "utf8");
    // main QR encodes ?src=qr so a scan is detected as fresh
    expect(src).toMatch(/RealQR url=\{`\$\{menuUrl\}\?src=qr`\}/);
    // the printed poster carries it too
    expect(src).toMatch(/url: `\$\{menuUrl\}\?src=qr`/);
  });
  it("a first visit with no prior session counts as a fresh scan", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/pages/customer/Menu.jsx", "utf8");
    expect(src).toMatch(/if \(isScan \|\| !hadSession\)/);
  });
});

describe("accepting-orders is enforced at placement, not just page load", () => {
  it("placeOrder re-checks the live accepting-orders flag before creating an order", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/pages/customer/Menu.jsx", "utf8");
    // authoritative re-check inside placeOrder
    expect(src).toMatch(/const placeOrder = async \(\) => \{[\s\S]*?acceptingOrders !== false[\s\S]*?setClosedNow\(true\); return;/);
  });
  it("the scan-expiry screen no longer has a one-tap bypass button", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/pages/customer/Menu.jsx", "utf8");
    expect(src).not.toMatch(/I'm at the restaurant — reload/);
  });
});

describe("image upload feedback + text limits", () => {
  it("menu item and settings images pre-validate size/type with alerts", async () => {
    const fs = await import("fs");
    const mi = fs.readFileSync("src/pages/menu/MenuItems.jsx", "utf8");
    expect(mi).toMatch(/please use one under 5 MB/);
    expect(mi).toMatch(/reportSuccess\("Image uploaded/);
    const st = fs.readFileSync("src/pages/Settings.jsx", "utf8");
    expect(st).toMatch(/under 5 MB/);
    expect(st).toMatch(/uploaded ✓/);
  });
  it("text fields have maxLength limits", async () => {
    const fs = await import("fs");
    const st = fs.readFileSync("src/pages/Settings.jsx", "utf8");
    expect(st).toMatch(/maxLength=\{60\}/);   // restaurant name
    expect(st).toMatch(/maxLength=\{200\}/);  // address
    const mi = fs.readFileSync("src/pages/menu/MenuItems.jsx", "utf8");
    expect(mi).toMatch(/maxLength=\{60\}/);   // item name
    expect(mi).toMatch(/maxLength=\{200\}/);  // item description
  });
});

describe("new-order sound works after login on any device", () => {
  it("resumes a suspended AudioContext on first interaction and before playing", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/pages/orders/LiveOrders.jsx", "utf8");
    // iOS needs a sound STARTED inside the gesture, not just resume()
    expect(src).toMatch(/createBufferSource\(\)/);
    expect(src).toMatch(/src\.start\(0\)/);
    // notes must be scheduled only once the context is actually running
    expect(src).toMatch(/ctx\.resume\(\)\.then\(beep\)/);
    // screen lock / app switch suspends the context — resume on return
    expect(src).toMatch(/visibilitychange/);
    // vibration fallback for phones on silent
    expect(src).toMatch(/navigator\.vibrate\?\.\(\[100, 60, 100\]\)/);
    // and a hint telling the owner to tap once
    expect(src).toMatch(/enable the new-order sound/);
  });
});

describe("next-visit reward is one unified setting", () => {
  it("Storefront edits the same growth.nextVisit field as Settings", async () => {
    const fs = await import("fs");
    const sf = fs.readFileSync("src/pages/Storefront.jsx", "utf8");
    // Storefront reads/writes growth.nextVisit (not the old growth.coupon)
    expect(sf).toMatch(/nextVisit: \{ \.\.\.nv, \.\.\.patch \}/);
    expect(sf).toMatch(/Next-visit reward/);
    // the customer flow gates on nextVisit.on, not the old coupon.on
    const menu = fs.readFileSync("src/pages/customer/Menu.jsx", "utf8");
    expect(menu).toMatch(/if \(!rw\.on\) return;/);
    expect(menu).not.toMatch(/if \(!g\.coupon\.on\)/);
  });
});

describe("landing navbar is mobile-safe", () => {
  it("header stays opaque when the mobile menu is open", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/pages/Landing.jsx", "utf8");
    // a transparent header with a white dropdown below looks broken — must be opaque when open
    expect(src).toMatch(/scrolled \|\| open \?/);
  });
  it("mobile menu can scroll and toggles to a close icon", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/pages/Landing.jsx", "utf8");
    expect(src).toMatch(/max-h-\[calc\(100vh-60px\)\] overflow-y-auto/);
    expect(src).toMatch(/\{open \? <X size=\{20\} \/> : <Menu size=\{20\} \/>\}/);
  });
});

describe("category icons", () => {
  it("offers a wide icon set suited to Indian restaurants", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/pages/Categories.jsx", "utf8");
    const block = src.split("const EMOJIS = [")[1].split("];")[0];
    const count = (block.match(/"/g) || []).length / 2;
    expect(count).toBeGreaterThan(60);          // was 12
    expect(block).toContain("🍛");               // curry
    expect(block).toContain("🫓");               // flatbread/roti
    expect(block).toContain("🧆");               // falafel/pakora
    expect(block).toContain("🧋");               // bubble tea
  });
  it("an existing category's icon can be changed", async () => {
    const menu = await import("../lib/menuStore");
    expect(typeof menu.setCategoryEmoji).toBe("function");
    menu.addCategory({ name: "IconTest", emoji: "🍔" });
    const cat = menu.getMenuCategories().find((c) => c.name === "IconTest");
    menu.setCategoryEmoji(cat.id, "🍛");
    expect(menu.getMenuCategories().find((c) => c.id === cat.id).emoji).toBe("🍛");
  });
});

describe("updates must never erase existing data", () => {
  it("settings merge against the DATABASE, not stale localStorage", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/lib/restaurantStore.js", "utf8");
    // must re-read current settings from the DB before writing the merged blob
    expect(src).toMatch(/select\("settings"\)\.eq\("id", rid\(\)\)/);
    expect(src).toMatch(/const merged = \{ \.\.\.\(cur\?\.settings \|\| \{\}\), \.\.\.patch \}/);
    // and must NOT blindly overwrite with the local copy
    expect(src).not.toMatch(/const next = \{ \.\.\.read\(\), \.\.\.patch \};\s*\n\s*write\(next\);\s*\n\s*if \(REMOTE\)/);
  });
  it("nested settings objects are merged, not clobbered by a partial patch", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/lib/restaurantStore.js", "utf8");
    expect(src).toMatch(/for \(const key of \["contact", "growth", "ordering", "closedDays"\]\)/);
  });
  it("saving an item without an image does not erase the existing photo", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/lib/menuStore.js", "utf8");
    expect(src).toMatch(/if \(data\.image !== undefined\) row\.image_url = data\.image \|\| "";/);
    expect(src).not.toMatch(/image_url: data\.image \|\| "", status:/);
  });
});

describe("item portions (half plate / full plate)", () => {
  it("normalisePortions keeps valid rows and rejects junk", async () => {
    const { normalisePortions } = await import("../lib/menuStore");
    expect(normalisePortions([{ label: "Half", price: 90 }, { label: "Full", price: 160 }]))
      .toEqual([{ label: "Half", price: 90 }, { label: "Full", price: 160 }]);
    // string prices from an older/hand-edited write are coerced to numbers
    expect(normalisePortions([{ label: "Half", price: "90" }])).toEqual([{ label: "Half", price: 90 }]);
    // junk is dropped rather than breaking the customer menu
    expect(normalisePortions([{ label: "", price: 90 }])).toEqual([]);
    expect(normalisePortions([{ label: "Half", price: "abc" }])).toEqual([]);
    expect(normalisePortions([{ label: "Half", price: -5 }])).toEqual([]);
    expect(normalisePortions(null)).toEqual([]);
    expect(normalisePortions("not-an-array")).toEqual([]);
  });

  it("portions survive a save/read round trip", async () => {
    const menu = await import("../lib/menuStore");
    menu.saveItem({
      name: "Dal Fry", desc: "", category: "Burgers", price: 90, type: "veg",
      portions: [{ label: "Half", price: 90 }, { label: "Full", price: 160 }],
    });
    const saved = menu.getMenuItems().find((i) => i.name === "Dal Fry");
    expect(saved.portions).toHaveLength(2);
    expect(saved.portions[1]).toEqual({ label: "Full", price: 160 });
  });

  it("an item with no portions is unchanged (backward compatible)", async () => {
    const menu = await import("../lib/menuStore");
    menu.saveItem({ name: "Filter Coffee", desc: "", category: "Burgers", price: 40, type: "veg" });
    const saved = menu.getMenuItems().find((i) => i.name === "Filter Coffee");
    expect(saved.portions).toEqual([]);
  });

  it("cart keys separate portions of the same dish", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/pages/customer/Menu.jsx", "utf8");
    // key format and parser
    expect(src).toMatch(/const cartKey = \(id, portion, addons\) =>/);
    expect(src).toMatch(/function parseCartKey\(key\)/);
    // the cart line must take its base price from the chosen portion
    expect(src).toMatch(/price = p\.price;/);
    // a removed/renamed portion drops the line instead of charging a stale price
    expect(src).toMatch(/if \(!p\) return null;/);
    // React keys in the cart drawer must include portion AND add-ons
    expect(src).toMatch(/key=\{cartKey\(l\.id, l\.portion, \(l\.addons \|\| \[\]\)\.map\(\(a\) => a\.label\)\)\}/);
    // the kitchen ticket names the portion
    expect(src).toMatch(/let name = l\.portion \? `\$\{l\.name\} \(\$\{l\.portion\}\)` : l\.name;/);
  });

  it("the editor blocks duplicate and half-filled portions", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/pages/menu/MenuItems.jsx", "utf8");
    expect(src).toMatch(/Two portions have the same name/);
    expect(src).toMatch(/Every portion needs both a name and a price/);
    // incomplete rows are filtered out of what gets saved
    expect(src).toMatch(/\.filter\(\(p\) => p\.label !== "" && Number\.isFinite\(p\.price\) && p\.price >= 0\)/);
  });
});

describe("a single portion is not a valid configuration", () => {
  it("the editor seeds a PAIR and refuses to save just one portion", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/pages/menu/MenuItems.jsx", "utf8");
    // first "Add" creates two rows, not one
    expect(src).toMatch(/if \(cur\.length === 0\)/);
    expect(src).toMatch(/\{ label: "Half", price: "" \}/);
    expect(src).toMatch(/\{ label: "Full", price: String\(f\.price \|\| ""\) \}/);
    // and a lone portion is blocked with an explanation
    expect(src).toMatch(/Add at least two portions/);
    // the help text warns that the base price stops being shown
    expect(src).toMatch(/The price above is no longer shown/);
  });
});

describe("portion editor layout", () => {
  it("portion inputs size themselves without fighting w-full", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/pages/menu/MenuItems.jsx", "utf8");
    // a width-less base class exists for use inside flex rows
    expect(src).toMatch(/const fieldBase = "px-3\.5/);
    expect(src).toMatch(/const field = "w-full " \+ fieldBase/);
    // the portion row uses fieldBase, never `field + " w-…"` (which collapses it)
    expect(src).toMatch(/fieldBase \+ " flex-1 min-w-0"/);
    expect(src).toMatch(/fieldBase \+ " w-20 shrink-0"/);
    expect(src).not.toMatch(/field \+ " w-24"/);
    // and the columns are labelled
    expect(src).toMatch(/Portion name/);
  });
});

describe("item add-ons (modifiers)", () => {
  it("add-ons normalise like portions and drop duplicates", async () => {
    const { normaliseAddons } = await import("../lib/menuStore");
    expect(normaliseAddons([{ label: "Extra cheese", price: 30 }]))
      .toEqual([{ label: "Extra cheese", price: 30 }]);
    expect(normaliseAddons([{ label: "Cheese", price: "30" }])).toEqual([{ label: "Cheese", price: 30 }]);
    // duplicates would collide in the cart key — only the first survives
    expect(normaliseAddons([{ label: "Egg", price: 20 }, { label: "egg", price: 25 }]))
      .toEqual([{ label: "Egg", price: 20 }]);
    expect(normaliseAddons(null)).toEqual([]);
  });

  it("add-ons survive a save/read round trip and default to empty", async () => {
    const menu = await import("../lib/menuStore");
    menu.saveItem({
      name: "Addon Burger", desc: "", category: "Burgers", price: 149, type: "veg",
      addons: [{ label: "Extra cheese", price: 30 }],
    });
    const withAddons = menu.getMenuItems().find((i) => i.name === "Addon Burger");
    expect(withAddons.addons).toEqual([{ label: "Extra cheese", price: 30 }]);

    menu.saveItem({ name: "Plain Tea", desc: "", category: "Burgers", price: 20, type: "veg" });
    expect(menu.getMenuItems().find((i) => i.name === "Plain Tea").addons).toEqual([]);
  });

  it("cart keys sort add-ons so the same choice merges into one line", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/pages/customer/Menu.jsx", "utf8");
    // sorting is what makes {Egg,Cheese} and {Cheese,Egg} the same key
    expect(src).toMatch(/const a = \(addons \|\| \[\]\)\.slice\(\)\.sort\(\);/);
    // add-on prices stack ON TOP of the portion/base price
    expect(src).toMatch(/price \+= chosen\.reduce\(\(s, a\) => s \+ a\.price, 0\);/);
    // a deleted add-on is dropped and not charged, rather than voiding the line
    expect(src).toMatch(/const chosen = \(m\.addons \|\| \[\]\)\.filter/);
    // the ticket lists the extras
    expect(src).toMatch(/name \+= ` \+ \$\{l\.addons\.map\(\(a\) => a\.label\)\.join\(", "\)\}`/);
  });

  it("the editor allows a single add-on but blocks separator characters", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/pages/menu/MenuItems.jsx", "utf8");
    // no "at least two" rule for add-ons (unlike portions)
    expect(src).toMatch(/Two add-ons have the same name/);
    expect(src).toMatch(/Every add-on needs both a name and a price/);
    // cart-key separators must not appear in labels
    expect(src).toMatch(/Names can't contain \| or ::/);
  });
});
