"""
CES IT Infrastructure Lead Generator
A sales tool for cold calling IT infrastructure leads.
"""

import streamlit as st
import pandas as pd
import json
import os
import html
from datetime import datetime, date
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass
from mock_data import LEADS, INDUSTRIES, SIZES, IT_TYPES, CALL_STATUSES, SCRIPT_TEMPLATES

# ─── Page Config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="CES Lead Generator",
    page_icon="📞",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─── Authentication Gate ──────────────────────────────────────────────────────
APP_PASSWORD = os.getenv("APP_PASSWORD")
if APP_PASSWORD:
    if "authenticated" not in st.session_state:
        st.session_state.authenticated = False

    if not st.session_state.authenticated:
        st.title("CES Lead Generator · Login")
        st.markdown("Enter the app password to continue.")
        password = st.text_input("Password", type="password")
        if st.button("Login"):
            if password == APP_PASSWORD:
                st.session_state.authenticated = True
                st.rerun()
            else:
                st.error("Invalid password")
        st.stop()

# ─── Custom CSS ───────────────────────────────────────────────────────────────
st.markdown("""
<style>
    [data-testid="stSidebar"] { background-color: #0f1b2d; }
    [data-testid="stSidebar"] * { color: #e8eaf0 !important; }
    [data-testid="stSidebar"] .stRadio label { font-size: 16px; padding: 6px 0; }
    .stMetric { background: #f0f4ff; border-radius: 8px; padding: 12px; }
    .lead-card {
        border: 1px solid #dde3f0;
        border-radius: 10px;
        padding: 16px;
        margin-bottom: 12px;
        background: #fafbff;
    }
    .badge {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        margin-right: 6px;
    }
    .badge-cloud { background: #e0f0ff; color: #1565c0; }
    .badge-onprem { background: #fff3e0; color: #e65100; }
    .badge-hybrid { background: #e8f5e9; color: #2e7d32; }
    .script-box {
        background: #f8f9ff;
        border-left: 4px solid #3d5afe;
        padding: 16px;
        border-radius: 4px;
        margin-bottom: 16px;
        font-size: 15px;
        line-height: 1.7;
    }
    h1 { color: #1a237e; }
    h2 { color: #283593; }
    h3 { color: #3949ab; }
    .status-prospect { color: #6c757d; }
    .status-contacted { color: #0d6efd; }
    .status-qualified { color: #198754; }
    .stButton > button {
        border-radius: 6px;
        font-weight: 600;
    }
</style>
""", unsafe_allow_html=True)

# ─── Session State ─────────────────────────────────────────────────────────────
CALLS_FILE = os.getenv("CALL_LOG_PATH", os.path.join(os.path.dirname(__file__), "call_log.json"))

def load_call_log():
    if os.path.exists(CALLS_FILE):
        with open(CALLS_FILE) as f:
            return json.load(f)
    return []

def save_call_log(log):
    with open(CALLS_FILE, "w") as f:
        json.dump(log, f, indent=2, default=str)

if "call_log" not in st.session_state:
    st.session_state.call_log = load_call_log()

if "leads" not in st.session_state:
    st.session_state.leads = [dict(l) for l in LEADS]

if "selected_lead_id" not in st.session_state:
    st.session_state.selected_lead_id = None

# ─── Sidebar Navigation ────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("## 📞 CES Lead Generator")
    st.markdown("---")
    page = st.radio(
        "Navigate",
        ["🔍 Lead Discovery", "📝 Script Generator", "📊 Call Tracker"],
        label_visibility="collapsed",
    )
    st.markdown("---")

    # Quick stats
    total = len(st.session_state.leads)
    contacted = len([c for c in st.session_state.call_log])
    qualified = len([c for c in st.session_state.call_log if c.get("outcome") == "Qualified"])
    st.markdown(f"**Total Leads:** {total}")
    st.markdown(f"**Calls Logged:** {contacted}")
    st.markdown(f"**Qualified:** {qualified}")
    st.markdown("---")
    st.markdown("<small style='color:#8899aa'>Powered by CES · Demo Mode</small>", unsafe_allow_html=True)

