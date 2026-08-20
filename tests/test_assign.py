import asyncio
from app.database import connect_db, disconnect_db
from app.modules.admin.repository import get_all_users

async def main():
    await connect_db()
    try:
        users = await get_all_users()
        for u in users:
            print(f"User {u.id}: {u.email}")
    except Exception as e:
        print("ERROR:", e)
    finally:
        await disconnect_db()

if __name__ == "__main__":
    asyncio.run(main())
