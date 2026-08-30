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
        "description": "Hot & cold espresso drinks"
    })
    cat_pastries = await db.category.create(data={
        "cafeId": cafe.id,
        "name": "Pastries",
        "description": "Freshly baked goods"
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
    master_croissant = await db.mastermenuitem.create(data={
        "cafeId": cafe.id,
        "categoryId": cat_pastries.id,
        "name": "Butter Croissant",
        "description": "Flaky French pastry",
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
