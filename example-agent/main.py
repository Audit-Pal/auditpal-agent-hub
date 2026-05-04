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
AGENT_ID = os.getenv("AGENT_ID", "agent-unknown")
PROGRAM_ID = os.getenv("PROGRAM_ID", "prog_123")
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

def main():
    print("==============================================")
    print("   AuditPal Sentinel Agent - CLI Interface    ")
    print("==============================================")
    print("1. Analyze Local Solidity File")
    print("2. Analyze Deployed Contract (Explorer URL)")
    print("3. Analyze GitHub Repository / File URL")
    print("==============================================")
    
    choice = input("Enter your choice (1/2/3): ").strip()
    
    contract_code = ""
    target_name = ""
    
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
    report_json = analyze_contract(contract_code, target_name, PROGRAM_ID)
    
    if report_json:
        # Auto-append additional metadata to graphContext based on input type
        if "graphContext" not in report_json:
            report_json["graphContext"] = {}
            
        report_json["graphContext"]["reporterAgent"] = AGENT_ID
        
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
