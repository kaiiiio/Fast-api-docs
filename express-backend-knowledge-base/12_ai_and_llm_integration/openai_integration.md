# OpenAI Integration: Using AI in Express.js Applications

Integrating OpenAI (or other LLMs) enables AI-powered features like chatbots, content generation, and embeddings. This guide covers OpenAI integration in Express.js.

## Installation

```bash
npm install openai
```

## Basic Setup

### Initialize OpenAI Client

```javascript
const { OpenAI } = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});
```

## Text Generation

### Chat Completion

```javascript
app.post('/chat', async (req, res) => {
    const { message } = req.body;
    
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: message }
            ],
            temperature: 0.7,
            max_tokens: 500
        });
        
        const response = completion.choices[0].message.content;
        res.json({ response });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

## Embeddings

### Generate Embeddings

```javascript
async function generateEmbedding(text) {
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
    });
    
    return response.data[0].embedding;
}

// Use in route
app.post('/documents', async (req, res) => {
    const { content } = req.body;
    
    // Generate embedding
    const embedding = await generateEmbedding(content);
    
    // Store in database
    await Document.create({
        content,
        embedding
    });
    
    res.status(201).json({ message: 'Document stored' });
});
```

## Real-World Examples

### Example 1: AI Chatbot

```javascript
const conversationHistory = new Map();

app.post('/chat', async (req, res) => {
    const { userId, message } = req.body;
    
    // Get conversation history
    const history = conversationHistory.get(userId) || [];
    
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                ...history,
                { role: 'user', content: message }
            ],
            temperature: 0.7
        });
        
        const response = completion.choices[0].message.content;
        
        // Update history
        history.push(
            { role: 'user', content: message },
            { role: 'assistant', content: response }
        );
        conversationHistory.set(userId, history.slice(-10));  // Keep last 10
        
        res.json({ response });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

### Example 2: Content Generation

```javascript
app.post('/generate-content', async (req, res) => {
    const { type, topic, length } = req.body;
    
    const prompts = {
        blog: `Write a blog post about ${topic} (${length} words)`,
        summary: `Summarize: ${topic}`,
        email: `Write a professional email about ${topic}`
    };
    
    const prompt = prompts[type] || prompts.blog;
    
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: length === 'short' ? 200 : length === 'medium' ? 500 : 1000
        });
        
        const content = completion.choices[0].message.content;
        res.json({ content });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

## Best Practices

1. **Rate Limiting**: Implement rate limiting for API calls
2. **Error Handling**: Handle API errors gracefully
3. **Cost Tracking**: Monitor API usage and costs
4. **Caching**: Cache responses when appropriate
5. **Token Limits**: Respect token limits

## Summary

**OpenAI Integration:**

1. **Purpose**: AI-powered features in applications
2. **Features**: Text generation, embeddings, chat
3. **Best Practice**: Rate limiting, error handling, cost tracking
4. **Use Cases**: Chatbots, content generation, semantic search
5. **Considerations**: API costs, rate limits, token limits

**Key Takeaway:**
OpenAI integration enables AI-powered features in Express.js applications. Use chat completions for text generation, embeddings for semantic search, and handle errors and rate limits appropriately. Monitor API usage and costs, and cache responses when possible.

**Integration Points:**
- Chat completions for text generation
- Embeddings for semantic search
- Error handling and retries
- Rate limiting
- Cost tracking

**Next Steps:**
- Learn [Structured Output](../12_ai_and_llm_integration/structured_output.md) for parsing responses
- Study [Cost Tracking](../12_ai_and_llm_integration/cost_tracking.md) for monitoring
- Master [Error Handling](../12_ai_and_llm_integration/error_handling.md) for reliability

