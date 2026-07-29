import { CHARCOAL } from "../lib/theme";
import { useAuth } from "../lib/authStore";
import SummaryCardsWidget from "../components/widgets/SummaryCardsWidget";
import LiveOrdersWidget from "../components/widgets/LiveOrdersWidget";
import RevenueChartWidget from "../components/widgets/RevenueChartWidget";
import BestSellersWidget from "../components/widgets/BestSellersWidget";
import TodaysSpecialsWidget from "../components/widgets/TodaysSpecialsWidget";
import {
  RecentActivityWidget, QuickActionsWidget,
  CustomerVerificationWidget, ProfileCompletionWidget,
} from "../components/widgets/OverviewWidgets";
import {
  GrowthSummaryWidget, ReviewGrowthWidget, SocialGrowthWidget, CouponsLoyaltyWidget,
} from "../components/widgets/GrowthWidgets";

export default function Overview() {
  const { user } = useAuth();
  const firstName = (user?.name || "there").split(" ")[0];
  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-5 space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: CHARCOAL }}>Welcome back, {firstName} 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your control center for {user?.restaurant || "your restaurant"}, today at a glance.</p>
        </div>
      </div>

      {/* widget: summary cards */}
      <SummaryCardsWidget />

      {/* live orders + revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><LiveOrdersWidget /></div>
        <ProfileCompletionWidget />
      </div>

      <RevenueChartWidget />

      {/* best sellers + specials + verification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BestSellersWidget />
        <TodaysSpecialsWidget />
        <CustomerVerificationWidget />
      </div>

      {/* quick actions */}
      <QuickActionsWidget />

      {/* growth engine — the channels promised on the landing page */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400 mb-3">Growth engine</h2>
        <GrowthSummaryWidget />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ReviewGrowthWidget />
        <SocialGrowthWidget />
        <CouponsLoyaltyWidget />
      </div>

      {/* recent activity */}
      <RecentActivityWidget />
    </div>
  );
}
