import "server-only";
import { getSupabase } from "./supabase";
import { todayInIndia } from "./dates";

import { currentCustomer } from "./customer";
type Item = {
  product_id: string;
  quantity: number;
  products: { name: string; return_window_days: number };
};
type Order = {
  id: number;
  order_date: string;
  status: string;
  expected_delivery: string | null;
  delivered_date: string | null;
  total_amount: number;
  courier: string | null;
  tracking_number: string | null;
  order_items: Item[];
};

function ordersQuery(customerId: string) {
  return getSupabase()
    .from("orders")
    .select(
      "id,order_date,status,expected_delivery,delivered_date,total_amount,courier,tracking_number,order_items(product_id,quantity,products(name,return_window_days))",
    )
    .eq("customer_id", customerId);
}
export async function listOrders() {
  const { data, error } = await ordersQuery((await currentCustomer()).id)
    .order("order_date", { ascending: false })
    .order("id", { ascending: false })
    .returns<Order[]>();
  if (error) throw new Error("Orders could not be loaded.");
  return data;
}
export async function getOrder(id: number) {
  const { data, error } = await ordersQuery((await currentCustomer()).id)
    .eq("id", id)
    .maybeSingle<Order>();
  if (error) throw new Error("Order lookup failed.");
  if (!data) throw new Error("Order not found in your account.");
  return data;
}
export async function eligibility(orderId: number, productId: string) {
  const order = await getOrder(orderId);
  const item = order.order_items.find((row) => row.product_id === productId);
  if (!item) throw new Error("Item not found in this order.");
  if (order.status !== "delivered" || !order.delivered_date)
    return { eligible: false, reason: "The order has not been delivered." };
  const days = item.products.return_window_days;
  if (days <= 0)
    return { eligible: false, reason: "This product has no return window." };
  const age =
    (Date.parse(todayInIndia()) - Date.parse(order.delivered_date)) / 86400000;
  if (age < 0 || age > days)
    return {
      eligible: false,
      reason: "Outside the product's return window.",
      days,
      delivered: order.delivered_date,
    };
  return { eligible: true, daysRemaining: days - age };
}
export async function listReturns() {
  const customerId = (await currentCustomer()).id;
  type Return = {
    id: number;
    order_id: number;
    status: string;
    reason: string;
    products: { name: string };
  };
  const { data, error } = await getSupabase()
    .from("returns")
    .select(
      "id,order_id,status,reason,products(name),orders!inner(customer_id)",
    )
    .eq("orders.customer_id", customerId)
    .order("created_at", { ascending: false })
    .returns<Return[]>();
  if (error) throw new Error("Returns could not be loaded.");
  return data;
}
export async function listProducts() {
  const { data, error } = await getSupabase()
    .from("products")
    .select("id,name,category,price,return_window_days")
    .order("price");
  if (error)
    throw new Error(
      "Products unavailable. Check Supabase configuration and seed data.",
    );
  return data;
}

export async function listTickets() {
  const { id } = await currentCustomer();
  const { data, error } = await getSupabase()
    .from("support_tickets")
    .select("id,issue,status,order_id")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Tickets unavailable.");
  return data;
}

