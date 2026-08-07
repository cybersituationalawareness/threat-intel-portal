import re

with open('frontend/src/components/IntelFeed.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import React from 'react';", "import React, { useState } from 'react';")

func_start = """function IntelFeed({ intels, loading, filter, onFilterChange, onIntelSelect, selectedIds, onSelectionChange, onDeleteSelected, onEditSelected }) {
  const FILTERS = ["""

func_start_new = """function IntelFeed({ intels, loading, filter, onFilterChange, onIntelSelect, selectedIds, onSelectionChange, onDeleteSelected, onEditSelected }) {
  const [searchQuery, setSearchQuery] = useState('');

  const displayedIntels = intels.filter(intel => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const searchableText = [
      intel.title,
      intel.description,
      intel.threat_data,
      intel.case_id,
      intel.type,
      intel.classification
    ].filter(Boolean).join(' ').toLowerCase();
    return searchableText.includes(query);
  });

  const FILTERS = ["""
content = content.replace(func_start, func_start_new)

header_actions = """        <div className="feed-actions" style={{ flex: 'none', marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
          {(onEditSelected || onDeleteSelected) && ("""
header_actions_new = """        <div className="feed-actions" style={{ flex: 'none', marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Search alerts, content, fields..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="field-input"
            style={{ width: '250px', padding: '5px 10px', fontSize: '13px' }}
          />
          {(onEditSelected || onDeleteSelected) && ("""
content = content.replace(header_actions, header_actions_new)

# Replace intels.length with displayedIntels.length
content = content.replace("{intels.length} {intels.length === 1 ? 'entry' : 'entries'}", "{displayedIntels.length} {displayedIntels.length === 1 ? 'entry' : 'entries'}")

# Replace intels.length === 0 with displayedIntels.length === 0
content = content.replace("? intels.length === 0 ?", "? displayedIntels.length === 0 ?")

# Replace intels.map with displayedIntels.map
content = content.replace("intels.map((intel) => (", "displayedIntels.map((intel) => (")

with open('frontend/src/components/IntelFeed.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
