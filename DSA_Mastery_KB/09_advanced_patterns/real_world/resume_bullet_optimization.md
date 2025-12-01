# 🌍 Real World: Resume Bullet Optimization

**Scenario**: You have 10 bullet points. You can only fit 5.
You want to pick the set that maximizes "Impact Score" but covers "Required Keywords".

## The Pattern: Backtracking (Constraint Satisfaction)
We need to try combinations.

1.  **State**: `(index, current_score, covered_keywords)`
2.  **Choice**: Include Bullet `i` OR Skip Bullet `i`.
3.  **Constraint**: Total bullets <= 5.
4.  **Goal**: Maximize `current_score`.

## Optimization
If `current_score + max_possible_remaining < best_score_so_far`, **Prune** (Stop exploring this branch).
This turns O(2^N) into something manageable.
