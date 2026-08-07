import re

with open('frontend/src/components/MemberDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. State variables
state_old = """  // Form states
  const [findings, setFindings] = useState('');
  const [assets, setAssets] = useState('');
  const [mitigations, setMitigations] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState([]);"""

state_new = """  // Form states
  const [findings, setFindings] = useState('');
  const [assets, setAssets] = useState('');
  const [mitigations, setMitigations] = useState('');
  
  // Alert form states
  const [ciiSector, setCiiSector] = useState('Aviation');
  const [sectorLeadName, setSectorLeadName] = useState('Statutory Board');
  const [affectedMemberStatus, setAffectedMemberStatus] = useState('No');
  const [affectedEnvironment, setAffectedEnvironment] = useState('CII');
  const [delayReason, setDelayReason] = useState('Pending patch testing');
  const [expectedVerificationDate, setExpectedVerificationDate] = useState('');
  const [patchStatus, setPatchStatus] = useState('Completed');
  const [mitigationMeasureIfNotPatched, setMitigationMeasureIfNotPatched] = useState('Protection Controls');
  const [iocTrafficDirection, setIocTrafficDirection] = useState('Inbound');
  const [followUpAction, setFollowUpAction] = useState('IOC Blocked');
  const [otherTypeOfAlert, setOtherTypeOfAlert] = useState('NIL');

  const [evidenceFiles, setEvidenceFiles] = useState([]);"""

content = content.replace(state_old, state_new)

# 2. Payload chunk
payload_old = """    const payload = {
      findings,
      affected_assets: assets.split(',').map(s => s.trim()).filter(Boolean),
      mitigation_measures: mitigations.split('\\n').map(s => s.trim()).filter(Boolean),
    };"""

payload_new = """    let payload = {};
    if (selectedIntel.type === 'Alert') {
      payload = {
        cii_sector: ciiSector,
        sector_lead_name: sectorLeadName,
        affected_member_status: affectedMemberStatus,
        affected_environment: affectedEnvironment,
        delay_reason: delayReason,
        expected_verification_date: expectedVerificationDate || null,
        patch_status: patchStatus,
        mitigation_measure_if_not_patched: mitigationMeasureIfNotPatched,
        ioc_traffic_direction: iocTrafficDirection,
        follow_up_action: followUpAction,
        other_type_of_alert: otherTypeOfAlert
      };
    } else {
      payload = {
        findings,
        affected_assets: assets.split(',').map(s => s.trim()).filter(Boolean),
        mitigation_measures: mitigations.split('\\n').map(s => s.trim()).filter(Boolean),
      };
    }"""

content = content.replace(payload_old, payload_new)

# 3. Reset chunk
reset_old = """      setFindings('');
      setAssets('');
      setMitigations('');
      setEvidenceFiles([]);"""

reset_new = """      setFindings('');
      setAssets('');
      setMitigations('');
      setCiiSector('Aviation');
      setSectorLeadName('Statutory Board');
      setAffectedMemberStatus('No');
      setAffectedEnvironment('CII');
      setDelayReason('Pending patch testing');
      setExpectedVerificationDate('');
      setPatchStatus('Completed');
      setMitigationMeasureIfNotPatched('Protection Controls');
      setIocTrafficDirection('Inbound');
      setFollowUpAction('IOC Blocked');
      setOtherTypeOfAlert('NIL');
      setEvidenceFiles([]);"""

content = content.replace(reset_old, reset_new)

with open('frontend/src/components/MemberDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
