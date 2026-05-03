import os
from enum import Enum
from typing import List, Optional, Any, Dict
from fastapi import FastAPI
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="Example Agent")

# Initialize Gemini Client
try:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY environment variable is not set.")
        client = None
    else:
        client = genai.Client(api_key=api_key)
except Exception as e:
    print(f"Error initializing Gemini client: {e}")
    client = None

# ---- SCHEMAS FOR STRUCTURED OUTPUT ----

class SeverityEnum(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class ReportSourceEnum(str, Enum):
    CROWD_REPORT = "CROWD_REPORT"
    EXPLOIT_FEED = "EXPLOIT_FEED"
    AGENT_DISAGREEMENT = "AGENT_DISAGREEMENT"

class VulnerabilityItem(BaseModel):
    title: str = Field(description="Title of the vulnerability")
    severity: SeverityEnum = Field(description="Severity of the vulnerability")
    target: str = Field(description="The target file, function, or contract")
    summary: str = Field(description="Summary of the issue")
    impact: str = Field(description="Impact of the vulnerability")
    proof: str = Field(description="Proof of concept or detailed explanation of the exploit")
    codeSnippet: Optional[str] = Field(None, description="Vulnerable code snippet")
    errorLocation: Optional[str] = Field(None, description="Location of the error (e.g. line number or function name)")

class GraphContext(BaseModel):
    reporterAgent: Optional[str] = None
    vulnerabilityClass: Optional[str] = None
    affectedAsset: Optional[str] = None
    affectedComponent: Optional[str] = None
    attackVector: Optional[str] = None
    rootCause: Optional[str] = None
    prerequisites: Optional[str] = None
    referenceIds: Optional[List[str]] = Field(default_factory=list)
    transactionHashes: Optional[List[str]] = Field(default_factory=list)
    contractAddresses: Optional[List[str]] = Field(default_factory=list)
    repositoryLinks: Optional[List[str]] = Field(default_factory=list)
    filePaths: Optional[List[str]] = Field(default_factory=list)
    tags: Optional[List[str]] = Field(default_factory=list)

class AgentSubmitReportInput(BaseModel):
    programId: str = Field(description="ID of the program")
    title: str = Field(description="Overall report title")
    reporterName: str = Field(description="Name of the reporting agent")
    source: ReportSourceEnum = Field(description="Source of the report")
    vulnerabilities: List[VulnerabilityItem] = Field(description="List of found vulnerabilities")
    graphContext: Optional[GraphContext] = None

# ---- API SCHEMAS ----

class AnalyzeContractRequest(BaseModel):
    contract_code: str = Field(..., description="The solidity code to analyze")
    program_id: str = Field(default="prog_123", description="The program ID to include in the report")
    reporter_name: str = Field(default="AuditPal Security Agent", description="The name of the agent doing the analysis")

@app.get("/")
def read_root():
    return {"status": "ok", "service": "example-agent"}

@app.post("/analyze", response_model=AgentSubmitReportInput)
def analyze_contract(req: AnalyzeContractRequest):
    if not client:
        raise Exception("Gemini client not initialized. Check API key.")
    
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
          "codeSnippet": "string", // optional
          "errorLocation": "string" // optional
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
      } // optional
    }
    """

    prompt = f"""
    You are an expert Smart Contract Security Auditor. 
    Analyze the following Solidity smart contract for vulnerabilities.
    Return a detailed report conforming strictly to the requested JSON schema.
    
    {schema_instructions}
    
    Program ID: {req.program_id}
    Reporter Name: {req.reporter_name}
    
    Contract Code:
    ```solidity
    {req.contract_code}
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
        import json
        from datetime import datetime, timezone
        
        result_json = json.loads(response.text)
        result_json["timestamp"] = datetime.now(timezone.utc).isoformat()
        
        return result_json
        
    except Exception as e:
        raise Exception(f"Error querying Gemini: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
