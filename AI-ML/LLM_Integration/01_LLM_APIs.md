# Comprehensive Guide to Core LLM APIs (OpenAI, Claude, Gemini)

## 1. The LLM API Ecosystem Overview
Integrating Large Language Models (LLMs) via RESTful APIs is the foundational step for any modern AI application. You are not hosting these massive neural networks (which require clusters of GPUs); instead, you are sending a payload (prompt + context) to managed endpoints and receiving a completion.

**Why use APIs over local open-source models?**
- **State-of-the-Art Reasoning**: Proprietary models heavily outperform open-source models (like Llama 3) on complex coding, math, and logic tasks.
- **Zero Infrastructure Management**: You don't need to provision, scale, or maintain $30,000 H100 GPUs.
- **Multimodal Capabilities**: Leading APIs natively handle images, audio, and large datasets seamlessly.

---

## 2. API Providers, Model Subtypes, and Capabilities

### 2.1 OpenAI Ecosystem
OpenAI provides the most robust and widely adopted API platform. It is generally the default choice for new projects due to its massive developer tooling ecosystem (e.g., function calling schemas).

#### Model Subtypes:
- **GPT-4o (Omni)**: The flagship model. Natively multimodal (it doesn't convert audio to text first; the neural net processes the audio waveform directly, reducing latency dramatically). Extremely fast and cost-effective.
- **GPT-4o mini**: The replacement for GPT-3.5. Cheaper and faster, meant for high-volume, low-complexity tasks (like basic data extraction or routing).
- **o1 / o1-mini (Reasoning Models)**: These models use Reinforcement Learning to "think" before they speak. They output a stream of hidden reasoning tokens (Chain-of-Thought) before generating the final answer. 
  * **Use Case**: Advanced mathematics, complex algorithmic coding, or puzzles where standard GPT-4o fails. They do *not* support tool calling or streaming yet.
- **Embedding Models (`text-embedding-3-large`/`small`)**: For converting text to vector arrays (crucial for RAG).

#### Key API Features:
- **Structured Outputs**: You can pass a JSON schema, and the API guarantees 100% adherence to that schema, eliminating the need for complex regex parsing.
- **Function Calling**: Defining tools that the model can request to execute (e.g., `search_database()`).

### 2.2 Anthropic (Claude 3.5 Family)
Anthropic focuses heavily on safety, steerability (adherence to system prompts), and massive context windows (up to 200k tokens).

#### Model Subtypes:
- **Claude 3.5 Sonnet**: The undisputed champion for coding and complex logic tasks as of late 2024. It reliably follows highly intricate, multi-step system prompts better than GPT-4o.
- **Claude 3.5 Haiku**: The fastest and cheapest model. Excels at parsing massive logs or documents where speed is the only metric.
- **Claude 3 Opus (Legacy Flagship)**: Slower and more expensive; currently overshadowed by 3.5 Sonnet, but useful for deeply nuanced creative writing.

#### Key API Features:
- **XML Tagging Optimization**: Claude is explicitly trained to read boundaries defined by XML tags (`<document>`, `<instructions>`).
- **Computer Use (Beta)**: Claude 3.5 Sonnet natively supports a "Computer Use" API where it can view exact screen coordinates, click, and type to automate GUI tasks.
- **Prompt Caching**: If you send the same 100k-token system prompt repeatedly, Anthropic caches it, dropping latency by 80% and cost by 90%.

### 2.3 Google Vertex AI & AI Studio (Gemini 1.5)
Google's Gemini models are built to process immense amounts of context flawlessly.

#### Model Subtypes:
- **Gemini 1.5 Pro**: The flagship model featuring a staggering **2 Million token context window**. You can upload entire codebases (10,000 files) or 2-hour long 1080p videos directly into the prompt.
- **Gemini 1.5 Flash**: Optimized for high-frequency tasks where speed matters more than deep reasoning.

#### Key API Features:
- **Native Multimodality**: Excels at analyzing multiple video files and timestamps simultaneously.
- **Grounding with Google Search**: A native API flag that automatically performs a Google search to verify its generated facts, appending citations (URL links) to its output, dramatically reducing hallucinations.

---

## 3. Steps to Implement an LLM API Integration

Implementing an LLM API in an Express.js backend requires strict adherence to asynchronous principles and error handling.

### Step 1: SDK Initialization & Authentication
Never expose API keys to the frontend (React/Next.js client-side). All LLM calls must route through your backend.
```javascript
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Initialize with environment variables securely
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
```

### Step 2: Payload Construction & Parameters
You must construct an array of messages. The parameter settings dictate the behavior.
- **Temperature (0.0 - 2.0)**: Low (0.0) means deterministic (best for code/math). High (0.8+) means creative/random.
- **Max_Tokens**: Limits the *output* length (preventing runaway generation costs).
- **Top_P**: An alternative to temperature (nucleus sampling). Usually, you alter Temperature OR Top_P, never both.

```javascript
// Step 3: Execution with Error Handling
async function generateSummary(text) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an exacting summarizer. Output EXACTLY 3 bullet points.' },
        { role: 'user', content: `Summarize this text: \n${text}` }
      ],
      temperature: 0.1,
      max_tokens: 150
    });
    
    return response.choices[0].message.content;
    
  } catch (error) {
    if (error.status === 429) {
      console.error("Rate limit exceeded. Implement exponential backoff.");
      // Logic to retry after 'retry-after' header
    } else {
      console.error("API Error: ", error.message);
    }
  }
}
```

---

## 4. Production Architectural Concepts

To scale an LLM integration from a prototype to a production app serving 10,000 users, you must implement the following:

### 4.1 Fallback Routing (Resiliency)
LLM APIs go down frequently. If OpenAI returns a 500 error, your app shouldn't crash.
* **Reasoning**: To maintain a 99.9% uptime SLA, you must catch the OpenAI error and immediately route the exact same prompt to Anthropic's Claude. Libraries like `LiteLLM` handle this routing and normalization automatically.

### 4.2 Rate Limit Management (429s)
You are allotted a specific number of Tokens Per Minute (TPM) and Requests Per Minute (RPM) based on your billing tier.
* **Implementation Steps**:
  1. Use Redis to track user requests per minute.
  2. If the user exceeds their quota, respond to your frontend with a HTTP 429.
  3. If your backend exceeds the *Global API* quota, implement **Exponential Backoff**: wait 2 seconds, try again. If it fails, wait 4 seconds, etc., up to 3 retries before failing the request.

### 4.3 Cost Tracking (FinOps)
Every API response objecy includes a `usage` key (`prompt_tokens: 400`, `completion_tokens: 150`).
* **Implementation**: You must save these metrics to a database (PostgreSQL or Datadog) tagged with the `user_id` on every API call. This is the only way to identify which users are burning through your API budget.
