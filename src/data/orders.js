// Live order seed — timestamps relative to load so timers look real.
const now0 = Date.now();
const mins = (m) => now0 - m * 60000;

export const SEED_ORDERS = [
  { id: 1, token: "#8342", customer: "Lipu", phone: "+91 98765 43210", type: "dinein", table: 7, payment: "unpaid", method: "Pay at counter", status: "new", placedAt: mins(1), notes: "Less spicy, no onion", returning: false, items: [{ name: "Chicken Burger", qty: 2, price: 229 }, { name: "Cold Coffee", qty: 1, price: 149 }] },
  { id: 2, token: "#8341", customer: "Aarav", phone: "+91 91234 56789", type: "parcel", payment: "paid", method: "UPI", status: "new", placedAt: mins(3), notes: "", returning: true, items: [{ name: "Margherita Pizza", qty: 1, price: 279 }, { name: "Fresh Lime Soda", qty: 2, price: 89 }] },
  { id: 3, token: "#8340", customer: "Meera", phone: "+91 99887 76655", type: "parcel", payment: "paid", method: "UPI", status: "new", placedAt: mins(5), notes: "Extra napkins", returning: true, items: [{ name: "Paneer Tikka Burger", qty: 1, price: 189 }] },
  { id: 4, token: "#8339", customer: "Dev", phone: "+91 90909 80808", type: "dinein", table: 3, payment: "unpaid", method: "Pay at counter", status: "preparing", placedAt: mins(9), startedAt: mins(6), notes: "Birthday — add candle", returning: false, items: [{ name: "Pepperoni Pizza", qty: 1, price: 399 }, { name: "Chocolate Lava Cake", qty: 2, price: 179 }] },
  { id: 5, token: "#8338", customer: "Priya", phone: "+91 93333 12121", type: "parcel", payment: "paid", method: "UPI", status: "preparing", placedAt: mins(14), startedAt: mins(12), notes: "", returning: true, items: [{ name: "Veg Burger", qty: 2, price: 149 }, { name: "Cappuccino", qty: 2, price: 129 }] },
  { id: 6, token: "#8337", customer: "Karan", phone: "+91 95555 67676", type: "dinein", table: 11, payment: "paid", method: "Card", status: "ready", placedAt: mins(18), startedAt: mins(15), readyAt: mins(2), notes: "", returning: true, items: [{ name: "Mango Smoothie", qty: 3, price: 139 }] },
  { id: 7, token: "#8336", customer: "Sana", phone: "+91 97777 23232", type: "parcel", payment: "paid", method: "UPI", status: "ready", placedAt: mins(22), startedAt: mins(19), readyAt: mins(4), notes: "Pack separately", returning: false, items: [{ name: "Chicken Burger", qty: 1, price: 229 }, { name: "Tiramisu", qty: 1, price: 199 }] },
  { id: 8, token: "#8335", customer: "Rohit", phone: "+91 98989 45454", type: "dinein", table: 5, payment: "paid", method: "UPI", status: "completed", placedAt: mins(35), startedAt: mins(32), readyAt: mins(24), completedAt: mins(20), notes: "", returning: true, items: [{ name: "Margherita Pizza", qty: 2, price: 279 }] },
  { id: 9, token: "#8334", customer: "Isha", phone: "+91 96666 78787", type: "parcel", payment: "paid", method: "UPI", status: "completed", placedAt: mins(42), startedAt: mins(40), readyAt: mins(31), completedAt: mins(28), notes: "", returning: true, items: [{ name: "Cold Coffee", qty: 2, price: 149 }, { name: "Fresh Lime Soda", qty: 1, price: 89 }] },
];

// Completed / cancelled order history.
export const ORDER_HISTORY = [
  { id: 101, token: "#8333", customer: "Nikhil", type: "dinein", table: 2, status: "completed", date: "Today, 11:20 AM", payment: "paid", total: 648, items: [{ name: "Pepperoni Pizza", qty: 1, price: 399 }, { name: "Cold Brew", qty: 1, price: 159 }, { name: "Lime Soda", qty: 1, price: 90 }] },
  { id: 102, token: "#8332", customer: "Anaya", type: "parcel", status: "completed", date: "Today, 10:55 AM", payment: "paid", total: 318, items: [{ name: "Veg Burger", qty: 2, price: 149 }] },
  { id: 103, token: "#8331", customer: "Vikram", type: "dinein", table: 9, status: "cancelled", date: "Today, 10:12 AM", payment: "unpaid", total: 279, items: [{ name: "Margherita Pizza", qty: 1, price: 279 }] },
  { id: 104, token: "#8330", customer: "Pooja", type: "parcel", status: "completed", date: "Yesterday, 8:40 PM", payment: "paid", total: 736, items: [{ name: "Chicken Zinger", qty: 2, price: 229 }, { name: "Tiramisu", qty: 1, price: 199 }, { name: "Cappuccino", qty: 1, price: 79 }] },
  { id: 105, token: "#8329", customer: "Arjun", type: "dinein", table: 4, status: "completed", date: "Yesterday, 8:05 PM", payment: "paid", total: 457, items: [{ name: "Paneer Tikka Burger", qty: 1, price: 189 }, { name: "Mango Smoothie", qty: 2, price: 134 }] },
  { id: 106, token: "#8328", customer: "Reema", type: "parcel", status: "completed", date: "Yesterday, 7:30 PM", payment: "paid", total: 558, items: [{ name: "Cold Brew", qty: 2, price: 159 }, { name: "Lava Cake", qty: 1, price: 179 }, { name: "Lime Soda", qty: 1, price: 61 }] },
  { id: 107, token: "#8327", customer: "Sahil", type: "dinein", table: 6, status: "completed", date: "Yesterday, 7:02 PM", payment: "paid", total: 896, items: [{ name: "Pepperoni Pizza", qty: 2, price: 399 }, { name: "Cappuccino", qty: 1, price: 98 }] },
  { id: 108, token: "#8326", customer: "Tina", type: "parcel", status: "cancelled", date: "Yesterday, 6:48 PM", payment: "unpaid", total: 149, items: [{ name: "Veg Burger", qty: 1, price: 149 }] },
];
