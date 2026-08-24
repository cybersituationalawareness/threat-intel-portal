import os

dir_path = r'c:\Users\ong\.gemini\antigravity\scratch\threat-intel-portal-mvp-airbase\frontend\src\components'

# IsacDashboard refactoring

isac_dashboard_path = os.path.join(dir_path, 'IsacDashboard.jsx')
with open(isac_dashboard_path, 'r', encoding='utf-8') as f:
    isac_dashboard_content = f.read()

# We need to extract IsacFeedTable.jsx, IsacDetailDrawer.jsx, IsacSubmissionForm.jsx
# Since this is complex, let's use a simpler approach of generating the files and updating the main file.
# But it's easier to use sed/regex or just manually split if we use Python logic.
