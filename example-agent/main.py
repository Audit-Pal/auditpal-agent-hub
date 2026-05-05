import os
import json
import sys
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Import our modular fetching tools
from utils import fetch_github_code, parse_explorer_url, fetch_contract_source

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

def submit_to_auditpal(report_json: dict):
    if not AUDITPAL_API_KEY:
        print("Warning: AUDITPAL_API_KEY is not set. Cannot submit to AuditPal.")
        return
        
    url = f"{SERVICE_URL}/reports/submit"
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": AUDITPAL_API_KEY
    }
    
    print(f"\nSubmitting report to {url}...")
    try:
        response = requests.post(url, headers=headers, json=report_json)
        if response.status_code == 200 or response.status_code == 201:
            print("✅ Successfully submitted report to AuditPal!")
            print(f"Response: {response.json()}")
        else:
            print(f"❌ Failed to submit. Status code: {response.status_code}")
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Exception during submission: {e}")

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
            model='gemini-3.1-flash-lite-preview',
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
    
    print(f"Fetching live programs...")
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

def list_programs_and_select(programs):
    if not programs:
        print("No programs found.")
        return input("Enter a valid Program ID manually: ").strip()

    print("\n--- Live Bounty Programs ---")
    for idx, p in enumerate(programs):
        bounty = p.get('maxBountyUsd', 0)
        print(f"{idx + 1}. {p.get('name')} (ID: {p.get('id')}) - Max Bounty: ${bounty:,}")
    
    while True:
        choice = input(f"\nSelect a program (1-{len(programs)}) or type an ID directly: ").strip()
        
        if choice.isdigit():
            idx = int(choice) - 1
            if 0 <= idx < len(programs):
                return programs[idx]['id']
            
        if choice:
            return choice

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
    print("   AuditPal Sentinel Agent - CLI Interface    ")
    print("==============================================")
    
    agent_id = create_agent()
    
    programs = fetch_programs()
    program_id = list_programs_and_select(programs)
    
    scope_targets = fetch_program_scope(program_id)
    contract_code = ""
    target_name = ""
    choice = ""
    
    if scope_targets:
        print(f"\n--- Found {len(scope_targets)} scope targets in program ---")
        for idx, target in enumerate(scope_targets):
            kind = target.get('referenceKind') or target.get('assetType') or 'Unknown'
            print(f"{idx + 1}. [{kind}] {target.get('label')} -> {target.get('location')}")
        print(f"{len(scope_targets) + 1}. [Manual] Enter a different source manually")
        
        scope_choice = input(f"\nSelect a target to analyze (1-{len(scope_targets) + 1}): ").strip()
        
        if scope_choice.isdigit() and 1 <= int(scope_choice) <= len(scope_targets):
            selected = scope_targets[int(scope_choice) - 1]
            location = selected.get('location', '')
            kind = selected.get('referenceKind', '')
            
            if kind in ['GITHUB_REPO', 'GITHUB_ORG', 'SOURCE_FILE'] or 'github.com' in location:
                print("Fetching source code from GitHub...")
                contract_code = fetch_github_code(location)
                target_name = selected.get('label', 'GitHub Repository')
                choice = '3'
                github_url = location
            elif kind == 'CONTRACT_ADDRESS' or '0x' in location:
                api_key = os.getenv("ETHERSCAN_API_KEY") or os.getenv("EXPLORER_API_KEY")
                try:
                    chain_id, address = parse_explorer_url(location)
                    print("Fetching source code from Explorer API...")
                    contract_code = fetch_contract_source(chain_id, address, api_key)
                    target_name = f"Deployed Contract: {address}"
                    choice = '2'
                except Exception as e:
                    print(f"Error parsing explorer URL: {e}")
                    sys.exit(1)
            else:
                print(f"Unsupported target location: {location}")
                sys.exit(1)
    
    if not contract_code:
        print("\n==============================================")
        print("1. Analyze Local Solidity File")
        print("2. Analyze Deployed Contract (Explorer URL)")
        print("3. Analyze GitHub Repository / File URL")
        print("==============================================")
        
        choice = input("Enter your choice (1/2/3): ").strip()
        
        try:
            if choice == '1':
                file_path = input("Enter the path to the local .sol file: ").strip()
                with open(file_path, "r", encoding="utf-8") as f:
                    contract_code = f.read()
                target_name = os.path.basename(file_path)
                
            elif choice == '2':
                explorer_url = input("Enter the verified contract explorer URL: ").strip()
                api_key = os.getenv("ETHERSCAN_API_KEY") or os.getenv("EXPLORER_API_KEY")
                chain_id, address = parse_explorer_url(explorer_url)
                print("Fetching source code from Explorer API...")
                contract_code = fetch_contract_source(chain_id, address, api_key)
                target_name = f"Deployed Contract: {address}"
                
            elif choice == '3':
                github_url = input("Enter the GitHub file or tree URL: ").strip()
                print("Fetching source code from GitHub...")
                contract_code = fetch_github_code(github_url)
                target_name = "GitHub Repository Code"
                
            else:
                print("Invalid choice. Exiting.")
                sys.exit(1)
                
        except Exception as e:
            print(f"Error fetching code: {e}")
            sys.exit(1)

    print(f"\n✅ Successfully loaded {len(contract_code)} bytes of source code.")
    
    # Generate the report
    report_json = analyze_contract(contract_code, target_name, program_id)
    
    if report_json:
        # Auto-append additional metadata to graphContext based on input type
        if "graphContext" not in report_json:
            report_json["graphContext"] = {}
            
        report_json["graphContext"]["reporterAgent"] = agent_id
        
        if choice == '2':
            report_json["graphContext"]["contractAddresses"] = [address]
        elif choice == '3':
            report_json["graphContext"]["repositoryLinks"] = [github_url]
            
        # Display summary
        print("\n=== Audit Report Generated ===")
        print(f"Title: {report_json.get('title')}")
        vulnerabilities = report_json.get("vulnerabilities", [])
        print(f"Found {len(vulnerabilities)} vulnerabilities.")
        for v in vulnerabilities:
            print(f"- [{v.get('severity')}] {v.get('title')}")
        
        # Submit to API
        submit_to_auditpal(report_json)

if __name__ == "__main__":
    main()
