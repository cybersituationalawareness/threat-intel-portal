import time
import requests

API_URL = "http://localhost:8000/api/v1"

def test_health():
    print("[*] Waiting for backend to become healthy...")
    max_retries = 30
    for i in range(max_retries):
        try:
            res = requests.get("http://localhost:8000/")
            if res.status_code == 200:
                print("[+] Backend is UP!\n")
                return True
        except requests.ConnectionError:
            pass
        time.sleep(1)
        if i % 5 == 0:
            print(f"    ...still waiting ({i}/{max_retries}s)")
    print("[-] Backend failed to start.")
    return False

def test_full_workflow():
    print("[*] Fetching demo users...")
    res = requests.get(f"{API_URL}/demo-users")
    if res.status_code != 200:
        print("[-] Failed to fetch demo users")
        return False
    
    users = res.json()
    acsac_admin = next(u for u in users if u['organization']['org_type'] == 'ACSAC')
    member_a = next(u for u in users if u['organization']['name'] == 'Global Airlines')

    print(f"[+] Found ACSAC Admin: {acsac_admin['name']}")
    print(f"[+] Found Member A: {member_a['name']}")

    # 1. ACSAC creates an Alert
    print("\n[*] Testing POST intel as ACSAC Admin...")
    payload = {
        "type": "Alert",
        "title": "Critical RCE in Edge Gateway",
        "summary": "Unauthenticated RCE vulnerability actively exploited.",
        "detailed_description": "A zero-day RCE exists in Edge Gateway.",
        "tlp": "Red",
        "severity": "Critical",
        "confidence": "High",
        "sector_relevance": ["Aviation"],
        "tags": ["Zero-day"],
        "recommended_actions": ["Isolate Gateway"],
        "classification": "sector-wide"
    }

    res = requests.post(f"{API_URL}/intel", json=payload, headers={"X-User-ID": acsac_admin['id']})
    if res.status_code == 201:
        intel_id = res.json()['id']
        print(f"[+] SUCCESS (201): Alert created with ID {intel_id}")
    else:
        print(f"[-] FAIL: {res.text}")
        return False

    # 2. Member A acknowledges the Alert
    print("\n[*] Member A acknowledges the Alert...")
    res = requests.post(f"{API_URL}/intel/{intel_id}/acknowledge", headers={"X-User-ID": member_a['id']})
    if res.status_code == 200:
        print("[+] SUCCESS (200): Alert Acknowledged")
    else:
        print(f"[-] FAIL: {res.text}")
        return False

    # 3. Member A responds
    print("\n[*] Member A submits investigation response...")
    resp_payload = {
        "findings": "We found IOCs in our logs.",
        "affected_assets": ["server-12"],
        "mitigation_measures": ["Patched to latest version"]
    }
    res = requests.post(f"{API_URL}/intel/{intel_id}/respond", json=resp_payload, headers={"X-User-ID": member_a['id']})
    if res.status_code == 200:
        print("[+] SUCCESS (200): Response submitted")
    else:
        print(f"[-] FAIL: {res.text}")
        return False

    return True

def main():
    print("=== Threat Intel Portal API Integration Tests (Phase 2) ===\n")
    if not test_health():
        return
    
    passed = test_full_workflow()
    
    if passed:
        print("\n=== ALL TESTS PASSED ===")
    else:
        print("\n=== SOME TESTS FAILED ===")

if __name__ == "__main__":
    main()
