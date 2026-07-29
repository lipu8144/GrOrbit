// Growth-channel data backing the features advertised on the landing page:
// Google Review growth, Social growth, and Coupons & Loyalty.

export const GROWTH_STATS = {
  reviews: { value: 2340, delta: 18, rating: 4.8 },
  followers: { value: 8900, delta: 22 },
  coupons: { value: 612, delta: 9 },     // redeemed
  repeatRate: { value: 67, delta: 6 },   // %
};

export const REVIEWS = [
  { id: 1, author: "Priya M.", rating: 5, text: "Best burgers in Ambala! Ordering from the QR was so quick.", source: "google", time: "2 min ago", replied: false },
  { id: 2, author: "Rahul S.", rating: 5, text: "Loved the cold brew and the lava cake. Will be back.", source: "google", time: "1 hr ago", replied: true },
  { id: 3, author: "Ananya K.", rating: 4, text: "Great food, slightly slow during rush hour but worth it.", source: "google", time: "3 hr ago", replied: false },
  { id: 4, author: "Vikram D.", rating: 5, text: "Super smooth ordering experience. Paneer tikka burger 🔥", source: "zomato", time: "Yesterday", replied: true },
  { id: 5, author: "Sneha R.", rating: 5, text: "The coupon after my first order brought me right back!", source: "google", time: "Yesterday", replied: false },
];

export const REVIEW_TREND = [6, 9, 8, 12, 15, 14, 18, 21, 19, 24, 28, 31];
export const RATING_BREAKDOWN = [
  { stars: 5, count: 1840 }, { stars: 4, count: 360 }, { stars: 3, count: 92 },
  { stars: 2, count: 28 }, { stars: 1, count: 20 },
];

export const SOCIAL = [
  { platform: "Instagram", handle: "@spicejunction", followers: 5240, delta: 24, color: "#E1306C", trend: [40, 52, 60, 75, 90, 110, 132] },
  { platform: "Facebook", handle: "Spice Junction", followers: 2680, delta: 11, color: "#1877F2", trend: [20, 24, 28, 31, 36, 40, 44] },
  { platform: "WhatsApp", handle: "+91 98765 43210", followers: 980, delta: 31, color: "#25D366", trend: [4, 8, 12, 18, 24, 30, 38] },
];

export const COUPONS = [
  { id: 1, code: "WELCOME10", desc: "10% off first order", type: "First-time", redeemed: 184, issued: 320, active: true, expires: "Ongoing", discount: { type: "percent", value: 10, max: 100, firstVisitOnly: true } },
  { id: 2, code: "COMEBACK50", desc: "₹50 off return visit", type: "Win-back", redeemed: 142, issued: 260, active: true, expires: "Jul 31", discount: { type: "flat", value: 50, minOrder: 250 } },
  { id: 3, code: "REVIEW15", desc: "15% off for a Google review", type: "Review reward", redeemed: 96, issued: 140, active: true, expires: "Ongoing", discount: { type: "percent", value: 15, max: 150 } },
  { id: 4, code: "WEEKEND20", desc: "20% off weekends", type: "Seasonal", redeemed: 190, issued: 410, active: false, expires: "Expired", discount: { type: "percent", value: 20 } },
  // Spin-to-win rewards (active so they apply on the next visit)
  { id: 5, code: "SPIN15", desc: "15% off — spin jackpot", type: "Spin reward", redeemed: 41, issued: 60, active: true, expires: "Next 3 visits", discount: { type: "percent", value: 15, max: 120 } },
  { id: 6, code: "TREAT30", desc: "₹30 off your next visit", type: "Spin reward", redeemed: 88, issued: 120, active: true, expires: "Next visit", discount: { type: "flat", value: 30 } },
  { id: 7, code: "LUCKY5", desc: "5% off your next visit", type: "Spin reward", redeemed: 132, issued: 200, active: true, expires: "Next visit", discount: { type: "percent", value: 5 } },
];

export const LOYALTY = {
  members: 1284,
  delta: 14,
  pointsIssued: 86400,
  pointsRedeemed: 41200,
  tiers: [
    { name: "Bronze", members: 720, color: "#CD7F32" },
    { name: "Silver", members: 410, color: "#9CA3AF" },
    { name: "Gold", members: 154, color: "#F59E0B" },
  ],
};
