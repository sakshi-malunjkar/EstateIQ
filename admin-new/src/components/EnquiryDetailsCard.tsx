import { Fragment } from "react";
import type { EnquiryDetails } from "@/api/types";
import { Card } from "./Card";

/**
 * The structured NER output (§27.3). A null field renders "Not mentioned" in ink-muted —
 * never a guessed value. `friendly` gives the client-facing labels (§10.3).
 */
export function EnquiryDetailsCard({ details, friendly = true }: { details: EnquiryDetails; friendly?: boolean }) {
  const rows: [string, string | null][] = [
    [friendly ? "Home type" : "BHK", details.bhk],
    ["Budget", details.budget],
    ["City", details.city],
    [friendly ? "Area" : "Locality / area", details.locality],
    ["Property type", details.propertyType],
    ["Amenities", details.amenities],
    ["Furnishing", details.furnishing],
  ];
  return (
    <Card className="p-4 font-text">
      <h3 className="font-semibold text-h3 mb-1 font-sans">{friendly ? "Here's what we understood" : "Enquiry details"}</h3>
      {friendly && <p className="text-small text-ink-muted mb-3 font-sans">Tell us if we got anything wrong.</p>}
      <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2">
        {rows.map(([k, v]) => (
          <Fragment key={k}>
            <dt className="text-body text-ink-soft font-sans">{k}</dt>
            <dd className={`text-body ${v ? "text-ink" : "text-ink-muted"}`}>{v ?? "Not mentioned"}</dd>
          </Fragment>
        ))}
      </dl>
    </Card>
  );
}
