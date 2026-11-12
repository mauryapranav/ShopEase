-- Run in Supabase SQL Editor after the PS1 seed. Safe to repeat.
BEGIN;
SET LOCAL search_path TO public;
CREATE SEQUENCE IF NOT EXISTS shop_order_id_seq START 2000;
-- Preserve the sequence position and avoid existing order IDs on repeated runs.
SELECT setval('shop_order_id_seq', greatest(
  (SELECT last_value FROM shop_order_id_seq),
  COALESCE((SELECT max(id) FROM orders), 1999)), true);
CREATE TABLE IF NOT EXISTS shop_mock_purchases (
  request_id uuid PRIMARY KEY,
  customer_id text NOT NULL REFERENCES customers(id),
  product_id text NOT NULL REFERENCES products(id),
  order_id integer NOT NULL REFERENCES orders(id)
);
ALTER TABLE shop_mock_purchases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON shop_mock_purchases FROM anon, authenticated;
GRANT ALL ON shop_mock_purchases TO service_role;
GRANT USAGE, SELECT ON SEQUENCE shop_order_id_seq TO service_role;

CREATE OR REPLACE FUNCTION shop_mock_purchase(p_customer text, p_product text, p_request uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $fn$
DECLARE
  product products%ROWTYPE;
  previous shop_mock_purchases%ROWTYPE;
  new_order integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request::text, 0));
  SELECT * INTO previous FROM shop_mock_purchases WHERE request_id = p_request;
  IF FOUND THEN
    IF previous.customer_id <> p_customer OR previous.product_id <> p_product THEN
      RAISE EXCEPTION 'Request already used';
    END IF;
    RETURN jsonb_build_object('order_id', previous.order_id);
  END IF;
  SELECT * INTO product FROM products WHERE id = p_product;
  IF NOT FOUND OR product.price <= 0 THEN RAISE EXCEPTION 'Product unavailable'; END IF;
  new_order := nextval('shop_order_id_seq');
  INSERT INTO orders(id, customer_id, order_date, status, expected_delivery, total_amount)
  VALUES (new_order, p_customer, (now() AT TIME ZONE 'Asia/Kolkata')::date, 'placed',
    (now() AT TIME ZONE 'Asia/Kolkata')::date + 5, product.price);
  INSERT INTO order_items(order_id, product_id, quantity, unit_price)
  VALUES (new_order, p_product, 1, product.price);
  INSERT INTO shop_mock_purchases VALUES(p_request, p_customer, p_product, new_order);
  RETURN jsonb_build_object('order_id', new_order);
