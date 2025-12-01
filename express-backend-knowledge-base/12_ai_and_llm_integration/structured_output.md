# Structured Output: Getting Validated LLM Responses

Structured output ensures LLMs return valid, parseable data. This guide covers getting structured output from LLMs in Express.js applications.

## The Problem

**Without structured output:**
```javascript
const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Extract user info from: John, 30, john@example.com' }]
});

const text = response.choices[0].message.content;
// "The user is John Doe, age 30, email john@example.com"
// How to parse? Split? Regex? Fragile!
```

## Solution: Structured Output

### Using OpenAI Function Calling

```javascript
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define schema
const userInfoSchema = {
    type: 'object',
    properties: {
        name: { type: 'string', description: 'User full name' },
        age: { type: 'number', description: 'User age', minimum: 0, maximum: 150 },
        email: { type: 'string', description: 'User email' },
        interests: { type: 'array', items: { type: 'string' } }
    },
    required: ['name', 'age', 'email']
};

// Extract structured data
async function extractUserInfo(text) {
    const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
            { role: 'system', content: 'Extract user information from text.' },
            { role: 'user', content: text }
        ],
        functions: [{
            name: 'extract_user_info',
            description: 'Extract user information',
            parameters: userInfoSchema
        }],
        function_call: { name: 'extract_user_info' }
    });
    
    // Parse and validate
    const functionCall = response.choices[0].message.function_call;
    const userInfo = JSON.parse(functionCall.arguments);
    
    // Validate
    if (!userInfo.name || !userInfo.email) {
        throw new Error('Invalid user info');
    }
    
    return userInfo;
}
```

## Real-World Examples

### Example 1: Product Recommendations

```javascript
const recommendationSchema = {
    type: 'object',
    properties: {
        product_id: { type: 'number' },
        product_name: { type: 'string' },
        match_score: { type: 'number', minimum: 0, maximum: 1 },
        reasons: { type: 'array', items: { type: 'string' } },
        price: { type: 'number' }
    },
    required: ['product_id', 'product_name', 'match_score']
};

async function getRecommendations(userQuery, products) {
    const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
            {
                role: 'system',
                content: 'Recommend products based on user needs.'
            },
            {
                role: 'user',
                content: `Query: ${userQuery}\nProducts: ${JSON.stringify(products)}`
            }
        ],
        functions: [{
            name: 'recommend_product',
            parameters: recommendationSchema
        }],
        function_call: { name: 'recommend_product' }
    });
    
    return JSON.parse(response.choices[0].message.function_call.arguments);
}
```

## Best Practices

1. **Define Schemas**: Use JSON Schema
2. **Validate Output**: Always validate parsed data
3. **Handle Errors**: Parse errors gracefully
4. **Use Function Calling**: For structured output
5. **Test Schemas**: Test with various inputs

## Summary

**Structured Output:**

1. **Purpose**: Get validated, parseable LLM responses
2. **Method**: Function calling with JSON Schema
3. **Benefits**: Type-safe, validated data
4. **Best Practice**: Define schemas, validate output
5. **Use Cases**: Data extraction, recommendations

**Key Takeaway:**
Structured output ensures LLMs return valid, parseable data. Use OpenAI function calling with JSON Schema to define output structure. Always validate parsed data. Handle errors gracefully. Use structured output for data extraction, recommendations, and any scenario requiring validated responses.

**Output Strategy:**
- Define JSON schemas
- Use function calling
- Validate output
- Handle errors
- Test thoroughly

**Next Steps:**
- Learn [OpenAI Integration](openai_integration.md) for basics
- Study [Cost Tracking](ai_cost_tracking.md) for monitoring
- Master [Error Handling](../12_ai_and_llm_integration/ai_call_retry.md) for reliability

