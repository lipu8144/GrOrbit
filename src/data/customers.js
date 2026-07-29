export const CUSTOMERS = [
  { id: 1, name: "Lipu Mohanty", phone: "+91 98765 43210", orders: 42, spend: 18420, last: "Today", tier: "vip", fav: "Chicken Burger", trend: [3, 5, 4, 6, 8, 7, 9] },
  { id: 2, name: "Aarav Sharma", phone: "+91 91234 56789", orders: 28, spend: 11260, last: "Yesterday", tier: "regular", fav: "Margherita Pizza", trend: [2, 3, 3, 4, 5, 4, 6] },
  { id: 3, name: "Meera Nair", phone: "+91 99887 76655", orders: 19, spend: 8740, last: "2 days ago", tier: "regular", fav: "Paneer Tikka Burger", trend: [1, 2, 3, 2, 4, 3, 5] },
  { id: 4, name: "Dev Patel", phone: "+91 90909 80808", orders: 7, spend: 3120, last: "1 week ago", tier: "new", fav: "Pepperoni Pizza", trend: [0, 1, 1, 2, 1, 2, 2] },
  { id: 5, name: "Priya Iyer", phone: "+91 93333 12121", orders: 51, spend: 24380, last: "Today", tier: "vip", fav: "Cappuccino", trend: [4, 6, 5, 7, 9, 8, 11] },
  { id: 6, name: "Karan Mehta", phone: "+91 95555 67676", orders: 14, spend: 6210, last: "3 days ago", tier: "regular", fav: "Mango Smoothie", trend: [1, 2, 2, 3, 3, 4, 4] },
  { id: 7, name: "Sana Khan", phone: "+91 97777 23232", orders: 4, spend: 1480, last: "2 weeks ago", tier: "atrisk", fav: "Cold Coffee", trend: [2, 2, 1, 1, 0, 1, 0] },
  { id: 8, name: "Rohit Verma", phone: "+91 98989 45454", orders: 33, spend: 14900, last: "Yesterday", tier: "regular", fav: "Lava Cake", trend: [3, 4, 4, 5, 6, 5, 7] },
];

export const TIER = {
  vip: { label: "VIP", tone: "brand" }, regular: { label: "Regular", tone: "blue" },
  new: { label: "New", tone: "green" }, atrisk: { label: "At risk", tone: "rose" },
};
