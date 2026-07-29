-- ============================================================
-- GrOrbit — seed data (run AFTER 001_init.sql)
-- Creates the demo restaurant "Spice Junction" with menu + coupons.
-- Owner: sign up in the app first, then run the UPDATE at the bottom
-- to attach the restaurant to your user.
-- ============================================================

insert into public.restaurants (id, slug, name, city, plan, status, settings) values (
  '00000000-0000-0000-0000-000000000001',
  'spice-junction', 'Spice Junction', 'Ambala', 'Growth', 'active',
  '{
    "about": "Spice Junction has been serving Ambala''s favourite burgers, wood-fired pizzas and slow-steeped cold brews since 2019.",
    "prepTimeMins": 15,
    "contact": {"phone":"+91 98765 43210","email":"hello@spicejunction.in","address":"Shop 14, Mall Road, Ambala Cantt, Haryana 133001","hours":"11:00 AM – 11:00 PM, daily"},
    "offers": [
      {"id":1,"emoji":"🎉","title":"Welcome offer","text":"10% off your first order with code WELCOME10","active":true},
      {"id":2,"emoji":"🍕","title":"Combo deal","text":"Any pizza + cold brew for just ₹349","active":true}
    ],
    "growth": {
      "google":{"url":"https://g.page/r/spice-junction/review","on":true},
      "instagram":{"url":"https://instagram.com/spicejunction","on":true},
      "facebook":{"url":"https://facebook.com/spicejunction","on":true},
      "whatsapp":{"number":"+91 98765 43210","on":true},
      "coupon":{"code":"COMEBACK50","desc":"₹50 off your next visit","on":true}
    }
  }'::jsonb
) on conflict (slug) do nothing;

-- categories
insert into public.menu_categories (id, restaurant_id, name, emoji, sort) values
 ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-000000000001','Burgers','🍔',1),
 ('00000000-0000-0000-0000-00000000c002','00000000-0000-0000-0000-000000000001','Pizza','🍕',2),
 ('00000000-0000-0000-0000-00000000c003','00000000-0000-0000-0000-000000000001','Coffee','☕',3),
 ('00000000-0000-0000-0000-00000000c004','00000000-0000-0000-0000-000000000001','Dessert','🍰',4),
 ('00000000-0000-0000-0000-00000000c005','00000000-0000-0000-0000-000000000001','Beverages','🥤',5)
on conflict (id) do nothing;

-- items
insert into public.menu_items (restaurant_id, category_id, name, description, price, food_type, status, popular, special) values
 ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000c001','Chicken Zinger Burger','Crispy fried chicken, spicy mayo, fresh lettuce',229,'nonveg','active',true,false),
 ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000c001','Veg Burger','Classic veg patty with house sauce',149,'veg','active',false,false),
 ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000c001','Paneer Tikka Burger','Char-grilled paneer, mint chutney',189,'veg','active',true,true),
 ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000c002','Margherita Pizza','Fresh mozzarella, basil, wood-fired',279,'veg','active',true,false),
 ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000c002','Pepperoni Pizza','Loaded pepperoni, extra cheese',399,'nonveg','active',false,false),
 ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000c003','Cold Brew','Slow-steeped 18 hours, served over ice',159,'veg','active',true,false),
 ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000c003','Cappuccino','Double shot, velvety microfoam',129,'veg','active',false,false),
 ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000c004','Chocolate Lava Cake','Molten centre, vanilla ice cream',179,'veg','active',false,true),
 ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000c004','Tiramisu','Classic Italian, espresso-soaked',199,'veg','active',false,false),
 ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000c005','Mango Smoothie','Alphonso mango, thick & fresh',139,'veg','active',false,true),
 ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000c005','Fresh Lime Soda','Sweet, salted or mixed',89,'veg','active',false,false);

-- coupons
insert into public.coupons (restaurant_id, code, description, kind, discount, active, expires) values
 ('00000000-0000-0000-0000-000000000001','WELCOME10','10% off first order','First-time','{"type":"percent","value":10,"max":100,"firstVisitOnly":true}',true,'Ongoing'),
 ('00000000-0000-0000-0000-000000000001','COMEBACK50','₹50 off return visit','Win-back','{"type":"flat","value":50,"minOrder":250}',true,'Jul 31'),
 ('00000000-0000-0000-0000-000000000001','REVIEW15','15% off for a Google review','Review reward','{"type":"percent","value":15,"max":150}',true,'Ongoing'),
 ('00000000-0000-0000-0000-000000000001','SPIN15','15% off — spin jackpot','Spin reward','{"type":"percent","value":15,"max":120}',true,'Next 3 visits'),
 ('00000000-0000-0000-0000-000000000001','TREAT30','₹30 off your next visit','Spin reward','{"type":"flat","value":30}',true,'Next visit'),
 ('00000000-0000-0000-0000-000000000001','LUCKY5','5% off your next visit','Spin reward','{"type":"percent","value":5}',true,'Next visit')
on conflict (restaurant_id, code) do nothing;

-- ── After signing up in the app, attach the demo restaurant to your account: ──
-- update public.restaurants set owner_id = (select id from auth.users where email = 'YOUR_EMAIL')
--   where slug = 'spice-junction';
-- ── To make yourself super-admin: ──
-- update public.profiles set role = 'superadmin' where id = (select id from auth.users where email = 'YOUR_EMAIL');
