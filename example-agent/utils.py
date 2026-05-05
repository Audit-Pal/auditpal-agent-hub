import json
import os
import re
import requests

# Mapping of common explorer domains to their chain IDs for Etherscan V2 API
CHAIN_ID_MAP = {
    "etherscan.io": 1,
    "sepolia.etherscan.io": 11155111,
    "basescan.org": 8453,
    "sepolia.basescan.org": 84532,
    "polygonscan.com": 137,
    "snowtrace.io": 43114,
    "arbiscan.io": 42161,
    "optimistic.etherscan.io": 10,
    "ftmscan.com": 250,
    "bscscan.com": 56,
}

def fetch_github_code(url: str) -> str:
    """Fetches source code from a GitHub URL (single file or entire directory)."""
    if "raw.githubusercontent.com" in url:
        resp = requests.get(url)
        resp.raise_for_status()
        return resp.text
        
    if "github.com" in url and "/blob/" in url:
        raw_url = url.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/")
        resp = requests.get(raw_url)
        resp.raise_for_status()
        return resp.text
        
    if "github.com" in url and "/tree/" in url:
        match = re.search(r'https://github\.com/([^/]+)/([^/]+)/tree/([^/]+)/(.*)', url)
        if not match:
            raise ValueError("Invalid GitHub tree URL")
            
        owner, repo, branch, path = match.groups()
        api_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}?ref={branch}"
        
        headers = {}
        if os.getenv("GITHUB_TOKEN"):
            headers["Authorization"] = f"token {os.getenv('GITHUB_TOKEN')}"
            
        response = requests.get(api_url, headers=headers)
        response.raise_for_status()
        contents = response.json()
        
        combined_code = ""
        for item in contents:
            if item.get("type") == "file" and item.get("name", "").endswith(".sol"):
                print(f"Fetching {item['name']}...")
                file_resp = requests.get(item["download_url"], headers=headers)
                if file_resp.status_code == 200:
                    combined_code += f"\n// ======== File: {item['name']} ========\n"
                    combined_code += file_resp.text
                    
        if not combined_code:
            raise Exception("No .sol files found in the directory.")
        return combined_code
        
    raise ValueError("Unsupported GitHub URL format. Must be a raw file, /blob/, or /tree/ link.")

def parse_explorer_url(url: str):
    """Parses an Etherscan/Basescan URL or raw address and determines the API chain ID and address."""
    # Check if it's just a raw address
    if re.fullmatch(r'0x[a-fA-F0-9]{40}', url):
        return 1, url
        
    match = re.search(r'https?://([^/]+)/(?:address|token)/(0x[a-fA-F0-9]{40})', url)
    if not match:
        raise ValueError("Invalid explorer URL or address. Expected format: https://[domain]/address/0x... or raw 0x... address")
    
    domain = match.group(1)
    address = match.group(2)
    chain_id = CHAIN_ID_MAP.get(domain, 1) # Default to mainnet
        
    return chain_id, address

def fetch_contract_source(chain_id: int, address: str, api_key: str = None) -> str:
    """Fetches the verified source code from Etherscan V2 API."""
    url = f"https://api.etherscan.io/v2/api?chainid={chain_id}&module=contract&action=getsourcecode&address={address}"
    if api_key:
        url += f"&apikey={api_key}"
        
    # Use headers to mimic browser in case of rate limiting without API key
    headers = {"User-Agent": "Mozilla/5.0"}
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    data = response.json()
    
    if data.get('status') != '1':
        raise Exception(f"Explorer API Error: {data.get('message')} - {data.get('result')}")
        
    source_code = data['result'][0].get('SourceCode')
    if not source_code:
        raise Exception("Source code is empty. Contract might not be verified.")
        
    # Handle multi-file Etherscan verification
    if source_code.startswith('{{'):
        source_code = source_code[1:-1]
        
    if source_code.startswith('{'):
        try:
            sources_dict = json.loads(source_code)
            # Sometimes wrapped in {"language": "Solidity", "sources": {...}}
            if "sources" in sources_dict:
                sources_dict = sources_dict["sources"]
                
            combined_code = ""
            for filename, content in sources_dict.items():
                combined_code += f"\n// ======== File: {filename} ========\n"
                combined_code += content.get("content", "") if isinstance(content, dict) else content
            return combined_code
        except json.JSONDecodeError:
            pass
            
    return source_code
