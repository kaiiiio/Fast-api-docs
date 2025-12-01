# ⚔️ LeetCode 20: Valid Parentheses

**Difficulty**: Easy
**Pattern**: Stack

## Problem
Given a string containing `(`, `)`, `{`, `}`, `[`, `]`, determine if it is valid.
Valid: `()[]{}`. Invalid: `(]`.

## Approach
1.  Iterate through string.
2.  If **Open Bracket** (`(`, `{`, `[`): Push to Stack.
3.  If **Close Bracket**:
    *   Check if Stack is empty (Invalid).
    *   Pop from Stack.
    *   If popped element doesn't match current close bracket -> Invalid.
4.  At end, Stack must be empty.

*   Time: O(N)
*   Space: O(N)

```python
def isValid(s):
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    
    for char in s:
        if char in mapping:
            # Closing bracket
            top_element = stack.pop() if stack else '#'
            if mapping[char] != top_element:
                return False
        else:
            # Opening bracket
            stack.append(char)
            
    return not stack
```
