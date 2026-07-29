// End-to-end user journeys through the REAL App (routes, guards, stores).
// These drive complete flows the way a person would: customer orders → kitchen
// works it → customer reviews → owner sees feedback. Demo mode (jsdom).
// True browser E2E against live Supabase lives in /e2e (Playwright).
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import { demoLogin, adminLogin, logout } from "../lib/authStore";
import { getPlacedOrders, updateOrderStatus } from "../lib/orderStore";

beforeEach(() => { localStorage.clear(); });

const renderAt = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
const lastOverlay = () => {
  const o = document.querySelectorAll(".fixed.inset-0");
  return o[o.length - 1];
};

describe("JOURNEY: customer orders → kitchen → review → owner feedback", () => {
  it("full order lifecycle across both surfaces", async () => {
    // ---- customer places an order ----
    renderAt("/r/spice-junction");
    await screen.findByText(/Scan & order/i, {}, { timeout: 4000 });
    fireEvent.click(screen.getAllByRole("button", { name: /ADD/i })[0]);
    fireEvent.click(screen.getByText(/View cart/i));
    fireEvent.change(screen.getByPlaceholderText("e.g. Aarav"), { target: { value: "E2E Tester" } });
    fireEvent.change(screen.getByPlaceholderText("+91…"), { target: { value: "+91 90000 00001" } });
    fireEvent.click(screen.getByText(/Place order/i));
    await screen.findByText(/Your token number/i);
    const order = getPlacedOrders()[0];
    expect(order.customer).toBe("E2E Tester");
    expect(order.phone).toContain("90000");
    cleanup();

    // ---- kitchen sees it live and starts preparing ----
    demoLogin();
    renderAt("/app/orders/live");
    const tokenEl = (await screen.findAllByText(order.token, {}, { timeout: 4000 }))[0];
    fireEvent.click(tokenEl);                       // open the order drawer
    const drawer = lastOverlay();
    fireEvent.click(within(drawer).getByText("Start Preparing"));
    expect(getPlacedOrders()[0].status).toBe("preparing");
    cleanup();

    // ---- customer's open status screen reflects the kitchen ----
    renderAt("/r/spice-junction");
    await screen.findByText(/Your token number/i, {}, { timeout: 4000 });
    expect(screen.getByText(/min left|Any moment/i)).toBeInTheDocument();
    cleanup();

    // ---- kitchen marks it ready, then completes it ----
    renderAt("/app/orders/live");
    fireEvent.click((await screen.findAllByText(order.token))[0]);
    fireEvent.click(within(lastOverlay()).getByText("Mark Ready"));
    expect(getPlacedOrders()[0].status).toBe("ready");
    cleanup();
    // complete it so the whole group is done (rate button gates on all-done now)
    updateOrderStatus(getPlacedOrders()[0].id, "completed");

    // ---- customer rates low → private feedback (never Google) ----
    // all orders complete → the app opens feedback automatically
    renderAt("/r/spice-junction");
    await screen.findByText(/How was everything|Thanks for dining|feedback/i, {}, { timeout: 4000 });
    const stars = [...document.querySelectorAll("svg.lucide-star")].slice(0, 5);
    fireEvent.click(stars[1].closest("button"));    // 2 stars
    fireEvent.change(screen.getByPlaceholderText("Your feedback..."), { target: { value: "Food was cold" } });
    fireEvent.click(screen.getByText("Send private feedback"));
    await screen.findByText(/Thank you for your feedback/i);
    cleanup();

    // ---- owner finds the feedback in Notifications ----
    renderAt("/app/notifications");
    expect((await screen.findAllByText(/feedback needs attention/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/Food was cold/i)).toBeInTheDocument();
  }, 25000);
});

describe("JOURNEY: auth gate", () => {
  it("blocks /app, demo login enters, logout returns", async () => {
    logout();
    renderAt("/app");
    await screen.findByText(/Welcome back$/i);          // bounced to login
    fireEvent.click(screen.getByText(/Continue to demo/i));
    await screen.findByText(/Welcome back, Ravi/i);     // dashboard greeting
  });
});

describe("JOURNEY: storefront edit reaches the customer page", () => {
  it("prep time saved in dashboard shows on the QR menu", async () => {
    demoLogin();
    renderAt("/app/storefront");
    const num = await screen.findByRole("spinbutton");
    fireEvent.change(num, { target: { value: "25" } });
    fireEvent.click(screen.getByText(/Save changes/i));
    cleanup();
    renderAt("/r/spice-junction");
    await screen.findByText(/~25 min/i, {}, { timeout: 4000 });
  });
});

describe("JOURNEY: menu edit reaches the customer page", () => {
  it("new category appears as a tab on the QR menu", async () => {
    demoLogin();
    renderAt("/app/categories");
    fireEvent.click(await screen.findByRole("button", { name: /Add category/i }));
    fireEvent.change(screen.getByPlaceholderText(/e.g. Wraps/i), { target: { value: "Momos" } });
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));
    cleanup();
    renderAt("/r/spice-junction");
    await screen.findByText(/Momos/, {}, { timeout: 4000 });
  }, 15000);
});

