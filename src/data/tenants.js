// Dummy multi-tenant data for the super-admin (platform owner) view.
export const PLANS = {
  Starter: { price: 0, color: "#6B7280" },
  Growth: { price: 999, color: "#E08A5B" },
  Pro: { price: 2499, color: "#9333EA" },
};

export const TENANTS = [
  { id: "t1", name: "Spice Junction", slug: "spice-junction", owner: "Ravi Kumar", city: "Ambala", plan: "Growth", status: "active", orders: 3284, revenue: 842000, rating: 4.8, joined: "2025-11-02", lastActive: "Just now" },
  { id: "t2", name: "Frosty Treats", slug: "frosty-treats", owner: "Neha Singh", city: "Chandigarh", plan: "Pro", status: "active", orders: 5120, revenue: 1340000, rating: 4.7, joined: "2025-09-18", lastActive: "12 min ago" },
  { id: "t3", name: "The Curry Co.", slug: "curry-co", owner: "Imran Q.", city: "Delhi", plan: "Growth", status: "active", orders: 2210, revenue: 631000, rating: 4.6, joined: "2025-12-01", lastActive: "1 hr ago" },
  { id: "t4", name: "Bean & Brew", slug: "bean-brew", owner: "Anita R.", city: "Pune", plan: "Starter", status: "trial", orders: 142, revenue: 38000, rating: 4.5, joined: "2026-06-10", lastActive: "3 hr ago" },
  { id: "t5", name: "Tandoori Nights", slug: "tandoori-nights", owner: "Vikram S.", city: "Jaipur", plan: "Pro", status: "active", orders: 4012, revenue: 1102000, rating: 4.9, joined: "2025-08-22", lastActive: "Today" },
  { id: "t6", name: "Pizza Palace", slug: "pizza-palace", owner: "Sara M.", city: "Mumbai", plan: "Growth", status: "suspended", orders: 1870, revenue: 498000, rating: 4.2, joined: "2025-10-14", lastActive: "8 days ago" },
  { id: "t7", name: "Sweet Corner", slug: "sweet-corner", owner: "Dev P.", city: "Surat", plan: "Starter", status: "trial", orders: 96, revenue: 21000, rating: 4.4, joined: "2026-06-20", lastActive: "Yesterday" },
  { id: "t8", name: "Wrap & Roll", slug: "wrap-roll", owner: "Farah K.", city: "Lucknow", plan: "Growth", status: "active", orders: 1530, revenue: 412000, rating: 4.6, joined: "2026-01-09", lastActive: "2 hr ago" },
  { id: "t9", name: "Cafe Mocha", slug: "cafe-mocha", owner: "Rahul T.", city: "Bengaluru", plan: "Pro", status: "active", orders: 6240, revenue: 1620000, rating: 4.8, joined: "2025-07-30", lastActive: "Just now" },
  { id: "t10", name: "Biryani House", slug: "biryani-house", owner: "Zoya A.", city: "Hyderabad", plan: "Growth", status: "active", orders: 3890, revenue: 980000, rating: 4.7, joined: "2025-11-25", lastActive: "30 min ago" },
  { id: "t11", name: "Crunchy Bites", slug: "crunchy-bites", owner: "Manish G.", city: "Indore", plan: "Starter", status: "trial", orders: 64, revenue: 14000, rating: 4.3, joined: "2026-06-25", lastActive: "5 hr ago" },
  { id: "t12", name: "Green Bowl", slug: "green-bowl", owner: "Priya N.", city: "Kochi", plan: "Growth", status: "active", orders: 2040, revenue: 560000, rating: 4.6, joined: "2026-02-14", lastActive: "1 hr ago" },
];

export const SIGNUPS_TREND = [4, 6, 5, 8, 11, 9, 13, 15, 12, 18, 21, 24];      // monthly
export const REVENUE_TREND = [120, 180, 165, 220, 280, 260, 340, 380, 360, 420, 470, 520]; // ₹k MRR
