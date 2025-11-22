-- Promote 'test_admin' to admin role
-- You can change 'test_admin' to your specific username if different
UPDATE public.profiles
SET role = 'admin'
WHERE username = 'test_admin';

-- Verify the change
SELECT * FROM public.profiles WHERE username = 'test_admin';