# ═══════════════════════════════════════════════════════════════════════════════
# PAGE 1: LEAD DISCOVERY
# ═══════════════════════════════════════════════════════════════════════════════
if page == "🔍 Lead Discovery":
    st.title("🔍 Lead Discovery")
    st.markdown("Browse and filter IT infrastructure leads. Click **Generate Script** to build a cold call script for any lead.")

    # ── Filters ──
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        f_industry = st.multiselect("Industry", INDUSTRIES, placeholder="All industries")
    with col2:
        f_it_type = st.multiselect("IT Type", IT_TYPES, placeholder="All types")
    with col3:
        f_size = st.multiselect("Company Size", SIZES, placeholder="All sizes")
    with col4:
        f_search = st.text_input("🔎 Search company / contact")

    # ── Apply filters ──
    leads = st.session_state.leads
    if f_industry:
        leads = [l for l in leads if l["industry"] in f_industry]
    if f_it_type:
        leads = [l for l in leads if l["it_type"] in f_it_type]
    if f_size:
        leads = [l for l in leads if l["size"] in f_size]
    if f_search:
        q = html.escape(f_search.lower())
        leads = [l for l in leads if q in l["company"].lower() or q in l["contact_name"].lower()]

    st.markdown(f"**{len(leads)} leads found**")
    st.markdown("---")

    if not leads:
        st.info("No leads match your filters. Try adjusting the criteria above.")
    else:
        for lead in leads:
            badge_class = {
                "Cloud": "badge-cloud",
                "On-Premise": "badge-onprem",
                "Hybrid": "badge-hybrid",
            }.get(lead["it_type"], "badge-cloud")

            with st.container():
                st.markdown(f"""
                <div class="lead-card">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <strong style="font-size:17px;">{html.escape(lead['company'])}</strong>
                            &nbsp;<span class="badge {badge_class}">{html.escape(lead['it_type'])}</span>
                            &nbsp;<span class="badge" style="background:#f3e5f5;color:#6a1b9a;">{html.escape(lead['industry'])}</span>
                        </div>
                        <div style="color:#888; font-size:13px;">{html.escape(lead['location'])} · {html.escape(str(lead['employees']))} employees</div>
                    </div>
                    <div style="margin-top:8px; color:#444;">
                        👤 <strong>{html.escape(lead['contact_name'])}</strong> — {html.escape(lead['contact_title'])}<br>
                        📧 {html.escape(lead['contact_email'])} &nbsp;|&nbsp; 📱 {html.escape(lead['contact_phone'])}
                    </div>
                    <div style="margin-top:8px; color:#555; font-size:13px;">
                        <strong>Current Infra:</strong> {html.escape(lead['current_infra'])}
                    </div>
                    <div style="margin-top:4px; font-size:13px; color:#c62828;">
                        ⚠️ <strong>Pain Points:</strong> {html.escape(' · '.join(lead['pain_points']))}
                    </div>
                    <div style="margin-top:4px; font-size:13px; color:#555;">
                        💰 IT Budget: <strong>{html.escape(lead['annual_it_budget'])}</strong>
                    </div>
                </div>
                """, unsafe_allow_html=True)

                col_a, col_b, col_c = st.columns([2, 2, 6])
                with col_a:
                    if st.button(f"📝 Generate Script", key=f"script_{lead['id']}"):
                        st.session_state.selected_lead_id = lead["id"]
                        st.session_state["_nav"] = "📝 Script Generator"
                        st.rerun()
                with col_b:
                    if st.button(f"📞 Log Call", key=f"log_{lead['id']}"):
                        st.session_state.selected_lead_id = lead["id"]
                        st.session_state["_nav"] = "📊 Call Tracker"
                        st.rerun()

    # Handle nav redirect
    if "_nav" in st.session_state:
        nav = st.session_state.pop("_nav")
        # Note: Streamlit doesn't allow programmatic radio change easily;
        # user will see a prompt to switch tab
        st.info(f"➡️ Now head to **{nav}** in the sidebar to continue.")


