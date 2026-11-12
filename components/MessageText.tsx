import Link from "next/link";
import { Fragment } from "react";
function orderLinks(text: string) {
  return text.split(/(order\s*#?\s*\d+)/gi).map((part, index) => {
    const match = /^order\s*#?\s*(\d+)$/i.exec(part);
    return match ? (
      <Link className="order-link" key={index} href={"/orders/" + match[1]}>
        {part}
      </Link>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    );
  });
}
function inline(text: string) {
  // Treat model output as text. Only recognized order references become links.
  const withoutLinks = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  return withoutLinks
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, index) =>
      part.startsWith("**") ? (
        <strong key={index}>{orderLinks(part.slice(2, -2))}</strong>
      ) : (
        <Fragment key={index}>{orderLinks(part)}</Fragment>
      ),
    );
}
export default function MessageText({ text }: { text: string }) {
  const orders = [
    ...new Set(
      Array.from(text.matchAll(/order\s*#?\s*(\d+)/gi), (match) => match[1]),
    ),
  ];
  return (
    <div className="message-text">
      {text.split(/\n\s*\n/).map((block, index) => {
        const lines = block.split("\n");
        const bullets = lines.every((line) => /^\s*[-*]\s+/.test(line));
        return bullets ? (
          <ul key={index}>
            {lines.map((line, i) => (
              <li key={i}>{inline(line.replace(/^\s*[-*]\s+/, ""))}</li>
            ))}
          </ul>
        ) : (
          <p key={index}>
            {lines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {inline(line.replace(/^#{1,6}\s+/, ""))}
              </Fragment>
            ))}
          </p>
        );
      })}
      {orders.length > 0 && (
        <div className="message-orders">
          {orders.map((id) => (
            <Link key={id} href={"/orders/" + id}>
              View order #{id}
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
