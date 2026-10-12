"""
EstateIQ Streamlit dashboard.

Two pages, selected from the sidebar:
  - "Analyze Lead": paste a transcript, run the NER + sentiment pipeline
    (combined_predict.py) and the XGBoost lead-scoring pipeline
    (predict_lead_score.py) on it, and show the results.
  - "Lead Dashboard": a hardcoded sample portfolio of 10 leads with a
    tier breakdown, for a quick portfolio-level view.

Run with:
    streamlit run dashboard/app.py
"""

import sys
from pathlib import Path

import altair as alt
import pandas as pd
import streamlit as st

# combined_predict.py / predict.py / sentiment_predict.py use bare
# `from predict import ...` / `from sentiment_predict import ...`
# imports that assume app/nlp is on sys.path (same convention
# extract_features.py uses) -- and predict_lead_score.py is imported as
# a proper package, so the project root must be on sys.path too.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
NLP_DIR = PROJECT_ROOT / "app" / "nlp"
for _p in (str(PROJECT_ROOT), str(NLP_DIR)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from combined_predict import predict_combined  # noqa: E402
from app.lead_scoring.heuristic import TIER_THRESHOLDS  # noqa: E402
from app.lead_scoring.predict_lead_score import predict_lead_score  # noqa: E402

st.set_page_config(page_title="EstateIQ", page_icon=":material/home_work:", layout="wide")

TIER_COLORS = {"hot": "#2ecc71", "warm": "#f1c40f", "cold": "#e74c3c"}
TIER_BADGE_COLOR = {"hot": "green", "warm": "orange", "cold": "red"}
TIER_ORDER = ["hot", "warm", "cold"]

DEFAULT_TRANSCRIPT = (
    "Agent: Hello, welcome to our real estate assistant. How can I help you today?\n"
    "Client: Namaste, mujhe ek 2BHK chahiye Baner mein, budget 50 lakhs, swimming pool chahiye\n"
    "Agent: Sure, let me check 2BHK options in Baner with Swimming Pool.\n"
    "Client: This sounds great!"
)

# Hardcoded sample portfolio for the "Lead Dashboard" page -- not run
# through the models, just realistic example rows covering all three
# tiers so the portfolio view has something to show.
SAMPLE_LEADS = [
    {"transcript": "I want a 3BHK in Wakad with parking and gym, budget 80 lakhs, this is amazing! Exactly what I wanted, let's book a visit right away!", "sentiment": "enthusiastic", "score": 87.2, "tier": "hot"},
    {"transcript": "Looking for a 4BHK villa in Aundh with clubhouse and swimming pool, budget 1.5 crore, we absolutely love it, ready to move forward today!", "sentiment": "enthusiastic", "score": 91.4, "tier": "hot"},
    {"transcript": "This 2BHK in Hinjewadi with gym and parking looks perfect, budget 65 lakhs, please schedule a site visit this weekend.", "sentiment": "enthusiastic", "score": 83.6, "tier": "hot"},
    {"transcript": "Mujhe Baner mein 2BHK chahiye, gym aur swimming pool ke saath, budget 60 lakhs, ekdum zakas hai, jaldi visit karna hai!", "sentiment": "enthusiastic", "score": 78.9, "tier": "hot"},
    {"transcript": "Interested in a 2BHK in Kothrud, maybe around 55 lakhs, still comparing a couple of other projects nearby.", "sentiment": "hesitant", "score": 52.3, "tier": "warm"},
    {"transcript": "3BHK in Wagholi sounds okay, budget flexible around 70 lakhs, need to check the floor plan before deciding.", "sentiment": "hesitant", "score": 47.8, "tier": "warm"},
    {"transcript": "2BHK in Viman Nagar with parking, budget around 58 lakhs, will discuss with family and get back to you.", "sentiment": "hesitant", "score": 44.1, "tier": "warm"},
    {"transcript": "hi just checking prices", "sentiment": "hesitant", "score": 22.5, "tier": "cold"},
    {"transcript": "I have called three times already and nobody has shown me anything in my budget, this is a waste of my time, I need a 2BHK in Baner", "sentiment": "frustrated", "score": 31.7, "tier": "cold"},
    {"transcript": "Not really looking right now, just browsing options for the future.", "sentiment": "hesitant", "score": 18.4, "tier": "cold"},
]


def inject_style():
    """Scoped CSS only (dark sidebar + score display) -- no external
    CSS framework, just Streamlit's own markdown/HTML escape hatch."""
    st.markdown(
        """
        <style>
        [data-testid="stSidebar"] {
            background-color: #111827;
        }
        [data-testid="stSidebar"] * {
            color: #e5e7eb !important;
        }
        [data-testid="stSidebar"] hr {
            border-color: #374151;
        }
        .estateiq-score {
            font-size: 4rem;
            font-weight: 800;
            line-height: 1;
        }
        .estateiq-header {
            padding-bottom: 0.25rem;
            border-bottom: 1px solid #e5e7eb;
            margin-bottom: 1rem;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def render_header():
    st.markdown(
        "<div class='estateiq-header'>"
        "<h1>&#127968; EstateIQ</h1>"
        "<p style='color:#6b7280;margin-top:-0.5rem;'>"
        "AI-powered lead intelligence for real estate teams"
        "</p></div>",
        unsafe_allow_html=True,
    )


def render_sidebar():
    st.sidebar.markdown("## &#127968; EstateIQ", unsafe_allow_html=True)
    st.sidebar.caption("AI Lead Intelligence")
    st.sidebar.divider()
    page = st.sidebar.radio(
        "Navigate", ["Analyze Lead", "Lead Dashboard"], label_visibility="collapsed"
    )
    st.sidebar.divider()
    st.sidebar.caption("Pipeline")
    st.sidebar.markdown(
        "- MuRIL NER (entities)\n"
        "- DistilBERT (sentiment)\n"
        "- XGBoost (lead score + SHAP)"
    )
    return page


def render_analyze_page():
    st.subheader("Analyze a call transcript")
    st.caption(
        "Paste a transcript (\"Agent: ...\\nClient: ...\" format, or a bare "
        "freeform sentence) and run it through the full pipeline."
    )

    transcript = st.text_area(
        "Call transcript", value=DEFAULT_TRANSCRIPT, height=180
    )
    analyze_clicked = st.button("Analyze", type="primary")

    if analyze_clicked:
        if not transcript.strip():
            st.warning("Please enter a transcript to analyze.")
        else:
            with st.spinner("Running NER + sentiment + lead scoring..."):
                try:
                    combined = predict_combined(transcript)
                    scored = predict_lead_score(transcript)
                    st.session_state["last_analysis"] = {"combined": combined, "scored": scored}
                except Exception as exc:  # noqa: BLE001 - surface any pipeline error to the user
                    st.session_state.pop("last_analysis", None)
                    st.error(f"Analysis failed: {exc}")

    result = st.session_state.get("last_analysis")
    if not result:
        return

    combined = result["combined"]
    scored = result["scored"]

    st.divider()
    _render_requirements(combined)
    st.divider()
    _render_sentiment(combined, scored)
    st.divider()
    _render_score(scored)
    st.divider()
    _render_shap(scored)


def _render_requirements(combined):
    st.markdown("### &#128203; Extracted Requirements", unsafe_allow_html=True)
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Location", ", ".join(combined.get("location") or []) or "—")
    c2.metric("Property Type", ", ".join(combined.get("property_type") or []) or "—")
    c3.metric("Budget", combined.get("budget") or "—")
    c4.metric("Amenities", ", ".join(combined.get("amenities") or []) or "—")


def _render_sentiment(combined, scored):
    st.markdown("### &#128172; Sentiment", unsafe_allow_html=True)
    left, right = st.columns([1, 2])

    sentiment = combined.get("sentiment", "unknown")
    confidence = float(combined.get("sentiment_confidence") or 0.0)
    reliability = scored.get("sentiment_reliability", "ok")

    with left:
        st.metric("Predicted sentiment", sentiment.capitalize())
        st.badge(
            f"Sentiment confidence: {reliability.upper()}",
            color=("red" if reliability == "low" else "green"),
        )
        if reliability == "low":
            st.caption("Confidence is below 0.5 (near-random for 3 classes) — weigh the score with caution.")

    with right:
        st.write(f"Confidence: **{confidence * 100:.1f}%**")
        st.progress(min(max(confidence, 0.0), 1.0))

        scores = combined.get("sentiment_scores") or {}
        if scores:
            scores_df = pd.DataFrame(
                {"sentiment": list(scores.keys()), "probability": list(scores.values())}
            )
            chart = (
                alt.Chart(scores_df)
                .mark_bar()
                .encode(
                    x=alt.X("probability:Q", title="Probability", scale=alt.Scale(domain=[0, 1])),
                    y=alt.Y("sentiment:N", sort="-x", title=None),
                    color=alt.Color("sentiment:N", legend=None),
                    tooltip=["sentiment", alt.Tooltip("probability:Q", format=".2%")],
                )
                .properties(height=140)
            )
            st.altair_chart(chart, width="stretch")


def _render_score(scored):
    st.markdown("### &#127919; Lead Score", unsafe_allow_html=True)
    score = scored["score"]
    tier = scored["tier"]
    color = TIER_COLORS.get(tier, "#6b7280")

    score_col, tier_col = st.columns([1, 1])
    with score_col:
        st.markdown(
            f"<div class='estateiq-score' style='color:{color};'>{score:.1f}</div>",
            unsafe_allow_html=True,
        )
        st.caption("out of 100")
    with tier_col:
        st.badge(tier.upper(), color=TIER_BADGE_COLOR.get(tier, "gray"))
        st.caption(
            f"Hot ≥ {TIER_THRESHOLDS['hot']} · Warm ≥ {TIER_THRESHOLDS['warm']} · Cold below {TIER_THRESHOLDS['warm']}"
        )

    with st.expander("Raw feature values used for scoring"):
        st.json(scored["features"])


def _render_shap(scored):
    st.markdown("### &#128269; What drove this score (SHAP)", unsafe_allow_html=True)
    shap_values = scored.get("shap_values") or {}
    if not shap_values:
        st.caption("No SHAP values available.")
        return

    shap_df = pd.DataFrame(
        {"feature": list(shap_values.keys()), "impact": list(shap_values.values())}
    )
    shap_df["direction"] = shap_df["impact"].apply(
        lambda v: "Increases score" if v >= 0 else "Decreases score"
    )
    shap_df = shap_df.sort_values("impact")

    chart = (
        alt.Chart(shap_df)
        .mark_bar()
        .encode(
            x=alt.X("impact:Q", title="SHAP value (impact on predicted score)"),
            y=alt.Y("feature:N", sort=None, title=None),
            color=alt.Color(
                "direction:N",
                scale=alt.Scale(
                    domain=["Increases score", "Decreases score"],
                    range=[TIER_COLORS["hot"], TIER_COLORS["cold"]],
                ),
                legend=alt.Legend(title=None),
            ),
            tooltip=["feature", alt.Tooltip("impact:Q", format=".3f")],
        )
        .properties(height=300)
    )
    st.altair_chart(chart, width="stretch")
    st.caption("Positive values pushed the score up; negative values pulled it down.")


def render_dashboard_page():
    st.subheader("Lead portfolio")
    st.caption("Sample of 10 recent leads scored by the EstateIQ pipeline.")

    df = pd.DataFrame(SAMPLE_LEADS)
    table_df = df.copy()
    table_df["transcript"] = table_df["transcript"].apply(
        lambda t: (t[:80] + "…") if len(t) > 80 else t
    )
    table_df = table_df.rename(
        columns={"transcript": "Transcript", "sentiment": "Sentiment", "score": "Score", "tier": "Tier"}
    )

    st.dataframe(
        table_df,
        width="stretch",
        hide_index=True,
        column_config={
            "Score": st.column_config.ProgressColumn("Score", min_value=0, max_value=100, format="%.1f"),
        },
    )

    st.divider()

    tier_counts = df["tier"].value_counts().reindex(TIER_ORDER).fillna(0).astype(int)
    tier_df = pd.DataFrame({"tier": [t.capitalize() for t in tier_counts.index], "count": tier_counts.values})
    tier_domain = [t.capitalize() for t in TIER_ORDER]
    tier_range = [TIER_COLORS[t] for t in TIER_ORDER]

    col1, col2 = st.columns(2)
    with col1:
        st.markdown("#### Tier distribution")
        pie = (
            alt.Chart(tier_df)
            .mark_arc(innerRadius=60)
            .encode(
                theta="count:Q",
                color=alt.Color("tier:N", scale=alt.Scale(domain=tier_domain, range=tier_range), legend=alt.Legend(title=None)),
                tooltip=["tier", "count"],
            )
        )
        st.altair_chart(pie, width="stretch")

    with col2:
        st.markdown("#### Lead counts by tier")
        bar = (
            alt.Chart(tier_df)
            .mark_bar()
            .encode(
                x=alt.X("tier:N", sort=tier_domain, title=None),
                y=alt.Y("count:Q", title="Leads"),
                color=alt.Color("tier:N", scale=alt.Scale(domain=tier_domain, range=tier_range), legend=None),
                tooltip=["tier", "count"],
            )
        )
        st.altair_chart(bar, width="stretch")


def main():
    inject_style()
    page = render_sidebar()
    render_header()

    if page == "Analyze Lead":
        render_analyze_page()
    else:
        render_dashboard_page()


if __name__ == "__main__":
    main()
