-- Fix same-day rental constraint (inclusive date model)
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS no_overlap;
ALTER TABLE reservations ADD CONSTRAINT valid_dates CHECK (start_date <= end_date);

-- Atomic reservation: server calculates price + prevents race conditions
CREATE OR REPLACE FUNCTION create_reservation(
  p_car_id     UUID,
  p_client_id  UUID,
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS reservations
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_car         cars%ROWTYPE;
  v_days        INTEGER;
  v_total_price NUMERIC(10,2);
  v_result      reservations%ROWTYPE;
BEGIN
  -- Lock the car row — any concurrent call waits here
  SELECT * INTO v_car FROM cars WHERE id = p_car_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voiture introuvable.';
  END IF;

  -- Client not blocked
  IF EXISTS (SELECT 1 FROM users WHERE id = p_client_id AND is_blocked = TRUE) THEN
    RAISE EXCEPTION 'Votre compte a été suspendu. Veuillez contacter l''agence.';
  END IF;

  -- No overlapping active reservation
  IF EXISTS (
    SELECT 1 FROM reservations
    WHERE car_id = p_car_id
      AND status IN ('PENDING', 'CONFIRMED')
      AND start_date <= p_end_date
      AND end_date   >= p_start_date
  ) THEN
    RAISE EXCEPTION 'Cette voiture n''est plus disponible pour ces dates.';
  END IF;

  -- Price calculated server-side (inclusive days)
  v_days        := (p_end_date - p_start_date) + 1;
  v_total_price := v_days * v_car.price_per_day;

  INSERT INTO reservations (car_id, client_id, start_date, end_date, total_price, status)
  VALUES (p_car_id, p_client_id, p_start_date, p_end_date, v_total_price, 'PENDING')
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION create_reservation TO authenticated;
