import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import {
  QrCode, Utensils, ChefHat, TrendingUp, Star,
  Gift, Users, BarChart3, Menu, X, Check, ArrowDown,
  Zap, Repeat, Instagram, Facebook, Twitter, ShoppingBag, ClipboardList, Award,
  ChevronRight, Store, Megaphone, Database,
  DollarSign, Activity, LineChart, MessageCircle, Bell,
  UserPlus,
} from "lucide-react";

const CORAL = "#E08A5B";
const CHARCOAL = "#1F2937";

// ─── Hooks ──────────────────────────────────────────────────────────────────

function useCountUp(target, duration = 2000, trigger = true) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!trigger) { setValue(0); return; }
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.floor(eased * target));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration, trigger]);
  return value;
}

function useIntersection(ref, threshold = 0.3) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return visible;
}

// ─── Navbar ──────────────────────────────────────────────────────────────────

function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  const links = ["Features", "How it works", "Pricing", "Contact"];
  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled || open ? "bg-white/96 backdrop-blur-xl border-b border-[#E5E7EB] shadow-sm" : "bg-transparent"}`}>
      <div className="max-w-6xl mx-auto px-5 h-[60px] flex items-center justify-between gap-3">
        <a href="#" className="flex items-center gap-2 shrink-0" onClick={() => setOpen(false)}>
          <img src="/grorbit-icon.png" alt="GrOrbit" className="h-9 w-9 sm:hidden rounded-xl" />
          <img src="/grorbit-logo.png" alt="GrOrbit" className="h-7 w-auto hidden sm:block" />
        </a>
        <nav className="hidden md:flex items-center gap-7">
          {links.map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`} className="text-[13.5px] font-medium text-[#6B7280] hover:text-foreground transition-colors" style={{ fontFamily: "var(--font-body)" }}>{l}</a>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-[13.5px] font-medium text-foreground hover:opacity-70 transition-opacity" style={{ fontFamily: "var(--font-body)" }}>Log in</Link>
          <Link to="/login" className="text-[13.5px] font-semibold text-white px-4 py-2 rounded-xl hover:opacity-90 transition-opacity" style={{ background: CORAL, fontFamily: "var(--font-body)" }}>Start free</Link>
        </div>
        <button onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}
          className="md:hidden p-2 -mr-2 shrink-0 rounded-lg hover:bg-muted transition-colors">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <div className="md:hidden bg-white border-b border-border px-5 py-4 flex flex-col gap-3 max-h-[calc(100vh-60px)] overflow-y-auto">
          {links.map(l => <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`} onClick={() => setOpen(false)} className="text-sm font-medium py-2">{l}</a>)}
          <div className="flex items-center gap-3 pt-3 border-t border-border">
            <Link to="/login" onClick={() => setOpen(false)} className="text-sm font-medium py-2 px-1">Log in</Link>
            <Link to="/login" onClick={() => setOpen(false)} className="text-sm font-semibold text-white px-4 py-2.5 rounded-xl" style={{ background: CORAL }}>Start free</Link>
          </div>
        </div>
      )}
    </header>
  );
}

// ─── Hero Growth Loop ─────────────────────────────────────────────────────────

const loopSteps = [
  { icon: QrCode, label: "Scan QR", sub: "At the table" },
  { icon: Utensils, label: "Browse Menu", sub: "No app needed" },
  { icon: ShoppingBag, label: "Place Order", sub: "Instant checkout" },
  { icon: Star, label: "Leave Google Review", sub: "One tap" },
  { icon: Instagram, label: "Follow Instagram", sub: "Social growth" },
  { icon: Gift, label: "Get Reward Coupon", sub: "Retention hook" },
  { icon: Repeat, label: "Return Again", sub: "Loyal customer" },
];

function HeroGrowthLoop() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActive(p => (p + 1) % loopSteps.length), 1200);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col items-center select-none py-2">
      {loopSteps.map(({ icon: Icon, label, sub }, i) => {
        const isActive = active === i;
        const isPast = i < active;
        return (
          <div key={i} className="flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
            >
              <div
                className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border-2 transition-all duration-300 cursor-default"
                style={{
                  width: 210,
                  borderColor: isActive ? CORAL : "#E5E7EB",
                  background: isActive ? "#FFF0EC" : "white",
                  boxShadow: isActive ? `0 0 0 4px ${CORAL}1A` : "none",
                }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300"
                  style={{ background: isActive ? CORAL : isPast ? "#F9FAFB" : "#F3F4F6" }}>
                  <Icon size={16} style={{ color: isActive ? "white" : isPast ? "#9CA3AF" : "#6B7280" }} strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold truncate transition-colors duration-300"
                    style={{ color: isActive ? CORAL : CHARCOAL, fontFamily: "var(--font-display)" }}>{label}</div>
                  <div className="text-[10.5px] mt-0.5" style={{ color: "#9CA3AF", fontFamily: "var(--font-body)" }}>{sub}</div>
                </div>
                {isPast && <Check size={13} strokeWidth={2.5} style={{ color: "#10B981", flexShrink: 0 }} />}
              </div>
            </motion.div>
            {i < loopSteps.length - 1 && (
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.07 }} className="my-0.5">
                <ArrowDown size={14} strokeWidth={2} style={{ color: active > i ? CORAL : "#D1D5DB" }} />
              </motion.div>
            )}
          </div>
        );
      })}
      <div className="mt-3 px-3 py-1 rounded-full text-[11px] font-semibold" style={{ background: "#FFF0EC", color: CORAL, fontFamily: "var(--font-body)" }}>↻ Live customer journey</div>
    </div>
  );
}

// ─── Floating Notification ────────────────────────────────────────────────────

const floatingBadges = [
  { text: "+1 Google Review", icon: Star, color: "#F59E0B", bg: "#FFFBEB", delay: 0 },
  { text: "+1 Follower", icon: UserPlus, color: "#8B5CF6", bg: "#F5F3FF", delay: 1.5 },
  { text: "+₹450 Order", icon: ShoppingBag, color: "#10B981", bg: "#ECFDF5", delay: 3 },
  { text: "Coupon Redeemed", icon: Gift, color: CORAL, bg: "#FFF0EC", delay: 4.5 },
];

function FloatingBadge({ text, icon: Icon, color, bg, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 8 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.85, 1, 1, 0.9], y: [8, 0, 0, -4] }}
      transition={{ duration: 2.5, delay, repeat: Infinity, repeatDelay: floatingBadges.length * 1.5 - 2.5 }}
      className="absolute flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm text-[12px] font-semibold whitespace-nowrap pointer-events-none"
      style={{ background: bg, borderColor: `${color}30`, color, fontFamily: "var(--font-body)" }}
    >
      <Icon size={11} strokeWidth={2} />
      {text}
    </motion.div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="pt-28 pb-20 px-5 max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row items-center gap-16">
        {/* Left */}
        <div className="flex-1 max-w-[560px]">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full border mb-6"
              style={{ background: "#FFF0EC", borderColor: "#FFD5C9", color: CORAL, fontFamily: "var(--font-body)" }}>
              <Zap size={11} fill={CORAL} />Built for cafés and restaurants
            </span>
            <h1 className="text-[46px] sm:text-[58px] font-extrabold leading-[1.06] tracking-tight text-foreground mb-5"
              style={{ fontFamily: "var(--font-display)" }}>
              Turn every table<br />
              <span style={{ color: CORAL }}>into a growth engine</span>
            </h1>
            <p className="text-[17px] leading-relaxed text-muted-foreground mb-8 max-w-[480px]" style={{ fontFamily: "var(--font-body)" }}>
              Customers scan, order, leave reviews, follow your social pages, and return with rewards — all from a single QR experience.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <Link to="/login" className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3.5 rounded-xl hover:opacity-90 active:scale-95 transition-all text-[15px]"
                style={{ background: CORAL, fontFamily: "var(--font-body)" }}>
                Start Free <ChevronRight size={16} />
              </Link>
              <Link to="/login" className="inline-flex items-center gap-2 text-foreground font-semibold px-6 py-3.5 rounded-xl border-2 border-border bg-white hover:border-primary/40 transition-all text-[15px]"
                style={{ fontFamily: "var(--font-body)" }}>
                See Live Demo
              </Link>
            </div>
            <div className="flex flex-wrap gap-5">
              {["Live in 10 minutes", "No setup fee", "Cancel anytime"].map(t => (
                <span key={t} className="flex items-center gap-1.5 text-[13px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                  <Check size={13} strokeWidth={2.5} style={{ color: "#10B981" }} />{t}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right: Growth loop + floating badges */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex-shrink-0 relative"
        >
          {/* Badge positions */}
          <div className="absolute -left-28 top-16 z-10">
            <FloatingBadge {...floatingBadges[0]} />
          </div>
          <div className="absolute -right-24 top-32 z-10">
            <FloatingBadge {...floatingBadges[1]} />
          </div>
          <div className="absolute -left-24 bottom-40 z-10">
            <FloatingBadge {...floatingBadges[2]} />
          </div>
          <div className="absolute -right-20 bottom-24 z-10">
            <FloatingBadge {...floatingBadges[3]} />
          </div>

          <div className="p-6 rounded-3xl border border-border" style={{ background: "#FAFAFA" }}>
            <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-4 text-center" style={{ fontFamily: "var(--font-body)" }}>Customer Journey</p>
            <HeroGrowthLoop />
          </div>
        </motion.div>
      </div>

      {/* Logos strip */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }}
        className="mt-16 pt-8 border-t border-border flex flex-col items-center gap-4">
        <p className="text-[12px] font-medium text-muted-foreground tracking-wide uppercase" style={{ fontFamily: "var(--font-body)" }}>Trusted by restaurants across India</p>
        <div className="flex flex-wrap justify-center gap-8 opacity-40">
          {["Brewstone Café", "The Bread Box", "Spice Route", "Urban Bites", "Cloud Kitchen Co."].map(name => (
            <span key={name} className="text-[14px] font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{name}</span>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

// ─── Scroll Story ─────────────────────────────────────────────────────────────

const scenes = [
  { icon: Store, label: "Customer enters café", desc: "They sit down and look for a menu.", color: "#6366F1" },
  { icon: QrCode, label: "Scans QR", desc: "No app. No friction. Instant.", color: CORAL },
  { icon: Utensils, label: "Orders coffee", desc: "Full menu, photos, and customisations.", color: "#F59E0B" },
  { icon: ChefHat, label: "Kitchen receives order", desc: "Live notification on staff dashboard.", color: "#10B981" },
  { icon: Award, label: "Meal completed", desc: "Staff marks the order done.", color: "#8B5CF6" },
  { icon: Star, label: "Review request", desc: "One tap to leave a Google review.", color: "#F59E0B" },
  { icon: Instagram, label: "Instagram follow", desc: "Prompted to follow in-flow.", color: "#E1306C" },
  { icon: Gift, label: "Coupon unlocked", desc: "A personalised reward for their next visit.", color: CORAL },
  { icon: Repeat, label: "Customer returns", desc: "They redeem the coupon — and bring a friend.", color: "#10B981" },
];

function SceneCard({ scene, index }) {
  const ref = useRef(null);
  const visible = useIntersection(ref, 0.5);
  const Icon = scene.icon;
  return (
    <div ref={ref} className="flex items-start gap-5">
      <div className="flex flex-col items-center shrink-0">
        <motion.div
          animate={{ scale: visible ? 1 : 0.85, opacity: visible ? 1 : 0.3 }}
          transition={{ duration: 0.4 }}
          className="w-11 h-11 rounded-2xl flex items-center justify-center border-2 transition-colors"
          style={{
            background: visible ? `${scene.color}15` : "#F9FAFB",
            borderColor: visible ? `${scene.color}40` : "#E5E7EB",
          }}
        >
          <Icon size={20} style={{ color: visible ? scene.color : "#9CA3AF" }} strokeWidth={1.75} />
        </motion.div>
        {index < scenes.length - 1 && (
          <div className="w-px flex-1 mt-2" style={{ background: visible ? `${scene.color}30` : "#E5E7EB", minHeight: 40 }} />
        )}
      </div>
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: visible ? 1 : 0.4, x: visible ? 0 : -8 }}
        transition={{ duration: 0.4 }}
        className="pb-8 flex-1"
      >
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: scene.color, fontFamily: "var(--font-body)" }}>Step {String(index + 1).padStart(2, "0")}</span>
        <h3 className="text-[17px] font-bold text-foreground mt-0.5 mb-1" style={{ fontFamily: "var(--font-display)" }}>{scene.label}</h3>
        <p className="text-[14px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>{scene.desc}</p>
      </motion.div>
    </div>
  );
}

function ScrollStory() {
  return (
    <section className="py-20 px-5" style={{ background: "#FAFAFA" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-[12px] font-semibold uppercase tracking-widest mb-3 block" style={{ color: CORAL, fontFamily: "var(--font-body)" }}>The GrOrbit Experience</span>
          <h2 className="text-[32px] sm:text-[40px] font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>From first scan to loyal customer</h2>
          <p className="text-[16px] text-muted-foreground mt-3 max-w-md mx-auto" style={{ fontFamily: "var(--font-body)" }}>Every interaction is an opportunity to grow. Watch how one meal becomes a lifelong relationship.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-x-16 gap-y-0 max-w-4xl mx-auto">
          {scenes.map((scene, i) => (
            <SceneCard key={i} scene={scene} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Growth Engine ────────────────────────────────────────────────────────────

const engineNodes = [
  { label: "Google Reviews", icon: Star, color: "#F59E0B", angle: -90 },
  { label: "Instagram", icon: Instagram, color: "#E1306C", angle: -30 },
  { label: "Facebook", icon: Facebook, color: "#1877F2", angle: 30 },
  { label: "WhatsApp", icon: MessageCircle, color: "#25D366", angle: 90 },
  { label: "Coupons", icon: Gift, color: CORAL, angle: 150 },
  { label: "Customer DB", icon: Database, color: "#8B5CF6", angle: -150 },
];

function GrowthEngine() {
  const R = 148; // orbit radius
  const CX = 250, CY = 220;

  return (
    <section className="py-20 px-5 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <span className="text-[12px] font-semibold uppercase tracking-widest mb-3 block" style={{ color: CORAL, fontFamily: "var(--font-body)" }}>Growth Engine</span>
        <h2 className="text-[32px] sm:text-[40px] font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>One platform. Every growth channel.</h2>
        <p className="text-[16px] text-muted-foreground mt-3 max-w-lg mx-auto" style={{ fontFamily: "var(--font-body)" }}>GrOrbit connects your restaurant to every customer growth channel from a single QR code.</p>
      </div>

      <div className="flex justify-center">
        <div className="relative w-full max-w-[500px]" style={{ aspectRatio: "500/440" }}>
          <svg viewBox="0 0 500 440" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full">
            {engineNodes.map(({ color, angle }, i) => {
              const rad = (angle * Math.PI) / 180;
              const nx = CX + R * Math.cos(rad);
              const ny = CY + R * Math.sin(rad);
              const id = `path-${i}`;
              return (
                <g key={i}>
                  <path id={id} d={`M${CX},${CY} L${nx},${ny}`} stroke={`${color}30`} strokeWidth="1.5" strokeDasharray="4 4" />
                  <circle r="5" fill={color}>
                    <animateMotion dur={`${2.2 + i * 0.4}s`} repeatCount="indefinite" begin={`${i * 0.5}s`}>
                      <mpath href={`#${id}`} />
                    </animateMotion>
                  </circle>
                  <circle r="3.5" fill={color} opacity="0.5">
                    <animateMotion dur={`${2.2 + i * 0.4}s`} repeatCount="indefinite" begin={`${i * 0.5 + 1}s`}>
                      <mpath href={`#${id}`} />
                    </animateMotion>
                  </circle>
                </g>
              );
            })}
            {/* Outer ring */}
            <circle cx={CX} cy={CY} r={R} stroke="#F3F4F6" strokeWidth="1" strokeDasharray="3 6" />
          </svg>

          {/* Center node */}
          <div className="absolute flex flex-col items-center justify-center rounded-3xl border-2 shadow-sm"
            style={{
              left: "50%", top: `${(CY / 440) * 100}%`,
              transform: "translate(-50%, -50%)",
              width: 100, height: 100,
              background: "white", borderColor: `${CORAL}30`,
            }}>
            <QrCode size={24} style={{ color: CORAL }} strokeWidth={1.75} />
            <span className="text-[11px] font-bold mt-1.5" style={{ color: CHARCOAL, fontFamily: "var(--font-display)" }}>GrOrbit</span>
          </div>

          {/* Outer nodes */}
          {engineNodes.map(({ label, icon: Icon, color, angle }, i) => {
            const rad = (angle * Math.PI) / 180;
            const nx = CX + R * Math.cos(rad);
            const ny = CY + R * Math.sin(rad);
            return (
              <div key={i} className="absolute flex flex-col items-center group"
                style={{ left: `${(nx / 500) * 100}%`, top: `${(ny / 440) * 100}%`, transform: "translate(-50%, -50%)" }}>
                <motion.div whileHover={{ scale: 1.12 }} transition={{ type: "spring", stiffness: 400 }}
                  className="w-14 h-14 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 bg-white shadow-sm cursor-default"
                  style={{ borderColor: `${color}35` }}>
                  <Icon size={20} style={{ color }} strokeWidth={1.75} />
                  <span className="text-[9px] font-bold text-center leading-tight px-1" style={{ color: CHARCOAL, fontFamily: "var(--font-body)" }}>{label}</span>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Live Impact ──────────────────────────────────────────────────────────────

const activityItems = [
  { icon: Star, text: "+1 Google Review", color: "#F59E0B", bg: "#FFFBEB" },
  { icon: UserPlus, text: "+1 Instagram Follow", color: "#E1306C", bg: "#FFF0F7" },
  { icon: ShoppingBag, text: "+₹220 Order placed", color: "#10B981", bg: "#ECFDF5" },
  { icon: Repeat, text: "+1 Returning Customer", color: CORAL, bg: "#FFF0EC" },
  { icon: Gift, text: "Coupon Redeemed", color: "#8B5CF6", bg: "#F5F3FF" },
  { icon: Star, text: "+1 Google Review", color: "#F59E0B", bg: "#FFFBEB" },
  { icon: Facebook, text: "+1 Facebook Follow", color: "#1877F2", bg: "#EFF6FF" },
];

const kpiDefs = [
  { label: "Revenue Generated", target: 148000, prefix: "₹", suffix: "", icon: TrendingUp, color: "#10B981" },
  { label: "Reviews Collected", target: 2340, prefix: "", suffix: "+", icon: Star, color: "#F59E0B" },
  { label: "Followers Gained", target: 8900, prefix: "", suffix: "+", icon: Users, color: "#8B5CF6" },
  { label: "Repeat Customers", target: 67, prefix: "", suffix: "%", icon: Repeat, color: CORAL },
];

function LiveImpact() {
  const ref = useRef(null);
  const visible = useIntersection(ref, 0.2);

  const [feed, setFeed] = useState(activityItems.slice(0, 4));
  useEffect(() => {
    if (!visible) return;
    let idx = 4;
    const id = setInterval(() => {
      const next = activityItems[idx % activityItems.length];
      setFeed(prev => [next, ...prev.slice(0, 5)]);
      idx++;
    }, 2200);
    return () => clearInterval(id);
  }, [visible]);

  // One hook call per KPI at top level — no hooks in loops
  const c0 = useCountUp(kpiDefs[0].target, 2200, visible);
  const c1 = useCountUp(kpiDefs[1].target, 2200, visible);
  const c2 = useCountUp(kpiDefs[2].target, 2200, visible);
  const c3 = useCountUp(kpiDefs[3].target, 2200, visible);
  const counts = [c0, c1, c2, c3];

  return (
    <section ref={ref} className="py-20 px-5" style={{ background: "#FFF9F7" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-[12px] font-semibold uppercase tracking-widest mb-3 block" style={{ color: CORAL, fontFamily: "var(--font-body)" }}>Business Impact</span>
          <h2 className="text-[32px] sm:text-[40px] font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Real restaurants. Real growth.</h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4">
            {kpiDefs.map(({ label, target, prefix, suffix, icon: Icon, color }, i) => {
              const displayed = counts[i];
              return (
                <div key={label} className="bg-white rounded-2xl border border-border p-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}15` }}>
                    <Icon size={18} style={{ color }} strokeWidth={1.75} />
                  </div>
                  <div className="text-[28px] font-extrabold leading-none mb-1" style={{ color: CHARCOAL, fontFamily: "var(--font-display)" }}>
                    {prefix}{target > 999 ? `${(displayed / 1000).toFixed(displayed >= 1000 ? 0 : 1)}k` : displayed}{suffix}
                  </div>
                  <div className="text-[12px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>{label}</div>
                </div>
              );
            })}
          </div>

          {/* Activity Feed */}
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between" style={{ background: "#FAFAFA" }}>
              <div className="flex items-center gap-2">
                <Activity size={15} style={{ color: CORAL }} />
                <span className="text-[14px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>Live Activity</span>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#ECFDF5", color: "#10B981" }}>● Live</span>
            </div>
            {/* Fixed-height list — no layout shift, items fade+slide on opacity/transform only */}
            <div className="divide-y divide-border">
              {feed.slice(0, 5).map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={`${item.text}-${i}-${feed.length}`}
                    initial={i === 0 ? { opacity: 0, y: -6 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="flex items-center gap-3 px-5 py-3.5"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: item.bg }}>
                      <Icon size={14} style={{ color: item.color }} strokeWidth={1.75} />
                    </div>
                    <span className="text-[13.5px] font-medium text-foreground" style={{ fontFamily: "var(--font-body)" }}>{item.text}</span>
                    <span className="ml-auto text-[11px] text-muted-foreground shrink-0" style={{ fontFamily: "var(--font-body)" }}>
                      {i === 0 ? "just now" : `${i * 2}m ago`}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Before / After Slider ────────────────────────────────────────────────────

function BeforeAfter() {
  const [pos, setPos] = useState(50);
  const dragging = useRef(false);
  const containerRef = useRef(null);

  const move = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(2, Math.min(98, p)));
  }, []);

  // Attach move/up to window so fast drags never lose tracking
  useEffect(() => {
    const onMouseMove = (e) => { if (dragging.current) move(e.clientX); };
    const onMouseUp = () => { dragging.current = false; };
    const onTouchMove = (e) => { if (dragging.current) { e.preventDefault(); move(e.touches[0].clientX); } };
    const onTouchEnd = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [move]);

  const onMouseDown = (e) => { dragging.current = true; move(e.clientX); };
  const onTouchStart = (e) => { dragging.current = true; move(e.touches[0].clientX); };

  const leftStats = [
    { label: "Daily Orders", value: "50" },
    { label: "Reviews", value: "5" },
    { label: "Followers", value: "15" },
    { label: "Repeat Customers", value: "3" },
  ];
  const rightStats = [
    { label: "Daily Orders", value: "50" },
    { label: "Reviews", value: "38" },
    { label: "Followers", value: "450" },
    { label: "Repeat Customers", value: "22" },
  ];

  return (
    <section className="py-20 px-5 max-w-6xl mx-auto">
      <div className="text-center mb-10">
        <span className="text-[12px] font-semibold uppercase tracking-widest mb-3 block" style={{ color: CORAL, fontFamily: "var(--font-body)" }}>Before vs After</span>
        <h2 className="text-[32px] sm:text-[40px] font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>The difference is undeniable</h2>
        <p className="text-[15px] text-muted-foreground mt-3" style={{ fontFamily: "var(--font-body)" }}>Drag the slider to compare</p>
      </div>

      <div
        ref={containerRef}
        className="relative rounded-3xl overflow-hidden border border-border select-none cursor-ew-resize"
        style={{ height: 320 }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {/* Left panel */}
        <div className="absolute inset-0 flex items-center" style={{ background: "#F9FAFB", clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <div className="w-full px-10">
            <div className="flex items-center gap-2 mb-5">
              <Store size={16} style={{ color: "#9CA3AF" }} />
              <span className="text-[16px] font-bold text-muted-foreground" style={{ fontFamily: "var(--font-display)" }}>Traditional Restaurant</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {leftStats.map(({ label, value }) => (
                <div key={label} className="bg-white rounded-xl border border-border p-3">
                  <div className="text-[22px] font-extrabold text-muted-foreground" style={{ fontFamily: "var(--font-display)" }}>{value}</div>
                  <div className="text-[12px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="absolute inset-0 flex items-center" style={{ background: "#FFF9F7", clipPath: `inset(0 0 0 ${pos}%)` }}>
          <div className="w-full px-10">
            <div className="flex items-center gap-2 mb-5">
              <Zap size={16} fill={CORAL} style={{ color: CORAL }} />
              <span className="text-[16px] font-bold" style={{ color: CORAL, fontFamily: "var(--font-display)" }}>GrOrbit Restaurant</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {rightStats.map(({ label, value }) => (
                <div key={label} className="bg-white rounded-xl border p-3" style={{ borderColor: `${CORAL}25` }}>
                  <div className="text-[22px] font-extrabold" style={{ color: CORAL, fontFamily: "var(--font-display)" }}>{value}</div>
                  <div className="text-[12px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Divider handle */}
        <div
          className="absolute top-0 bottom-0 w-[2px] z-10 flex items-center justify-center"
          style={{ left: `${pos}%`, transform: "translateX(-50%)", background: "white" }}
        >
          <div className="w-10 h-10 rounded-full bg-white border-2 border-border shadow-md flex items-center justify-center cursor-ew-resize">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M5 4l-3 4 3 4M11 4l3 4-3 4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Bento Grid ───────────────────────────────────────────────────────────────

const bentoCards = [
  {
    icon: QrCode, title: "QR Ordering", desc: "Customers order instantly. No app, no friction, no waiting for a waiter.",
    span: "md:col-span-2", accent: CORAL,
  },
  {
    icon: Bell, title: "Live Kitchen Dashboard", desc: "Orders appear on staff screens the moment they're placed.",
    span: "", accent: "#10B981",
  },
  {
    icon: Users, title: "Customer Capture", desc: "Collect names and phone numbers automatically at checkout.",
    span: "", accent: "#8B5CF6",
  },
  {
    icon: Star, title: "Google Review Growth", desc: "Convert happy diners into public five-star reviews with one-tap prompts.",
    span: "", accent: "#F59E0B",
  },
  {
    icon: Megaphone, title: "Social Media Growth", desc: "Turn diners into Instagram and Facebook followers before they leave.",
    span: "", accent: "#E1306C",
  },
  {
    icon: Gift, title: "Coupons & Loyalty", desc: "Bring customers back with personalised rewards and loyalty points.",
    span: "md:col-span-2", accent: "#6366F1",
  },
  {
    icon: BarChart3, title: "Simple Analytics", desc: "Track orders, revenue, reviews, and social growth in one dashboard.",
    span: "", accent: "#10B981",
  },
  {
    icon: LineChart, title: "Restaurant Insights", desc: "Understand peak hours, popular items, and customer behaviour.",
    span: "", accent: "#F59E0B",
  },
];

function BentoGrid() {
  return (
    <section id="features" className="py-20 px-5" style={{ background: "#FAFAFA" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-[12px] font-semibold uppercase tracking-widest mb-3 block" style={{ color: CORAL, fontFamily: "var(--font-body)" }}>Features</span>
          <h2 className="text-[32px] sm:text-[40px] font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Everything you need to grow</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {bentoCards.map(({ icon: Icon, title, desc, span, accent }, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
              whileHover={{ y: -3, boxShadow: `0 8px 24px ${accent}18` }}
              className={`bg-white rounded-2xl border border-border p-6 cursor-default group transition-shadow ${span}`}
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: -4 }}
                transition={{ type: "spring", stiffness: 400 }}
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${accent}15` }}
              >
                <Icon size={20} style={{ color: accent }} strokeWidth={1.75} />
              </motion.div>
              <h3 className="text-[16px] font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>{title}</h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── ROI Calculator ───────────────────────────────────────────────────────────

function ROICalculator() {
  const [customers, setCustomers] = useState(80);
  const [aov, setAov] = useState(350);
  const [reviewRate, setReviewRate] = useState(30);
  const [repeatRate, setRepeatRate] = useState(25);

  const monthlyCustomers = customers * 26;
  const addlReviews = Math.round(monthlyCustomers * (reviewRate / 100));
  const addlFollowers = Math.round(addlReviews * 1.8);
  const addlRepeat = Math.round(monthlyCustomers * (repeatRate / 100));
  const addlRevenue = addlRepeat * aov;

  const Slider = ({ label, value, min, max, step = 1, prefix = "", suffix = "", onChange }) => (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-[13px] font-medium text-foreground" style={{ fontFamily: "var(--font-body)" }}>{label}</span>
        <span className="text-[13px] font-bold" style={{ color: CORAL, fontFamily: "var(--font-display)" }}>{prefix}{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: CORAL, background: `linear-gradient(to right, ${CORAL} ${((value - min) / (max - min)) * 100}%, #E5E7EB ${((value - min) / (max - min)) * 100}%)` }}
      />
    </div>
  );

  const outputs = [
    { label: "Additional Monthly Revenue", value: `₹${addlRevenue.toLocaleString("en-IN")}`, icon: DollarSign, color: "#10B981" },
    { label: "Additional Reviews", value: `+${addlReviews}`, icon: Star, color: "#F59E0B" },
    { label: "Additional Followers", value: `+${addlFollowers}`, icon: Users, color: "#8B5CF6" },
    { label: "Repeat Customers", value: `+${addlRepeat}`, icon: Repeat, color: CORAL },
  ];

  return (
    <section className="py-20 px-5 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <span className="text-[12px] font-semibold uppercase tracking-widest mb-3 block" style={{ color: CORAL, fontFamily: "var(--font-body)" }}>ROI Calculator</span>
        <h2 className="text-[32px] sm:text-[40px] font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>See your growth potential</h2>
        <p className="text-[16px] text-muted-foreground mt-3" style={{ fontFamily: "var(--font-body)" }}>Adjust the sliders to estimate your monthly impact with GrOrbit.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Inputs */}
        <div className="bg-white rounded-2xl border border-border p-7 flex flex-col gap-6">
          <Slider label="Customers per day" value={customers} min={10} max={500} step={5} onChange={setCustomers} />
          <Slider label="Average order value" value={aov} min={100} max={2000} step={50} prefix="₹" onChange={setAov} />
          <Slider label="Review conversion rate" value={reviewRate} min={5} max={80} suffix="%" onChange={setReviewRate} />
          <Slider label="Repeat visit rate" value={repeatRate} min={5} max={80} suffix="%" onChange={setRepeatRate} />
        </div>

        {/* Outputs */}
        <div className="grid grid-cols-2 gap-4">
          {outputs.map(({ label, value, icon: Icon, color }) => (
            <motion.div key={label} layout className="bg-white rounded-2xl border border-border p-5 flex flex-col gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                <Icon size={16} style={{ color }} strokeWidth={1.75} />
              </div>
              <div>
                <motion.div
                  key={value}
                  initial={{ scale: 0.9, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="text-[20px] font-extrabold" style={{ color: CHARCOAL, fontFamily: "var(--font-display)" }}
                >{value}</motion.div>
                <div className="text-[11.5px] text-muted-foreground mt-0.5" style={{ fontFamily: "var(--font-body)" }}>{label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Dashboard Preview ────────────────────────────────────────────────────────

const dashKpis = [
  { label: "Orders Today", base: 42, icon: ClipboardList, color: "#6366F1", prefix: "" },
  { label: "Revenue", base: 8450, icon: TrendingUp, color: "#10B981", prefix: "₹" },
  { label: "Reviews", base: 18, icon: Star, color: "#F59E0B", prefix: "" },
  { label: "Followers", base: 11, icon: Users, color: "#8B5CF6", prefix: "" },
  { label: "Coupons", base: 9, icon: Gift, color: CORAL, prefix: "" },
];

const recentActivity = [
  { icon: ShoppingBag, text: "New order #0047 — Table 4", time: "Just now", color: "#6366F1" },
  { icon: Star, text: "Priya M. left a 5★ review", time: "2m ago", color: "#F59E0B" },
  { icon: UserPlus, text: "Rahul S. followed on Instagram", time: "4m ago", color: "#E1306C" },
  { icon: Gift, text: "Ananya K. redeemed coupon", time: "7m ago", color: CORAL },
];

function DashboardPreview() {
  const ref = useRef(null);
  const visible = useIntersection(ref, 0.3);
  const [values, setValues] = useState(dashKpis.map(k => k.base));

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      setValues(prev => prev.map((v, i) => {
        const delta = dashKpis[i].base > 1000 ? Math.floor(Math.random() * 50 + 10) : 1;
        return i === 0 || i >= 2 ? v + 1 : v + delta;
      }));
    }, 3000);
    return () => clearInterval(id);
  }, [visible]);

  const barHeights = [22, 35, 28, 50, 42, 68, 58, 88, 72, 95, 80, 62];

  return (
    <section ref={ref} className="py-20 px-5" style={{ background: "#FFF9F7" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-[12px] font-semibold uppercase tracking-widest mb-3 block" style={{ color: CORAL, fontFamily: "var(--font-body)" }}>Dashboard</span>
          <h2 className="text-[32px] sm:text-[40px] font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>See your growth in real time</h2>
          <p className="text-[16px] text-muted-foreground mt-3 max-w-md mx-auto" style={{ fontFamily: "var(--font-body)" }}>One dashboard. Every metric that matters. No screenshots — this is live.</p>
        </div>

        <div className="bg-white rounded-3xl border border-border overflow-hidden shadow-sm">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between" style={{ background: "#FAFAFA" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: CORAL }}>
                <BarChart3 size={13} color="white" />
              </div>
              <span className="text-[14px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>GrOrbit Dashboard</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[12px] font-medium px-2.5 py-1 rounded-full" style={{ background: "#ECFDF5", color: "#10B981" }}>● Live</span>
              <span className="text-[12px] text-muted-foreground hidden sm:block" style={{ fontFamily: "var(--font-body)" }}>Today, {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-y divide-border">
            {dashKpis.map(({ label, icon: Icon, color, prefix }, i) => (
              <div key={label} className="p-5 flex flex-col gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                  <Icon size={15} style={{ color }} strokeWidth={1.75} />
                </div>
                <div>
                  <motion.div
                    key={values[i]}
                    initial={{ opacity: 0.6, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[22px] font-extrabold leading-none"
                    style={{ color: CHARCOAL, fontFamily: "var(--font-display)" }}
                  >
                    {prefix}{values[i] > 999 ? `${(values[i] / 1000).toFixed(1)}k` : values[i]}
                  </motion.div>
                  <div className="text-[11px] text-muted-foreground mt-1" style={{ fontFamily: "var(--font-body)" }}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Chart + Activity */}
          <div className="grid md:grid-cols-2 divide-x divide-border">
            {/* Bar chart */}
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[13px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>Orders Today</span>
                <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>Hourly</span>
              </div>
              <div className="flex items-end gap-1.5 h-20">
                {barHeights.map((h, i) => (
                  <motion.div key={i} initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }}
                    transition={{ delay: i * 0.04, duration: 0.4 }}
                    className="flex-1 rounded-t-sm origin-bottom"
                    style={{ height: `${h}%`, background: i === barHeights.length - 2 ? CORAL : "#F3F4F6" }} />
                ))}
              </div>
              <div className="flex justify-between mt-2">
                {["9am", "11am", "1pm", "3pm", "5pm", "7pm"].map(t => (
                  <span key={t} className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>{t}</span>
                ))}
              </div>
            </div>

            {/* Activity */}
            <div className="p-6">
              <div className="text-[13px] font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>Recent Activity</div>
              <div className="flex flex-col gap-3">
                {recentActivity.map(({ icon: Icon, text, time, color }, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                      <Icon size={13} style={{ color }} strokeWidth={1.75} />
                    </div>
                    <span className="text-[12.5px] text-foreground flex-1 truncate" style={{ fontFamily: "var(--font-body)" }}>{text}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0" style={{ fontFamily: "var(--font-body)" }}>{time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

const howSteps = [
  { icon: QrCode, step: "01", title: "Scan QR", desc: "Customer scans the table QR — no app download, zero friction." },
  { icon: Utensils, step: "02", title: "Order Food", desc: "Full digital menu with photos and instant placement." },
  { icon: ChefHat, step: "03", title: "Kitchen Receives Order", desc: "Live dashboard alerts staff the moment an order comes in." },
  { icon: TrendingUp, step: "04", title: "Grow After The Meal", desc: "Automated prompts collect reviews, follows, and lock in the next visit." },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-5 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <span className="text-[12px] font-semibold uppercase tracking-widest mb-3 block" style={{ color: CORAL, fontFamily: "var(--font-body)" }}>How it works</span>
        <h2 className="text-[32px] sm:text-[40px] font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Simple for customers. Powerful for you.</h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {howSteps.map(({ icon: Icon, step, title, desc }, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.4 }} whileHover={{ y: -4 }}
            className="bg-white rounded-2xl border border-border p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "#FFF0EC" }}>
                <Icon size={20} style={{ color: CORAL }} strokeWidth={1.75} />
              </div>
              <span className="text-[13px] font-bold" style={{ color: "#E5E7EB", fontFamily: "var(--font-display)" }}>{step}</span>
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-foreground mb-1.5" style={{ fontFamily: "var(--font-display)" }}>{title}</h3>
              <p className="text-[13.5px] text-muted-foreground leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>{desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

const plans = [
  {
    name: "Free", price: "₹0", period: "/month", desc: "Perfect for getting started.",
    cta: "Get started free", popular: false,
    features: ["QR Menu", "Basic Ordering", "Unlimited Menu Items", "Single Location"],
  },
  {
    name: "Growth", price: "₹399", period: "/month", desc: "For restaurants serious about growth.",
    cta: "Start free trial", popular: true,
    features: ["Everything in Free", "Customer Capture", "Review Collection", "Social Growth Tools", "Coupon System"],
  },
  {
    name: "Pro", price: "₹999", period: "/month", desc: "For multi-branch operations.",
    cta: "Contact sales", popular: false,
    features: ["Everything in Growth", "Multi Branch Support", "Advanced Analytics", "Staff Management", "Priority Support"],
  },
];

function Pricing() {
  return (
    <section id="pricing" className="py-20 px-5" style={{ background: "#FFF9F7" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-[12px] font-semibold uppercase tracking-widest mb-3 block" style={{ color: CORAL, fontFamily: "var(--font-body)" }}>Pricing</span>
          <h2 className="text-[32px] sm:text-[40px] font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Start free. Grow at your pace.</h2>
          <p className="text-[16px] text-muted-foreground mt-3" style={{ fontFamily: "var(--font-body)" }}>No hidden fees. No credit card required to start.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {plans.map(({ name, price, period, desc, cta, popular, features }) => (
            <motion.div key={name} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              whileHover={{ y: -5, boxShadow: popular ? `0 16px 40px ${CORAL}25` : "0 8px 24px rgba(0,0,0,0.08)" }}
              transition={{ duration: 0.35 }}
              className="relative rounded-2xl p-6 flex flex-col"
              style={{ background: popular ? CHARCOAL : "white", border: `2px solid ${popular ? CHARCOAL : "#E5E7EB"}` }}>
              {popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[11px] font-bold px-3 py-1 rounded-full text-white whitespace-nowrap"
                  style={{ background: CORAL, fontFamily: "var(--font-body)" }}>★ Most Popular</span>
              )}
              <div className="mb-5">
                <span className="text-[13px] font-semibold block mb-1" style={{ color: popular ? "#9CA3AF" : "#6B7280", fontFamily: "var(--font-display)" }}>{name}</span>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-[36px] font-extrabold" style={{ color: popular ? "white" : CHARCOAL, fontFamily: "var(--font-display)" }}>{price}</span>
                  <span className="text-[14px]" style={{ color: "#9CA3AF", fontFamily: "var(--font-body)" }}>{period}</span>
                </div>
                <p className="text-[13px]" style={{ color: popular ? "#9CA3AF" : "#6B7280", fontFamily: "var(--font-body)" }}>{desc}</p>
              </div>
              <ul className="flex flex-col gap-2.5 mb-7 flex-1">
                {features.map(f => (
                  <li key={f} className="flex items-center gap-2.5">
                    <Check size={14} strokeWidth={2.5} style={{ color: popular ? CORAL : "#10B981", flexShrink: 0 }} />
                    <span className="text-[13px]" style={{ color: popular ? "#D1D5DB" : "#374151", fontFamily: "var(--font-body)" }}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/login" className="block text-center text-[14px] font-semibold py-3 rounded-xl transition-all hover:opacity-90"
                style={{ background: popular ? CORAL : "#F3F4F6", color: popular ? "white" : CHARCOAL, fontFamily: "var(--font-body)" }}>
                {cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="py-20 px-5 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="rounded-3xl p-12 sm:p-16 text-center relative overflow-hidden"
        style={{ background: CHARCOAL }}>
        {/* Decorative dots */}
        {[["-top-8", "-left-8"], ["-top-8", "-right-8"], ["-bottom-8", "-left-8"], ["-bottom-8", "-right-8"]].map(([t, l], i) => (
          <div key={i} className={`absolute ${t} ${l} w-32 h-32 rounded-full opacity-5`} style={{ background: CORAL }} />
        ))}

        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full mb-6 relative"
          style={{ background: `${CORAL}25`, color: CORAL, fontFamily: "var(--font-body)" }}>
          <Zap size={11} fill={CORAL} />Get started in minutes
        </span>
        <h2 className="text-[34px] sm:text-[46px] font-extrabold text-white mb-4 leading-tight relative"
          style={{ fontFamily: "var(--font-display)" }}>
          Start turning diners into<br />loyal customers
        </h2>
        <p className="text-[16px] mb-8 max-w-md mx-auto relative" style={{ color: "#9CA3AF", fontFamily: "var(--font-body)" }}>
          Launch your QR ordering and growth system in minutes. No credit card. No setup fee.
        </p>
        <Link to="/login" className="relative inline-flex items-center gap-2 text-white font-semibold px-8 py-4 rounded-xl hover:opacity-90 active:scale-95 transition-all text-[16px]"
          style={{ background: CORAL, fontFamily: "var(--font-body)" }}>
          Start Free Today <ChevronRight size={18} />
        </Link>
        <div className="flex flex-wrap justify-center gap-6 mt-8 relative">
          {["No credit card", "Live in 10 minutes", "Cancel anytime"].map(t => (
            <span key={t} className="flex items-center gap-1.5 text-[13px]" style={{ color: "#6B7280", fontFamily: "var(--font-body)" }}>
              <Check size={13} strokeWidth={2.5} style={{ color: "#4B5563" }} />{t}
            </span>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const cols = [
    { title: "Product", links: ["Features", "How it works", "Pricing", "Changelog", "Roadmap"] },
    { title: "Company", links: ["About", "Blog", "Careers", "Press", "Partners"] },
    { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR"] },
  ];
  return (
    <footer className="border-t border-border bg-white">
      <div className="max-w-6xl mx-auto px-5 py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div className="col-span-2 lg:col-span-1">
            <a href="#" className="flex items-center gap-2 mb-4">
              <img src="/grorbit-logo.png" alt="GrOrbit" className="h-7 w-auto" />
            </a>
            <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[200px]" style={{ fontFamily: "var(--font-body)" }}>
              QR ordering and restaurant growth platform for cafés, bakeries, and restaurants.
            </p>
          </div>
          {cols.map(({ title, links }) => (
            <div key={title}>
              <h4 className="text-[12px] font-bold text-foreground mb-4 uppercase tracking-wider" style={{ fontFamily: "var(--font-display)" }}>{title}</h4>
              <ul className="flex flex-col gap-2.5">
                {links.map(l => (
                  <li key={l}><a href="#" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors" style={{ fontFamily: "var(--font-body)" }}>{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-border">
          <span className="text-[12px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>© 2024 GrOrbit. All rights reserved.</span>
          <div className="flex items-center gap-3">
            {[Instagram, Facebook, Twitter].map((Icon, i) => (
              <a key={i} href="#" className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
                <Icon size={14} strokeWidth={1.75} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "var(--font-body)" }}>
      <Navbar />
      <main>
        <Hero />
        <ScrollStory />
        <GrowthEngine />
        <LiveImpact />
        <BeforeAfter />
        <HowItWorks />
        <BentoGrid />
        <ROICalculator />
        <DashboardPreview />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
