const fs = require('fs');
let content = fs.readFileSync('backend/main.py', 'utf8');

const closeEndpoint = `
@router.post("/isac/submissions/{submission_id}/clarification/close", tags=["ISAC"])
def close_isac_clarification(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    """Analyst closes an ISAC clarification thread."""
    if current_user.organization.org_type != 'ACSAC':
        raise HTTPException(status_code=403, detail="Only ACSAC can close clarification threads.")
    
    sub = db.query(models.IsacSubmission).filter(models.IsacSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found.")
    
    sub.status = "CLOSED"
    db.commit()
    return {"message": "Thread closed."}
`;

const insertPoint = content.indexOf('@router.post("/isac/submissions/{submission_id}/clarification"');
content = content.substring(0, insertPoint) + closeEndpoint + '\n\n' + content.substring(insertPoint);
fs.writeFileSync('backend/main.py', content);
console.log('Added close endpoint to backend.');
