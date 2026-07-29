// Item-level sales for the Analytics page, per time period.
// Swap for an API aggregation later (GROUP BY item, date range).
export const ITEM_SALES = {
  week: [
    { name: "Margherita Pizza", emoji: "🍕", category: "Pizza", orders: 84, revenue: 23436, trend: 12 },
    { name: "Chicken Zinger Burger", emoji: "🍔", category: "Burgers", orders: 76, revenue: 17404, trend: 8 },
    { name: "Cold Brew", emoji: "☕", category: "Coffee", orders: 61, revenue: 9699, trend: 24 },
    { name: "Chocolate Lava Cake", emoji: "🍰", category: "Dessert", orders: 43, revenue: 7697, trend: -5 },
    { name: "Paneer Tikka Burger", emoji: "🍔", category: "Burgers", orders: 39, revenue: 7371, trend: 15 },
    { name: "Mango Smoothie", emoji: "🥤", category: "Beverages", orders: 34, revenue: 4726, trend: 3 },
    { name: "Pepperoni Pizza", emoji: "🍕", category: "Pizza", orders: 28, revenue: 11172, trend: -2 },
    { name: "Fresh Lime Soda", emoji: "🥤", category: "Beverages", orders: 22, revenue: 1958, trend: -8 },
  ],
  month: [
    { name: "Margherita Pizza", emoji: "🍕", category: "Pizza", orders: 312, revenue: 87048, trend: 14 },
    { name: "Chicken Zinger Burger", emoji: "🍔", category: "Burgers", orders: 286, revenue: 65494, trend: 9 },
    { name: "Cold Brew", emoji: "☕", category: "Coffee", orders: 241, revenue: 38319, trend: 22 },
    { name: "Chocolate Lava Cake", emoji: "🍰", category: "Dessert", orders: 198, revenue: 35442, trend: -3 },
    { name: "Paneer Tikka Burger", emoji: "🍔", category: "Burgers", orders: 164, revenue: 30996, trend: 11 },
    { name: "Pepperoni Pizza", emoji: "🍕", category: "Pizza", orders: 141, revenue: 56259, trend: 4 },
    { name: "Mango Smoothie", emoji: "🥤", category: "Beverages", orders: 128, revenue: 17792, trend: 6 },
    { name: "Fresh Lime Soda", emoji: "🥤", category: "Beverages", orders: 96, revenue: 8544, trend: -6 },
  ],
  lastMonth: [
    { name: "Chicken Zinger Burger", emoji: "🍔", category: "Burgers", orders: 262, revenue: 59998, trend: 5 },
    { name: "Margherita Pizza", emoji: "🍕", category: "Pizza", orders: 274, revenue: 76446, trend: 7 },
    { name: "Chocolate Lava Cake", emoji: "🍰", category: "Dessert", orders: 204, revenue: 36516, trend: 9 },
    { name: "Cold Brew", emoji: "☕", category: "Coffee", orders: 197, revenue: 31323, trend: 13 },
    { name: "Pepperoni Pizza", emoji: "🍕", category: "Pizza", orders: 136, revenue: 54264, trend: -1 },
    { name: "Paneer Tikka Burger", emoji: "🍔", category: "Burgers", orders: 148, revenue: 27972, trend: 2 },
    { name: "Mango Smoothie", emoji: "🥤", category: "Beverages", orders: 121, revenue: 16819, trend: -4 },
    { name: "Fresh Lime Soda", emoji: "🥤", category: "Beverages", orders: 102, revenue: 9078, trend: 1 },
  ],
};

export const PERIOD_LABEL = { week: "This week", month: "This month", lastMonth: "Last month" };
