-- Does the same thing a Supabase "Database Webhook" would (Dashboard →
-- Database → Webhooks), just configured entirely in SQL instead of hunting
-- for that menu — it moves around between dashboard versions. Whenever a
-- new row lands in public.notifications, this calls the deployed send-push
-- edge function so a real push notification goes out to any subscribed
-- device. Standalone and safe to run — does not touch or delete existing
-- data. The URL below is specific to this project (from `supabase functions
-- deploy`), so this file isn't meant to be reused as-is on a different
-- Supabase project.

create extension if not exists pg_net with schema extensions;

create or replace function public.handle_notification_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://pexmyasywfqkswpblmrq.supabase.co/functions/v1/send-push',
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'notifications',
      'schema', 'public',
      'record', to_jsonb(new),
      'old_record', null
    ),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  return new;
end;
$$;

drop trigger if exists on_notification_send_push on public.notifications;
create trigger on_notification_send_push
  after insert on public.notifications
  for each row execute function public.handle_notification_push();
