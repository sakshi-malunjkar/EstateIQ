import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

/**
 * The lead search text lives in the URL (/leads?q=…), so the header box and the Leads page box are the
 * same search: typing in the header from any page jumps to Leads, already filtered, and the text survives
 * a refresh or a shared link.
 */
export function useLeadSearch() {
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const onLeads = pathname === "/leads";
  const q = onLeads ? params.get("q") ?? "" : "";
  const setQ = (v: string) => {
    // replace while already on Leads (one history entry, not one per keystroke); push the first jump there
    navigate(v ? `/leads?q=${encodeURIComponent(v)}` : "/leads", { replace: onLeads });
  };
  return [q, setQ] as const;
}
