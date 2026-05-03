import json
import os
import sys
import re
import requests
from pathlib import Path
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load environment variables (e.g., EXPLORER_API_KEY)
load_dotenv()

# Add the current directory to sys.path so we can import from main
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from main import client, types

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

def parse_explorer_url(url: str):
    """Parses an Etherscan/Basescan URL and determines the API chain ID and address for V2 API."""
    match = re.search(r'https?://([^/]+)/(?:address|token)/(0x[a-fA-F0-9]{40})', url)
    if not match:
        raise ValueError("Invalid explorer URL. Expected format: https://[domain]/address/0x... or https://[domain]/token/0x...")
    
    domain = match.group(1)
    address = match.group(2)
    chain_id = CHAIN_ID_MAP.get(domain, 1) # Default to mainnet
        
    return chain_id, address

def fetch_contract_source(chain_id: int, address: str, api_key: str = None) -> str:
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

def analyze_deployed_contract(explorer_url: str):
    if not client:
        print("Gemini client not initialized. Check your GEMINI_API_KEY in .env.")
        return

    try:
        api_domain, address = parse_explorer_url(explorer_url)
        print(f"Parsed URL -> Domain: {api_domain}, Address: {address}")
        
        api_key = os.getenv("ETHERSCAN_API_KEY") or os.getenv("EXPLORER_API_KEY")
        if not api_key:
            print("Warning: ETHERSCAN_API_KEY not found in .env. Request might fail or be rate limited.")
            
        print("Fetching verified source code...")
        contract_code = fetch_contract_source(api_domain, address, api_key)
        
    except Exception as e:
        print(f"Failed to fetch code: {e}")
        return
        
    print(f"Successfully fetched {len(contract_code)} bytes. Submitting to Gemini API...")

    program_id = "prog_deployed_contract"
    reporter_name = "AuditPal Agent (Deployed Explorer)"

    schema_instructions = """
    Expected JSON Structure:
    {
      "programId": "string",
      "title": "string",
      "reporterName": "string",
      "source": "CROWD_REPORT",
      "vulnerabilities": [
        {
          "title": "string",
          "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
          "target": "string",
          "summary": "string",
          "impact": "string",
          "proof": "string",
          "codeSnippet": "string",
          "errorLocation": "string"
        }
      ],
      "graphContext": {
        "reporterAgent": "string",
        "vulnerabilityClass": "string",
        "affectedAsset": "string",
        "affectedComponent": "string",
        "attackVector": "string",
        "rootCause": "string",
        "prerequisites": "string",
        "contractAddresses": ["string"]
      }
    }
    """

    prompt = f"""
    You are an expert Smart Contract Security Auditor. 
    Analyze the following Solidity smart contract for vulnerabilities.
    Return a detailed report conforming strictly to the requested JSON schema.
    
    {schema_instructions}
    
    Program ID: {program_id}
    Reporter Name: {reporter_name}
    Contract Address: {address}
    
    Contract Code:
    ```solidity
    {contract_code}
    ```
    """
    
    try:
        api_response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )
        
        result_json = json.loads(api_response.text)
        result_json["timestamp"] = datetime.now(timezone.utc).isoformat()
        
        # Automatically add the contract address to graphContext
        if "graphContext" not in result_json:
            result_json["graphContext"] = {}
        result_json["graphContext"]["contractAddresses"] = [address]
        
        # Save output
        output_dir = Path("samples/deployed-contract")
        output_dir.mkdir(parents=True, exist_ok=True)
        output_file = output_dir / "output.json"
        
        with open(output_file, "w") as f:
            json.dump(result_json, f, indent=2)
            
        print(f"\n✅ Successfully generated report and saved to {output_file}")
        
    except Exception as e:
        print(f"Error querying Gemini: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: poetry run python test_submission_contract_deployed_link.py <explorer_url>")
        print("Example: poetry run python test_submission_contract_deployed_link.py https://sepolia.etherscan.io/address/0x1234567890123456789012345678901234567890")
        sys.exit(1)
        
    explorer_url = sys.argv[1]
    analyze_deployed_contract(explorer_url)
