import { currentCustomer } from "@/lib/customer";
import { getSupabase } from "@/lib/supabase";
import TicketDesk, { type Ticket } from "@/components/TicketDesk";

export default async function TicketsPage() {
  const { id } = await currentCustomer();
  const { data, error } = await getSupabase()
    .from("support_tickets")
    .select(
      "id,issue,status,order_id,created_at,chat_history,ticket_events(id,body,created_at)",
    )
    .eq("customer_id", id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true, referencedTable: "ticket_events" })
    .returns<Ticket[]>();
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">CUSTOMER SUPPORT</p>
        <h1>Tickets</h1>
      </div>
      {error ? (
        <p className="notice" role="alert">
          Tickets could not load. Check the database update and refresh.
        </p>
      ) : (
        <TicketDesk customerId={id} tickets={data || []} />
      )}
    </>
  );
}
