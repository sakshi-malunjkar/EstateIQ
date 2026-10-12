"""
Public project / property catalog.

The landing page (client-new) reads it without auth; the admin dashboard (admin-new) creates, edits
and deletes it with the same Supabase bearer token the lead endpoints use. JSON field names are
camelCase because that is what both frontends' `Project` / `Property` types use.

Derived fields are computed here, not stored (they would drift from the properties they summarise):
  - Project.unitTypes / priceRange: from the project's properties ("2–3 BHK", "₹ 65 L – 1.4 Cr"),
    with the same fallbacks the frontend catalog used ("—" / "Price on request").
  - Property.type / price / project / city: from bhk + propertyType, priceLakh and the parent project.

Images are a URL or a /path only. Uploads are not supported yet, so data: URLs are rejected.
"""

import logging
import re
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic.alias_generators import to_camel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from api.auth import get_current_user
from api.database import get_db
from app.lead_scoring.models import Project, Property

logger = logging.getLogger("estateiq.api.catalog")

City = Literal["Nashik", "Pune"]
ProjectStatus = Literal["Ready to move", "Under construction", "New launch"]
PropertyType = Literal["Apartment", "Villa", "Row house", "Penthouse", "Plot"]
Furnishing = Literal["Unfurnished", "Semi-furnished", "Fully furnished"]
PropertyStatus = Literal["available", "sold", "hold"]


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class _Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


def _check_image(v: str | None) -> str | None:
    if v is None:
        return None
    v = v.strip()
    if not v:
        return None
    if len(v) > 500:
        raise ValueError("Image must be a URL or path of at most 500 characters.")
    if v.startswith("data:") or not (re.match(r"^/(?!/)", v) or re.match(r"^https?://", v, re.I)):
        raise ValueError("Image must be an http(s) URL or a /path. Uploads aren't supported yet.")
    return v


def _check_tags(v: list[str] | None) -> list[str] | None:
    if v is None:
        return None
    out = [t.strip() for t in v if t and t.strip()]
    if len(out) > 30 or any(len(t) > 60 for t in out):
        raise ValueError("At most 30 items of up to 60 characters each.")
    return out


class _Checked(_Camel):
    """Shared input checks, applied to whichever of these fields a subclass has."""

    @field_validator("image", check_fields=False)
    @classmethod
    def _image(cls, v: str | None) -> str | None:
        return _check_image(v)

    @field_validator("features", "tags", check_fields=False)
    @classmethod
    def _list(cls, v: list[str] | None) -> list[str] | None:
        return _check_tags(v)


class ProjectIn(_Checked):
    name: str = Field(min_length=1, max_length=120)
    city: City
    locality: str = Field(min_length=1, max_length=120)
    status: ProjectStatus
    features: list[str] = Field(default_factory=list)
    total_units: int | None = Field(default=None, ge=0)
    available_units: int | None = Field(default=None, ge=0)
    description: str | None = Field(default=None, max_length=2000)
    image: str | None = None


    @field_validator("name", "locality")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Must not be blank.")
        return v

    @model_validator(mode="after")
    def _units(self):
        if self.total_units is not None and self.available_units is not None and self.available_units > self.total_units:
            raise ValueError("availableUnits can't exceed totalUnits.")
        return self


class ProjectPatch(_Checked):
    """Any subset of ProjectIn. An omitted field is left alone."""
    name: str | None = Field(default=None, min_length=1, max_length=120)
    city: City | None = None
    locality: str | None = Field(default=None, min_length=1, max_length=120)
    status: ProjectStatus | None = None
    features: list[str] | None = None
    total_units: int | None = Field(default=None, ge=0)
    available_units: int | None = Field(default=None, ge=0)
    description: str | None = Field(default=None, max_length=2000)
    image: str | None = None



class PropertyIn(_Checked):
    property_type: PropertyType
    price_lakh: float = Field(gt=0, lt=1_000_000)
    beds: int = Field(ge=0, le=50)
    baths: int = Field(ge=0, le=50)
    tags: list[str] = Field(default_factory=list)
    status: PropertyStatus = "available"
    bhk: int | None = Field(default=None, ge=0, le=50)
    area_sqft: int | None = Field(default=None, gt=0, le=1_000_000)
    furnishing: Furnishing | None = None
    image: str | None = None



