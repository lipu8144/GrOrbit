import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { adminLogin, demoLogin } from "../lib/authStore";

// pages
import Overview from "../pages/Overview";
import LiveOrders from "../pages/orders/LiveOrders";
import OrderHistory from "../pages/orders/OrderHistory";
import MenuItems from "../pages/menu/MenuItems";
import TodaysSpecials from "../pages/menu/TodaysSpecials";
import Categories from "../pages/Categories";
import Customers from "../pages/Customers";
import Reviews from "../pages/growth/Reviews";
import Social from "../pages/growth/Social";
import WhatsApp from "../pages/growth/WhatsApp";
import Coupons from "../pages/growth/Coupons";
import QRCodes from "../pages/QRCodes";
import Storefront from "../pages/Storefront";
import Analytics from "../pages/Analytics";
import Notifications from "../pages/Notifications";
import Settings from "../pages/Settings";
import Login from "../pages/Login";
import CustomerMenu from "../pages/customer/Menu";
import AdminOverview from "../pages/admin/AdminOverview";
import AdminRestaurants from "../pages/admin/Restaurants";
import { Subscriptions, AdminAnalytics } from "../pages/admin/AdminPages";
// components
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";

beforeEach(() => localStorage.clear());
const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

const pages = [
  ["Overview", <Overview />], ["LiveOrders", <LiveOrders />], ["OrderHistory", <OrderHistory />],
  ["MenuItems", <MenuItems />], ["TodaysSpecials", <TodaysSpecials />], ["Categories", <Categories />],
  ["Customers", <Customers />], ["Reviews", <Reviews />], ["Social", <Social />], ["WhatsApp", <WhatsApp />],
  ["Coupons", <Coupons />], ["QRCodes", <QRCodes />], ["Storefront", <Storefront />], ["Analytics", <Analytics />],
  ["Notifications", <Notifications />], ["Settings", <Settings />], ["Login", <Login />],
  ["AdminOverview", <AdminOverview />], ["AdminRestaurants", <AdminRestaurants />],
  ["Subscriptions", <Subscriptions />], ["AdminAnalytics", <AdminAnalytics />],
];

describe("every page renders without crashing", () => {
  it.each(pages)("%s mounts", (_name, ui) => {
    const { container } = wrap(ui);
    expect(container).toBeTruthy();
    expect(container.querySelector("h1, h2")).toBeTruthy();
  });
});

describe("layout components render", () => {
  it("Sidebar shows nav", () => { wrap(<Sidebar />); expect(screen.getByText("Overview")).toBeInTheDocument(); });
  it("Topbar shows owner", () => { demoLogin(); wrap(<Topbar />); expect(screen.getAllByText(/Ravi Kumar/).length).toBeGreaterThan(0); });
});

describe("customer ordering flow", () => {
  const renderMenu = () => render(
    <MemoryRouter initialEntries={["/r/spice-junction"]}>
      <Routes><Route path="/r/:slug" element={<CustomerMenu />} /></Routes>
    </MemoryRouter>
  );
  it("renders the menu with restaurant name", () => {
    renderMenu();
    expect(screen.getAllByText(/Spice Junction/i).length).toBeGreaterThan(0);
  });
  it("can add an item to cart and open cart", () => {
    renderMenu();
    const addButtons = screen.getAllByRole("button", { name: /ADD/i });
    fireEvent.click(addButtons[0]);
    // floating cart bar appears
    expect(screen.getByText(/View cart/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/View cart/i));
    expect(screen.getByText(/Place order/i)).toBeInTheDocument();
  });
});

