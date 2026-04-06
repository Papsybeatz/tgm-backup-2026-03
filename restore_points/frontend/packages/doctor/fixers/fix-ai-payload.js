import fs from 'fs';
const path = globalThis.ED_SAFE_PATH;

export default {
  id: 'fix-ai-payload',
  description:
    'Hardens the AI route JSON handling and generates a Windows-safe curl test command.',

  async run({ projectRoot, checkResult }) {
    const logs = [];
    const backendHints = [];
    const envHints = [];

    // 1. Backend hardening: ensure body parsing + defensive logging

    const serverFileCandidates = ['server.js', 'index.js', 'app.js']
      .map(f => path.join(projectRoot, f))
      .filter(f => fs.existsSync(f));

    if (serverFileCandidates.length > 0) {
      const serverFile = serverFileCandidates[0];
      let content = fs.readFileSync(serverFile, 'utf8');

      if (!content.includes("express.json(") && !content.includes("app.use(express.json(")) {
        if (!content.includes("import express")) {
          content = `import express from 'express';\n` + content;
        }

        if (!content.includes('const app = express()')) {
          content = content.replace(
            /const app = .*;/,
            'const app = express();'
          );
        }

        if (!content.includes('app.use(express.json(')) {
          content = content.replace(
            /const app = express\(\);/,
            `const app = express();\napp.use(express.json({ limit: '1mb' }));`
          );
        }

        fs.writeFileSync(serverFile, content);
        logs.push(`Ensured express.json() middleware in ${path.basename(serverFile)}.`);
        backendHints.push('Express JSON body parsing middleware was added or confirmed.');
      }
    }

    // 2. AI route logging for malformed payloads

    const aiFile = path.join(projectRoot, 'api', 'ai.js');
    if (fs.existsSync(aiFile)) {
      let aiContent = fs.readFileSync(aiFile, 'utf8');

      if (!aiContent.includes('AI_PAYLOAD_DIAGNOSTIC_LOG')) {
        aiContent = aiContent.replace(
          /router\.post\([^]*?\{/,
          match =>
            `${match}
  console.log('AI_PAYLOAD_DIAGNOSTIC_LOG', {
    headers: req.headers,
    bodyType: typeof req.body,
    bodySample: JSON.stringify(req.body).slice(0, 500)
  });`
        );

        fs.writeFileSync(aiFile, aiContent);
        logs.push('Added diagnostic logging to AI route for payload inspection.');
        backendHints.push('AI route now logs payload structure for malformed JSON debugging.');
      }
    }

    // 3. Environment: generate Windows-safe curl command

    const testScriptDir = path.join(projectRoot, 'scripts');
    if (!fs.existsSync(testScriptDir)) {
      fs.mkdirSync(testScriptDir, { recursive: true });
    }

    const psScript = `
# Windows-safe AI payload test
# Forces use of curl.exe instead of PowerShell's Invoke-WebRequest alias

$body = @{
  "prompt" = "Doctor AI payload integrity test"
  "meta"   = @{
    "source" = "enterprise-doctor"
    "type"   = "diagnostic"
  }
} | ConvertTo-Json -Depth 5

$exe = (Get-Command curl.exe -ErrorAction SilentlyContinue)
if (-not $exe) {
  Write-Host "curl.exe not found. Please install curl or run from Git Bash."
  exit 1
}

& $exe "http://localhost:4000/api/ai" ^
  -H "Content-Type: application/json" ^
  -d "$body"
`.trim();

    const psPath = path.join(testScriptDir, 'test-ai-payload.ps1');
    fs.writeFileSync(psPath, psScript);
    logs.push('Generated scripts/test-ai-payload.ps1 for Windows-safe JSON testing.');
    envHints.push('Use scripts/test-ai-payload.ps1 to avoid PowerShell JSON/quoting issues.');

    return {
      ok: true,
      message: 'AI payload handling hardened and environment test script generated.',
      logs,
      backendHints,
      envHints,
      artifacts: {
        testScript: psPath
      }
    };
  }
};