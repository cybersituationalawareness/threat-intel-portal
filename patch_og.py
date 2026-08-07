import re

with open('backend/og_integration.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_func = """def gather_search_cases():
    api_key = get_api_credential()
    if not api_key or api_key == "your_api_key_here":
        print("ERROR: Invalid or missing GATHER_API_KEY")
        return []

    headers = get_headers(api_key)
    payload = {
        "statuses": ["Open"],
        "order": "desc",
        "sort": "caseRef",
        "page": 1,
        "size": 5
    }
    url = "https://gather.gov.sg/cms/api/cases/search"
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        if response.status_code == 200:
            return response.json().get("data", [])
        return []
    except Exception as e:
        print(f"Search Network error: {e}")
        return []"""

new_func = """def gather_search_cases():
    api_key = get_api_credential()
    if not api_key or api_key == "your_api_key_here":
        print("ERROR: Invalid or missing GATHER_API_KEY")
        return []

    headers = get_headers(api_key)
    url = "https://gather.gov.sg/cms/api/cases/search"
    all_cases = []
    page = 1
    size = 50
    
    while True:
        payload = {
            "order": "desc",
            "sort": "caseRef",
            "page": page,
            "size": size
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            if response.status_code == 200:
                data = response.json().get("data", [])
                if not data:
                    break
                
                all_cases.extend(data)
                
                if len(data) < size:
                    break
                    
                page += 1
            else:
                print(f"Error fetching page {page}: {response.status_code}")
                break
        except Exception as e:
            print(f"Search Network error: {e}")
            break
            
    return all_cases"""

content = content.replace(old_func, new_func)

with open('backend/og_integration.py', 'w', encoding='utf-8') as f:
    f.write(content)