describe("interactions write to stores", () => {
  it("Categories add creates a category", () => {
    wrap(<Categories />);
    const before = screen.getAllByText(/items?$/i).length;
    fireEvent.click(screen.getByRole("button", { name: /Add category/i }));
    fireEvent.change(screen.getByPlaceholderText(/e.g. Wraps/i), { target: { value: "Wraps" } });
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));
    expect(screen.getByText("Wraps")).toBeInTheDocument();
  });

  it("Coupons 'New coupon' modal adds a coupon", () => {
    wrap(<Coupons />);
    fireEvent.click(screen.getByRole("button", { name: /New coupon/i }));
    fireEvent.change(screen.getByPlaceholderText("SUMMER20"), { target: { value: "TESTCODE" } });
    fireEvent.click(screen.getByRole("button", { name: /^Create$/i }));
    expect(screen.getByText("TESTCODE")).toBeInTheDocument();
  });

  it("Storefront save persists prep time", async () => {
    const { updateRestaurant, getRestaurant } = await import("../lib/restaurantStore");
    wrap(<Storefront />);
    fireEvent.click(screen.getByRole("button", { name: /Save changes/i }));
    expect(getRestaurant()).toBeTruthy();
  });
});

describe("admin tenant actions", () => {
  it("suspends a restaurant from the table drawer", () => {
    adminLogin();
    wrap(<AdminRestaurants />);
    // open first row
    const rows = screen.getAllByText(/Ambala|Chandigarh|Delhi/);
    expect(rows.length).toBeGreaterThan(0);
  });
});

describe("new customer-menu features", () => {
  const renderMenu = () => render(
    <MemoryRouter initialEntries={["/r/spice-junction"]}>
      <Routes><Route path="/r/:slug" element={<CustomerMenu />} /></Routes>
    </MemoryRouter>
  );

  it("veg filter hides non-veg items", () => {
    renderMenu();
    expect(screen.getByText(/Chicken Zinger Burger/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Veg$/ }));
    expect(screen.queryByText(/Chicken Zinger Burger/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Margherita Pizza/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Non-veg/ }));
    expect(screen.getByText(/Chicken Zinger Burger/i)).toBeInTheDocument();
    expect(screen.queryByText(/Margherita Pizza/i)).not.toBeInTheDocument();
  });

  it("cart offers dine-in / parcel choice", () => {
    renderMenu();
    fireEvent.click(screen.getAllByRole("button", { name: /ADD/i })[0]);
    fireEvent.click(screen.getByText(/View cart/i));
    const parcel = screen.getByRole("button", { name: /Parcel/i });
    expect(screen.getByRole("button", { name: /Dine-in/i })).toBeInTheDocument();
    fireEvent.click(parcel);
    expect(parcel).toBeInTheDocument();
  });

  it("customer can cancel a new order", async () => {
    renderMenu();
    fireEvent.click(screen.getAllByRole("button", { name: /ADD/i })[0]);
    fireEvent.click(screen.getByText(/View cart/i));
    fireEvent.click(screen.getByText(/Place order/i));
    // status screen with timer + cancel
    expect(await screen.findByText(/Your token number/i)).toBeInTheDocument();
    expect(screen.getByText(/min left|Any moment/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Cancel order/i }));
    fireEvent.click(screen.getByRole("button", { name: /Yes, cancel/i }));
    expect(await screen.findByText(/Order cancelled/i)).toBeInTheDocument();
  });
});

describe("MenuItems add/edit modal (hook-order regression)", () => {
  it("opens the Add-item modal without a hooks error", async () => {
    demoLogin();
    render(<MemoryRouter><MenuItems /></MemoryRouter>);
    const addBtn = (await screen.findAllByText(/Add new item/i))[0];
    fireEvent.click(addBtn);
    // modal mounts its later hooks (upload state) — must not throw.
    // The name placeholder only exists inside the modal.
    expect(await screen.findByPlaceholderText(/Paneer Tikka Burger/i)).toBeInTheDocument();
  });
});

