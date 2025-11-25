# Mistral AI Setup Guide

## Quick Reference: Claude → Mistral Changes

---

## Step-by-Step Setup

### 1. Get Mistral API Key

1. Go to https://console.mistral.ai/
2. Sign up or log in
3. Navigate to "API Keys"
4. Click "Create new key"
5. Copy your API key (starts with: `...`)

### 2. Update Dependencies

```bash
# Remove Claude SDK
npm uninstall @anthropic-ai/sdk

# Install Mistral SDK
npm install @mistralai/mistralai
```

### 3. Update Environment Variables

Edit your `.env` file:

```bash

# To:
MISTRAL_API_KEY=your_mistral_key_here
DATABASE_URL=https://crnzwmtkhsaxotfzhadx.supabase.co
SUPABASE_KEY=sb_secret_jtCz5Ajtbt6umcxmTD8sGw_uk1SM5wL
```

### 4. Considerations
  
// NEW (Mistral)
import { Mistral } from '@mistralai/mistralai';
private client: Mistral;
private model = 'mistral-large-latest';
```

### 5. Update main.ts

Change the environment variable check:

```typescript
// OLD
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('Error: ANTHROPIC_API_KEY not set');
}

// NEW
const apiKey = process.env.MISTRAL_API_KEY;
if (!apiKey) {
  console.error('Error: MISTRAL_API_KEY not set');
  console.error('   Get your API key from: https://console.mistral.ai/');
}
```

### 6. Test the Setup

```bash
# Build
npm run build

# Test with 1 paper
# Edit src/main.ts temporarily:
# Change: buildGaussianSplattingGraph(1)
npm start
```

---

## API Comparison



### Mistral API Call:
```typescript
const chatResponse = await mistral.chat.complete({
  model: "mistral-large-latest",
  maxTokens: 4096,
  temperature: 0.3,
  messages: [
    { role: 'user', content: prompt }
  ],
  responseFormat: {
    type: 'json_object'  // Native JSON mode!
  }
});

const text = chatResponse.choices?.[0]?.message?.content || '';
```

---

## Key Differences

### 1. JSON Mode


**Mistral**: Native JSON mode
```typescript
responseFormat: {
  type: 'json_object'  // Guarantees valid JSON
}
```

### 2. Response Structure

**Claude**:
```typescript
{
  content: [
    { type: "text", text: "..." }
  ]
}
```

**Mistral**:
```typescript
{
  choices: [
    {
      message: {
        content: "..."
      }
    }
  ]
}
```

### 3. Model Names

**Mistral**:
- `mistral-large-latest` (auto-updates to latest)
- `mistral-medium-latest` (mid-tier)
- `mistral-small-latest` (faster, cheaper)
- `open-mistral-7b` (open-source)

---

## Advanced Mistral Features

### 1. Streaming (Optional)

```typescript
const stream = await mistral.chat.stream({
  model: 'mistral-large-latest',
  messages: [{ role: 'user', content: prompt }]
});

for await (const chunk of stream) {
  console.log(chunk.choices[0].delta.content);
}
```

### 2. Function Calling (Future Enhancement)

```typescript
const response = await mistral.chat.complete({
  model: 'mistral-large-latest',
  messages: [...],
  tools: [
    {
      type: 'function',
      function: {
        name: 'extract_concepts',
        parameters: { ... }
      }
    }
  ]
});
```

### 3. Embeddings (For Future Search)

```typescript
const embeddings = await mistral.embeddings.create({
  model: 'mistral-embed',
  inputs: ['Text to embed...']
});
```

---

## Troubleshooting

### Error: "Invalid API key"

```bash
# Check your API key
echo $MISTRAL_API_KEY

# Verify it's in .env file
cat .env | grep MISTRAL

# Get new key from:
# https://console.mistral.ai/
```

### Error: "Rate limit exceeded"

Mistral free tier limits:
- 1 million tokens/month
- 5 requests/second

Solution:
```typescript
// Add delay between requests (already implemented)
await sleep(3000); // 3 seconds
```

### Error: "Model not found"

Available models:
- `mistral-large-latest` (recommended)
- `mistral-medium-latest`
- `mistral-small-latest` 
- `mistral-tiny` (deprecated)

### Error: "JSON parsing failed"

With Mistral's JSON mode, this should be rare. If it happens:

```typescript
// The code already handles this:
try {
  const parsed = JSON.parse(cleaned);
} catch (error) {
  console.error('Failed to parse');
  return {
    concepts: [],
    methods: [],
    relationships: []
  };
}
```

---

## Checklist

- [ ] Install `@mistralai/mistralai`
- [ ] Update `.env` with `MISTRAL_API_KEY`
- [ ] Replace `extractionAgent.ts`
- [ ] Update `main.ts` env check
- [ ] Update `README.md` with Mistral info
- [ ] Update `package.json`
- [ ] Test with 1 paper
- [ ] Test with 5 papers
- [ ] Deploy

---

## Testing

```bash
# Quick test
npm run dev

# Should see:
# Academic Paper Knowledge Graph Builder
# Powered by Mistral AI
# ==========================================
```

---

## Documentation Updates

After switching to Mistral, update these files:

1. `README.md` - Replace Claude references
2. `ARCHITECTURE.md` - Update model selection section
3. `.env.example` - Use MISTRAL_API_KEY
4. `package.json` - Update dependencies


---

## Support

**Mistral Documentation**: https://docs.mistral.ai/  
**API Reference**: https://docs.mistral.ai/api/  
**Community Discord**: https://discord.gg/mistral  

**Issues?** Open an issue on GitHub or contact [joedimos@gmail.com]
