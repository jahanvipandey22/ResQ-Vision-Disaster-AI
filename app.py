import os
import json
import time
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from ml_engine import ai_engine
from triage_engine import triage_engine

app = Flask(__name__, template_folder="templates", static_folder="static")
CORS(app)

# Load base mock scenario
SCENARIO_PATH = os.path.join(app.static_folder, "data", "scenario_flood_2026.json")

def load_scenario():
    with open(SCENARIO_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    # Re-rank sectors through triage algorithm
    data["sectors"] = triage_engine.rank_sectors(data["sectors"])
    return data

scenario_state = load_scenario()

# In-memory Human-in-the-Loop Audit Log
hitl_audit_log = [
    {
        "id": "AUDIT-101",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(time.time() - 3600)),
        "officer": "Cmdr. Rajesh Kumar (NDRF 03 Bn)",
        "sector_id": "SEC-A1",
        "action": "APPROVED_DISPATCH",
        "notes": "Verified high distress call near Sector 4 CHC. Dispatched 2 inflatable boat units with paramedic kit."
    },
    {
        "id": "AUDIT-102",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(time.time() - 1800)),
        "officer": "Insp. Priya Sharma (SDMA)",
        "sector_id": "SEC-A2",
        "action": "RECLASSIFIED_HAZARD",
        "notes": "Electric department informed for power line isolation. Priority raised to Critical."
    }
]

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/scenario", methods=["GET"])
def get_scenario():
    global scenario_state
    scenario_state["sectors"] = triage_engine.rank_sectors(scenario_state["sectors"])
    return jsonify(scenario_state)

@app.route("/api/analyze-imagery", methods=["POST"])
def analyze_imagery():
    data = request.get_json() or {}
    results = ai_engine.analyze_imagery(data)
    return jsonify(results)

@app.route("/api/triage/recalculate", methods=["POST"])
def recalculate_triage():
    params = request.get_json() or {}
    w_damage = float(params.get("w_damage", 0.40))
    w_vuln = float(params.get("w_vuln", 0.35))
    w_access = float(params.get("w_access", 0.25))

    triage_engine.w_damage = w_damage
    triage_engine.w_vuln = w_vuln
    triage_engine.w_access = w_access

    global scenario_state
    scenario_state["sectors"] = triage_engine.rank_sectors(scenario_state["sectors"])
    return jsonify({
        "status": "SUCCESS",
        "weights": {"damage": w_damage, "vuln": w_vuln, "access": w_access},
        "ranked_sectors": scenario_state["sectors"]
    })

@app.route("/api/dispatch", methods=["POST"])
def dispatch_rescue():
    data = request.get_json() or {}
    sector_id = data.get("sector_id")
    unit_name = data.get("unit_name", "NDRF Alpha Quick-Response Team")
    officer = data.get("officer", "Duty Officer (Control Room)")

    global scenario_state
    target_sec = None
    for sec in scenario_state["sectors"]:
        if sec["id"] == sector_id:
            sec["rescue_status"] = "DISPATCHED_ACTIVE"
            target_sec = sec
            break

    if target_sec:
        # Append to audit log
        audit_entry = {
            "id": f"AUDIT-{int(time.time()) % 10000}",
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "officer": officer,
            "sector_id": sector_id,
            "action": "DISPATCH_EXECUTED",
            "notes": f"Dispatched {unit_name} to {target_sec['name']} (Priority Score: {target_sec['priority_score']})."
        }
        hitl_audit_log.insert(0, audit_entry)
        return jsonify({"status": "SUCCESS", "message": f"Rescue Unit successfully dispatched to {target_sec['name']}!", "audit": audit_entry})

    return jsonify({"status": "ERROR", "message": "Sector not found"}), 404

@app.route("/api/hitl/verify", methods=["POST"])
def hitl_verify():
    data = request.get_json() or {}
    sector_id = data.get("sector_id")
    action = data.get("action", "VERIFIED")
    notes = data.get("notes", "Field officer verified findings.")
    officer = data.get("officer", "Field Inspector (On-Ground)")

    entry = {
        "id": f"AUDIT-{int(time.time()) % 10000}",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "officer": officer,
        "sector_id": sector_id,
        "action": action,
        "notes": notes
    }
    hitl_audit_log.insert(0, entry)
    return jsonify({"status": "SUCCESS", "audit_entry": entry})

@app.route("/api/audit-log", methods=["GET"])
def get_audit_log():
    return jsonify(hitl_audit_log)

if __name__ == "__main__":
    print("===================================================================")
    print("ResQ-Vision AI: Autonomous Post-Disaster Mapping & Triage Platform")
    print("Team: Girls Who Master | Problem ID: SOAIDEATHON-S34")
    print("Local Server: http://127.0.0.1:5000")
    print("===================================================================")
    app.run(host="0.0.0.0", port=5000, debug=True)
