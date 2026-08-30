"""
seed_historical_orders.py
Generate rich realistic order history (120 days) for Haji Cafe Management System.
Includes:
- 12 comprehensive menu items across 4 categories
- Realistic diurnal hourly curves (Morning rush, Lunch rush, Evening surge)
- Weekend & weekday seasonality
- Injected real-world anomaly events (Festival spike, Storm drop, Promo bump)
- Realistic multi-item baskets, notes, and statuses
"""

import asyncio
import datetime
import random
import sys
from decimal import Decimal
from prisma import Prisma

sys.stdout.reconfigure(encoding='utf-8')

# Categories and Master Items to ensure are present in Cafe 1
MENU_STRUCTURE = [
    {
        "category": "Espresso Bar",
        "description": "Artisan espresso drinks crafted with premium roasted beans",
        "items": [
            {"name": "Espresso Single", "basePrice": Decimal("2.50"), "desc": "Rich, intense single shot with thick golden crema"},
            {"name": "Americano", "basePrice": Decimal("3.25"), "desc": "Espresso poured over hot filtered water"},
            {"name": "Spanish Latte", "basePrice": Decimal("4.75"), "desc": "Signature espresso with condensed milk and microfoam"},
            {"name": "Cappuccino", "basePrice": Decimal("4.25"), "desc": "Equal parts espresso, steamed milk, and velvety foam"},
            {"name": "Caramel Macchiato", "basePrice": Decimal("4.95"), "desc": "Vanilla-infused milk marked with espresso and caramel drizzle"},
        ],
    },
    {
        "category": "Cold Drinks & Refreshers",
        "description": "Slow-steeped cold brews and iced refreshers",
        "items": [
            {"name": "Nitro Cold Brew", "basePrice": Decimal("4.50"), "desc": "18-hour cold brew infused with nitrogen for creamy texture"},
            {"name": "Iced Vanilla Latte", "basePrice": Decimal("4.75"), "desc": "Chilled espresso, milk, and Madagascar vanilla syrup over ice"},
            {"name": "Matcha Green Tea Latte", "basePrice": Decimal("5.25"), "desc": "Ceremonial Japanese matcha whisked with steamed milk"},
            {"name": "Peach Sparkler Iced Tea", "basePrice": Decimal("3.75"), "desc": "Brewed black tea with peach puree and sparkling water"},
        ],
    },
    {
        "category": "Bakery & Pastries",
        "description": "Freshly baked pastries and treats",
        "items": [
            {"name": "Butter Croissant", "basePrice": Decimal("3.50"), "desc": "Flaky, all-butter layered French classic"},
            {"name": "Blueberry Crumble Muffin", "basePrice": Decimal("3.75"), "desc": "Moist muffin packed with fresh blueberries and cinnamon crumb"},
            {"name": "Chocolate Hazelnut Danish", "basePrice": Decimal("4.20"), "desc": "Flaky pastry filled with Belgian chocolate and hazelnut cream"},
        ],
    },
    {
        "category": "Sandwiches & Mains",
        "description": "Warm paninis and gourmet sourdough melts",
        "items": [
            {"name": "Grilled Chicken Pesto Panini", "basePrice": Decimal("7.50"), "desc": "Herb chicken, basil pesto, mozzarella, and roasted peppers on ciabatta"},
            {"name": "Smoked Turkey Sourdough", "basePrice": Decimal("6.95"), "desc": "Smoked turkey breast, aged cheddar, and honey mustard on toasted sourdough"},
        ],
    },
]

CUSTOMER_NOTES = [
    "",
    "",
    "",  # Most orders have no notes
    "Extra hot please",
    "Oat milk substitute",
    "Almond milk substitute",
    "Less ice",
    "Double shot espresso",
    "No sugar syrup",
    "Warm the pastry",
    "To-go bag please",
    "Decaf espresso",
    "Extra caramel drizzle",
]

# Day of week multiplier (0=Monday, ..., 6=Sunday)
DAY_MULTIPLIERS = {
    0: 0.85,  # Monday
    1: 0.90,  # Tuesday
    2: 0.95,  # Wednesday
    3: 1.10,  # Thursday
    4: 1.35,  # Friday (High rush in Pakistan/Middle East)
    5: 1.45,  # Saturday peak
    6: 1.25,  # Sunday family day
}

