# Example Python Agent

This is a separate service that runs an AI agent using the Gemini API.
It is built with Python, Poetry, and FastAPI.

## Setup

1. Make sure you have [Poetry](https://python-poetry.org/) installed.
2. Install dependencies:
   ```bash
   poetry install
   ```

## Running the Service

1. Start the FastAPI server:
   ```bash
   poetry run python main.py
   ```
2. The service will be available at `http://localhost:8000`.

## Endpoints

- `GET /` : Health check
- `POST /analyze` : Analyze a smart contract for vulnerabilities
  - Body: 
    ```json
    {
      "contract_code": "contract Vulnerable { ... }",
      "program_id": "prog_123",
      "reporter_name": "AuditPal Security Agent"
    }
    ```
  - Returns: A structured JSON response matching the AuditPal `AgentSubmitReportInput` schema, ready for submission to the API.

## Environment Variables

The `GEMINI_API_KEY` is loaded from the `.env` file automatically.
You should also set `ETHERSCAN_API_KEY` for explorer testing, and optionally `GITHUB_TOKEN` for large repository testing.

## Testing Scripts

We have provided three separate CLI scripts to test the agent capabilities without needing to hit the API server:

1. **Local File Test**
   Runs a test using a hardcoded `samples/single-file-contract/sample.sol` file.
   ```bash
   poetry run python test_submission.py
   ```

2. **GitHub URL Test**
   Fetches and analyzes raw files, blobs, or entire directories from GitHub.
   ```bash
   poetry run python test_submission_contract_git_direct.py <github_url>
   ```
   *Examples:*
   - `poetry run python test_submission_contract_git_direct.py https://github.com/farazsth98/damn-vulnerable-defi/tree/master/contracts/backdoor`
   - `poetry run python test_submission_contract_git_direct.py https://raw.githubusercontent.com/user/repo/main/contract.sol`

3. **Deployed Explorer Link Test**
   Fetches verified contract source code directly from Etherscan, Basescan, or other supported EVM explorers using API V2.
   ```bash
   poetry run python test_submission_contract_deployed_link.py <explorer_url>
   ```
   *Example:*
   - `poetry run python test_submission_contract_deployed_link.py https://etherscan.io/token/0xbb9bc244d798123fde783fcc1c72d3bb8c189413#code`

All scripts will automatically output a fully structured `output.json` file in their respective `samples/` directories.
