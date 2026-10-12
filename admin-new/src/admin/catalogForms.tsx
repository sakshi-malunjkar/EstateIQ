import { useId, useState, type ReactNode } from "react";
import { ImageIcon, Plus, X } from "lucide-react";
import type { City, Furnishing, Project, Property, PropertyType } from "@/api/types";
import { fmtLakh, propertyTitle, saveProject, saveProperty, type ProjectInput, type PropertyInput } from "@/api/catalog";
import { Button } from "@/components/Button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/* ================= shared pieces ================= */

/** Right-side drawer on the shared Radix dialog (focus trap, Esc, scroll lock). */
export function Sheet({ open, onClose, title, description, children }: {
  open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {open && (
        <DialogContent className="left-auto right-0 top-0 translate-x-0 translate-y-0 h-dvh max-h-dvh w-full max-w-xl rounded-none border-y-0 border-r-0 p-0 gap-0 flex flex-col overflow-hidden eq-sheet">
          <div className="px-6 py-5 border-b border-border pr-16">
            <DialogTitle className="font-display tracking-tight">{title}</DialogTitle>
            {description && <DialogDescription className="text-small mt-1">{description}</DialogDescription>}
          </div>
          {children}
        </DialogContent>
      )}
    </Dialog>
  );
}

/** Confirm before deleting (§23: destructive actions ask first). */
export function ConfirmDelete({ open, onClose, onConfirm, what, detail }: {
  open: boolean; onClose: () => void; onConfirm: () => void; what: string; detail?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {open && (
        <DialogContent className="max-w-md">
          <DialogTitle>Delete {what}?</DialogTitle>
          <DialogDescription>{detail ?? "This can't be undone."}</DialogDescription>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="secondary" className="border-negative bg-negative/10 text-ink hover:bg-negative/20" onClick={() => { onConfirm(); onClose(); }}>Delete</Button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}

/** §23.1: label above, required mark, hint, inline error tied to the control. */
function Field({ label, required, hint, error, children, id }: {
  label: string; required?: boolean; hint?: string; error?: string; children: (a11y: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => ReactNode; id?: string;
}) {
  const auto = useId();
  const fid = id ?? auto;
  const desc = error ? `${fid}-err` : hint ? `${fid}-hint` : undefined;
  return (
    <div>
      <label htmlFor={fid} className="block text-body font-medium text-ink mb-1.5">
        {label} {required && <span className="text-negative" aria-hidden="true">*</span>}
        {required && <span className="sr-only">(required)</span>}
      </label>
      {children({ id: fid, "aria-invalid": error ? true : undefined, "aria-describedby": desc })}
      {error ? (
        <p id={`${fid}-err`} className="text-small text-negative mt-1">{error}</p>
      ) : hint ? (
        <p id={`${fid}-hint`} className="text-small text-ink-muted mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

const control = (err?: string) =>
  cn(
    "w-full h-10 px-3 rounded-control border bg-surface text-body text-ink outline-none placeholder:text-ink-muted",
    "focus-visible:shadow-focus",
    err ? "border-negative" : "border-border focus-visible:border-accent",
  );

/** Chip multi-select with presets + "add your own". */
function ChipPicker({ value, onChange, presets, label }: { value: string[]; onChange: (v: string[]) => void; presets: string[]; label: string }) {
  const [custom, setCustom] = useState("");
  const all = Array.from(new Set([...presets, ...value]));
  const toggle = (t: string) => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
  const add = () => { const t = custom.trim(); if (t && !value.includes(t)) onChange([...value, t]); setCustom(""); };
  return (
    <fieldset>
      <legend className="block text-body font-medium text-ink mb-1.5">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {all.map((t) => {
          const on = value.includes(t);
          return (
            <button
              key={t}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(t)}
              className={cn(
                "h-8 px-3 rounded-pill border text-small transition-colors duration-fast",
                on ? "bg-accent-soft border-accent text-ink font-medium" : "bg-surface border-border text-ink-soft hover:text-ink",
              )}
            >
              {t}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 mt-2">
        <label className="sr-only" htmlFor={`${label}-custom`}>Add another {label.toLowerCase()}</label>
        <input
          id={`${label}-custom`}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Add another…"
          className={cn(control(), "h-9")}
        />
        <Button type="button" variant="secondary" className="h-9" onClick={add} disabled={!custom.trim()}>
          <Plus size={14} strokeWidth={1.5} /> Add
        </Button>
      </div>
    </fieldset>
  );
}

/**
 * Image picker: an http(s) URL or a path under public/images/ (the API rejects anything else).
 * File uploads aren't supported yet.
 */
function ImageField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const fid = useId();
  return (
    <div>
      <p className="block text-body font-medium text-ink mb-1.5">{label}</p>
      <div className="flex gap-3 items-start">
        <div className="w-28 aspect-video shrink-0 rounded-control border border-border bg-surface-hover overflow-hidden grid place-items-center">
          {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={20} strokeWidth={1.5} className="text-ink-muted" aria-hidden="true" />}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <label htmlFor={fid} className="sr-only">Image URL or path</label>
            <div className="flex gap-2">
              <input
                id={fid}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="/images/your-photo.jpg or https://…"
                className={cn(control(), "h-9")}
              />
              {value && (
                <button type="button" onClick={() => onChange("")} aria-label="Remove image" className="h-9 w-9 shrink-0 grid place-items-center rounded-control border border-border text-ink-soft hover:text-ink">
                  <X size={14} strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <p className="text-small text-ink-muted mt-1.5">
        A web address or a path like /images/name.jpg. Uploading files isn't available yet.
      </p>
    </div>
  );
}

function FormFooter({ onCancel, submitLabel, busy, error }: { onCancel: () => void; submitLabel: string; busy?: boolean; error?: string | null }) {
  return (
    <div className="px-6 py-4 border-t border-border flex flex-wrap items-center justify-end gap-2 bg-surface">
      {error && <p role="alert" className="basis-full text-small text-negative">Couldn't save: {error}</p>}
      <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : submitLabel}</Button>
    </div>
  );
}

/* ================= Project form ================= */

const PROJECT_STATUSES: Project["status"][] = ["New launch", "Under construction", "Ready to move"];
const PROJECT_AMENITIES = ["Clubhouse", "Gym", "Swimming pool", "Covered parking", "Kids' play area", "Power backup", "Security", "Garden"];

export function ProjectForm({ project, onDone }: { project?: Project; onDone: (id?: string) => void }) {
  const [v, setV] = useState({
    name: project?.name ?? "",
    city: (project?.city ?? "") as City | "",
    locality: project?.locality ?? "",
    status: project?.status ?? "",
    totalUnits: project?.totalUnits?.toString() ?? "",
    availableUnits: project?.availableUnits?.toString() ?? "",
    description: project?.description ?? "",
    image: project?.image ?? "",
    features: project?.features ?? [],
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }));
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));

  const total = Number(v.totalUnits), avail = Number(v.availableUnits);
  const errors: Record<string, string | undefined> = {
    name: !v.name.trim() ? "Enter the project name." : undefined,
    city: !v.city ? "Choose a city." : undefined,
    locality: !v.locality.trim() ? "Enter the locality." : undefined,
    status: !v.status ? "Choose a status." : undefined,
    totalUnits: !v.totalUnits ? "Enter total units." : !Number.isInteger(total) || total < 1 ? "Use a whole number, 1 or more." : undefined,
    availableUnits: v.availableUnits === "" ? undefined : !Number.isInteger(avail) || avail < 0 ? "Use a whole number." : avail > total ? "Can't be more than total units." : undefined,
  };
  const show = (k: string) => (touched[k] || tried ? errors[k] : undefined);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    const first = Object.keys(errors).find((k) => errors[k]);
    if (first) { document.getElementById(`pf-${first}`)?.focus(); return; }
    const input: ProjectInput = {
      name: v.name.trim(),
      city: v.city as City,
      locality: v.locality.trim(),
      status: v.status as Project["status"],
      totalUnits: total,
      availableUnits: v.availableUnits === "" ? total : avail,
      description: v.description.trim(),
      image: v.image,
      features: v.features,
    };
    setBusy(true);
    setSaveErr(null);
    try {
      onDone(await saveProject(input, project?.id));
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <p className="text-small text-ink-muted"><span className="text-negative">*</span> Required</p>
        <Field id="pf-name" label="Project name" required error={show("name")}>
          {(a) => <input {...a} value={v.name} onChange={(e) => set("name", e.target.value)} onBlur={blur("name")} className={control(show("name"))} />}
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="pf-city" label="City" required error={show("city")}>
            {(a) => (
              <select {...a} value={v.city} onChange={(e) => set("city", e.target.value as City)} onBlur={blur("city")} className={control(show("city"))}>
                <option value="">Choose…</option>
                <option value="Nashik">Nashik</option>
                <option value="Pune">Pune</option>
              </select>
            )}
          </Field>
          <Field id="pf-locality" label="Locality" required error={show("locality")}>
            {(a) => <input {...a} value={v.locality} onChange={(e) => set("locality", e.target.value)} onBlur={blur("locality")} placeholder="e.g. Gangapur Road" className={control(show("locality"))} />}
          </Field>
        </div>
        <Field id="pf-status" label="Status" required error={show("status")}>
          {(a) => (
            <select {...a} value={v.status} onChange={(e) => set("status", e.target.value as Project["status"])} onBlur={blur("status")} className={control(show("status"))}>
              <option value="">Choose…</option>
              {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          )}
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="pf-totalUnits" label="Total units" required error={show("totalUnits")}>
            {(a) => <input {...a} inputMode="numeric" value={v.totalUnits} onChange={(e) => set("totalUnits", e.target.value.replace(/\D/g, ""))} onBlur={blur("totalUnits")} className={cn(control(show("totalUnits")), "tnum")} />}
          </Field>
          <Field id="pf-availableUnits" label="Available units" hint="Leave blank if all are available." error={show("availableUnits")}>
            {(a) => <input {...a} inputMode="numeric" value={v.availableUnits} onChange={(e) => set("availableUnits", e.target.value.replace(/\D/g, ""))} onBlur={blur("availableUnits")} className={cn(control(show("availableUnits")), "tnum")} />}
          </Field>
        </div>
        <Field id="pf-description" label="Description" hint="Shown to clients in the project details.">
          {(a) => <textarea {...a} rows={4} value={v.description} onChange={(e) => set("description", e.target.value)} className={cn(control(), "h-auto py-2")} />}
        </Field>
        <ChipPicker label="Amenities" value={v.features} onChange={(f) => set("features", f)} presets={PROJECT_AMENITIES} />
        <ImageField label="Cover image" value={v.image} onChange={(i) => set("image", i)} />
      </div>
      <FormFooter onCancel={() => onDone()} submitLabel={project ? "Save changes" : "Add project"} busy={busy} error={saveErr} />
    </form>
  );
}

/* ================= Property form ================= */

const PROPERTY_TYPES: PropertyType[] = ["Apartment", "Villa", "Row house", "Penthouse", "Plot"];
const FURNISHING: Furnishing[] = ["Unfurnished", "Semi-furnished", "Fully furnished"];
const PROPERTY_STATUS: { id: NonNullable<Property["status"]>; label: string }[] = [
  { id: "available", label: "Available" },
  { id: "hold", label: "On hold" },
  { id: "sold", label: "Sold" },
];

export function PropertyForm({ project, property, onDone }: { project: Project; property?: Property; onDone: () => void }) {
  const [v, setV] = useState({
    propertyType: (property?.propertyType ?? "Apartment") as PropertyType,
    bhk: property?.bhk?.toString() ?? "",
    priceLakh: property?.priceLakh?.toString() ?? "",
    beds: property?.beds?.toString() ?? "",
    baths: property?.baths?.toString() ?? "",
    areaSqft: property?.areaSqft?.toString() ?? "",
    furnishing: (property?.furnishing ?? "Unfurnished") as Furnishing,
    status: property?.status ?? "available",
    tags: property?.tags ?? [],
    image: property?.image ?? "",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [tried, setTried] = useState(false);
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }));
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const plot = v.propertyType === "Plot";
  const price = Number(v.priceLakh);
  const int = (s: string, min: number) => s !== "" && Number.isInteger(Number(s)) && Number(s) >= min;

  const errors: Record<string, string | undefined> = {
    bhk: plot ? undefined : !v.bhk ? "Enter the BHK." : !int(v.bhk, 1) || Number(v.bhk) > 10 ? "Use 1–10." : undefined,
    priceLakh: !v.priceLakh ? "Enter the price." : !(price > 0) ? "Enter a price above 0." : undefined,
    beds: plot ? undefined : !int(v.beds, 0) ? "Enter bedrooms (0 or more)." : undefined,
    baths: plot ? undefined : !int(v.baths, 0) ? "Enter bathrooms (0 or more)." : undefined,
    areaSqft: !v.areaSqft ? "Enter the area." : !int(v.areaSqft, 100) ? "Use a whole number of sq ft (100+)." : undefined,
  };
  const show = (k: string) => (touched[k] || tried ? errors[k] : undefined);

  const [busy, setBusy] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    const first = Object.keys(errors).find((k) => errors[k]);
    if (first) { document.getElementById(`rf-${first}`)?.focus(); return; }
    const input: PropertyInput = {
      propertyType: v.propertyType,
      bhk: plot ? undefined : Number(v.bhk),
      priceLakh: price,
      beds: plot ? 0 : Number(v.beds),
      baths: plot ? 0 : Number(v.baths),
      areaSqft: Number(v.areaSqft),
      furnishing: plot ? undefined : v.furnishing,
      status: v.status,
      tags: v.tags,
      image: v.image,
    };
    setBusy(true);
    setSaveErr(null);
    try {
      await saveProperty(project.id, input, property?.id);
      onDone();
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  };

  const preview = propertyTitle({ propertyType: v.propertyType, bhk: v.bhk ? Number(v.bhk) : undefined });

  return (
    <form onSubmit={submit} noValidate className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <p className="text-small text-ink-muted"><span className="text-negative">*</span> Required · clients see this as “{preview}” at {project.name}.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="rf-propertyType" label="Property type" required>
            {(a) => (
              <select {...a} value={v.propertyType} onChange={(e) => set("propertyType", e.target.value as PropertyType)} className={control()}>
                {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            )}
          </Field>
          {!plot && (
            <Field id="rf-bhk" label="BHK" required error={show("bhk")}>
              {(a) => <input {...a} inputMode="numeric" value={v.bhk} onChange={(e) => set("bhk", e.target.value.replace(/\D/g, ""))} onBlur={blur("bhk")} placeholder="2" className={cn(control(show("bhk")), "tnum")} />}
            </Field>
          )}
        </div>

        <Field id="rf-priceLakh" label="Price (in lakh)" required error={show("priceLakh")} hint={price > 0 ? `Shown to clients as ${fmtLakh(price)}` : "e.g. 65 for ₹ 65 L, 120 for ₹ 1.2 Cr"}>
          {(a) => (
            <div className={cn("flex items-center rounded-control border bg-surface focus-within:shadow-focus", show("priceLakh") ? "border-negative" : "border-border focus-within:border-accent")}>
              <span className="pl-3 text-body text-ink-soft" aria-hidden="true">₹</span>
              <input {...a} inputMode="decimal" value={v.priceLakh} onChange={(e) => set("priceLakh", e.target.value.replace(/[^\d.]/g, ""))} onBlur={blur("priceLakh")} className="flex-1 min-w-0 h-10 px-2 bg-transparent border-0 outline-none shadow-none focus-visible:shadow-none text-body tnum" />
              <span className="pr-3 text-body text-ink-soft" aria-hidden="true">lakh</span>
            </div>
          )}
        </Field>

        <div className="grid grid-cols-3 gap-4">
          {!plot && (
            <>
              <Field id="rf-beds" label="Bedrooms" required error={show("beds")}>
                {(a) => <input {...a} inputMode="numeric" value={v.beds} onChange={(e) => set("beds", e.target.value.replace(/\D/g, ""))} onBlur={blur("beds")} className={cn(control(show("beds")), "tnum")} />}
              </Field>
              <Field id="rf-baths" label="Bathrooms" required error={show("baths")}>
                {(a) => <input {...a} inputMode="numeric" value={v.baths} onChange={(e) => set("baths", e.target.value.replace(/\D/g, ""))} onBlur={blur("baths")} className={cn(control(show("baths")), "tnum")} />}
              </Field>
            </>
          )}
          <Field id="rf-areaSqft" label="Area (sq ft)" required error={show("areaSqft")}>
            {(a) => <input {...a} inputMode="numeric" value={v.areaSqft} onChange={(e) => set("areaSqft", e.target.value.replace(/\D/g, ""))} onBlur={blur("areaSqft")} className={cn(control(show("areaSqft")), "tnum")} />}
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {!plot && (
            <Field id="rf-furnishing" label="Furnishing">
              {(a) => (
                <select {...a} value={v.furnishing} onChange={(e) => set("furnishing", e.target.value as Furnishing)} className={control()}>
                  {FURNISHING.map((f) => <option key={f}>{f}</option>)}
                </select>
              )}
            </Field>
          )}
          <Field id="rf-status" label="Availability" required>
            {(a) => (
              <select {...a} value={v.status} onChange={(e) => set("status", e.target.value as NonNullable<Property["status"]>)} className={control()}>
                {PROPERTY_STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            )}
          </Field>
        </div>

        <ChipPicker label="Amenities" value={v.tags} onChange={(t) => set("tags", t)} presets={project.features} />
        <ImageField label="Property image" value={v.image} onChange={(i) => set("image", i)} />
      </div>
      <FormFooter onCancel={onDone} submitLabel={property ? "Save changes" : "Add property"} busy={busy} error={saveErr} />
    </form>
  );
}

export { PROPERTY_STATUS };