# Hourly probabilities (weight for placing an order in that hour)
HOURLY_WEIGHTS = {
    7: 3.0,   # 7 AM: Morning early birds
    8: 7.5,   # 8 AM: Peak morning rush
    9: 8.5,   # 9 AM: Peak morning coffee
    10: 6.0,  # 10 AM: Mid-morning coffee
    11: 4.0,  # 11 AM: Pre-lunch
    12: 7.0,  # 12 PM: Lunch rush
    13: 8.0,  # 1 PM: Peak lunch rush
    14: 5.0,  # 2 PM: Post-lunch
    15: 3.5,  # 3 PM: Afternoon break
    16: 4.5,  # 4 PM: Tea time
    17: 6.5,  # 5 PM: Evening after-work rush
    18: 7.5,  # 6 PM: Evening socializing
    19: 8.0,  # 7 PM: Peak evening
    20: 6.5,  # 8 PM: Dinner coffee
    21: 4.0,  # 9 PM: Night wind-down
    22: 1.5,  # 10 PM: Closing orders
}


async def seed_historical_data():
    db = Prisma()
    await db.connect()
    print("🚀 Starting Historical Data Generation...")

    # 1. Fetch Primary Cafe and Branches
    cafes = await db.cafe.find_many(include={"branches": True})
    if not cafes:
        print("❌ No cafes found. Please run seed.py first.")
        await db.disconnect()
        return

    primary_cafe = cafes[0]
    branches = primary_cafe.branches
    if not branches:
        print("❌ No branches found for cafe.")
        await db.disconnect()
        return

    print(f"🏢 Using Cafe: '{primary_cafe.name}' (id={primary_cafe.id}) with {len(branches)} branches.")

    # 2. Fetch or Create Users for Order attribution
    users = await db.user.find_many()
    staff_users = [u for u in users if u.roleId in [3, 4]] or users
    staff_ids = [u.id for u in staff_users]

    # 3. Ensure Master Menu and Branch Items exist
    print("📋 Checking and expanding Menu items...")
    master_item_records = []
    
    for cat_data in MENU_STRUCTURE:
        # Check or create category
        category = await db.category.find_first(where={"cafeId": primary_cafe.id, "name": cat_data["category"]})
        if not category:
            category = await db.category.create(
                data={
                    "cafeId": primary_cafe.id,
                    "name": cat_data["category"],
                    "description": cat_data["description"],
                }
            )
        
        for item_data in cat_data["items"]:
            m_item = await db.mastermenuitem.find_first(
                where={"cafeId": primary_cafe.id, "name": item_data["name"]}
            )
            if not m_item:
                m_item = await db.mastermenuitem.create(
                    data={
                        "cafeId": primary_cafe.id,
                        "categoryId": category.id,
                        "name": item_data["name"],
                        "description": item_data["desc"],
                        "basePrice": item_data["basePrice"],
                    }
                )
            master_item_records.append(m_item)

    print(f"✅ Verified {len(master_item_records)} Master Menu Items.")

    # 4. Link Branch Menu Items for each branch
    branch_items_by_branch = {}
    for branch in branches:
        branch_items = []
        for m_item in master_item_records:
            b_item = await db.branchmenuitem.find_first(
                where={"branchId": branch.id, "masterItemId": m_item.id}
            )
            if not b_item:
                # Small price override variation for branch 2
                override = None
                if branch.id == 2:
                    override = m_item.basePrice + Decimal("0.50")
                
                b_item = await db.branchmenuitem.create(
                    data={
                        "branchId": branch.id,
                        "masterItemId": m_item.id,
                        "priceOverride": override,
                        "availableQuantity": random.randint(45, 120),
                        "isInStock": True,
                        "isActive": True,
                        "lowStockThreshold": 10,
                    }
                )
            branch_items.append((b_item, m_item))
        branch_items_by_branch[branch.id] = branch_items

    # 5. Clean prior historical test orders if desired
    existing_orders_count = await db.order.count()
    if existing_orders_count > 10:
        print(f"ℹ️ Found {existing_orders_count} existing orders. Cleaning orders to build fresh realistic 120-day history...")
        await db.orderitem.delete_many()
        await db.order.delete_many()

    # 6. Generate 120 Days of Orders
    now = datetime.datetime.now(datetime.timezone.utc)
    start_date = now - datetime.timedelta(days=120)
    
    print(f"⏳ Generating realistic orders from {start_date.strftime('%Y-%m-%d')} to {now.strftime('%Y-%m-%d')}...")

    total_orders_created = 0
    total_revenue_generated = Decimal("0.00")

    hours_list = list(HOURLY_WEIGHTS.keys())
    hours_weights = list(HOURLY_WEIGHTS.values())

    # Item popularity weights (Spanish Latte, Americano, Croissant are most popular)
    popularity_map = {
        "Spanish Latte": 18,
        "Latte": 15,
        "Americano": 14,
        "Butter Croissant": 13,
        "Cappuccino": 10,
        "Iced Vanilla Latte": 9,
        "Nitro Cold Brew": 7,
        "Grilled Chicken Pesto Panini": 6,
        "Blueberry Crumble Muffin": 5,
        "Caramel Macchiato": 5,
        "Chocolate Hazelnut Danish": 4,
        "Smoked Turkey Sourdough": 4,
        "Matcha Green Tea Latte": 3,
        "Peach Sparkler Iced Tea": 3,
        "Espresso Single": 3,
    }

    # Process day by day
    for day_offset in range(121):
        current_day = start_date + datetime.timedelta(days=day_offset)
        weekday = current_day.weekday()
        day_multiplier = DAY_MULTIPLIERS.get(weekday, 1.0)

        # Injected Anomaly logic
        days_from_now = (now - current_day).days
        anomaly_reason = None
        anomaly_factor = 1.0

        if days_from_now == 45:
            # Major Street Festival Spike
            anomaly_factor = 2.1
            anomaly_reason = "Downtown Food & Coffee Carnival"
        elif days_from_now == 22:
            # Severe Rainstorm Dip
            anomaly_factor = 0.35
            anomaly_reason = "Severe Urban Monsoon Storm"
        elif days_from_now == 8:
            # Holiday Promo Spike
            anomaly_factor = 1.55
            anomaly_reason = "Weekend BOGO Pastry Promotion"
        
        # Base daily order count per branch
        for branch in branches:
            # Downtown HQ has higher volume than Airport Kiosk
            base_orders = 24 if branch.id == 1 else 16
            
            # Apply multipliers with random jitter (+-15%)
            jitter = random.uniform(0.85, 1.15)
            # Long term growth trend (+15% over 120 days)
            trend_factor = 1.0 + (day_offset / 120.0) * 0.20
            
            num_orders = int(base_orders * day_multiplier * trend_factor * anomaly_factor * jitter)
            num_orders = max(4, num_orders)

            branch_items = branch_items_by_branch[branch.id]
            item_weights = [popularity_map.get(m.name, 5) for b, m in branch_items]

            is_today = (current_day.date() == now.date())

            for _ in range(num_orders):
                if is_today:
                    # Distribute today's orders across past few hours
                    hour = random.randint(0, max(1, now.hour))
                    minute = random.randint(0, now.minute if hour == now.hour else 59)
                    second = random.randint(0, 59)
                else:
                    # Pick realistic hour based on diurnal weights
                    hour = random.choices(hours_list, weights=hours_weights, k=1)[0]
                    minute = random.randint(0, 59)
                    second = random.randint(0, 59)

                order_time = current_day.replace(
                    hour=hour, minute=minute, second=second, microsecond=0
                )

                # Avoid timestamps in the future
                if order_time > now:
                    order_time = now - datetime.timedelta(minutes=random.randint(5, 120))

                # Status determination
                if (now - order_time).total_seconds() < 3600:
                    status = random.choice(["PENDING", "IN_PREPARATION", "COMPLETED"])
                else:
                    status = random.choices(["COMPLETED", "CANCELLED"], weights=[95, 5], k=1)[0]

                # Basket composition (1 to 3 items per order)
                num_items_in_order = random.choices([1, 2, 3, 4], weights=[45, 35, 15, 5], k=1)[0]
                chosen_tuples = random.choices(branch_items, weights=item_weights, k=num_items_in_order)

                order_total = Decimal("0.00")
                order_items_data = []

                for b_item, m_item in chosen_tuples:
                    qty = random.choices([1, 2, 3], weights=[78, 18, 4], k=1)[0]
                    effective_price = b_item.priceOverride if b_item.priceOverride is not None else m_item.basePrice
                    line_total = effective_price * qty
                    order_total += line_total

                    note = random.choice(CUSTOMER_NOTES)
                    order_items_data.append({
                        "branchMenuItemId": b_item.id,
                        "quantity": qty,
                        "priceAtPurchase": effective_price,
                        "notes": note if note else None,
                    })

                creator_id = random.choice(staff_ids) if staff_ids else None

                # Create Order in DB
                order = await db.order.create(
                    data={
                        "branchId": branch.id,
                        "createdByUserId": creator_id,
                        "status": status,
                        "totalAmount": order_total,
                        "createdAt": order_time,
                        "updatedAt": order_time,
                        "orderItems": {
                            "create": order_items_data,
                        },
                    }
                )

                total_orders_created += 1
                if status == "COMPLETED":
                    total_revenue_generated += order_total

        if day_offset % 20 == 0:
            print(f"  ... seeded day {day_offset}/120 ({current_day.strftime('%Y-%m-%d')})")

    print(f"\n🎉 Successfully seeded {total_orders_created} realistic orders!")
    print(f"💰 Total Completed Revenue: ${total_revenue_generated:,.2f}")
    print("✅ Database is primed with realistic 120-day historical data for ML & Analytics.")
    await db.disconnect()


if __name__ == "__main__":
    asyncio.run(seed_historical_data())
