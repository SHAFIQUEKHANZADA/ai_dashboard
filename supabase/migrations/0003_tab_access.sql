-- Per-member tab (page) access. Deny-list of nav hrefs a member cannot see.
-- Empty = full access (default), so existing members are unaffected. Admins
-- always see every tab regardless of this list.
alter table esther_profiles
  add column if not exists hidden_tabs text[] not null default '{}';
