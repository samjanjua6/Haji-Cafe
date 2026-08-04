-- ==============================================================
-- Haji Cafe Multi-Branch Management - Seed Data
-- ==============================================================

-- 1. Users
-- Password hash for 'password123' (same for all users for easy testing)
-- $2b$12$R.32U./j2P9JqjH9Z6K.P.U/eO/q.T5lD2k6Vv2FzP5pS.hB584n6
INSERT INTO users (role_id, email, password_hash)
VALUES
    ((SELECT id FROM roles WHERE name = 'SUPER_ADMIN'), 'admin@hajicafe.com', '$2b$12$R.32U./j2P9JqjH9Z6K.P.U/eO/q.T5lD2k6Vv2FzP5pS.hB584n6'),
    ((SELECT id FROM roles WHERE name = 'CAFE_OWNER'), 'owner@sunrise.com', '$2b$12$R.32U./j2P9JqjH9Z6K.P.U/eO/q.T5lD2k6Vv2FzP5pS.hB584n6'),
    ((SELECT id FROM roles WHERE name = 'BRANCH_MANAGER'), 'manager@sunrise-downtown.com', '$2b$12$R.32U./j2P9JqjH9Z6K.P.U/eO/q.T5lD2k6Vv2FzP5pS.hB584n6'),
    ((SELECT id FROM roles WHERE name = 'STAFF'), 'staff@sunrise-downtown.com', '$2b$12$R.32U./j2P9JqjH9Z6K.P.U/eO/q.T5lD2k6Vv2FzP5pS.hB584n6');

-- 2. Cafes
INSERT INTO cafes (name, owner_id)
VALUES 
    ('Sunrise Coffee', (SELECT id FROM users WHERE email = 'owner@sunrise.com'));

-- 3. Branches
INSERT INTO branches (cafe_id, name, location)
VALUES
    ((SELECT id FROM cafes WHERE name = 'Sunrise Coffee'), 'Downtown HQ', '123 Main St'),
    ((SELECT id FROM cafes WHERE name = 'Sunrise Coffee'), 'Airport Kiosk', 'Terminal B');

-- 4. User Scopes (Tenant Isolation)
INSERT INTO user_scopes (user_id, cafe_id, branch_id)
VALUES
    -- Cafe owner gets scope over the entire cafe
    ((SELECT id FROM users WHERE email = 'owner@sunrise.com'), (SELECT id FROM cafes WHERE name = 'Sunrise Coffee'), NULL),
    
    -- Branch manager gets scope over the Downtown branch
    ((SELECT id FROM users WHERE email = 'manager@sunrise-downtown.com'), NULL, (SELECT id FROM branches WHERE name = 'Downtown HQ')),
    
    -- Staff gets scope over the Downtown branch
    ((SELECT id FROM users WHERE email = 'staff@sunrise-downtown.com'), NULL, (SELECT id FROM branches WHERE name = 'Downtown HQ'));

-- 5. Categories
INSERT INTO categories (cafe_id, name, description)
VALUES
    ((SELECT id FROM cafes WHERE name = 'Sunrise Coffee'), 'Espresso Bar', 'Hot & cold espresso drinks'),
    ((SELECT id FROM cafes WHERE name = 'Sunrise Coffee'), 'Pastries', 'Freshly baked goods');

-- 6. Master Menu Items
INSERT INTO master_menu_items (cafe_id, category_id, name, description, base_price)
VALUES
    ((SELECT id FROM cafes WHERE name = 'Sunrise Coffee'), (SELECT id FROM categories WHERE name = 'Espresso Bar'), 'Latte', 'Classic espresso with steamed milk', 4.50),
    ((SELECT id FROM cafes WHERE name = 'Sunrise Coffee'), (SELECT id FROM categories WHERE name = 'Espresso Bar'), 'Americano', 'Espresso over hot water', 3.00),
    ((SELECT id FROM cafes WHERE name = 'Sunrise Coffee'), (SELECT id FROM categories WHERE name = 'Pastries'), 'Butter Croissant', 'Flaky French pastry', 3.50);

-- 7. Branch Menu Items (Downtown HQ overrides)
INSERT INTO branch_menu_items (branch_id, master_item_id, price_override, is_in_stock, is_active)
VALUES
    -- Downtown uses default price (NULL override) for Latte
    ((SELECT id FROM branches WHERE name = 'Downtown HQ'), (SELECT id FROM master_menu_items WHERE name = 'Latte'), NULL, TRUE, TRUE),
    
    -- Downtown overrides Americano price to 3.25
    ((SELECT id FROM branches WHERE name = 'Downtown HQ'), (SELECT id FROM master_menu_items WHERE name = 'Americano'), 3.25, TRUE, TRUE),
    
    -- Downtown is out of Croissants
    ((SELECT id FROM branches WHERE name = 'Downtown HQ'), (SELECT id FROM master_menu_items WHERE name = 'Butter Croissant'), NULL, FALSE, TRUE);

-- 8. Branch Menu Items (Airport Kiosk overrides)
INSERT INTO branch_menu_items (branch_id, master_item_id, price_override, is_in_stock, is_active)
VALUES
    -- Airport charges premium pricing (5.50 for Latte, 4.00 for Americano, 4.50 for Croissant)
    ((SELECT id FROM branches WHERE name = 'Airport Kiosk'), (SELECT id FROM master_menu_items WHERE name = 'Latte'), 5.50, TRUE, TRUE),
    ((SELECT id FROM branches WHERE name = 'Airport Kiosk'), (SELECT id FROM master_menu_items WHERE name = 'Americano'), 4.00, TRUE, TRUE),
    ((SELECT id FROM branches WHERE name = 'Airport Kiosk'), (SELECT id FROM master_menu_items WHERE name = 'Butter Croissant'), 4.50, TRUE, TRUE);

-- 9. Sample Orders (Downtown HQ)
INSERT INTO orders (branch_id, created_by_user_id, status, total_amount)
VALUES
    ((SELECT id FROM branches WHERE name = 'Downtown HQ'), (SELECT id FROM users WHERE email = 'staff@sunrise-downtown.com'), 'COMPLETED', 7.75);

-- 10. Sample Order Items
INSERT INTO order_items (order_id, branch_menu_item_id, quantity, price_at_purchase)
VALUES
    -- 1 Latte (4.50) + 1 Americano (3.25) = 7.75
    ((SELECT id FROM orders LIMIT 1), (SELECT id FROM branch_menu_items WHERE branch_id = (SELECT id FROM branches WHERE name = 'Downtown HQ') AND master_item_id = (SELECT id FROM master_menu_items WHERE name = 'Latte')), 1, 4.50),
    ((SELECT id FROM orders LIMIT 1), (SELECT id FROM branch_menu_items WHERE branch_id = (SELECT id FROM branches WHERE name = 'Downtown HQ') AND master_item_id = (SELECT id FROM master_menu_items WHERE name = 'Americano')), 1, 3.25);
