BEGIN;
CREATE TABLE IF NOT EXISTS public.cancellation_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text NOT NULL REFERENCES public.customers(id),
  order_id integer NOT NULL REFERENCES public.orders(id),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '10 minutes',
  confirmed_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.wallet_refunds (
  order_id integer PRIMARY KEY REFERENCES public.orders(id),
  customer_id text NOT NULL REFERENCES public.customers(id),
  amount numeric(10,2) NOT NULL CHECK(amount > 0),
  due_at timestamptz NOT NULL DEFAULT now() + interval '60 seconds',
  credited_at timestamptz
);
ALTER TABLE public.cancellation_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_refunds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cancellation_intents, public.wallet_refunds FROM anon, authenticated;
GRANT ALL ON public.cancellation_intents, public.wallet_refunds TO service_role;

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

CREATE OR REPLACE FUNCTION public.shop_confirm_cancellation(p_customer text, p_intent uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $fn$
DECLARE intent cancellation_intents%ROWTYPE; purchase orders%ROWTYPE; refund wallet_refunds%ROWTYPE;
BEGIN
  SELECT * INTO intent FROM cancellation_intents WHERE id=p_intent AND customer_id=p_customer FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Confirmation not found'; END IF;
  IF intent.confirmed_at IS NOT NULL THEN
    SELECT * INTO refund FROM wallet_refunds WHERE order_id=intent.order_id;
    RETURN jsonb_build_object('orderId',intent.order_id,'amount',refund.amount,'dueAt',refund.due_at);
  END IF;
  IF intent.expires_at < now() THEN RAISE EXCEPTION 'Confirmation expired. Ask to cancel again.'; END IF;
  SELECT * INTO purchase FROM orders WHERE id=intent.order_id AND customer_id=p_customer FOR UPDATE;
  IF NOT FOUND OR purchase.status <> 'placed' THEN RAISE EXCEPTION 'This order has already shipped or been cancelled'; END IF;
  IF NOT EXISTS(SELECT 1 FROM wallets WHERE customer_id=p_customer) THEN RAISE EXCEPTION 'Wallet unavailable'; END IF;
  UPDATE orders SET status='cancelled' WHERE id=purchase.id;
  INSERT INTO wallet_refunds(order_id,customer_id,amount) VALUES(purchase.id,p_customer,purchase.total_amount) RETURNING * INTO refund;
  UPDATE cancellation_intents SET confirmed_at=now() WHERE id=p_intent;
  RETURN jsonb_build_object('orderId',purchase.id,'amount',refund.amount,'dueAt',refund.due_at);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.shop_settle_refunds()
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $fn$
DECLARE refund wallet_refunds%ROWTYPE; settled integer := 0;
BEGIN
  FOR refund IN SELECT * FROM wallet_refunds WHERE credited_at IS NULL AND due_at <= now() ORDER BY customer_id,order_id FOR UPDATE SKIP LOCKED LOOP
    UPDATE wallets SET balance=balance+refund.amount WHERE customer_id=refund.customer_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Refund wallet unavailable'; END IF;
    UPDATE wallet_refunds SET credited_at=now() WHERE order_id=refund.order_id;
    settled := settled+1;
  END LOOP;
  RETURN settled;
END;
$fn$;
REVOKE ALL ON FUNCTION public.shop_request_cancellation(text,integer), public.shop_confirm_cancellation(text,uuid), public.shop_settle_refunds() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shop_request_cancellation(text,integer), public.shop_confirm_cancellation(text,uuid), public.shop_settle_refunds() TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
