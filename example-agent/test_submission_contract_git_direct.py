import json
import os
import sys
import requests
from pathlib import Path
from datetime import datetime, timezone

# Add the current directory to sys.path so we can import from main
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from main import client, types

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
        import re
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
                file_resp = requests.get(item["download_url"])
                if file_resp.status_code == 200:
                    combined_code += f"\n// ======== File: {item['name']} ========\n"
                    combined_code += file_resp.text
                    
        if not combined_code:
            raise Exception("No .sol files found in the directory.")
        return combined_code
        
    raise ValueError("Unsupported GitHub URL format. Must be a raw file, /blob/, or /tree/ link.")

def analyze_github_contract(github_url: str):
    if not client:
        print("Gemini client not initialized. Check your GEMINI_API_KEY in .env.")
        return

    print(f"Fetching source code from: {github_url}")
    
    try:
        contract_code = fetch_github_code(github_url)
    except Exception as e:
        print(f"Failed to fetch code from GitHub: {e}")
        return
        
    print(f"Successfully fetched {len(contract_code)} bytes.")

    program_id = "prog_github_direct"
    reporter_name = "AuditPal Agent (GitHub Source)"

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
        "repositoryLinks": ["string"]
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
    Repository Link: {github_url}
    
    Contract Code:
    ```solidity
    {contract_code}
    ```
    """
    
    try:
        print("Submitting to Gemini API...")
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
        
        # Add the github url to graph context automatically
        if "graphContext" not in result_json:
            result_json["graphContext"] = {}
        result_json["graphContext"]["repositoryLinks"] = [github_url]
        
        # Save output
        output_dir = Path("samples/github-contract")
        output_dir.mkdir(parents=True, exist_ok=True)
        output_file = output_dir / "output.json"
        
        with open(output_file, "w") as f:
            json.dump(result_json, f, indent=2)
            
        print(f"\n✅ Successfully generated report and saved to {output_file}")
        
    except Exception as e:
        print(f"Error querying Gemini: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: poetry run python test_submission_contract_git_direct.py <github_url>")
        print("Example: poetry run python test_submission_contract_git_direct.py https://github.com/user/repo/tree/master/contracts")
        sys.exit(1)
        
    target_github_url = sys.argv[1]
    print(f"Testing GitHub URL: {target_github_url}")
    analyze_github_contract(target_github_url)
