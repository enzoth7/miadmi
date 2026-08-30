begin;

-- Mi Admi uses the Supabase REST API only. Removing the unused GraphQL
-- extension keeps private RLS-protected tables out of that additional surface.
drop extension if exists pg_graphql;

commit;