# ═══════════════════════════════════════════════════════════════════════════════
# PAGE 2: SCRIPT GENERATOR
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "📝 Script Generator":
    st.title("📝 Cold Call Script Generator")
    st.markdown("Select a lead to instantly generate a tailored cold call script based on their IT environment and pain points.")

    # Lead selector
    lead_options = {f"{l['company']} — {l['contact_name']}": l["id"] for l in st.session_state.leads}

    # Pre-select if coming from Lead Discovery
    default_idx = 0
    if st.session_state.selected_lead_id:
        ids = list(lead_options.values())
        if st.session_state.selected_lead_id in ids:
            default_idx = ids.index(st.session_state.selected_lead_id)

    selected_label = st.selectbox("Select Lead", list(lead_options.keys()), index=default_idx)
    selected_id = lead_options[selected_label]
    lead = next(l for l in st.session_state.leads if l["id"] == selected_id)

    st.markdown("---")

    # Company snapshot
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Company", lead["company"])
    col2.metric("IT Type", lead["it_type"])
    col3.metric("Industry", lead["industry"])
    col4.metric("IT Budget", lead["annual_it_budget"])

    st.markdown("---")

    # Generate script
    template = SCRIPT_TEMPLATES.get(lead["it_type"], SCRIPT_TEMPLATES["Hybrid"])
    pain_points = lead["pain_points"]

    def fill(text):
        return text.format(
            company=lead["company"],
            industry=lead["industry"],
            contact_name=lead["contact_name"].split()[0],  # first name
            pain_1=pain_points[0] if len(pain_points) > 0 else "infrastructure complexity",
            pain_2=pain_points[1] if len(pain_points) > 1 else "rising costs",
        )

    st.subheader(f"📞 Script for {lead['contact_name']} at {lead['company']}")
    st.caption(f"{lead['contact_title']} · {lead['contact_phone']} · {lead['contact_email']}")

    sections = [
        ("🎯 Opening Hook", fill(template["hook"])),
        ("❓ Pain Point Discovery", fill(template["pain"])),
        ("💡 Value Proposition", fill(template["value"])),
        ("🛡️ Handling Objections", fill(template["objection"])),
        ("📅 Call to Action", fill(template["cta"])),
    ]

    for title, content in sections:
        st.markdown(f"**{title}**")
        st.markdown(f'<div class="script-box">{html.escape(content)}</div>', unsafe_allow_html=True)

    # Objection quick-reference
    with st.expander("💬 Common Objections — Quick Responses"):
        objections = {
            "\"We're happy with our current vendor.\"": "That's great to hear — we actually work alongside existing vendors a lot. I'm not asking you to switch anything today; I just want to show you what a second set of eyes on your infrastructure might reveal.",
            "\"We don't have budget right now.\"": "Understood — timing matters. Most of our clients found that our assessment actually helped them redirect existing budget more efficiently. No investment needed for the first step.",
            "\"Send me an email.\"": f"Absolutely, I'll send something over right after this call. To make sure it's relevant, can I just ask — is {pain_points[0].lower()} something you're actively looking to address?",
            "\"We handle everything in-house.\"": "Respect for that — internal IT teams are great for day-to-day. Where we typically add value is in the areas that are hard to staff for: 24/7 monitoring, compliance audits, and disaster recovery planning.",
            "\"Not interested.\"": "No problem at all. Could I ask — is the timing not right, or is infrastructure services not something on the roadmap? Just helps me understand so I don't bother you with the wrong things.",
        }
        for obj, response in objections.items():
            st.markdown(f"**{obj}**")
            st.markdown(f"> {response}")
            st.markdown("")

    # Copy/export
    full_script = "\n\n".join([f"--- {t} ---\n{c}" for t, c in sections])
    st.download_button(
        "⬇️ Download Script as .txt",
        data=full_script,
        file_name=f"script_{lead['company'].replace(' ', '_')}.txt",
        mime="text/plain",
    )


