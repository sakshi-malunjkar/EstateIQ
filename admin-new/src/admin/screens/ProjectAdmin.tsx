import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bath, Bed, ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import type { Property } from "@/api/types";
import { deleteProject, deleteProperty, projectImage, projectView, useCatalog } from "@/api/catalog";
import { LoadError, Loading } from "../components/LoadState";
import { Button } from "@/components/Button";
import { CityPill } from "@/components/CityPill";
import { cn } from "@/lib/utils";
import { ConfirmDelete, ProjectForm, PROPERTY_STATUS, PropertyForm, Sheet } from "../catalogForms";

const statusTone: Record<NonNullable<Property["status"]>, string> = {
  available: "bg-positive/15 border-positive/40",
  hold: "bg-warm/15 border-warm/40",
  sold: "bg-neutral/15 border-neutral/40",
};
const statusDot: Record<NonNullable<Property["status"]>, string> = { available: "bg-positive", hold: "bg-warm", sold: "bg-neutral" };

/** One project: its info + every property in it, with add / edit / delete (§11.5). */
export function ProjectAdmin() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, properties, loading, error, reload } = useCatalog();
  const raw = projects.find((p) => p.id === id);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmProject, setConfirmProject] = useState(false);
  const [propForm, setPropForm] = useState<{ property?: Property } | null>(null);
  const [confirmProp, setConfirmProp] = useState<Property | null>(null);

  if (!raw && loading) return <Loading label="Loading project…" />;
  if (!raw && error) return <LoadError message={`Couldn't load this project: ${error}`} onRetry={reload} />;
  if (!raw) {
    return (
      <div className="max-w-xl rounded-card border border-border bg-surface p-8">
        <h2 className="font-semibold text-h3">Project not found</h2>
        <Link to="/projects" className="inline-block mt-4 text-small font-medium text-accent-ink hover:underline">← Back to projects</Link>
      </div>
    );
  }
  const p = projectView(raw, properties);
  const own = properties.filter((x) => x.projectId === p.id);

  return (
    <div className="space-y-6 max-w-screen-xl">
      <Link to="/projects" className="inline-flex items-center gap-1 text-small text-ink-soft hover:text-ink rounded-control">
        <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" /> All projects
      </Link>

      {actionErr && <LoadError message={`Couldn't delete: ${actionErr}`} />}

      {/* Project info */}
      <section aria-labelledby="proj-title" className="rounded-card border border-border bg-surface overflow-hidden grid md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <img src={projectImage(p)} alt={`${p.name}, ${p.locality}, ${p.city}`} className="w-full h-full min-h-40 object-cover bg-surface-hover" />
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <CityPill city={p.city} />
                <span className="inline-flex h-6 items-center rounded-pill bg-accent-soft px-2.5 text-small font-medium text-accent-ink">{p.status}</span>
              </div>
              <h2 id="proj-title" className="font-display font-semibold text-h1 tracking-tight">{p.name}</h2>
              <p className="text-body text-ink-soft">{p.locality}, {p.city}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="h-9" onClick={() => setEditing(true)}><Pencil size={14} strokeWidth={1.5} /> Edit</Button>
              <Button variant="secondary" className="h-9" onClick={() => setConfirmProject(true)} aria-label={`Delete ${p.name}`}><Trash2 size={14} strokeWidth={1.5} /> Delete</Button>
            </div>
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-body">
            <div><dt className="text-small text-ink-muted">Units</dt><dd className="tnum"><span className="font-medium">{p.availableUnits ?? "—"}</span> available of {p.totalUnits ?? "—"}</dd></div>
            <div><dt className="text-small text-ink-muted">Homes</dt><dd>{p.unitTypes}</dd></div>
            <div><dt className="text-small text-ink-muted">Price range</dt><dd className="tnum">{p.priceRange}</dd></div>
            <div><dt className="text-small text-ink-muted">Properties</dt><dd className="tnum">{own.length}</dd></div>
          </dl>
          <p className={cn("text-body", p.description ? "text-ink-soft" : "text-ink-muted")}>{p.description || "No description yet."}</p>
          {p.features.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Amenities">
              {p.features.map((f) => <li key={f} className="text-small text-ink-soft bg-bg border border-border rounded-pill px-2 py-0.5">{f}</li>)}
            </ul>
          )}
        </div>
      </section>

      {/* Properties */}
      <section aria-labelledby="props-title" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="props-title" className="font-semibold text-h2">Properties <span className="text-ink-muted font-normal tnum">({own.length})</span></h3>
          <Button onClick={() => setPropForm({})}><Plus size={16} strokeWidth={1.5} /> Add property</Button>
        </div>
        {own.length === 0 ? (
          <p className="rounded-card border border-dashed border-border bg-surface p-6 text-body text-ink-muted">No properties yet — add the first one so clients can see prices and homes.</p>
        ) : (
          <div className="rounded-card border border-border bg-surface overflow-x-auto">
            <table className="w-full text-body">
              <thead>
                <tr className="text-left text-small text-ink-muted border-b border-border">
                  <th scope="col" className="font-medium pl-4 pr-3 py-2.5">Property</th>
                  <th scope="col" className="font-medium px-3 py-2.5 text-right">Price</th>
                  <th scope="col" className="font-medium px-3 py-2.5">Beds · Baths</th>
                  <th scope="col" className="font-medium px-3 py-2.5 text-right">Area</th>
                  <th scope="col" className="font-medium px-3 py-2.5">Furnishing</th>
                  <th scope="col" className="font-medium px-3 py-2.5">Amenities</th>
                  <th scope="col" className="font-medium px-3 py-2.5">Status</th>
                  <th scope="col" className="pr-4 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {own.map((x) => {
                  const st = x.status ?? "available";
                  return (
                    <tr key={x.id} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors duration-fast">
                      <td className="pl-4 pr-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <span className="w-14 aspect-[4/3] rounded-control overflow-hidden bg-surface-hover grid place-items-center shrink-0">
                            {x.image ? <img src={x.image} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={16} strokeWidth={1.5} className="text-ink-muted" aria-hidden="true" />}
                          </span>
                          <div>
                            <div className="font-medium whitespace-nowrap">{x.type}</div>
                            <div className="text-small text-ink-muted">{x.propertyType ?? "Apartment"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tnum whitespace-nowrap">{x.price}</td>
                      <td className="px-3 py-2.5 text-ink-soft whitespace-nowrap">
                        <span className="inline-flex items-center gap-1"><Bed size={14} strokeWidth={1.5} aria-label="Bedrooms" />{x.beds}</span>
                        <span className="inline-flex items-center gap-1 ml-3"><Bath size={14} strokeWidth={1.5} aria-label="Bathrooms" />{x.baths}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-ink-soft tnum whitespace-nowrap">{x.areaSqft ? `${x.areaSqft.toLocaleString("en-IN")} sq ft` : "—"}</td>
                      <td className="px-3 py-2.5 text-ink-soft whitespace-nowrap">{x.furnishing ?? "—"}</td>
                      <td className="px-3 py-2.5 text-small text-ink-soft max-w-56">{x.tags.length ? x.tags.join(", ") : <span className="text-ink-muted">None</span>}</td>
                      <td className="px-3 py-2.5">
                        <span className={cn("inline-flex items-center gap-1.5 h-6 px-2.5 rounded-pill border text-small text-ink whitespace-nowrap", statusTone[st])}>
                          <span className={cn("w-2 h-2 rounded-pill", statusDot[st])} aria-hidden="true" />
                          {PROPERTY_STATUS.find((s) => s.id === st)!.label}
                        </span>
                      </td>
                      <td className="pr-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => setPropForm({ property: x })} aria-label={`Edit ${x.type}`} className="h-8 w-8 grid place-items-center rounded-control text-ink-soft hover:text-ink hover:bg-surface">
                            <Pencil size={14} strokeWidth={1.5} />
                          </button>
                          <button type="button" onClick={() => setConfirmProp(x)} aria-label={`Delete ${x.type}`} className="h-8 w-8 grid place-items-center rounded-control text-ink-soft hover:text-ink hover:bg-surface">
                            <Trash2 size={14} strokeWidth={1.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Sheet open={editing} onClose={() => setEditing(false)} title={`Edit ${raw.name}`} description="Changes show on the website straight away.">
        <ProjectForm project={raw} onDone={() => setEditing(false)} />
      </Sheet>
      <Sheet
        open={!!propForm}
        onClose={() => setPropForm(null)}
        title={propForm?.property ? `Edit ${propForm.property.type}` : "Add property"}
        description={`In ${raw.name} · ${raw.city}. Clients see exactly these details.`}
      >
        {propForm && <PropertyForm project={raw} property={propForm.property} onDone={() => setPropForm(null)} />}
      </Sheet>
      <ConfirmDelete
        open={confirmProject}
        onClose={() => setConfirmProject(false)}
        what={raw.name}
        detail={`This removes the project and its ${own.length} ${own.length === 1 ? "property" : "properties"} from the website. This can't be undone.`}
        onConfirm={() => { setActionErr(null); deleteProject(raw.id).then(() => navigate("/projects")).catch((e) => setActionErr(e instanceof Error ? e.message : "Something went wrong.")); }}
      />
      <ConfirmDelete
        open={!!confirmProp}
        onClose={() => setConfirmProp(null)}
        what={confirmProp ? `${confirmProp.type} · ${confirmProp.price}` : "property"}
        onConfirm={() => { if (!confirmProp) return; setActionErr(null); deleteProperty(confirmProp.id).catch((e) => setActionErr(e instanceof Error ? e.message : "Something went wrong.")); }}
      />
    </div>
  );
}