describe("JOURNEY: coupon applied in cart", () => {
  it("WELCOME10 shows a live discount row", async () => {
    renderAt("/r/spice-junction");
    await screen.findByText(/Scan & order/i, {}, { timeout: 4000 });
    const add = screen.getAllByRole("button", { name: /ADD/i })[0];
    fireEvent.click(add); fireEvent.click(add);
    fireEvent.click(screen.getByText(/View cart/i));
    fireEvent.change(screen.getByPlaceholderText("+91…"), { target: { value: "+91 92222 22222" } });
    fireEvent.click(screen.getByRole("button", { name: "WELCOME10" }));
    await screen.findByText(/WELCOME10 applied/i);
    expect(screen.getByText(/Discount \(WELCOME10\)/i)).toBeInTheDocument();
  });
});

describe("JOURNEY: super-admin manages a tenant", () => {
  it("suspend a restaurant from the drawer", async () => {
    adminLogin();
    renderAt("/admin/restaurants");
    fireEvent.click(await screen.findByText("Frosty Treats"));
    const drawer = lastOverlay();
    fireEvent.click(within(drawer).getByText(/^Suspend$/i));
    await waitFor(() => expect(within(drawer).getByText("suspended")).toBeInTheDocument());
  });
});

describe("JOURNEY: status never flickers backwards", () => {
  it("shows the rate button once the order is completed", async () => {
    // place an order, advance it straight to ready in the store
    const { placeOrder, updateOrderStatus } = await import("../lib/orderStore");
    const o = placeOrder({ token: "#900", customer: "Flicker", phone: "+91 90000 00009", items: [{ name: "X", qty: 1, price: 100, type: "veg" }], subtotal: 100, total: 100 });
    updateOrderStatus(o.id, "preparing");
    updateOrderStatus(o.id, "ready");
    updateOrderStatus(o.id, "completed");   // whole order done
    localStorage.setItem("qm_active_order_v1", o.id);
    localStorage.setItem("qm_my_orders_v1", JSON.stringify([o.id]));

    renderAt("/r/spice-junction");
    // all orders done → customer is taken to feedback automatically
    expect(await screen.findByText(/How was everything|Rate your meal|Thanks for dining/i, {}, { timeout: 6000 })).toBeInTheDocument();
  }, 15000);
});

describe("JOURNEY: welcome offer is first-visit only", () => {
  it("rejects WELCOME10 for a phone that ordered before", async () => {
    const { placeOrder } = await import("../lib/orderStore");
    placeOrder({ token: "#901", customer: "Repeat", phone: "+91 93333 33333", items: [{ name: "X", qty: 1, price: 100, type: "veg" }], subtotal: 100, total: 100 });

    renderAt("/r/spice-junction?fresh");
    await screen.findByText(/Scan & order/i, {}, { timeout: 4000 });
    const add = screen.getAllByRole("button", { name: /ADD/i })[0];
    fireEvent.click(add); fireEvent.click(add);
    fireEvent.click(screen.getByText(/View cart/i));
    fireEvent.change(screen.getByPlaceholderText("+91…"), { target: { value: "+91 93333 33333" } });
    fireEvent.change(screen.getByPlaceholderText(/Coupon code/i), { target: { value: "WELCOME10" } });
    fireEvent.click(screen.getByRole("button", { name: /^Apply$/i }));
    expect(await screen.findByText(/first-time visitors only/i)).toBeInTheDocument();
  }, 15000);
});

