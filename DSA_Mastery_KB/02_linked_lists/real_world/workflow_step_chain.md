# 🌍 Real World: Workflow Step Chain

**Scenario**: You are building a CI/CD pipeline or an Approval Workflow.
Each step depends on the previous one.
`Build -> Test -> Deploy -> Notify`

This is a **Singly Linked List**.

## The Data Structure
```python
class WorkflowStep:
    def __init__(self, name, command):
        self.name = name
        self.command = command
        self.next_step = None
        
    def execute(self):
        print(f"Running {self.name}: {self.command}")
        # ... logic ...
        if self.next_step:
            self.next_step.execute()
```

## Why Linked List?
1.  **Dynamic Insertion**: You can easily insert a "Security Scan" step between "Test" and "Deploy" without rewriting an array.
2.  **Execution Flow**: The `next` pointer naturally models the sequence of events.

## Example: Inserting a Step
```python
def insert_step_after(prev_step, new_step):
    new_step.next_step = prev_step.next_step
    prev_step.next_step = new_step
```
