import asyncio
import os
from prisma import Prisma
from app.core.security import hash_password

async def test_archiving_rbac():
    db = Prisma()
    await db.connect()
    
    try:
        # 1. Setup test data
        role = await db.role.find_first(where={"name": "CAFE_OWNER"})
        if not role:
            role = await db.role.create(data={"name": "CAFE_OWNER", "description": "Owner"})
            
        test_email = "test_archive_owner@example.com"
        owner = await db.user.find_unique(where={"email": test_email})
        if not owner:
            owner = await db.user.create(
                data={
                    "email": test_email,
                    "passwordHash": hash_password("password123"),
                    "authProvider": "LOCAL",
                    "roleId": role.id
                }
            )

        cafe = await db.cafe.create(
            data={
                "name": "Test Archive Cafe",
                "ownerId": owner.id,
            }
        )
        
        branch = await db.branch.create(
            data={
                "name": "Test Branch",
                "cafeId": cafe.id
            }
        )
        
        # Give owner scope manually to branch and cafe
        await db.userscope.create(data={"userId": owner.id, "cafeId": cafe.id})
        await db.userscope.create(data={"userId": owner.id, "branchId": branch.id})

        # 2. Function to simulate get_current_user dependencies read-time filter
        async def get_filtered_scopes(user_id: int):
            user = await db.user.find_unique(
                where={"id": user_id},
                include={
                    "userScopes": {
                        "include": {
                            "cafe": True,
                            "branch": {"include": {"cafe": True}}
                        }
                    }
                }
            )
            filtered_scopes = []
            for scope in user.userScopes:
                cafe_is_archived = False
                if scope.cafe and scope.cafe.isArchived:
                    cafe_is_archived = True
                if scope.branch and scope.branch.cafe and scope.branch.cafe.isArchived:
                    cafe_is_archived = True
                    
                if not cafe_is_archived:
                    filtered_scopes.append(scope)
            return filtered_scopes

        # Initially, scopes should be present
        scopes_before = await get_filtered_scopes(owner.id)
        assert len(scopes_before) == 2, f"Expected 2 scopes, got {len(scopes_before)}"
        print("[SUCCESS] Before archive: Scopes are present.")

        # 3. Archive Cafe
        await db.cafe.update(where={"id": cafe.id}, data={"isArchived": True})
        
        # Scopes should be filtered out
        scopes_after_archive = await get_filtered_scopes(owner.id)
        assert len(scopes_after_archive) == 0, f"Expected 0 scopes, got {len(scopes_after_archive)}"
        print("[SUCCESS] After archive: Scopes are correctly filtered out at read-time.")

        # 4. Restore Cafe
        await db.cafe.update(where={"id": cafe.id}, data={"isArchived": False})
        
        # Scopes should be restored
        scopes_after_restore = await get_filtered_scopes(owner.id)
        assert len(scopes_after_restore) == 2, f"Expected 2 scopes, got {len(scopes_after_restore)}"
        print("[SUCCESS] After restore: Scopes are correctly restored at read-time.")

        print("--- All tests passed! ---")
        
    finally:
        # Cleanup
        await db.userscope.delete_many(where={"userId": owner.id})
        if 'branch' in locals():
            await db.branch.delete(where={"id": branch.id})
        if 'cafe' in locals():
            await db.cafe.delete(where={"id": cafe.id})
        if 'owner' in locals():
            await db.user.delete(where={"id": owner.id})
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(test_archiving_rbac())
