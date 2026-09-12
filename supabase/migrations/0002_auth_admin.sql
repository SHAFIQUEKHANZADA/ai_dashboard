-- Esther dashboard — auth & team management
-- Adds the write policies an admin needs to manage team members and their store
-- scope. Member creation itself is done by a server action with the service-role
-- key (it must touch auth.users), but reads/writes below let the admin UI operate
-- as the signed-in admin where possible. All namespaced esther_*.

-- Admin can read every profile (self policy already covers own row).
drop policy if exists p_admin_all on esther_profiles;
create policy p_admin_all on esther_profiles
  for all using (esther_is_admin()) with check (esther_is_admin());

-- Admin manages store grants; members still read their own (p_self already exists).
drop policy if exists p_admin_all on esther_user_stores;
create policy p_admin_all on esther_user_stores
  for all using (esther_is_admin()) with check (esther_is_admin());

-- Admin manages the store list (everyone can already read via p_read).
drop policy if exists p_admin_write on esther_stores;
create policy p_admin_write on esther_stores
  for all using (esther_is_admin()) with check (esther_is_admin());

-- A user may create their own profile row on first login if one doesn't exist
-- (defaults to the least-privileged 'store' role; an admin then grants scope).
drop policy if exists p_self_insert on esther_profiles;
create policy p_self_insert on esther_profiles
  for insert with check (id = auth.uid());
