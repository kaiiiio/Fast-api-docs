# 🌍 Real World: Tech Stack Trie

**Scenario**: You are building a "Skill Normalizer" for resumes.
User types: "React.js", "ReactJS", "React".
We want to map them all to "React".

## The Data Structure: Trie (Prefix Tree)
Store standard skills in a Trie.

## Optimization: Autocomplete
When user types "Re...", we traverse the Trie:
`R -> e -> a -> c -> t`
We find "React", "React Native", "Redis".

## Why Trie?
*   **Speed**: O(L) where L is word length. Faster than Hash Map for prefix search.
*   **Space**: Shared prefixes save memory. "React" and "Reader" share "R-e-a".
