import asyncio
from app.database import db
from app.modules.admin.repository import update_user_role_atomic
from app.modules.admin.service import update_user_role

async def test_admin_roles():
    await db.connect()
    
    # Setup Test Data
    super_admin_role = await db.role.find_unique(where={"name": "SUPER_ADMIN"})
    staff_role = await db.role.find_unique(where={"name": "STAFF"})
    
    # Create two temporary SUPER_ADMIN users
    user1 = await db.user.create(data={
        "email": "test_admin1@haji.cafe",
        "roleId": super_admin_role.id
    })
    user2 = await db.user.create(data={
        "email": "test_admin2@haji.cafe",
        "roleId": super_admin_role.id
    })
    
    try:
        # Test 1: Self-demotion block (in service layer logic)
        print("Testing self-demotion block...")
        try:
            await update_user_role(user_id=user1.id, role_name="STAFF", current_user_id=user1.id)
            raise AssertionError("Self-demotion succeeded when it should have failed!")
        except Exception as e:
            if "You cannot change your own role" in str(e):
                print("SUCCESS: Self-demotion explicitly blocked.")
            else:
                raise

        # Test 2: Boundary test - 2 admins. Demote one successfully.
        print("\nTesting demotion boundary...")
        
        # We need exactly 2 admins for the boundary test.
        # Temporarily demote all other real admins in the DB so only our 2 test admins remain.
        all_admins = await db.user.find_many(where={'roleId': super_admin_role.id})
        real_admins = [u for u in all_admins if u.id not in (user1.id, user2.id)]
        
        for u in real_admins:
            await db.user.update(where={"id": u.id}, data={"roleId": staff_role.id})
            
        print("Temporarily demoted real admins. Total SUPER_ADMIN count is now exactly 2.")
        
        # Now exactly 2 admins exist (user1, user2).
        # Demote user1 (acted upon by user2 to bypass self-demotion).
        await update_user_role(user_id=user1.id, role_name="STAFF", current_user_id=user2.id)
        print("SUCCESS: Demoted user1 successfully. Count is now 1.")
        
        # Test 3: Last-admin protection
        # Now only user2 is admin. Attempt to demote user2 (acted upon by some random ID, e.g., 9999).
        print("\nTesting last-admin protection...")
        try:
            await update_user_role(user_id=user2.id, role_name="STAFF", current_user_id=9999)
            raise AssertionError("Demotion succeeded when it should have failed!")
        except Exception as e:
            if "Cannot demote the last SUPER_ADMIN." in str(e):
                print("SUCCESS: Last-admin demotion correctly blocked.")
            else:
                raise

        # Restore real admins
        for u in real_admins:
            await db.user.update(where={"id": u.id}, data={"roleId": super_admin_role.id})
            
        print("Restored original admins.")
        print("\nALL BACKEND TESTS PASSED.")
        
    finally:
        # Cleanup
        await db.user.delete(where={"id": user1.id})
        await db.user.delete(where={"id": user2.id})
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(test_admin_roles())
