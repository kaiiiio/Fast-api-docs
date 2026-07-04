# SQLAlchemy Relationships: Minimal Guide

## Common Patterns
1.  **One-to-Many:** `User` has multiple `Posts`.
2.  **Many-to-One:** `Post` belongs to one `User`.
3.  **Many-to-Many:** `Users` and `Teams` linked via an association table.

## Implementation Details
*   **`relationship("TargetModel")`:** Sets up the Python-level link between models.
*   **`back_populates`:** Ensures bidirectional synchronization (if A updates, B knows).
*   **`ForeignKey("table.column")`:** Sets up the database-level constraint.

## Eager Loading (Performance)
1.  **`selectinload`:** Best for One-to-Many or Many-to-Many. Executes a separate SELECT query.
2.  **`joinedload`:** Best for Many-to-One. Uses a single SQL JOIN.
3.  **`lazy="selectin"`** (Model-level): Recommended for default eager loading.

## Best Practices
- ✅ Always use **`index=True`** on ForeignKey columns.
- ✅ Avoid **Lazy Loading** in async code (leads to errors). Use Eager options!
- ✅ Define **`passive_deletes=True`** for efficient ON DELETE CASCADE.
- ✅ Use **Indices** for frequently joined fields to speed up queries.

## Summary Checklist
- ✅ Bidirectional relations (back_populates)
- ✅ Foreign Key constraints
- ✅ Eager loading configured (to avoid N+1)