-- Remove legacy categoryId field from Product model
-- The relationship is now M:N via the CategoryToProduct junction table (categories[])

ALTER TABLE "Product" DROP COLUMN IF EXISTS "categoryId";