from typing import List, Dict, Any

class ReliefTriageEngine:
    """
    Multi-Criteria Decision Analysis (MCDA) Prioritization Engine
    Formula: Priority Score = (Damage Severity * w1) + (Vulnerability Index * w2) + (Access Obstruction * w3)
    """

    def __init__(self, w_damage=0.40, w_vuln=0.35, w_access=0.25):
        self.w_damage = w_damage
        self.w_vuln = w_vuln
        self.w_access = w_access

    def calculate_priority(self, damage_score: float, vuln_score: float, access_score: float) -> Dict[str, Any]:
        raw_score = (damage_score * self.w_damage) + (vuln_score * self.w_vuln) + (access_score * self.w_access)
        final_score = min(100.0, max(0.0, round(raw_score, 1)))

        if final_score >= 75:
            urgency_tier = "CRITICAL (Immediate Dispatch)"
            badge_color = "red"
        elif final_score >= 50:
            urgency_tier = "HIGH (Phase 1 Relief)"
            badge_color = "orange"
        elif final_score >= 30:
            urgency_tier = "MEDIUM (Phase 2 Relief)"
            badge_color = "yellow"
        else:
            urgency_tier = "LOW (Monitoring)"
            badge_color = "green"

        return {
            "priority_score": final_score,
            "urgency_tier": urgency_tier,
            "badge_color": badge_color,
            "formula_breakdown": {
                "damage_component": round(damage_score * self.w_damage, 1),
                "vulnerability_component": round(vuln_score * self.w_vuln, 1),
                "accessibility_component": round(access_score * self.w_access, 1),
                "weights_applied": {
                    "damage_weight": self.w_damage,
                    "vulnerability_weight": self.w_vuln,
                    "access_weight": self.w_access
                }
            }
        }

    def rank_sectors(self, sectors: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        for sec in sectors:
            res = self.calculate_priority(
                sec.get("damage_score", 50),
                sec.get("vulnerability_score", 50),
                sec.get("access_score", 50)
            )
            sec.update(res)
        
        # Sort by priority score descending
        return sorted(sectors, key=lambda x: x["priority_score"], reverse=True)

triage_engine = ReliefTriageEngine()