END;
$fn$;
REVOKE ALL ON FUNCTION shop_mock_purchase(text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION shop_mock_purchase(text,text,uuid) TO service_role;

-- Recent fictional orders make return and late-delivery demos possible for every login.
INSERT INTO orders(id, customer_id, order_date, status, expected_delivery, delivered_date, total_amount)
SELECT 9000 + n, 'C00' || n, current_date - 6, 'delivered', current_date - 3, current_date - 3, 899
FROM generate_series(1,4) n ON CONFLICT DO NOTHING;
INSERT INTO order_items(order_id,product_id,quantity,unit_price)
SELECT 9000+n,'P104',1,899 FROM generate_series(1,4) n
WHERE NOT EXISTS(SELECT 1 FROM order_items WHERE order_id=9000+n AND product_id='P104');
INSERT INTO orders(id, customer_id, order_date, status, expected_delivery, total_amount, courier)
SELECT 9100+n, 'C00' || n, current_date-9, 'shipped', current_date-4, 349, 'Demo courier'
FROM generate_series(1,4) n ON CONFLICT DO NOTHING;
INSERT INTO order_items(order_id,product_id,quantity,unit_price)
SELECT 9100+n,'P123',1,349 FROM generate_series(1,4) n
WHERE NOT EXISTS(SELECT 1 FROM order_items WHERE order_id=9100+n AND product_id='P123');
SELECT setval('shop_order_id_seq', greatest(
  (SELECT last_value FROM shop_order_id_seq), (SELECT max(id) FROM orders)), true);

-- Enforce return ownership, item membership and the date window atomically.
CREATE OR REPLACE FUNCTION shop_return(p_customer text, p_order integer, p_product text, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $fn$
DECLARE
  purchase orders%ROWTYPE;
  days integer;
  return_id bigint;
BEGIN
  SELECT * INTO purchase FROM orders WHERE id = p_order AND customer_id = p_customer FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found in your account'; END IF;
  SELECT p.return_window_days INTO days FROM order_items i JOIN products p ON p.id = i.product_id
    WHERE i.order_id = p_order AND i.product_id = p_product LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found in this order'; END IF;
  IF EXISTS(SELECT 1 FROM returns WHERE order_id = p_order AND product_id = p_product) THEN
    RAISE EXCEPTION 'A return already exists for this item. See My Returns.';
  END IF;
  IF purchase.status <> 'delivered' OR purchase.delivered_date IS NULL OR days <= 0
    OR (now() AT TIME ZONE 'Asia/Kolkata')::date - purchase.delivered_date NOT BETWEEN 0 AND days THEN
    RAISE EXCEPTION 'This item is outside its return policy';
  END IF;
  IF length(trim(p_reason)) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Give a return reason'; END IF;
  INSERT INTO returns(order_id,product_id,reason) VALUES(p_order,p_product,trim(p_reason)) RETURNING id INTO return_id;
  RETURN jsonb_build_object('id',return_id,'order_id',p_order,'status','requested');
END;
$fn$;
REVOKE ALL ON FUNCTION shop_return(text,integer,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION shop_return(text,integer,text,text) TO service_role;
GRANT SELECT, INSERT, UPDATE ON orders, order_items, returns, support_tickets TO service_role;
GRANT SELECT ON customers, products TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

CREATE TABLE IF NOT EXISTS public.cancellation_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text NOT NULL REFERENCES public.customers(id),
  order_id integer NOT NULL REFERENCES public.orders(id),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '10 minutes',
  confirmed_at timestamptz
);
ALTER TABLE public.cancellation_intents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cancellation_intents FROM anon, authenticated;
GRANT ALL ON public.cancellation_intents TO service_role;

CREATE OR REPLACE FUNCTION public.shop_request_cancellation(p_customer text, p_order integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $fn$
DECLARE purchase orders%ROWTYPE; intent uuid;
BEGIN
  SELECT * INTO purchase FROM orders WHERE id=p_order AND customer_id=p_customer FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found in your account'; END IF;
  IF purchase.status <> 'placed' THEN RAISE EXCEPTION 'Only orders that have not shipped can be cancelled'; END IF;
  INSERT INTO cancellation_intents(customer_id,order_id) VALUES(p_customer,p_order) RETURNING id INTO intent;
  RETURN jsonb_build_object('confirmationId',intent,'orderId',p_order,'amount',purchase.total_amount);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.shop_mock_confirm_cancellation(p_customer text, p_intent uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $fn$
DECLARE intent cancellation_intents%ROWTYPE; purchase orders%ROWTYPE;
BEGIN
  SELECT * INTO intent FROM cancellation_intents WHERE id=p_intent AND customer_id=p_customer FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Confirmation not found'; END IF;
  IF intent.confirmed_at IS NOT NULL THEN
    RETURN jsonb_build_object('orderId',intent.order_id);
  END IF;
  IF intent.expires_at < now() THEN RAISE EXCEPTION 'Confirmation expired. Ask to cancel again.'; END IF;
  SELECT * INTO purchase FROM orders WHERE id=intent.order_id AND customer_id=p_customer FOR UPDATE;
  IF NOT FOUND OR purchase.status <> 'placed' THEN RAISE EXCEPTION 'This order has already shipped or been cancelled'; END IF;
  UPDATE orders SET status='cancelled' WHERE id=purchase.id;
  UPDATE cancellation_intents SET confirmed_at=now() WHERE id=p_intent;
  RETURN jsonb_build_object('orderId',purchase.id);
END;
$fn$;

REVOKE ALL ON FUNCTION shop_request_cancellation(text,integer), shop_mock_confirm_cancellation(text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION shop_request_cancellation(text,integer), shop_mock_confirm_cancellation(text,uuid) TO service_role;

DO $$
BEGIN
  IF to_regclass('cron.job') IS NOT NULL THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='shopease-wallet-refunds';
  END IF;
END $$;

ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS chat_history jsonb NOT NULL DEFAULT '[]';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS request_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS support_tickets_request_idx ON support_tickets(request_id);
CREATE TABLE IF NOT EXISTS ticket_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id bigint NOT NULL REFERENCES support_tickets(id),
  request_id uuid UNIQUE NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ticket_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ticket_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON ticket_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE ticket_events_id_seq TO service_role;

CREATE OR REPLACE FUNCTION shop_update_ticket(p_customer text, p_ticket bigint, p_action text, p_note text, p_request uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE existing support_tickets%ROWTYPE; next_status text; event_text text;
BEGIN
  SELECT * INTO existing FROM support_tickets WHERE id=p_ticket AND customer_id=p_customer FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket unavailable'; END IF;
  IF EXISTS (SELECT FROM ticket_events WHERE request_id=p_request AND ticket_id=p_ticket) THEN RETURN; END IF;
  IF p_action='note' THEN
    IF existing.status='resolved' OR coalesce(length(trim(p_note)),0) NOT BETWEEN 1 AND 1500 THEN
      RAISE EXCEPTION 'Cannot add note'; END IF;
    event_text := trim(p_note);
  ELSE
    next_status := CASE p_action WHEN 'close' THEN 'resolved' WHEN 'reopen' THEN 'open' WHEN 'start' THEN 'in_progress' END;
    IF next_status IS NULL OR (p_action='start' AND existing.status<>'open')
      OR (p_action='close' AND existing.status='resolved') OR (p_action='reopen' AND existing.status<>'resolved') THEN
      RAISE EXCEPTION 'Ticket status changed'; END IF;
    UPDATE support_tickets SET status=next_status WHERE id=p_ticket;
    event_text := CASE p_action WHEN 'close' THEN 'Ticket closed.' WHEN 'start' THEN 'Ticket marked in progress.' ELSE 'Ticket reopened.' END;
  END IF;
  INSERT INTO ticket_events(ticket_id,request_id,body) VALUES(p_ticket,p_request,event_text);
END $$;
REVOKE ALL ON FUNCTION shop_update_ticket(text,bigint,text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION shop_update_ticket(text,bigint,text,text,uuid) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;