# ═══════════════════════════════════════════════════════════════════════════════
# PAGE 3: CALL TRACKER
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "📊 Call Tracker":
    st.title("📊 Call Tracker")
    st.markdown("Log your call outcomes, set follow-ups, and track your pipeline.")

    # ── Log a Call ──
    with st.expander("➕ Log a New Call", expanded=(st.session_state.selected_lead_id is not None)):
        lead_options = {f"{l['company']} — {l['contact_name']}": l["id"] for l in st.session_state.leads}

        default_idx = 0
        if st.session_state.selected_lead_id:
            ids = list(lead_options.values())
            if st.session_state.selected_lead_id in ids:
                default_idx = ids.index(st.session_state.selected_lead_id)

        col1, col2 = st.columns(2)
        with col1:
            log_lead_label = st.selectbox("Lead", list(lead_options.keys()), index=default_idx, key="log_lead")
            log_date = st.date_input("Call Date", value=date.today(), key="log_date")
            log_outcome = st.selectbox("Outcome", CALL_STATUSES, key="log_outcome")
        with col2:
            log_notes = st.text_area("Notes", placeholder="What was discussed? Key objections? Next steps?", key="log_notes")
            log_followup = st.date_input("Follow-up Date (optional)", value=None, key="log_followup")

        if st.button("✅ Save Call Log", type="primary"):
            lead_id = lead_options[log_lead_label]
            lead = next(l for l in st.session_state.leads if l["id"] == lead_id)
            entry = {
                "id": len(st.session_state.call_log) + 1,
                "lead_id": lead_id,
                "company": lead["company"],
                "contact_name": lead["contact_name"],
                "contact_title": lead["contact_title"],
                "date": str(log_date),
                "outcome": log_outcome,
                "notes": html.escape(log_notes) if log_notes else "",
                "follow_up": str(log_followup) if log_followup else None,
            }
            st.session_state.call_log.append(entry)
            save_call_log(st.session_state.call_log)
            st.session_state.selected_lead_id = None
            st.success(f"Call logged for {lead['company']}!")
            st.rerun()

    st.markdown("---")

    if not st.session_state.call_log:
        st.info("No calls logged yet. Log your first call above.")
    else:
        # ── Pipeline Summary ──
        st.subheader("📈 Pipeline Overview")
        pipeline_counts = {}
        for status in CALL_STATUSES:
            count = len([c for c in st.session_state.call_log if c.get("outcome") == status])
            pipeline_counts[status] = count

        cols = st.columns(len(CALL_STATUSES))
        colors = ["#90a4ae","#42a5f5","#ffb74d","#ab47bc","#26a69a","#ef5350","#66bb6a"]
        for i, (status, count) in enumerate(pipeline_counts.items()):
            cols[i].metric(status, count)

        st.markdown("---")

        # ── Filters ──
        col1, col2 = st.columns(2)
        with col1:
            filter_outcome = st.multiselect("Filter by Outcome", CALL_STATUSES, placeholder="All outcomes")
        with col2:
            filter_company = st.text_input("🔎 Search company")

        logs = st.session_state.call_log
        if filter_outcome:
            logs = [l for l in logs if l.get("outcome") in filter_outcome]
        if filter_company:
            logs = [l for l in logs if filter_company.lower() in l["company"].lower()]

        # ── Follow-ups Due ──
        today_str = str(date.today())
        due = [l for l in st.session_state.call_log if l.get("follow_up") and l["follow_up"] <= today_str]
        if due:
            st.warning(f"⏰ **{len(due)} follow-up(s) due today or overdue:**")
            for d in due:
                st.markdown(f"- **{d['company']}** ({d['contact_name']}) — due {d['follow_up']}")
            st.markdown("---")

        # ── Call Log Table ──
        st.subheader(f"📋 Call Log ({len(logs)} entries)")

        df = pd.DataFrame(logs)
        if not df.empty:
            display_cols = ["date", "company", "contact_name", "contact_title", "outcome", "notes", "follow_up"]
            df_display = df[[c for c in display_cols if c in df.columns]].copy()
            df_display.columns = ["Date", "Company", "Contact", "Title", "Outcome", "Notes", "Follow-up"]
            df_display = df_display.sort_values("Date", ascending=False)
            st.dataframe(df_display, use_container_width=True, hide_index=True)

        # ── Export ──
        if not df.empty:
            csv = df_display.to_csv(index=False)
            st.download_button(
                "⬇️ Export Call Log as CSV",
                data=csv,
                file_name=f"call_log_{date.today()}.csv",
                mime="text/csv",
            )

        # ── Delete entry ──
        with st.expander("🗑️ Delete a Call Entry"):
            if st.session_state.call_log:
                entry_labels = {
                    f"#{e['id']} — {e['company']} ({e['date']})": e["id"]
                    for e in st.session_state.call_log
                }
                del_label = st.selectbox("Select entry to delete", list(entry_labels.keys()))
                if st.button("Delete Entry", type="secondary"):
                    del_id = entry_labels[del_label]
                    st.session_state.call_log = [e for e in st.session_state.call_log if e["id"] != del_id]
                    save_call_log(st.session_state.call_log)
                    st.success("Entry deleted.")
                    st.rerun()
