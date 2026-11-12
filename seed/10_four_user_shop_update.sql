-- Run once after the existing PS1 seed. Safe to repeat.
-- Existing C001-C004 orders belong to the renamed demo accounts.
BEGIN;
SET LOCAL search_path TO public;
UPDATE customers SET name = CASE id
  WHEN 'C001' THEN 'Nitin' WHEN 'C002' THEN 'Pranav'
  WHEN 'C003' THEN 'Gokul' WHEN 'C004' THEN 'Loki' END,
  email = CASE id WHEN 'C001' THEN 'nitin@example.com'
  WHEN 'C002' THEN 'pranav@example.com' WHEN 'C003' THEN 'gokul@example.com'
  WHEN 'C004' THEN 'loki@example.com' END
WHERE id IN ('C001','C002','C003','C004');

CREATE TABLE IF NOT EXISTS wallets (
  customer_id text PRIMARY KEY REFERENCES customers(id),
  balance numeric(10,2) NOT NULL DEFAULT 1000 CHECK (balance >= 0)
);
INSERT INTO wallets(customer_id)
SELECT id FROM customers WHERE id IN ('C001','C002','C003','C004')
ON CONFLICT DO NOTHING;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON wallets FROM anon, authenticated;
GRANT SELECT, UPDATE, INSERT ON wallets TO service_role;

CREATE SEQUENCE IF NOT EXISTS shop_order_id_seq START 2000;
-- Preserve the sequence position and avoid existing order IDs on repeated runs.
SELECT setval('shop_order_id_seq', greatest(
  (SELECT last_value FROM shop_order_id_seq),
  COALESCE((SELECT max(id) FROM orders), 1999)), true);
CREATE TABLE IF NOT EXISTS shop_purchases (
  request_id uuid PRIMARY KEY,
  customer_id text NOT NULL REFERENCES customers(id),
  product_id text NOT NULL REFERENCES products(id),
  order_id integer NOT NULL REFERENCES orders(id),
  balance_after numeric(10,2) NOT NULL
);
ALTER TABLE shop_purchases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON shop_purchases FROM anon, authenticated;
GRANT ALL ON shop_purchases TO service_role;
GRANT USAGE, SELECT ON SEQUENCE shop_order_id_seq TO service_role;

CREATE OR REPLACE FUNCTION shop_purchase(p_customer text, p_product text, p_request uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $fn$
DECLARE
  funds numeric;
  product products%ROWTYPE;
  previous shop_purchases%ROWTYPE;
  new_order integer;
BEGIN
  -- Lock the wallet to serialize concurrent purchases for the same account.
  SELECT balance INTO funds FROM wallets WHERE customer_id = p_customer FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet unavailable'; END IF;
  SELECT * INTO previous FROM shop_purchases WHERE request_id = p_request;
  IF FOUND THEN
    IF previous.customer_id <> p_customer OR previous.product_id <> p_product THEN
      RAISE EXCEPTION 'Request already used';
    END IF;
    RETURN jsonb_build_object('order_id', previous.order_id, 'balance', previous.balance_after);
  END IF;
  SELECT * INTO product FROM products WHERE id = p_product FOR SHARE;
  IF NOT FOUND OR product.price <= 0 THEN RAISE EXCEPTION 'Product unavailable'; END IF;
  IF product.price > funds THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
  new_order := nextval('shop_order_id_seq');
  INSERT INTO orders(id, customer_id, order_date, status, expected_delivery, total_amount)
  VALUES (new_order, p_customer, (now() AT TIME ZONE 'Asia/Kolkata')::date, 'placed',
    (now() AT TIME ZONE 'Asia/Kolkata')::date + 5, product.price);
  INSERT INTO order_items(order_id, product_id, quantity, unit_price)
  VALUES (new_order, p_product, 1, product.price);
  UPDATE wallets SET balance = balance - product.price WHERE customer_id = p_customer;
  INSERT INTO shop_purchases VALUES(p_request, p_customer, p_product, new_order, funds-product.price);
  RETURN jsonb_build_object('order_id', new_order, 'balance', funds-product.price);
END;
$fn$;
REVOKE ALL ON FUNCTION shop_purchase(text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION shop_purchase(text,text,uuid) TO service_role;

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
NOTIFY pgrst, 'reload schema';
SELECT c.name,w.balance FROM customers c JOIN wallets w ON w.customer_id=c.id ORDER BY c.id;
COMMIT;
