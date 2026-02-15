import re

file_path = r'c:\Users\nikit\Downloads\Nikita\Prepare\Knowledge-base\Dump_1\SQL_Notes.md'
output_path = r'c:\Users\nikit\Downloads\Nikita\Prepare\Knowledge-base\Dump_1\SQL_Notes_Styled.md'

def style_sql_notes(content):
    # 1. Standardize headers (===== decorative to #)
    # Match headers with many = or - above/below
    content = re.sub(r'={5,}\n+(.*?)\n+={5,}', r'## \1', content)
    content = re.sub(r'-{5,}\n+(.*?)\n+-{5,}', r'### \1', content)
    
    # Also handle headers that just have a bar below them, but avoid list items
    content = re.sub(r'\n(?!\s*- )([^\n]+)\n={5,}\n', r'\n## \1\n', content)
    content = re.sub(r'\n(?!\s*- )([^\n]+)\n-{5,}\n', r'\n### \1\n', content)
    
    # 2. Fix broken emojis (based on common patterns seen)
    emojis = {
        'ðŸ“š': '📚',
        'ðŸ“–': '📖',
        'ðŸ’¡': '💡',
        'âœ⚡': '⚡',
        'ðŸ—️': '🛠️',
        'ðŸŸ¢': '🟢',
        'ðŸ”µ': '🔵',
        'ðŸ“˜': '📘',
        'ðŸ§±': '🧱',
        'ðŸ§©': '🧩',
        'ðŸ§ ': '🧠',
        'ï¸ ': '', # fix weird space-like chars
        'âƒ£': '', # fix numbered icons
        'ï¿½': '', # clean up broken chars
        'ðŸš€': '🚀',
        'ðŸ§°': '🛠️',
        'ðŸ’': '⚡',
        'ðŸ“Š': '📊',
        'ðŸ”—': '🔗',
        'ðŸš«': '🚫',
        'ðŸ˜Ž': '😎',
        'âš⚡': '⚡',
        'âš ï¸ ': '⚠️',
        '1ï¸ ': '1.',
        '2ï¸ ': '2.',
        '3ï¸ ': '3.',
        '4ï¸ ': '4.',
        '5ï¸ ': '5.',
        '6ï¸ ': '6.',
        '7ï¸ ': '7.',
        '8ï¸ ': '8.',
        '9ï¸ ': '9.',
        'ðŸ”Ÿ': '10.',
    }
    for old, new in emojis.items():
        content = content.replace(old, new)

    # 3. Standardize horizontal separators
    content = re.sub(r'-{5,}', '---', content)
    content = re.sub(r'={5,}', '---', content)

    # 4. Fix specific section headers that are already weirdly formatted
    content = re.sub(r'## \*\* (.*?) \*\*', r'## \1', content)
    
    # 5. Clean up conversational filler using regex to be safe
    filler_patterns = [
        r"Perfect 😎 — let’s go blazingly fast but solid\.",
        r"We’ll move from basics → intermediate → advanced in bite-sized, practical bursts — you’ll learn by doing small queries that actually build up intuition\.",
        r"Would you like me to make this interactive, where I teach you concept-by-concept with a small task after every step \(and we go from beginner → pro in ~10 sessions\)\?",
        r"That’s the fastest way to actually learn it\.",
        r"Let’s go step-by-step and make this crystal clear 👇",
        r"Let’s go step - by - step — here’s a \*\* clear and complete explanation of \* method overloading \* in C\+\+ \*\*, with examples and notes on how it works under the hood\.",
        r"Perfect! Let’s do a \*\* deep - dive PostgreSQL tutorial \*\*",
        r"Absolutely! Let’s do this in a \*\* memory - friendly, structured way \*\*",
        r"Do you want me to do that \?",
        r"Do you want me to make that visual map\?",
        r"Perfect! Let’s make this \*\*super concise, structured, and interview-friendly\*\*.*",
        r"Perfect! Let’s do a \*\*deep dive into modifying data and control flow in PostgreSQL\*\*.*"
    ]
    for pattern in filler_patterns:
        content = re.sub(pattern, "", content)

    # 6. Clean up empty/redundant headers and markers
    content = re.sub(r'\n#+\s*\n', '\n', content) # Remove empty headers
    content = re.sub(r'\n\s*---\s*\n\s*---\s*\n', '\n---\n', content) # Remove double separators
    content = re.sub(r'\n\s*###\s*---\s*\n', '\n---\n', content) # Double cleanup
    content = re.sub(r'(---\n\s*)+', '---\n', content) # Collapse multiple separators
    content = content.replace('\n## \n', '\n')
    content = content.replace('\n### \n', '\n')
    content = re.sub(r'\n## -\s*(.*?)\n', r'\n- \1\n', content) # Fix list items turned into headers
    
    # 7. Final pass to remove any leftover empty lines or weird fragments
    content = re.sub(r'\n{3,}', '\n\n', content) # Normalize whitespace

    # 7. Syntax highlighting for code blocks
    content = re.sub(r'```(?!\w)\s*(\n\s*(?:SELECT|CREATE|INSERT|UPDATE|DELETE|WITH|ALTER|DROP|BEGIN|COMMIT|ROLLBACK|VALUES).*?)```', r'```sql\1```', content, flags=re.IGNORECASE | re.DOTALL)
    content = re.sub(r'```(?!\w)\s*(\n\s*(?:#include|class|int main|void|template).*?)```', r'```cpp\1```', content, flags=re.DOTALL)
    content = re.sub(r'```(?!\w)\s*(\n\s*(?:const|function|let|require|import).*?)```', r'```javascript\1```', content, flags=re.DOTALL)

    return content

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    styled_content = style_sql_notes(content)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(styled_content)
    
    print(f"Styled file saved to {output_path}")
except Exception as e:
    print(f"Error: {e}")
