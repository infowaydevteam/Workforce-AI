BEGIN;

-- Promote Girivasan and Madhu from Team Admin to Super Admin.
--
-- Matched on email rather than id, because the ids differ between the
-- production database and any restored copy of it.
--
-- Re-running is harmless: rows already at superadmin are left alone, and an
-- address that is not present simply matches nothing.
--
-- Note that these two were the only Team Admins in the system, so after this
-- runs no organization has one. Nothing breaks, but the restricted-website
-- alert in alertController looks for a Team Admin in the employee's
-- organization and team, and will find nobody until one is appointed.

UPDATE users
SET role = 'superadmin'
WHERE email IN (
  'girivasan@infowaygroup.com',
  'madhu@infowaygroup.com'
)
AND role <> 'superadmin';

COMMIT;