class PropertyPatch(_Checked):
    """Any subset of PropertyIn. An omitted field is left alone."""
    property_type: PropertyType | None = None
    price_lakh: float | None = Field(default=None, gt=0, lt=1_000_000)
    beds: int | None = Field(default=None, ge=0, le=50)
    baths: int | None = Field(default=None, ge=0, le=50)
    tags: list[str] | None = None
    status: PropertyStatus | None = None
    bhk: int | None = Field(default=None, ge=0, le=50)
    area_sqft: int | None = Field(default=None, gt=0, le=1_000_000)
    furnishing: Furnishing | None = None
    image: str | None = None



class ProjectOut(_Camel):
    id: str
    name: str
    city: City
    locality: str
    status: ProjectStatus
    unit_types: str
    price_range: str
    features: list[str]
    total_units: int | None = None
    available_units: int | None = None
    description: str | None = None
    image: str | None = None


class PropertyOut(_Camel):
    id: str
    project_id: str
    project: str
    city: City
    type: str
    price: str
    beds: int
    baths: int
    tags: list[str]
    status: PropertyStatus
    property_type: PropertyType
    bhk: int | None = None
    price_lakh: float
    area_sqft: int | None = None
    furnishing: Furnishing | None = None
    image: str | None = None


# ---------------------------------------------------------------------------
# Derived display values (mirror the formatting the frontend catalog used)
# ---------------------------------------------------------------------------

def _num(x: float) -> str:
    return str(int(x)) if float(x).is_integer() else str(x)


def fmt_lakh(l: float) -> str:
    """65 -> "₹ 65 L", 120 -> "₹ 1.2 Cr"."""
    if l >= 100:
        crore = re.sub(r"\.?0+$", "", f"{l / 100:.2f}")
        return f"₹ {crore} Cr"
    return f"₹ {_num(round(l * 10) / 10)} L"


def property_title(bhk: int | None, property_type: str) -> str:
    if property_type == "Plot":
        return "Plot"
    suffix = f" {property_type}" if property_type != "Apartment" else ""
    return f"{bhk if bhk is not None else '—'} BHK{suffix}"


def _unit_types(props: list[Property]) -> str:
    bhks = [p.bhk for p in props if p.bhk]
    if not bhks:
        return "—"
    lo, hi = min(bhks), max(bhks)
    return f"{lo} BHK" if lo == hi else f"{lo}–{hi} BHK"


def _price_range(props: list[Property]) -> str:
    if not props:
        return "Price on request"
    lo, hi = min(p.price_lakh for p in props), max(p.price_lakh for p in props)
    return fmt_lakh(lo) if lo == hi else f"{fmt_lakh(lo)} – {fmt_lakh(hi).replace('₹ ', '')}"


def project_out(p: Project) -> ProjectOut:
    return ProjectOut(
        id=str(p.id), name=p.name, city=p.city, locality=p.locality, status=p.status,
        unit_types=_unit_types(p.properties), price_range=_price_range(p.properties),
        features=list(p.features or []), total_units=p.total_units, available_units=p.available_units,
        description=p.description, image=p.image,
    )


def property_out(r: Property, p: Project) -> PropertyOut:
    return PropertyOut(
        id=str(r.id), project_id=str(p.id), project=p.name, city=p.city,
        type=property_title(r.bhk, r.property_type), price=fmt_lakh(r.price_lakh),
        beds=r.beds, baths=r.baths, tags=list(r.tags or []), status=r.status,
        property_type=r.property_type, bhk=r.bhk, price_lakh=r.price_lakh, area_sqft=r.area_sqft,
        furnishing=r.furnishing, image=r.image,
    )


# ---------------------------------------------------------------------------
# Data access
# ---------------------------------------------------------------------------

def _uuid(value: str, what: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"{what} {value} not found") from None


async def _project(db: AsyncSession, project_id: str) -> Project:
    pid = _uuid(project_id, "Project")
    project = (await db.execute(select(Project).where(Project.id == pid).options(selectinload(Project.properties)))).scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    return project


