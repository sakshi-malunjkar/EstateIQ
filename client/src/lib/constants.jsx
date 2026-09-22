import {
  Calendar,
  HelpCircle,
  Home,
  IndianRupee,
  Key,
  MapPin,
  Phone,
  ShoppingCart,
  Star,
  TrendingUp,
} from 'lucide-react'

// Mirrors the tier/sentiment/status/lost_reason vocabularies the
// FastAPI backend actually returns/accepts (app/lead_scoring/models.py,
// api/models.py) -- kept as a single source of truth on the frontend
// so every page (dashboard filters, detail page, analytics) agrees.

export const TIER_COLORS = {
  hot: '#22c55e',
  warm: '#f59e0b',
  cold: '#ef4444',
}

export const TIER_LABELS = {
  hot: 'Hot',
  warm: 'Warm',
  cold: 'Cold',
}

export const SENTIMENT_META = {
  enthusiastic: { emoji: '😊', color: '#22c55e', label: 'Enthusiastic' },
  hesitant: { emoji: '😐', color: '#f59e0b', label: 'Hesitant' },
  frustrated: { emoji: '😤', color: '#ef4444', label: 'Frustrated' },
}

export const INTENT_META = {
  Buy: { icon: ShoppingCart, color: '#6366f1' },
  Rent: { icon: Key, color: '#8b5cf6' },
  Inquiry: { icon: HelpCircle, color: '#94a3b8' },
  'Schedule Visit': { icon: Calendar, color: '#22c55e' },
  Investment: { icon: TrendingUp, color: '#f59e0b' },
  'Request Callback': { icon: Phone, color: '#ef4444' },
}

export const NER_ICONS = {
  location: MapPin,
  property_type: Home,
  budget: IndianRupee,
  amenities: Star,
}

// The DB schema (app/lead_scoring/models.py LeadStatus) uses
// new/contacted/qualified/won/lost -- "won" where an earlier draft of
// the spec said "Converted". Labels below display "Won" for clarity
// but the `value` sent to the API is the real backend enum value.
export const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
]

export const STATUS_COLORS = {
  new: '#94a3b8',
  contacted: '#6366f1',
  qualified: '#8b5cf6',
  won: '#22c55e',
  lost: '#ef4444',
}

// Matches app/lead_scoring/models.py's LostReason enum exactly.
export const LOST_REASON_OPTIONS = [
  { value: 'lost-budget', label: 'Budget mismatch' },
  { value: 'lost-competitor', label: 'Went with a competitor' },
  { value: 'lost-timing', label: 'Bad timing' },
  { value: 'lost-location-mismatch', label: 'Location mismatch' },
  { value: 'lost-not-interested', label: 'Not interested' },
  { value: 'lost-unreachable', label: 'Unreachable' },
  { value: 'lost-duplicate', label: 'Duplicate lead' },
  { value: 'lost-invalid-data', label: 'Invalid data' },
  { value: 'lost-agent-error', label: 'Agent error' },
]

export const SHAP_LABELS = {
  sentiment: 'Sentiment',
  sentiment_confidence: 'Sentiment Confidence',
  entity_completeness: 'Entity Completeness',
  amenities_count: 'Amenities Count',
  budget_amount: 'Budget Amount',
  turn_count: 'Turn Count',
  message_length: 'Message Length',
}
