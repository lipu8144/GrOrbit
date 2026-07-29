// Category config (shared by Menu page + customer preview)
export const CATEGORIES = ["Burgers", "Pizza", "Coffee", "Dessert", "Beverages"];

export const CAT_EMOJI = { Burgers: "🍔", Pizza: "🍕", Coffee: "☕", Dessert: "🍰", Beverages: "🥤" };

export const CAT_GRADIENT = {
  Burgers: "linear-gradient(135deg,#FFE3D3,#FFC9A8)",
  Pizza: "linear-gradient(135deg,#FFE0DB,#FFB9AE)",
  Coffee: "linear-gradient(135deg,#EADBCB,#D8BFA3)",
  Dessert: "linear-gradient(135deg,#F3DCEF,#E7BEDE)",
  Beverages: "linear-gradient(135deg,#D9EFEA,#B6E0D4)",
};

export const MENU_ITEMS = [
  { id: 1, name: "Classic Veg Burger", category: "Burgers", price: 149, type: "veg", status: "active", popular: true, special: false, desc: "Crispy potato patty, lettuce & house sauce", image: "https://images.unsplash.com/photo-1550317138-10000687a72b?w=200&h=200&fit=crop&auto=format" },
  { id: 2, name: "Chicken Zinger Burger", category: "Burgers", price: 229, type: "nonveg", status: "active", popular: false, special: false, desc: "Spicy fried chicken, mayo & pickles", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop&auto=format" },
  { id: 3, name: "Paneer Tikka Burger", category: "Burgers", price: 189, type: "veg", status: "active", popular: false, special: true, desc: "Char-grilled paneer with mint chutney", image: "https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?w=200&h=200&fit=crop&auto=format" },
  { id: 4, name: "Margherita Pizza", category: "Pizza", price: 279, type: "veg", status: "active", popular: true, special: false, desc: "San Marzano tomato, mozzarella & basil", image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop&auto=format" },
  { id: 5, name: "Pepperoni Pizza", category: "Pizza", price: 399, type: "nonveg", status: "active", popular: false, special: false, desc: "Loaded pepperoni with extra cheese", image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=200&h=200&fit=crop&auto=format" },
  { id: 6, name: "Farmhouse Pizza", category: "Pizza", price: 349, type: "veg", status: "outofstock", popular: false, special: false, desc: "Onion, capsicum, mushroom & tomato", image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&h=200&fit=crop&auto=format" },
  { id: 7, name: "Cappuccino", category: "Coffee", price: 129, type: "veg", status: "active", popular: false, special: false, desc: "Double shot with velvety microfoam", image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=200&h=200&fit=crop&auto=format" },
  { id: 8, name: "Cold Brew", category: "Coffee", price: 159, type: "veg", status: "active", popular: true, special: false, desc: "18-hour steeped, smooth & low-acid", image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=200&h=200&fit=crop&auto=format" },
  { id: 9, name: "Hazelnut Latte", category: "Coffee", price: 169, type: "veg", status: "hidden", popular: false, special: false, desc: "Roasted hazelnut with steamed milk", image: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=200&h=200&fit=crop&auto=format" },
  { id: 10, name: "Chocolate Lava Cake", category: "Dessert", price: 179, type: "veg", status: "active", popular: true, special: false, desc: "Molten center with a vanilla scoop", image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=200&h=200&fit=crop&auto=format" },
  { id: 11, name: "Tiramisu", category: "Dessert", price: 199, type: "veg", status: "active", popular: false, special: false, desc: "Espresso-soaked layers & mascarpone", image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=200&h=200&fit=crop&auto=format" },
  { id: 12, name: "Fresh Lime Soda", category: "Beverages", price: 89, type: "veg", status: "active", popular: false, special: false, desc: "Sweet & salted, freshly fizzed", image: "https://images.unsplash.com/photo-1437418747212-8d9709afab22?w=200&h=200&fit=crop&auto=format" },
  { id: 13, name: "Mango Smoothie", category: "Beverages", price: 139, type: "veg", status: "active", popular: false, special: true, desc: "Alphonso mango blended with yogurt", image: "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=200&h=200&fit=crop&auto=format" },
];
