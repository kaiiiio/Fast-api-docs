# 🌍 Real World: Cover Letter Generation

**Scenario**: You want to generate a cover letter.
You have 3 paragraphs. For each paragraph, you have 2 variations (Formal vs Casual).
You want to pick the best combination that fits the "Tone Limit" (e.g., total words < 200).

## The Problem
This is the **Knapsack Problem** (or Shortest Path in DAG).
*   Items: Paragraph variants.
*   Weight: Word count.
*   Value: "Fit Score".

## The Solution: DP
`dp[i][w]` = Max score using first `i` paragraphs with total words `w`.

We build the letter by choosing the path that maximizes score while staying under the word limit.
