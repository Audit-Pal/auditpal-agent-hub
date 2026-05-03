import json
from pathlib import Path
import os
import sys

# Add the current directory to sys.path so we can import from main
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import client, AgentSubmitReportInput
from google.genai import types

def test_submission():
    if not client:
        print("Gemini client not initialized. Check your GEMINI_API_KEY in .env.")
        return

    # Read the vulnerable sample contract
    contract_path = Path("samples/single-file-contract/sample.sol")
    if not contract_path.exists():
        print(f"Contract file not found at {contract_path}")
        return

    with open(contract_path, "r") as f:
        contract_code = f.read()

    print(f"Read {len(contract_code)} bytes from {contract_path}. Submitting to Gemini API...")

    program_id = "prog_sample_test"
    reporter_name = "AuditPal Agent (Local Test)"

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
    Reporter Name: {reporter_name}
    
    Contract Code:
    ```solidity
    {contract_code}
    ```
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )
        
        # The response text will be a JSON string
        result_json = json.loads(response.text)
        
        from datetime import datetime, timezone
        result_json["timestamp"] = datetime.now(timezone.utc).isoformat()
        
        output_file = Path("samples/single-file-contract/output.json")
        with open(output_file, "w") as f:
            json.dump(result_json, f, indent=2)
            
        print(f"\n✅ Successfully generated report and saved to {output_file}")
        print("\n--- Output JSON Preview ---")
        print(json.dumps(result_json, indent=2))
        
    except Exception as e:
        print(f"Error querying Gemini: {e}")

if __name__ == "__main__":
    test_submission()
