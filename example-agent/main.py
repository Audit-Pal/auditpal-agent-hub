import os
import json
import sys
import requests
import time
from datetime import datetime, timezone
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Import our modular fetching tools
from utils import fetch_github_code, parse_explorer_url, fetch_contract_source, sign_report_id

# Load environment variables from .env file
load_dotenv()

# Initialize Gemini Client
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Error: GEMINI_API_KEY environment variable is not set in .env")
    sys.exit(1)
    
client = genai.Client(api_key=api_key)

# AuditPal Credentials
AUDITPAL_API_KEY = os.getenv("AUDITPAL_API_KEY")
SERVICE_URL = os.getenv("SERVICE_URL", "http://localhost:3001/api/v1")
WALLET_PRIVATE_KEY = os.getenv("WALLET_PRIVATE_KEY")

PROCESSED_FILE = "processed_bounties.json"

def load_processed():
    if os.path.exists(PROCESSED_FILE):
        try:
            with open(PROCESSED_FILE, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading {PROCESSED_FILE}: {e}")
    return {"processed": {}}

def save_processed(data):
    try:
        with open(PROCESSED_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving {PROCESSED_FILE}: {e}")

def is_launched_today(program):
    started_at = program.get("startedAt")
    if not started_at:
        return False
    
    # ISO-8601 usually is like "2026-05-31T08:25:54.000Z"
    date_part = started_at.split('T')[0]
    
    today_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_local = datetime.now().strftime("%Y-%m-%d")
    
    return date_part == today_utc or date_part == today_local

def submit_to_auditpal(report_json: dict):
    if not AUDITPAL_API_KEY:
        print("Warning: AUDITPAL_API_KEY is not set. Cannot submit to AuditPal.")
        return None
        
    url = f"{SERVICE_URL}/reports/submit"
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": AUDITPAL_API_KEY
    }
    
    print(f"\nSubmitting report to {url}...")
    try:
        response = requests.post(url, headers=headers, json=report_json)
        if response.status_code in [200, 201]:
            resp_data = response.json()
            print("✅ Successfully submitted report to AuditPal!")
            print(f"Response: {resp_data}")
            return resp_data.get("data", {}).get("id")
        else:
            print(f"❌ Failed to submit. Status code: {response.status_code}")
            print(f"Error: {response.text}")
            return None
    except Exception as e:
        print(f"Exception during submission: {e}")
        return None

def analyze_contract(contract_code: str, target_name: str, program_id: str):
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
        "prerequisites": "string"
      }
    }
    """

    prompt = f"""
    You are an expert Smart Contract Security Auditor. 
    Analyze the following Solidity smart contract for vulnerabilities.
    Return a detailed report conforming strictly to the requested JSON schema.
    
    {schema_instructions}
    
    Program ID: {program_id}
    Reporter Name: AuditPal Security Agent
    Target Name: {target_name}
    
    Contract Code:
    ```solidity
    {contract_code}
    ```
    """
    
    print("Analyzing contract with Gemini 2.5 Flash...")
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
        
        return result_json
        
    except Exception as e:
        print(f"Error querying Gemini: {e}")
        return None

def create_agent():
    if not AUDITPAL_API_KEY:
        print("Warning: AUDITPAL_API_KEY is not set. Cannot create agent.")
        return "agent-unknown"

    url = f"{SERVICE_URL}/agents"
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": AUDITPAL_API_KEY
    }
    data = {
        "name": "Sentinel Forge",
        "headline": "Autonomous EVM exploit hunter",
        "summary": "Continuously analyzes live AuditPal programs and submits structured findings.",
        "capabilities": ["Static Analysis", "Invariant Testing", "Trace Diffing"],
        "agentUrl": "https://github.com/Audit-Pal/auditpal-agent-hub/tree/main/example-agent",
        "accentTone": "mint",
        "guardrails": ["no PII", "on-chain only"],
        "supportedSurfaces": ["SMART_CONTRACT", "BLOCKCHAIN"],
        "supportedTechnologies": ["Solidity", "EVM", "Vyper"],
        "tools": [
            {
                "name": "Gemini 2.5 Flash",
                "access": "API",
                "useCase": "High-speed static analysis and anomaly detection"
            }
        ],
        "runtimeFlow": [
            {
                "order": 1,
                "title": "Code Ingestion",
                "description": "Fetches verified source code from explorer or repository.",
                "outputs": ["AST", "Raw Source"]
            },
            {
                "order": 2,
                "title": "Vulnerability Analysis",
                "description": "Scans for logic flaws using prompt-driven static analysis.",
                "outputs": ["Draft Report"]
            }
        ]
    }
    
    print(f"\nRegistering Agent...")
    try:
        response = requests.post(url, headers=headers, json=data)
        if response.status_code in [200, 201]:
            resp_data = response.json()
            if resp_data.get("success") and "data" in resp_data:
                agent_id = resp_data["data"]["id"]
                print(f"✅ Successfully registered Agent! ID: {agent_id}")
                return agent_id
            else:
                print(f"✅ Registered Agent, but couldn't parse ID.")
                return "agent-unknown"
        elif response.status_code == 409:
            print(f"✅ Agent already exists. Fetching existing agent details...")
            slug = data["name"].lower().replace(' ', '-')
            get_url = f"{SERVICE_URL}/agents/{slug}"
            get_response = requests.get(get_url, headers=headers)
            if get_response.status_code == 200:
                resp_data = get_response.json()
                agent_id = resp_data["data"]["id"]
                print(f"✅ Reusing existing Agent! ID: {agent_id}")
                return agent_id
            else:
                print(f"❌ Failed to fetch existing agent. Status: {get_response.status_code}")
                return "agent-unknown"
        else:
            print(f"❌ Failed to create agent. Status code: {response.status_code}")
            return "agent-unknown"
    except Exception as e:
        print(f"Exception during agent creation: {e}")
        return "agent-unknown"

def fetch_programs():
    if not AUDITPAL_API_KEY:
        print("Warning: AUDITPAL_API_KEY is not set.")
        return []

    url = f"{SERVICE_URL}/programs?kind=BUG_BOUNTY&category=SMART_CONTRACT&sortBy=bounty&limit=10"
    headers = {
        "X-API-Key": AUDITPAL_API_KEY
    }
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code in [200, 201]:
            resp_data = response.json()
            if resp_data.get("success") and "data" in resp_data:
                return resp_data["data"]
            else:
                return []
        else:
            print(f"❌ Failed to fetch programs. Status code: {response.status_code}")
            return []
    except Exception as e:
        print(f"Exception fetching programs: {e}")
        return []

def fetch_program_scope(program_id):
    if not AUDITPAL_API_KEY:
        return []
    url = f"{SERVICE_URL}/programs/{program_id}"
    headers = {"X-API-Key": AUDITPAL_API_KEY}
    try:
        response = requests.get(url, headers=headers)
        if response.status_code in [200, 201]:
            data = response.json()
            if data.get("success"):
                return data.get("data", {}).get("scopeTargets", [])
    except Exception as e:
        print(f"Exception fetching program scope: {e}")
    return []

def main():
    print("==============================================")
    print("   AuditPal Autonomous Agent - Continuous Mode ")
    print("==============================================")
    
    agent_id = create_agent()
    
    processed_data = load_processed()
    processed_map = processed_data.setdefault("processed", {})
    
    print("\nStarting continuous monitoring loop (checking every 10 seconds)...")
    
    while True:
        try:
            programs = fetch_programs()
            
            # Filter for programs launched today
            today_programs = []
            for p in programs:
                if is_launched_today(p):
                    today_programs.append(p)
            
            if today_programs:
                print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Found {len(today_programs)} program(s) launched today.")
            else:
                print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Listening for new programs (none launched today found in current batch)...")
                
            for p in today_programs:
                program_id = p.get("id")
                program_name = p.get("name", "Unknown Program")
                
                # Fetch scope targets for this program
                scope_targets = fetch_program_scope(program_id)
                if not scope_targets:
                    continue
                    
                for target in scope_targets:
                    location = target.get("location")
                    kind = target.get("referenceKind") or target.get("assetType") or "Unknown"
                    label = target.get("label", "Target")
                    
                    if not location:
                        continue
                        
                    # Create a unique key for the processed queue
                    queue_key = f"{program_id}:{location}"
                    
                    if queue_key in processed_map:
                        continue
                        
                    print(f"\n🚀 Analyzing new target for program '{program_name}':")
                    print(f"   [{kind}] {label} -> {location}")
                    
                    contract_code = ""
                    choice_type = ""
                    github_url = ""
                    address = ""
                    
                    # Fetch code depending on the target type
                    try:
                        if kind in ['GITHUB_REPO', 'GITHUB_ORG', 'SOURCE_FILE'] or 'github.com' in location:
                            print("   Fetching source code from GitHub...")
                            contract_code = fetch_github_code(location)
                            target_name = label if label else "GitHub Repository"
                            choice_type = '3'
                            github_url = location
                            
                        elif kind == 'CONTRACT_ADDRESS' or '0x' in location:
                            api_key = os.getenv("ETHERSCAN_API_KEY") or os.getenv("EXPLORER_API_KEY")
                            chain_id, address = parse_explorer_url(location)
                            print(f"   Fetching source code from Explorer API (Chain ID: {chain_id}, Address: {address})...")
                            contract_code = fetch_contract_source(chain_id, address, api_key)
                            target_name = label if label else f"Deployed Contract: {address}"
                            choice_type = '2'
                            
                        else:
                            print(f"   ⚠️ Unsupported target kind '{kind}' or location format. Skipping.")
                            continue
                            
                    except Exception as e:
                        print(f"   ❌ Failed to fetch code: {e}")
                        continue
                        
                    if not contract_code:
                        print(f"   ⚠️ Fetched source code is empty. Skipping.")
                        continue
                        
                    print(f"   ✅ Loaded {len(contract_code)} bytes of source code.")
                    
                    # Generate the vulnerability report
                    report_json = analyze_contract(contract_code, target_name, program_id)
                    
                    if not report_json:
                        print("   ❌ Failed to generate report from Gemini.")
                        continue
                        
                    # Append context metadata
                    if "graphContext" not in report_json:
                        report_json["graphContext"] = {}
                    report_json["graphContext"]["reporterAgent"] = agent_id
                    
                    if choice_type == '2':
                        report_json["graphContext"]["contractAddresses"] = [address]
                    elif choice_type == '3':
                        report_json["graphContext"]["repositoryLinks"] = [github_url]
                        
                    # Submit to AuditPal API
                    report_id = submit_to_auditpal(report_json)
                    
                    if not report_id:
                        print("   ❌ Failed to submit report to AuditPal.")
                        continue
                        
                    signature = None
                    wallet_address = None
                    
                    # Cryptographic binding if private key is set
                    if WALLET_PRIVATE_KEY:
                        print("   Signing report ID for secure reward escrow...")
                        try:
                            wallet_address, signature = sign_report_id(report_id, WALLET_PRIVATE_KEY)
                            print(f"   ✍️ Signed with wallet: {wallet_address}")
                            
                            bind_url = f"{SERVICE_URL}/reports/{report_id}"
                            bind_headers = {
                                "Content-Type": "application/json",
                                "X-API-Key": AUDITPAL_API_KEY
                            }
                            bind_data = {
                                "title": report_json.get("title"),
                                "walletAddress": wallet_address,
                                "signature": signature
                            }
                            
                            bind_resp = requests.patch(bind_url, headers=bind_headers, json=bind_data)
                            if bind_resp.status_code == 200:
                                print("   ✅ Successfully bound wallet signature to report!")
                            else:
                                print(f"   ⚠️ Failed to bind signature: {bind_resp.text}")
                        except Exception as e:
                            print(f"   ❌ Error during signing/binding: {e}")
                            
                    # Save to processed queue
                    processed_map[queue_key] = {
                        "program_id": program_id,
                        "program_name": program_name,
                        "target_label": label,
                        "location": location,
                        "processed_at": datetime.now(timezone.utc).isoformat(),
                        "status": "submitted",
                        "report_id": report_id,
                        "wallet_address": wallet_address,
                        "signature": signature
                    }
                    save_processed(processed_data)
                    print(f"   🎯 Successfully processed and recorded bounty: {queue_key}")
                    
        except Exception as e:
            print(f"Error in continuous listening loop: {e}")
            
        time.sleep(10)

if __name__ == "__main__":
    main()
