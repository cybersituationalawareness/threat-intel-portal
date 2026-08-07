import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../AuthContext';

/**
 * IntelForm
 * ---------
 * Right panel: the Intel Submission form. Handles all 13 data fields with
 * client-side validation before POSTing to the backend API.
 *
 * UX decisions:
 *   - Chip inputs (Enter/comma to add, × to remove) for tags & sector_relevance.
 *   - Textarea (one line = one action) for recommended_actions, split on newline.
 *   - Validation errors display inline beneath the offending field.
 *   - Success banner auto-dismisses after 4 seconds; form resets on success.
 *   - Form id="intel-creation-form" links the submit button (outside the <form>)
 *     via the HTML `form` attribute so it lives in the sticky footer.
 */

// ── ChipInput ──────────────────────────────────────────────────────────────
/**
 * Reusable chip/tag input. Press Enter or comma to commit a chip.
 * Press Backspace on empty input to remove the last chip.
 */
function ChipInput({ id, value, onChange, placeholder }) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  const commit = (text) => {
    const trimmed = text.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setDraft('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div
      className="chip-input-wrapper"
      onClick={() => inputRef.current?.focus()}
      role="group"
      aria-label={placeholder}
    >
      {value.map((chip, i) => (
        <span key={i} className="chip">
          {chip}
          <button
            type="button"
            className="chip-remove"
            aria-label={`Remove ${chip}`}
            onClick={(e) => { e.stopPropagation(); onChange(value.filter((_, idx) => idx !== i)); }}
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        type="text"
        className="chip-text-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (draft.trim()) commit(draft); }}
        placeholder={value.length === 0 ? placeholder : ''}
        aria-label={placeholder}
      />
    </div>
  );
}

// ── Form defaults ──────────────────────────────────────────────────────────
const DEFAULT_FORM = {
  type:                 'Alert',
  title:                '',
  case_id:              '',
  description:          '',
  threat_data:          '',
  tlp:                  'Amber',
  confidence:           'Medium',
  tags:                 [],
  classification:       'National',
  category:             'Indicators of Compromise',
  others_text:          '',
  category_others_text: '',
  target_org_id:        'ALL',
  has_sla:              '',
  sla_value:            '',
  sla_unit:             '',
};

// ── Helper to normalize initial data when editing ──────────────────────────
const getInitialFormState = (data) => {
  if (!data) return DEFAULT_FORM;
  const standardClassifications = [
    'National', 'SIEM', 'Threat Intel', 'Digital Threat Monitoring',
    'Attack Surface Management', 'Risk Rating', 'ISAC', 'Shared Insights', 'Others'
  ];
  let classification = data.classification || 'National';
  let others_text = '';
  if (!standardClassifications.includes(classification)) {
    if (classification.startsWith('Others - ')) {
      others_text = classification.replace(/^Others\s*-\s*/, '');
    } else {
      others_text = classification;
    }
    classification = 'Others';
  }

  const standardCategories = [
    'Indicators of Compromise', 'Exploited Vulnerabilities', 'Campaign',
    'Threat Hunt Package', 'RFI', 'Other'
  ];
  let category = data.category || 'Indicators of Compromise';
  let category_others_text = '';
  if (!standardCategories.includes(category)) {
    if (category.startsWith('Other - ')) {
      category_others_text = category.replace(/^Other\s*-\s*/, '');
    } else {
      category_others_text = category;
    }
    category = 'Other';
  }

  return {
    ...DEFAULT_FORM,
    ...data,
    target_org_id: data.target_org_id || 'ALL',
    classification,
    category,
    others_text,
    category_others_text,
    has_sla: data.has_sla !== undefined && data.has_sla !== null ? data.has_sla : '',
    sla_value: data.sla_value !== undefined && data.sla_value !== null ? data.sla_value : '',
    sla_unit: data.sla_unit || '',
    tags: data.tags || [],
  };
};

// ── IntelForm ──────────────────────────────────────────────────────────────

function IntelForm({ apiBase = '', onIntelCreated, useAuthFetch = false, onCancel, onClose, onSuccess, initialData, currentUser }) {
  const [form, setForm]               = useState(() => getInitialFormState(initialData));
  const [errors, setErrors]           = useState({});
  const [submitting, setSubmitting]   = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // null | 'success' | 'error'
  const [submitMsg, setSubmitMsg]     = useState('');
  const [memberOrgs, setMemberOrgs]   = useState([]);
  const submitActionRef = useRef('OPEN');
  const { authFetch } = useAuth();

  useEffect(() => {
    if (initialData) {
      setForm(getInitialFormState(initialData));
    }
  }, [initialData]);

  useEffect(() => {
    // Fetch organizations
    const fetchFunc = (useAuthFetch || onSuccess) ? authFetch : fetch;
    let orgUrl = (useAuthFetch || onSuccess) ? '/api/v1/organizations' : `${apiBase}/api/v1/organizations`;
    fetchFunc(orgUrl)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMemberOrgs(data.filter(org => org.org_type === 'MEMBER'));
        }
      })
      .catch(err => console.error('Failed to fetch organizations:', err));

    const fetchNextCaseId = () => {
      const fetchFunc = (useAuthFetch || onSuccess) ? authFetch : fetch;
      let url = (useAuthFetch || onSuccess) ? '/api/v1/intel/next-case-id' : `${apiBase}/api/v1/intel/next-case-id`;
      fetchFunc(url)
        .then(res => res.json())
        .then(data => {
          if (data && data.next_case_id) {
            setForm(prev => ({ ...prev, case_id: data.next_case_id }));
          }
        })
        .catch(err => console.error('Failed to fetch next case ID:', err));
    };

    if (!initialData) {
      fetchNextCaseId();
    }
  }, [initialData, apiBase, useAuthFetch, onSuccess, authFetch]);

  // Generic field updater; clears field-level error on edit
  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  // ── Client-side validation ───────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.title || form.title.trim().length < 3)
      errs.title = 'Title must be at least 3 characters';
    if (!form.case_id || form.case_id.trim().length === 0)
      errs.case_id = 'A&A ID is required';
    if (!form.description || form.description.trim().length === 0)
      errs.description = 'Description is required';
    if (!form.threat_data || form.threat_data.trim().length === 0)
      errs.threat_data = 'Threat data is required';
    if (!form.target_org_id)
      errs.target_org_id = 'Target Member is required';
    if (form.has_sla === '' || form.has_sla === null || form.has_sla === undefined)
      errs.has_sla = 'SLA presence is required';
    if (form.has_sla === true) {
      if (form.sla_value === '' || form.sla_value === null || form.sla_value === undefined)
        errs.sla_value = 'SLA duration is required';
      if (!form.sla_unit || form.sla_unit === '')
        errs.sla_unit = 'SLA unit is required';
    }
    return errs;
  };

  // ── Submit handler ───────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setSubmitStatus('error');
      const firstErrKey = Object.keys(errs)[0];
      setSubmitMsg(errs[firstErrKey] || 'Please fix the validation errors before submitting.');
      setTimeout(() => setSubmitStatus(null), 4500);
      return;
    }

    setSubmitting(true);
    setSubmitStatus(null);

    const payload = {
      type:                 form.type,
      title:                form.title.trim(),
      case_id:              form.case_id.trim(),
      description:          form.description.trim(),
      threat_data:          form.threat_data.trim(),
      tlp:                  form.tlp,
      confidence:           form.confidence,
      tags:                 form.tags,
      classification:       form.classification === 'Others' && form.others_text?.trim() ? `Others - ${form.others_text.trim()}` : form.classification,
      category:             form.category === 'Other' && form.category_others_text?.trim() ? `Other - ${form.category_others_text.trim()}` : (form.category || 'Indicators of Compromise'),
      target_org_id:        (form.target_org_id && form.target_org_id !== 'ALL') ? form.target_org_id : null,
      has_sla:              form.has_sla,
      sla_value:            form.has_sla ? form.sla_value : null,
      sla_unit:             form.has_sla ? form.sla_unit : null,
      status:               submitActionRef.current,
    };

    try {
      const isEdit = !!initialData;
      const fetchFunc = (useAuthFetch || onSuccess) ? authFetch : fetch;
      let url = (useAuthFetch || onSuccess) ? '/api/v1/intel' : `${apiBase}/api/v1/intel`;
      if (isEdit) url += `/${initialData.id}`;
      
      const res = await fetchFunc(url, {
        method:  isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // Surface the first Pydantic validation error if present
        const detail =
          Array.isArray(err.detail)
            ? err.detail.map((e) => e.msg).join('; ')
            : err.detail || `HTTP ${res.status}`;
        throw new Error(detail);
      }
      
      const createdIntel = await res.json();

      if (form.files && form.files.length > 0) {
        const formData = new FormData();
        form.files.forEach(f => formData.append("files", f));
        
        const uploadRes = await fetchFunc(`/api/v1/intel/${createdIntel.id}/attachment`, {
          method: 'POST',
          body: formData
        });
        if (!uploadRes.ok) {
           console.error("Failed to upload attachment(s)");
        }
      }

      setSubmitStatus('success');
      setSubmitMsg(isEdit ? 'Intelligence entry updated.' : 'Intelligence entry submitted and published.');
      setForm(DEFAULT_FORM);
      setErrors({});
      if (!isEdit) {
        const fetchFunc = (useAuthFetch || onSuccess) ? authFetch : fetch;
        let url = (useAuthFetch || onSuccess) ? '/api/v1/intel/next-case-id' : `${apiBase}/api/v1/intel/next-case-id`;
        fetchFunc(url)
          .then(res => res.json())
          .then(data => {
            if (data && data.next_case_id) {
              setForm(prev => ({ ...DEFAULT_FORM, case_id: data.next_case_id }));
            }
          })
          .catch(() => {});
      }
      if (onIntelCreated) onIntelCreated();
      if (onSuccess) onSuccess();
      setTimeout(() => setSubmitStatus(null), 4500);
    } catch (err) {
      setSubmitStatus('error');
      setSubmitMsg(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <section className="form-panel" aria-label="Intel Submission Panel">
      {/* Panel header */}
      <div className="form-panel-header">
        <div className="form-panel-title">{initialData ? 'Edit Alert or Advisory' : 'Alert or Advisory Creation Form'}</div>
        <div className="form-panel-sub">{initialData ? 'Modify an existing alert or advisory' : 'Create and publish a new alert or advisory'}</div>
      </div>

      {/* Form — id is linked to the submit button via form attr */}
      <form
        id="intel-creation-form"
        className="form-body"
        onSubmit={handleSubmit}
        noValidate
        aria-label="Threat intelligence creation form"
      >
        {/* ── Classification & Type ──────────────────────────────── */}
        <div className="form-section-label">Classification</div>

        <div className="form-row">
          <div className="field-group">
            <label htmlFor="intel-type" className="field-label">
              Type <span className="field-required">*</span>
            </label>
            <select
              id="intel-type"
              className="field-select"
              value={form.type}
              onChange={(e) => setField('type', e.target.value)}
            >
              <option value="Alert">⚠ Alert</option>
              <option value="Advisory">📋 Advisory</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="intel-classification" className="field-label">
              Source
            </label>
            <select
              id="intel-classification"
              className="field-select"
              value={form.classification}
              onChange={(e) => setField('classification', e.target.value)}
            >
              <option value="National">National</option>
              <option value="SIEM">SIEM</option>
              <option value="Threat Intel">Threat Intel</option>
              <option value="Digital Threat Monitoring">Digital Threat Monitoring</option>
              <option value="Attack Surface Management">Attack Surface Management</option>
              <option value="Risk Rating">Risk Rating</option>
              <option value="ISAC">ISAC</option>
              <option value="Shared Insights">Shared Insights</option>
              <option value="Others">Others</option>
            </select>
            {form.classification === 'Others' && (
              <input
                type="text"
                className="field-input"
                style={{ marginTop: '10px' }}
                placeholder="Optional text for Others..."
                value={form.others_text || ''}
                onChange={(e) => setField('others_text', e.target.value)}
              />
            )}
          </div>

          <div className="field-group">
            <label htmlFor="intel-category" className="field-label">
              Category
            </label>
            <select
              id="intel-category"
              className="field-select"
              value={form.category || 'Indicators of Compromise'}
              onChange={(e) => setField('category', e.target.value)}
            >
              <option value="Indicators of Compromise">Indicators of Compromise</option>
              <option value="Exploited Vulnerabilities">Exploited Vulnerabilities</option>
              <option value="Campaign">Campaign</option>
              <option value="Threat Hunt Package">Threat Hunt Package</option>
              <option value="RFI">RFI</option>
              <option value="Other">Other</option>
            </select>
            {form.category === 'Other' && (
              <input
                type="text"
                className="field-input"
                style={{ marginTop: '8px' }}
                placeholder="Optional text for Other..."
                value={form.category_others_text || ''}
                onChange={(e) => setField('category_others_text', e.target.value)}
              />
            )}
          </div>

          <div className="field-group">
            <label htmlFor="intel-target-org" className="field-label">
              Target Member
            </label>
            <select
              id="intel-target-org"
              className="field-select"
              value={form.target_org_id || 'ALL'}
              onChange={(e) => setField('target_org_id', e.target.value)}
            >
              <option value="ALL">All Member</option>
              {memberOrgs.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
            {errors.target_org_id && <div className="field-error" style={{ color: 'var(--alert-color)', fontSize: '12px', marginTop: '5px' }}>{errors.target_org_id}</div>}
          </div>
        </div>

        {/* ── Core Intel Content ─────────────────────────────────── */}
        <div className="form-section-label">Intel Content</div>

        <div className="form-row full">
          <div className="field-group">
            <label htmlFor="intel-title" className="field-label">
              Title <span className="field-required">*</span>
            </label>
            <input
              id="intel-title"
              className={`field-input ${errors.title ? 'error' : ''}`}
              type="text"
              placeholder="e.g. Critical RCE in Edge Gateway"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
            />
            {errors.title && <div className="field-error">{errors.title}</div>}
          </div>
        </div>

        <div className="form-row full">
          <div className="field-group">
            <label htmlFor="intel-case_id" className="field-label">
              A&amp;A ID <span className="field-required">*</span>
            </label>
            <input
              id="intel-case_id"
              className="field-input"
              type="text"
              disabled
              readOnly
              style={{ opacity: 0.75, cursor: 'not-allowed', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
              title="A&amp;A ID is system generated and cannot be modified"
              placeholder="Generating A&amp;A ID..."
              value={form.case_id}
            />
          </div>
        </div>

        <div className="form-row full">
          <div className="field-group">
            <label htmlFor="intel-description" className="field-label">
              Description <span className="field-required">*</span>
            </label>
            <textarea
              id="intel-description"
              className={`field-textarea ${errors.description ? 'error' : ''}`}
              placeholder="Description of the issue..."
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
            />
            {errors.description && <div className="field-error">{errors.description}</div>}
          </div>
        </div>

        <div className="form-row full">
          <div className="field-group">
            <label htmlFor="intel-threat_data" className="field-label">
              Threat Data <span className="field-required">*</span>
            </label>
            <textarea
              id="intel-threat_data"
              className={`field-textarea ${errors.threat_data ? 'error' : ''}`}
              style={{ minHeight: '120px' }}
              placeholder="Indicator of Compromises (IOCs)"
              value={form.threat_data}
              onChange={(e) => setField('threat_data', e.target.value)}
            />
            {errors.threat_data && <div className="field-error">{errors.threat_data}</div>}
          </div>
        </div>

        {/* ── Metadata ───────────────────────────────────────────── */}
        <div className="form-section-label">Metadata</div>

        <div className="form-row thirds">
          <div className="field-group">
            <label htmlFor="intel-tlp" className="field-label">
              TLP <span className="field-required">*</span>
            </label>
            <select
              id="intel-tlp"
              className="field-select"
              value={form.tlp}
              onChange={(e) => setField('tlp', e.target.value)}
            >
              <option value="Red">🔴 Red</option>
              <option value="Amber+Strict">🟠 Amber+Strict</option>
              <option value="Amber">🟡 Amber</option>
              <option value="Green">🟢 Green</option>
              <option value="Clear">⚪ Clear</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="intel-confidence" className="field-label">
              Confidence <span className="field-required">*</span>
            </label>
            <select
              id="intel-confidence"
              className="field-select"
              value={form.confidence}
              onChange={(e) => setField('confidence', e.target.value)}
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        <div className="form-row thirds">
          <div className="field-group">
            <label htmlFor="intel-has_sla" className="field-label">
              Is there SLA ? <span className="field-required">*</span>
            </label>
            <select
              id="intel-has_sla"
              className={`field-select ${errors.has_sla ? 'error' : ''}`}
              value={form.has_sla === '' ? '' : (form.has_sla ? 'Yes' : 'No')}
              onChange={(e) => setField('has_sla', e.target.value === '' ? '' : e.target.value === 'Yes')}
            >
              <option value="" disabled hidden>Select...</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
            {errors.has_sla && (
              <div className="field-error">{errors.has_sla}</div>
            )}
          </div>

          {form.has_sla === true && (
            <>
              <div className="field-group">
                <label htmlFor="intel-sla_value" className="field-label">
                  SLA Duration <span className="field-required">*</span>
                </label>
                <select
                  id="intel-sla_value"
                  className={`field-select ${errors.sla_value ? 'error' : ''}`}
                  value={form.sla_value}
                  onChange={(e) => setField('sla_value', e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                >
                  <option value="" disabled hidden>Select...</option>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
                {errors.sla_value && <div className="field-error">{errors.sla_value}</div>}
              </div>
              <div className="field-group">
                <label htmlFor="intel-sla_unit" className="field-label">
                  SLA Unit <span className="field-required">*</span>
                </label>
                <select
                  id="intel-sla_unit"
                  className={`field-select ${errors.sla_unit ? 'error' : ''}`}
                  value={form.sla_unit}
                  onChange={(e) => setField('sla_unit', e.target.value)}
                >
                  <option value="" disabled hidden>Select...</option>
                  <option value="day">day</option>
                  <option value="week">week</option>
                  <option value="month">month</option>
                </select>
                {errors.sla_unit && <div className="field-error">{errors.sla_unit}</div>}
              </div>
            </>
          )}
        </div>

        {/* ── Targeting ──────────────────────────────────────────── */}
        <div className="form-section-label">Targeting &amp; Tags</div>

        <div className="form-row full">
          <div className="field-group">
            <label htmlFor="intel-tags" className="field-label">
              Tags
            </label>
            <ChipInput
              id="intel-tags"
              value={form.tags}
              onChange={(chips) => setField('tags', chips)}
              placeholder="E.g. APT29, Phishing, Log4Shell"
            />
          </div>
        </div>
        <div className="form-section-label">Attachments</div>
        <div className="form-row full">
          <div className="field-group">
            <label htmlFor="intel-file" className="field-label">
              Upload Files
            </label>
            <input
              id="intel-file"
              type="file"
              multiple
              className="field-input"
              onChange={(e) => setField('files', Array.from(e.target.files))}
            />
          </div>
        </div>

      </form>

      {/* ── Sticky footer with submit ──────────────────────────────── */}
      <div className="form-footer">
        {submitStatus && (
          <div className={`alert-banner ${submitStatus}`} role="alert">
            {submitStatus === 'success' ? '✓' : '⚠'} {submitMsg}
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <button type="button" className="submit-btn" style={{ flex: 1, backgroundColor: 'transparent', border: '1px solid var(--border-color)' }} onClick={onClose || onCancel}>
            Cancel
          </button>
          
          <button
            type="submit"
            form="intel-creation-form"
            className="submit-btn"
            style={{ flex: 1, backgroundColor: 'var(--bg-lighter)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}
            disabled={submitting}
            onClick={() => submitActionRef.current = initialData?.status || 'DRAFT'}
          >
            {submitting ? 'SAVING...' : (initialData ? 'SAVE' : 'SAVE DRAFT')}
          </button>

          {(!currentUser || currentUser.role === 'ANALYST') && (
            <button
              type="submit"
              form="intel-creation-form"
              className="submit-btn"
              style={{ flex: 1, backgroundColor: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe', border: '1px solid #a855f7' }}
              disabled={submitting}
              onClick={() => submitActionRef.current = 'PENDING_REVIEW'}
            >
              {submitting ? 'SUBMITTING...' : 'SUBMIT FOR REVIEW'}
            </button>
          )}

          {currentUser?.role === 'ADMIN' && (initialData?.status === 'PENDING_REVIEW' || initialData?.status === 'APPROVED') && (
            <button
              type="submit"
              form="intel-creation-form"
              className="submit-btn"
              style={{ flex: 1, backgroundColor: 'var(--accent)', color: '#000' }}
              disabled={submitting}
              onClick={() => submitActionRef.current = 'APPROVED'}
            >
              {submitting ? 'APPROVING...' : (initialData?.status === 'APPROVED' ? 'APPROVED' : 'APPROVE')}
            </button>
          )}
          
          <button
            type="submit"
            form="intel-creation-form"
            className="submit-btn"
            style={{ flex: 1 }}
            disabled={submitting}
            aria-busy={submitting}
            onClick={() => submitActionRef.current = 'OPEN'}
          >
            {submitting ? 'PUBLISHING...' : 'PUBLISH'}
          </button>
        </div>
      </div>
    </section>
  );
}

export default IntelForm;
