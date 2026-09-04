import asyncio
import sys
from decimal import Decimal
from prisma import Prisma
from app.core.security import hash_password

async def main():
    db = Prisma()
    await db.connect()

    print("Cleaning existing data...")
    # Clean data to avoid UniqueConstraint errors (order matters because of foreign keys)
    await db.orderitem.delete_many()
    await db.order.delete_many()
    await db.branchmenuitem.delete_many()
    await db.mastermenuitem.delete_many()
    await db.category.delete_many()
    await db.userscope.delete_many()
    await db.branch.delete_many()
    await db.cafe.delete_many()
    await db.refreshtoken.delete_many()
    await db.user.delete_many()
    await db.role.delete_many()
    print("Database cleaned.")

    print("Seeding Roles...")
    roles_data = ["SUPER_ADMIN", "CAFE_OWNER", "BRANCH_MANAGER", "STAFF"]
    roles = {}
    for name in roles_data:
        roles[name] = await db.role.create(data={"name": name})

    print("Seeding Users...")
    password = hash_password("password123")
    admin = await db.user.create(data={
        "roleId": roles["SUPER_ADMIN"].id,
        "email": "admin@hajicafe.com",
        "passwordHash": password,
    })
    owner = await db.user.create(data={
        "roleId": roles["CAFE_OWNER"].id,
        "email": "samjanjua6@gmail.com",
        "passwordHash": password,
    })
    manager = await db.user.create(data={
        "roleId": roles["BRANCH_MANAGER"].id,
        "email": "manager@sunrise-downtown.com",
        "passwordHash": password,
    })
    staff = await db.user.create(data={
        "roleId": roles["STAFF"].id,
        "email": "staff@sunrise-downtown.com",
        "passwordHash": password,
    })
    kitchen = await db.user.create(data={
        "roleId": roles["STAFF"].id,
        "email": "kitchen@gmail.com",
        "displayName": "Kitchen Display",
        "passwordHash": password,
    })

    print("Seeding Cafe & Branches...")
    cafe = await db.cafe.create(data={
        "name": "Sunrise Coffee",
        "ownerId": owner.id
    })

    branch_hq = await db.branch.create(data={
        "cafeId": cafe.id,
        "name": "Downtown HQ",
        "location": "123 Main St"
    })
    branch_airport = await db.branch.create(data={
        "cafeId": cafe.id,
        "name": "Airport Kiosk",
        "location": "Terminal B"
    })

    print("Seeding User Scopes (Tenant isolation)...")
    await db.userscope.create(data={"userId": owner.id, "cafeId": cafe.id})
    await db.userscope.create(data={"userId": manager.id, "branchId": branch_hq.id})
    await db.userscope.create(data={"userId": staff.id, "branchId": branch_hq.id})
    await db.userscope.create(data={"userId": kitchen.id, "branchId": branch_hq.id})

    print("Seeding Menu...")
    cat_espresso = await db.category.create(data={
        "cafeId": cafe.id,
        "name": "Espresso Bar",
        "description": "Hot & specialty espresso coffees"
    })
    cat_cold = await db.category.create(data={
        "cafeId": cafe.id,
        "name": "Cold Brew & Iced Coffee",
        "description": "Chilled, draft, and cold-brew specialty beverages"
    })
    cat_tea = await db.category.create(data={
        "cafeId": cafe.id,
        "name": "Teas & Refreshers",
        "description": "Artisan loose-leaf teas, matcha, and iced coolers"
    })
    cat_pastries = await db.category.create(data={
        "cafeId": cafe.id,
        "name": "Pastries & Bakery",
        "description": "Freshly baked goods and Parisian pastries"
    })

    master_latte = await db.mastermenuitem.create(data={
        "cafeId": cafe.id,
        "categoryId": cat_espresso.id,
        "name": "Latte",
        "description": "Classic espresso with steamed milk",
        "basePrice": Decimal("4.50")
    })
    master_americano = await db.mastermenuitem.create(data={
        "cafeId": cafe.id,
        "categoryId": cat_espresso.id,
        "name": "Americano",
        "description": "Espresso over hot water",
        "basePrice": Decimal("3.00")
    })
    master_spanish_latte = await db.mastermenuitem.create(data={
        "cafeId": cafe.id,
        "categoryId": cat_espresso.id,
        "name": "Spanish Latte",
        "description": "Rich espresso, condensed milk, and velvety steamed milk foam",
        "basePrice": Decimal("4.75")
    })
    master_cappuccino = await db.mastermenuitem.create(data={
        "cafeId": cafe.id,
        "categoryId": cat_espresso.id,
        "name": "Cappuccino",
        "description": "Equal parts bold espresso, steamed milk, and dense foam",
        "basePrice": Decimal("4.25")
    })
    master_flat_white = await db.mastermenuitem.create(data={
        "cafeId": cafe.id,
        "categoryId": cat_espresso.id,
        "name": "Flat White",
        "description": "Double ristretto topped with micro-foamed velvety milk",
        "basePrice": Decimal("4.50")
    })
    master_caramel_macchiato = await db.mastermenuitem.create(data={
        "cafeId": cafe.id,
        "categoryId": cat_espresso.id,
        "name": "Caramel Macchiato",
        "description": "Vanilla steamed milk marked with espresso and caramel drizzle",
        "basePrice": Decimal("5.00")
    })
    master_nitro = await db.mastermenuitem.create(data={
        "cafeId": cafe.id,
        "categoryId": cat_cold.id,
        "name": "Nitro Cold Brew",
        "description": "Slow-steeped 18 hours with cascading draft nitrogen crema",
        "basePrice": Decimal("4.75")
    })
    master_iced_spanish = await db.mastermenuitem.create(data={
        "cafeId": cafe.id,
        "categoryId": cat_cold.id,
        "name": "Iced Spanish Latte",
        "description": "Signature sweet condensed milk espresso poured over clear ice",
        "basePrice": Decimal("4.95")
    })
    master_matcha = await db.mastermenuitem.create(data={
        "cafeId": cafe.id,
        "categoryId": cat_tea.id,
        "name": "Matcha Latte",
        "description": "Ceremonial Japanese Uji green tea with creamy oat milk",
        "basePrice": Decimal("5.25")
    })
    master_croissant = await db.mastermenuitem.create(data={
        "cafeId": cafe.id,
        "categoryId": cat_pastries.id,
        "name": "Butter Croissant",
        "description": "Flaky French pastry baked fresh daily",
        "basePrice": Decimal("3.50")
    })

    print("Seeding Branch Pricing & Inventory...")
    # Downtown HQ uses default price for Latte, overrides Americano, out of croissants
    latte_hq = await db.branchmenuitem.create(data={
        "branchId": branch_hq.id,
        "masterItemId": master_latte.id,
        "isInStock": True
    })
    americano_hq = await db.branchmenuitem.create(data={
        "branchId": branch_hq.id,
        "masterItemId": master_americano.id,
        "priceOverride": Decimal("3.25"),
        "isInStock": True
    })
    await db.branchmenuitem.create(data={
        "branchId": branch_hq.id,
        "masterItemId": master_croissant.id,
        "isInStock": False
    })

    # Airport Kiosk charges premium pricing
    await db.branchmenuitem.create(data={
        "branchId": branch_airport.id,
        "masterItemId": master_latte.id,
        "priceOverride": Decimal("5.50")
    })
    await db.branchmenuitem.create(data={
        "branchId": branch_airport.id,
        "masterItemId": master_americano.id,
        "priceOverride": Decimal("4.00")
    })
    await db.branchmenuitem.create(data={
        "branchId": branch_airport.id,
        "masterItemId": master_croissant.id,
        "priceOverride": Decimal("4.50")
    })

    print("Seeding Sample Orders...")
    order = await db.order.create(data={
        "branchId": branch_hq.id,
        "createdByUserId": staff.id,
        "status": "COMPLETED",
        "totalAmount": Decimal("7.75")
    })
    await db.orderitem.create(data={
        "orderId": order.id,
        "branchMenuItemId": latte_hq.id,
        "quantity": 1,
        "priceAtPurchase": Decimal("4.50")
    })
    await db.orderitem.create(data={
        "orderId": order.id,
        "branchMenuItemId": americano_hq.id,
        "quantity": 1,
        "priceAtPurchase": Decimal("3.25")
    })

    print("[SUCCESS] Seeding completed successfully!")
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
