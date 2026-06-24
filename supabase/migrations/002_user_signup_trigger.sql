-- Auto-create public.users row when a new auth user signs up.
-- Runs as SECURITY DEFINER to bypass RLS (no session exists yet at signup time).

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'name' IS NOT NULL THEN
    INSERT INTO public.users (id, name, email, phone, cin, permis_id, address)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'name',
      NEW.email,
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'cin',
      NEW.raw_user_meta_data->>'permis_id',
      NEW.raw_user_meta_data->>'address'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
