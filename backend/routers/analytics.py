from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

import models
from database import get_db
from dependencies import get_current_user

router = APIRouter()

@router.get("/analytics/dashboard", tags=["Analytics"])
def get_analytics_dashboard(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Returns aggregated data for the analytics dashboard."""
    if user.organization.org_type != models.OrgType.acsac:
        raise HTTPException(status_code=403, detail="Only ACSAC users can view analytics.")

    # 1. Intel Type Distribution
    intel_types = db.query(models.ThreatIntel.type, func.count(models.ThreatIntel.id)).group_by(models.ThreatIntel.type).all()
    intel_type_data = [{"name": t.value if hasattr(t, 'value') else str(t), "value": c} for t, c in intel_types]

    # 2. SLA Compliance
    sla_data = []
    compliant_count = db.query(models.InvestigationResponse).filter(models.InvestigationResponse.sla_met == True).count()
    non_compliant_count = db.query(models.InvestigationResponse).filter(models.InvestigationResponse.sla_met == False).count()
    if compliant_count or non_compliant_count:
        sla_data = [
            {"name": "Compliant", "value": compliant_count},
            {"name": "Non-compliant", "value": non_compliant_count}
        ]

    # 3. Intel Volume Over Time (grouped by month)
    all_intel = db.query(models.ThreatIntel.published_at).all()
    volume_dict = {}
    for (pub_date,) in all_intel:
        if pub_date:
            month_str = pub_date.strftime("%Y-%m")
            volume_dict[month_str] = volume_dict.get(month_str, 0) + 1
    
    volume_data = [{"date": k, "count": v} for k, v in sorted(volume_dict.items())]

    # 4. Status Distribution: Alerts
    alert_status = db.query(models.ThreatIntel.status, func.count(models.ThreatIntel.id)).filter(models.ThreatIntel.type == models.IntelType.alert).group_by(models.ThreatIntel.status).all()
    alert_status_data = [{"name": s.value if hasattr(s, 'value') else str(s), "value": c} for s, c in alert_status]

    # 5. Status Distribution: Advisories
    advisory_status = db.query(models.ThreatIntel.status, func.count(models.ThreatIntel.id)).filter(models.ThreatIntel.type == models.IntelType.advisory).group_by(models.ThreatIntel.status).all()
    advisory_status_data = [{"name": s.value if hasattr(s, 'value') else str(s), "value": c} for s, c in advisory_status]

    return {
        "intelTypeDistribution": intel_type_data,
        "slaCompliance": sla_data,
        "volumeOverTime": volume_data,
        "alertStatusDistribution": alert_status_data,
        "advisoryStatusDistribution": advisory_status_data
    }