describe("JOURNEY: completed order lands on the feedback page", () => {
  it("auto-opens review with a next-visit gift", async () => {
    const { placeOrder, updateOrderStatus } = await import("../lib/orderStore");
    const o = placeOrder({ token: "#902", customer: "Fin", phone: "+91 94444 44444", items: [{ name: "X", qty: 1, price: 100, type: "veg" }], subtotal: 100, total: 100 });
    updateOrderStatus(o.id, "preparing");
    updateOrderStatus(o.id, "ready");
    updateOrderStatus(o.id, "completed");
    localStorage.setItem("qm_active_order_v1", o.id);

    renderAt("/r/spice-junction");
    // completed → straight to the feedback page with the gift block
    expect(await screen.findByText(/Thanks for dining with us/i, {}, { timeout: 6000 })).toBeInTheDocument();
    expect(screen.getByText(/A gift for your next visit/i)).toBeInTheDocument();
  }, 15000);
});

describe("JOURNEY: phone is remembered on the device", () => {
  it("prefills the cart phone on the next visit", async () => {
    // first visit: type the number and order
    renderAt("/r/spice-junction?fresh");
    await screen.findByText(/Scan & order/i, {}, { timeout: 4000 });
    fireEvent.click(screen.getAllByRole("button", { name: /ADD/i })[0]);
    fireEvent.click(screen.getByText(/View cart/i));
    fireEvent.change(screen.getByPlaceholderText("+91…"), { target: { value: "+91 95555 55555" } });
    fireEvent.click(screen.getByText(/Place order/i));
    await screen.findByText(/Your token number/i);
    cleanup();
    // "next visit": fresh mount — the field must already contain the number
    localStorage.removeItem("qm_active_order_v1");
    renderAt("/r/spice-junction");
    await screen.findByText(/Scan & order/i, {}, { timeout: 4000 });
    fireEvent.click(screen.getAllByRole("button", { name: /ADD/i })[0]);
    fireEvent.click(screen.getByText(/View cart/i));
    expect(screen.getByPlaceholderText("+91…").value).toBe("+91 95555 55555");
  }, 15000);
});

