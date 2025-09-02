-- Add user_id column to customers table
ALTER TABLE customers 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create index for faster lookups
CREATE INDEX customers_user_id_idx ON customers(user_id);

-- Add unique constraint to prevent multiple customers per user
ALTER TABLE customers
ADD CONSTRAINT customers_user_id_unique UNIQUE (user_id);

-- Update existing customers if possible by matching on email_address
UPDATE customers c
SET user_id = u.id
FROM auth.users u
WHERE c.email_address = u.email;

-- After verifying data is properly migrated, you may want to:
-- 1. Make user_id NOT NULL for new records
-- ALTER TABLE customers ALTER COLUMN user_id SET NOT NULL;
-- 2. Add a trigger to automatically set user_id on insert
