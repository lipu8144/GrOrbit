import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./components/layout/DashboardLayout";
import RequireAuth from "./components/RequireAuth";
import RequireAdmin from "./components/RequireAdmin";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Health from "./pages/Health";
import { ConfirmEmail, AuthCallback } from "./pages/AuthPages";
import ErrorBoundary from "./components/ErrorBoundary";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import Restaurants from "./pages/admin/Restaurants";
import AdminUsers from "./pages/admin/AdminUsers";
import { Subscriptions, AdminAnalytics } from "./pages/admin/AdminPages";

// Landing pulls in Framer Motion — load it only on "/"
const Landing = lazy(() => import("./pages/Landing"));
// Customer ordering app — public, separate experience
const CustomerMenu = lazy(() => import("./pages/customer/Menu"));

import Overview from "./pages/Overview";
import LiveOrders from "./pages/orders/LiveOrders";
import OrderHistory from "./pages/orders/OrderHistory";
import MenuItems from "./pages/menu/MenuItems";
import TodaysSpecials from "./pages/menu/TodaysSpecials";
import Categories from "./pages/Categories";
import Customers from "./pages/Customers";
import Reviews from "./pages/growth/Reviews";
import Social from "./pages/growth/Social";
import WhatsApp from "./pages/growth/WhatsApp";
import Coupons from "./pages/growth/Coupons";
import QRCodes from "./pages/QRCodes";
import Storefront from "./pages/Storefront";
import Analytics from "./pages/Analytics";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";

function Loader() {
  return (
    <div className="min-h-screen grid place-items-center bg-white">
      <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-[#E08A5B] animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <Routes>
      <Route path="/" element={<Suspense fallback={<Loader />}><Landing /></Suspense>} />
      <Route path="/r/:slug" element={<Suspense fallback={<Loader />}><CustomerMenu /></Suspense>} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/health" element={<Health />} />
      <Route path="/confirm-email" element={<ConfirmEmail />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
        <Route index element={<AdminOverview />} />
        <Route path="restaurants" element={<Restaurants />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="*" element={<AdminOverview />} />
      </Route>
      <Route path="/app" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
        <Route index element={<Overview />} />
        <Route path="orders/live" element={<LiveOrders />} />
        <Route path="orders/history" element={<OrderHistory />} />
        <Route path="orders" element={<Navigate to="/app/orders/live" replace />} />
        <Route path="menu/items" element={<MenuItems />} />
        <Route path="menu/specials" element={<TodaysSpecials />} />
        <Route path="menu" element={<Navigate to="/app/menu/items" replace />} />
        <Route path="categories" element={<Categories />} />
        <Route path="customers" element={<Customers />} />
        <Route path="growth/reviews" element={<Reviews />} />
        <Route path="growth/social" element={<Social />} />
        <Route path="growth/whatsapp" element={<WhatsApp />} />
        <Route path="growth/coupons" element={<Coupons />} />
        <Route path="growth" element={<Navigate to="/app/growth/reviews" replace />} />
        <Route path="qr" element={<QRCodes />} />
        <Route path="storefront" element={<Storefront />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Overview />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ErrorBoundary>
  );
}