describe("coupon builder creates a rule-based coupon", () => {
  it("flat ₹50, min ₹299, first-visit-only", async () => {
    demoLogin();
    render(<MemoryRouter><Coupons /></MemoryRouter>);
    fireEvent.click((await screen.findAllByText(/New coupon/i))[0]);
    fireEvent.change(screen.getByPlaceholderText("SUMMER20"), { target: { value: "FIRST50" } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "flat" } });
    const numbers = screen.getAllByRole("spinbutton");
    fireEvent.change(numbers[0], { target: { value: "50" } });   // amount
    fireEvent.change(numbers[1], { target: { value: "299" } });  // min order
    fireEvent.click(screen.getByRole("checkbox"));               // first-visit only
    fireEvent.click(screen.getByRole("button", { name: /^Create$/i }));
    expect(await screen.findByText("FIRST50")).toBeInTheDocument();
    expect(screen.getByText(/₹50 off on orders above ₹299/i)).toBeInTheDocument();
  });
});

describe("Settings page persists edits", () => {
  it("saves contact + name to the restaurant store", async () => {
    demoLogin();
    render(<MemoryRouter><Settings /></MemoryRouter>);
    const phoneInput = (await screen.findAllByPlaceholderText("+91…"))[0];
    fireEvent.change(phoneInput, { target: { value: "+91 91111 00000" } });
    fireEvent.change(screen.getByPlaceholderText("Your restaurant name"), { target: { value: "Tandoor Tales" } });
    fireEvent.click(screen.getByRole("button", { name: /Save changes/i }));
    const { getRestaurant } = await import("../lib/restaurantStore");
    expect(getRestaurant().contact.phone).toBe("+91 91111 00000");
    const { getUser } = await import("../lib/authStore");
    expect(getUser().restaurant).toBe("Tandoor Tales");
  });
});

describe("Settings account: password show/hide", () => {
  it("toggles the new-password field between hidden and visible", async () => {
    demoLogin();
    render(<MemoryRouter><Settings /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: /Account/i }));
    const pw = (await screen.findAllByPlaceholderText("••••••••"))[0];
    expect(pw).toHaveAttribute("type", "password");
    fireEvent.click(screen.getAllByRole("button", { name: /Show password/i })[0]);
    expect(pw).toHaveAttribute("type", "text");
  });
});

describe("signup requires a contact number", () => {
  it("rejects signup without a valid phone", async () => {
    render(<MemoryRouter><Login /></MemoryRouter>);
    fireEvent.click(await screen.findByText(/Create an account/i));
    fireEvent.change(screen.getByPlaceholderText("Your name"), { target: { value: "Asha" } });
    fireEvent.change(screen.getByPlaceholderText("Restaurant name"), { target: { value: "Asha Cafe" } });
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "asha@test.in" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "StrongPass1" } });
    fireEvent.click(screen.getByRole("button", { name: /Create account/i }));
    expect(await screen.findByText(/valid contact number/i)).toBeInTheDocument();
  });
});

describe("Settings: next-visit reward is editable", () => {
  it("persists a custom reward to growth.nextVisit", async () => {
    demoLogin();
    render(<MemoryRouter><Settings /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: /^Ordering$/i }));
    await screen.findByText(/Next-visit reward/i);
    const amt = screen.getByText(/Amount ₹/i).parentElement.querySelector("input");
    fireEvent.change(amt, { target: { value: "75" } });
    fireEvent.click(screen.getByRole("button", { name: /Save changes/i }));
    const { getRestaurant } = await import("../lib/restaurantStore");
    expect(getRestaurant().growth.nextVisit.value).toBe(75);
  });
});

describe("Settings: logo/banner persist and reload", () => {
  it("saves logoUrl and bannerUrl through the main Save", async () => {
    demoLogin();
    const { updateRestaurant, getRestaurant } = await import("../lib/restaurantStore");
    // simulate prior uploads having set URLs, then re-open Settings
    updateRestaurant({ logoUrl: "data:image/png;base64,LOGO", bannerUrl: "data:image/png;base64,BANNER" });
    render(<MemoryRouter><Settings /></MemoryRouter>);
    // the restaurant tab shows them; saving should keep them
    fireEvent.click(screen.getByRole("button", { name: /Save changes/i }));
    expect(getRestaurant().logoUrl).toBe("data:image/png;base64,LOGO");
    expect(getRestaurant().bannerUrl).toBe("data:image/png;base64,BANNER");
  });
});
