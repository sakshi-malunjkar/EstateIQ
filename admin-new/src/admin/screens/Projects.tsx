import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, MapPin, Plus } from "lucide-react";
import type { City } from "@/api/types";
import { projectImage, projectView, useCatalog } from "@/api/catalog";
import { Button } from "@/components/Button";
import { ProjectForm, Sheet } from "../catalogForms";
import { LoadError, Loading } from "../components/LoadState";

const CITIES: City[] = ["Nashik", "Pune"];

/** Projects & properties (§11.5): projects grouped by city. Writes go to the shared catalog. */
export function Projects() {
  const { projects, properties, loading, error, reload } = useCatalog();
  const [adding, setAdding] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-screen-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-ink-soft">
          {projects.length} projects · {properties.length} properties · what you enter here is what clients see on the website.
        </p>
        <Button onClick={() => setAdding(true)}>
          <Plus size={16} strokeWidth={1.5} /> Add project
        </Button>
      </div>

      {error && <LoadError message={`Couldn't load projects: ${error}`} onRetry={reload} />}
      {loading && <Loading label="Loading projects…" />}

      {!loading && CITIES.map((city) => {
        const list = projects.filter((p) => p.city === city).map((p) => projectView(p, properties));
        return (
          <section key={city} aria-labelledby={`city-${city}`} className="space-y-3">
            <h2 id={`city-${city}`} className="font-semibold text-h2">
              {city} <span className="text-ink-muted font-normal tnum">({list.length})</span>
            </h2>
            {list.length === 0 ? (
              <p className="rounded-card border border-dashed border-border bg-surface p-6 text-body text-ink-muted">No projects in {city} yet.</p>
            ) : (
              <ul className="rounded-card border border-border bg-surface divide-y divide-border">
                {list.map((p) => {
                  const nProps = properties.filter((x) => x.projectId === p.id).length;
                  return (
                    <li key={p.id} className="relative flex items-center gap-4 p-3 lg:p-4 hover:bg-surface-hover transition-colors duration-fast">
                      <img src={projectImage(p)} alt="" className="w-24 aspect-video rounded-control object-cover bg-surface-hover shrink-0" />
                      <div className="min-w-0 flex-1">
                        <Link to={`/projects/${p.id}`} className="font-semibold text-body after:absolute after:inset-0 hover:text-accent-ink rounded-control">
                          {p.name}
                        </Link>
                        <p className="text-small text-ink-soft inline-flex items-center gap-1 mt-0.5">
                          <MapPin size={12} strokeWidth={1.5} aria-hidden="true" /> {p.locality}
                        </p>
                      </div>
                      <span className="hidden sm:inline-flex h-6 items-center rounded-pill bg-accent-soft px-2.5 text-small font-medium text-accent-ink whitespace-nowrap">{p.status}</span>
                      <div className="hidden md:block text-right text-small text-ink-soft tnum w-32">
                        <div><span className="text-ink font-medium">{p.availableUnits ?? "—"}</span> / {p.totalUnits ?? "—"} units</div>
                        <div className="text-ink-muted">{nProps} {nProps === 1 ? "property" : "properties"}</div>
                      </div>
                      <div className="hidden lg:block text-right text-small text-ink-soft tnum w-36">{p.priceRange}</div>
                      <ChevronRight size={16} strokeWidth={1.5} className="text-ink-muted shrink-0" aria-hidden="true" />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add project" description="Appears on the website's project grid as soon as you save.">
        <ProjectForm onDone={(id) => { setAdding(false); if (id) navigate(`/projects/${id}`); }} />
      </Sheet>
    </div>
  );
}