async def _property(db: AsyncSession, property_id: str) -> Property:
    rid = _uuid(property_id, "Property")
    prop = (await db.execute(select(Property).where(Property.id == rid).options(joinedload(Property.project)))).scalar_one_or_none()
    if prop is None:
        raise HTTPException(status_code=404, detail=f"Property {property_id} not found")
    return prop


_NOT_NULL_PROJECT_FIELDS = {"name", "city", "locality", "status", "features"}
_NOT_NULL_PROPERTY_FIELDS = {"property_type", "price_lakh", "beds", "baths", "tags", "status"}


def _apply(obj, patch: BaseModel, not_null: set[str]) -> None:
    for key, value in patch.model_dump(exclude_unset=True).items():
        if value is None and key in not_null:
            raise HTTPException(status_code=422, detail=f"{to_camel(key)} can't be null.")
        setattr(obj, key, value)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

router = APIRouter(tags=["catalog"])
admin = [Depends(get_current_user)]


@router.get("/projects", response_model=list[ProjectOut], response_model_exclude_none=True)
async def list_projects(db: AsyncSession = Depends(get_db)):
    """Public. Every project, oldest first, with unitTypes / priceRange derived from its properties."""
    rows = (await db.execute(select(Project).options(selectinload(Project.properties)).order_by(Project.created_at, Project.name))).scalars().all()
    return [project_out(p) for p in rows]


@router.get("/projects/{project_id}", response_model=ProjectOut, response_model_exclude_none=True)
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """Public. One project."""
    return project_out(await _project(db, project_id))


@router.post("/projects", response_model=ProjectOut, response_model_exclude_none=True, status_code=201, dependencies=admin)
async def create_project(payload: ProjectIn, db: AsyncSession = Depends(get_db)):
    project = Project(**payload.model_dump())
    project.properties = []
    db.add(project)
    await db.commit()
    return project_out(project)


@router.patch("/projects/{project_id}", response_model=ProjectOut, response_model_exclude_none=True, dependencies=admin)
async def update_project(project_id: str, payload: ProjectPatch, db: AsyncSession = Depends(get_db)):
    project = await _project(db, project_id)
    _apply(project, payload, _NOT_NULL_PROJECT_FIELDS)
    if project.total_units is not None and project.available_units is not None and project.available_units > project.total_units:
        raise HTTPException(status_code=422, detail="availableUnits can't exceed totalUnits.")
    await db.commit()
    return project_out(project)


@router.delete("/projects/{project_id}", status_code=204, dependencies=admin)
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """Also deletes the project's properties."""
    await db.delete(await _project(db, project_id))
    await db.commit()
    return Response(status_code=204)


@router.get("/properties", response_model=list[PropertyOut], response_model_exclude_none=True)
async def list_properties(project_id: str | None = Query(default=None, alias="projectId"), db: AsyncSession = Depends(get_db)):
    """Public. All properties, or one project's with ?projectId=. Sold ones are included (status says so)."""
    q = select(Property).options(joinedload(Property.project)).order_by(Property.created_at)
    if project_id is not None:
        q = q.where(Property.project_id == _uuid(project_id, "Project"))
    return [property_out(r, r.project) for r in (await db.execute(q)).scalars().all()]


@router.post("/projects/{project_id}/properties", response_model=PropertyOut, response_model_exclude_none=True, status_code=201, dependencies=admin)
async def create_property(project_id: str, payload: PropertyIn, db: AsyncSession = Depends(get_db)):
    project = await _project(db, project_id)
    prop = Property(project_id=project.id, **payload.model_dump())
    db.add(prop)
    await db.commit()
    return property_out(prop, project)


@router.patch("/properties/{property_id}", response_model=PropertyOut, response_model_exclude_none=True, dependencies=admin)
async def update_property(property_id: str, payload: PropertyPatch, db: AsyncSession = Depends(get_db)):
    prop = await _property(db, property_id)
    _apply(prop, payload, _NOT_NULL_PROPERTY_FIELDS)
    await db.commit()
    return property_out(prop, prop.project)


@router.delete("/properties/{property_id}", status_code=204, dependencies=admin)
async def delete_property(property_id: str, db: AsyncSession = Depends(get_db)):
    await db.delete(await _property(db, property_id))
    await db.commit()
    return Response(status_code=204)
