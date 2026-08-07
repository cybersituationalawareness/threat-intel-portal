import requests
import uuid
import os

r = requests.get('http://localhost:3000/api/v1/demo-users')
users = r.json()
member1 = next(u for u in users if u['name'].upper() == 'MEMBER1')

headers = {'X-User-ID': str(member1['id'])}

r = requests.get('http://localhost:3000/api/v1/intel/member', headers=headers)
intels = r.json()
intel = intels[0]

# First find an existing response, or create a mock one.
# Just query responses for this intel.
intel_id = intel['id']
# We can't list responses for a member directly if there's no endpoint, but we can just use the DB to find one.
# Let's just create a new response.
payload = {
    'findings': 'test',
    'affected_assets': ['test'],
    'status_update': 'test',
    'ioc_traffic_direction': 'test',
    'mitigation_measure_if_not_patched': 'test',
    'follow_up_action': 'test',
    'other_type_of_alert': 'test',
    'ioc_detected': 'test',
    'patch_status': 'test',
    'incident_reported': False
}
r = requests.post(f'http://localhost:3000/api/v1/intel/{intel_id}/responses', json=payload, headers=headers)
resp_data = r.json()
response_id = resp_data.get('response_id')

if response_id:
    with open('test_evidence.txt', 'w') as f:
        f.write('x' * (2 * 1024 * 1024))
    
    with open('test_evidence.txt', 'rb') as f:
        r = requests.post(f'http://localhost:3000/api/v1/intel/{intel_id}/responses/{response_id}/evidence', files={'files': f}, headers=headers)
        print('Upload Status:', r.status_code)
        print('Upload Response:', r.text)
else:
    print("Failed to create response:", r.status_code, r.text)
