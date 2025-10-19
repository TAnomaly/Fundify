DROP INDEX IF EXISTS idx_purchases_status;
DROP INDEX IF EXISTS idx_purchases_user;
DROP INDEX IF EXISTS idx_purchases_product;
DROP INDEX IF EXISTS idx_digital_products_featured;
DROP INDEX IF EXISTS idx_digital_products_active;
DROP INDEX IF EXISTS idx_digital_products_type;
DROP INDEX IF EXISTS idx_digital_products_creator;
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS digital_products;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_status') THEN
        DROP TYPE purchase_status;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_type') THEN
        DROP TYPE product_type;
    END IF;
END;
$$;
