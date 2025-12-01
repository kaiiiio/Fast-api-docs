# 🧠 Intuition: Stack for Undo/Redo

Why do text editors use Stacks?

## The Problem
User types "A", then "B", then deletes "B".
We need to "go back" in time.

## The Solution: Two Stacks
1.  **Undo Stack**: Stores every action you DO.
2.  **Redo Stack**: Stores every action you UNDO.

### Scenario
1.  Type "Hello": Push "Type Hello" to **Undo Stack**.
2.  Type "World": Push "Type World" to **Undo Stack**.
3.  **User hits Ctrl+Z (Undo)**:
    *   Pop "Type World" from **Undo Stack**.
    *   Reverse it (Delete "World").
    *   Push "Type World" to **Redo Stack**.

Now, if user hits Ctrl+Y (Redo), we pop from Redo Stack and push back to Undo Stack.