describe("JOURNEY: refresh restores instantly from the device snapshot", () => {
  it("token screen shows even when the server hasn't confirmed the order yet", async () => {
    // simulate: order remembered on device, but NOT present in any store yet
    // (exactly the reload-during-insert race seen in live Playwright runs)
    const ghost = {
      id: "ghost-123", token: "#777", customer: "Racer", status: "new",
      placedAt: Date.now(), items: [{ name: "X", qty: 1, price: 100, type: "veg" }],
      subtotal: 100, total: 100, phone: "",
    };
    localStorage.setItem("qm_active_order_v1", ghost.id);
    localStorage.setItem("qm_active_order_snap_v1", JSON.stringify(ghost));

    renderAt("/r/spice-junction");
    expect(await screen.findByText(/Your token number/i, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByText("#777")).toBeInTheDocument();
  }, 10000);
});

describe("JOURNEY: customer can download a bill", () => {
  it("bill button on the status screen triggers the receipt", async () => {
    renderAt("/r/spice-junction?fresh");
    await screen.findByText(/Scan & order/i, {}, { timeout: 4000 });
    fireEvent.click(screen.getAllByRole("button", { name: /ADD/i })[0]);
    fireEvent.click(screen.getByText(/View cart/i));
    fireEvent.click(screen.getByText(/Place order/i));
    await screen.findByText(/Your token number/i);
    // bill is intentionally hidden while the order is new/preparing
    expect(screen.queryByRole("button", { name: /Download bill/i })).toBeNull();
    // once the kitchen marks it ready, the bill becomes available
    const { usePlacedOrders, updateOrderStatus } = await import("../lib/orderStore");
    const all = JSON.parse(localStorage.getItem("qm_live_orders_v1") || "[]");
    if (all[0]) { updateOrderStatus(all[0].id, "ready"); }
    const btn = await screen.findByRole("button", { name: /Download bill/i }, { timeout: 4000 });
    fireEvent.click(btn);           // iframe print path — must not throw
    expect(btn).toBeInTheDocument();
  }, 15000);
});

describe("JOURNEY: add more items after ordering", () => {
  it("can browse the menu with an active order and place a second one", async () => {
    renderAt("/r/spice-junction?fresh");
    await screen.findByText(/Scan & order/i, {}, { timeout: 4000 });
    // first order
    fireEvent.click(screen.getAllByRole("button", { name: /ADD/i })[0]);
    fireEvent.click(screen.getByText(/View cart/i));
    fireEvent.click(screen.getByText(/Place order/i));
    await screen.findByText(/Your token number/i);
    // "Add more items" → back to the menu, with a simple back bar
    fireEvent.click(screen.getByRole("button", { name: /Add more items/i }));
    await screen.findByText(/Back to my order/i, {}, { timeout: 4000 });
    // menu is browsable again
    expect(screen.getAllByRole("button", { name: /ADD/i }).length).toBeGreaterThan(0);
    // tapping the bar returns to the order status
    fireEvent.click(screen.getByText(/Back to my order/i));
    expect(await screen.findByText(/Your token number/i)).toBeInTheDocument();
  }, 15000);
});

describe("JOURNEY: next-visit reward is gated behind a review", () => {
  it("shows 'review us to unlock' until a Google review is left", async () => {
    // land on feedback for a completed order
    const ghost = { id: "rev-1", token: "#611", customer: "Rev", status: "completed", placedAt: Date.now(), items: [{ name: "X", qty: 1, price: 100, type: "veg" }], subtotal: 100, total: 100, phone: "+91 90000 06110" };
    localStorage.setItem("qm_active_order_v1", ghost.id);
    localStorage.setItem("qm_active_order_snap_v1", JSON.stringify(ghost));
    localStorage.setItem("qm_my_orders_v1", JSON.stringify([ghost.id]));
    renderAt("/r/spice-junction");
    // feedback page appears; reward is locked behind a review prompt
    expect(await screen.findByText(/Review us to unlock your reward/i, {}, { timeout: 5000 })).toBeInTheDocument();
    // give 5 stars then leave the review → reward unlocks
    const stars = screen.getAllByRole("button").filter(b => b.querySelector("svg"));
    // click the review-for-reward button
    fireEvent.click(screen.getByRole("button", { name: /Review us for your reward/i }));
    // after review, the locked prompt is gone (reward area now issuing/showing)
    await screen.findByText(/A gift for your next visit/i);
    expect(screen.queryByText(/Review us to unlock your reward/i)).toBeNull();
  }, 15000);
});

describe("JOURNEY: ready-to-collect highlight", () => {
  it("shows a prominent collect banner when the order is ready", async () => {
    renderAt("/r/spice-junction?fresh");
    await screen.findByText(/Scan & order/i, {}, { timeout: 4000 });
    fireEvent.click(screen.getAllByRole("button", { name: /ADD/i })[0]);
    fireEvent.click(screen.getByText(/View cart/i));
    fireEvent.click(screen.getByText(/Place order/i));
    await screen.findByText(/Your token number/i);
    // move the order to ready via the store
    const all = JSON.parse(localStorage.getItem("qm_live_orders_v1") || "[]");
    const { updateOrderStatus } = await import("../lib/orderStore");
    if (all[0]) updateOrderStatus(all[0].id, "ready");
    expect(await screen.findByText(/Your order is ready/i, {}, { timeout: 4000 })).toBeInTheDocument();
  }, 15000);
});
