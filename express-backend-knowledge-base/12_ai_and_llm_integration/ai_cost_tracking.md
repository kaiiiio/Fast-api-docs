# AI Cost Tracking: Monitoring LLM API Costs

Tracking LLM API costs is crucial for budget management. This guide covers cost tracking, analytics, and optimization in Express.js applications.

## Understanding AI Costs

**Cost factors:**
- Model pricing (different models have different costs)
- Input tokens (prompt length)
- Output tokens (response length)
- API overhead

## Database Schema

```javascript
const LLMCallLog = sequelize.define('LLMCallLog', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    model: { type: DataTypes.STRING, allowNull: false, index: true },
    provider: { type: DataTypes.STRING, allowNull: false },
    input_tokens: { type: DataTypes.INTEGER, allowNull: false },
    output_tokens: { type: DataTypes.INTEGER, allowNull: false },
    total_tokens: { type: DataTypes.INTEGER, allowNull: false },
    input_cost: { type: DataTypes.FLOAT, allowNull: false },
    output_cost: { type: DataTypes.FLOAT, allowNull: false },
    total_cost: { type: DataTypes.FLOAT, allowNull: false, index: true },
    user_id: { type: DataTypes.INTEGER, index: true },
    endpoint: { type: DataTypes.STRING, index: true },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, index: true },
    duration_ms: { type: DataTypes.FLOAT },
    success: { type: DataTypes.BOOLEAN, defaultValue: true, index: true }
});
```

## Pricing Configuration

```javascript
const LLM_PRICING = {
    openai: {
        'gpt-4': { input: 30.0, output: 60.0 },  // per 1M tokens
        'gpt-4-turbo': { input: 10.0, output: 30.0 },
        'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
        'text-embedding-3-small': { input: 0.13, output: 0.0 }
    }
};

function calculateCost(provider, model, inputTokens, outputTokens) {
    const pricing = LLM_PRICING[provider][model];
    const inputCost = (inputTokens / 1000000) * pricing.input;
    const outputCost = (outputTokens / 1000000) * pricing.output;
    return {
        inputCost,
        outputCost,
        totalCost: inputCost + outputCost
    };
}
```

## Cost Tracking Middleware

```javascript
async function trackLLMCall(provider, model, usage, userId, endpoint) {
    const cost = calculateCost(provider, model, usage.prompt_tokens, usage.completion_tokens);
    
    await LLMCallLog.create({
        provider,
        model,
        input_tokens: usage.prompt_tokens,
        output_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
        input_cost: cost.inputCost,
        output_cost: cost.outputCost,
        total_cost: cost.totalCost,
        user_id: userId,
        endpoint,
        timestamp: new Date()
    });
}

// Use in OpenAI calls
async function callOpenAI(prompt, userId, endpoint) {
    const startTime = Date.now();
    
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }]
        });
        
        const duration = Date.now() - startTime;
        
        // Track cost
        await trackLLMCall(
            'openai',
            'gpt-3.5-turbo',
            response.usage,
            userId,
            endpoint
        );
        
        return response.choices[0].message.content;
    } catch (error) {
        // Track failed call
        await LLMCallLog.create({
            provider: 'openai',
            model: 'gpt-3.5-turbo',
            success: false,
            user_id: userId,
            endpoint
        });
        throw error;
    }
}
```

## Cost Analytics

```javascript
// Get cost by user
app.get('/analytics/cost/user/:userId', async (req, res) => {
    const { startDate, endDate } = req.query;
    
    const costs = await LLMCallLog.findAll({
        where: {
            user_id: req.params.userId,
            timestamp: {
                [Sequelize.Op.between]: [startDate, endDate]
            }
        },
        attributes: [
            'model',
            [sequelize.fn('SUM', sequelize.col('total_cost')), 'total_cost'],
            [sequelize.fn('SUM', sequelize.col('total_tokens')), 'total_tokens']
        ],
        group: ['model']
    });
    
    res.json(costs);
});

// Get total cost
app.get('/analytics/cost/total', async (req, res) => {
    const total = await LLMCallLog.sum('total_cost', {
        where: {
            timestamp: {
                [Sequelize.Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
        }
    });
    
    res.json({ total_cost: total });
});
```

## Best Practices

1. **Track All Calls**: Log every API call
2. **Monitor Costs**: Set up alerts
3. **Optimize Models**: Use cheaper models when possible
4. **Cache Responses**: Cache similar prompts
5. **Set Budgets**: Enforce spending limits

## Summary

**AI Cost Tracking:**

1. **Purpose**: Monitor and control LLM API costs
2. **Tracking**: Log all calls with token usage
3. **Analytics**: Cost by user, model, time period
4. **Best Practice**: Track all calls, monitor costs, optimize
5. **Benefits**: Budget control, cost optimization

**Key Takeaway:**
AI cost tracking monitors LLM API usage and costs. Log all API calls with token usage and calculate costs based on model pricing. Provide analytics for cost by user, model, and time period. Set up alerts and budgets. Optimize by using cheaper models and caching responses.

**Cost Strategy:**
- Track all calls
- Monitor costs
- Optimize models
- Cache responses
- Set budgets

**Next Steps:**
- Learn [OpenAI Integration](openai_integration.md) for basics
- Study [Structured Output](structured_output.md) for parsing
- Master [Error Handling](../12_ai_and_llm_integration/ai_call_retry.md) for reliability

