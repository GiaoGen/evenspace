-- Public SQL wrappers are security invokers, so authenticated callers need
-- execute on their guarded security-schema implementations as well.
grant execute on function security.get_zine_studio(text),
  security.get_zine_asset_path(text,uuid),
  security.save_zine_manual_draft(text,text,text,jsonb),
  security.publish_zine_deterministic(text,text,jsonb)
  to authenticated;

notify pgrst,'reload schema';
