from prisma import Prisma

db = Prisma()


async def connect_db() -> None:
    """Connect the Prisma client to the database."""
    await db.connect()


async def disconnect_db() -> None:
    """Disconnect the Prisma client from the database."""
    await db.disconnect()
