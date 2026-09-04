-- Rename the existing Raigad demo officer login without recreating its profile/data.
do $$ declare uid uuid; begin
 select id into uid from auth.users where email='officer.pune@pashusetu.dev';
 if uid is null then
   if exists(select 1 from auth.users where email='officer.raigad@pashusetu.dev') then return; end if;
   raise exception 'demo officer account not found';
 end if;
 if exists(select 1 from auth.users where email='officer.raigad@pashusetu.dev' and id<>uid) then raise exception 'target email already exists'; end if;
 update auth.users set email='officer.raigad@pashusetu.dev', email_confirmed_at=coalesce(email_confirmed_at,now()), updated_at=now() where id=uid;
 update auth.identities set identity_data=jsonb_set(jsonb_set(identity_data,'{email}','"officer.raigad@pashusetu.dev"'),'{email_verified}','true'), updated_at=now() where user_id=uid and provider='email';
end $$;
