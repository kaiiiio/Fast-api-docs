# Knowledge Representation: How AI "Knows" Things

Knowledge representation (KR) is about how to model information so a computer can reason with it.

## 🧱 Core KR Methods

### 1. Logic-Based (Predicate Logic)
- **Concept**: Representing facts as logical statements.
- **Example**: `All humans are mortal` -> $\forall x (Human(x) \implies Mortal(x))$.
- **Inference**: If `Socrates is human`, the system can "infer" that `Socrates is mortal`.

### 2. Semantic Networks
- **Concept**: A graph where nodes are objects and edges represent relationships.
- **Relationship Examples**: `Is-A` (Cat Is-A Mammal), `Part-Of` (Engine Part-Of Car).

### 3. Ontologies
- **Concept**: A formal way of naming and defining the types, properties, and relationships of entities in a domain.
- **Use Case**: The "Semantic Web" and Medical Databases.

---

## ⛓️ Reasoning & Inference

### 1. Forward Chaining (Data-Driven)
- Start with known facts and apply rules to find more facts.
- *If I see smoke, and a rule says Smoke -> Fire, I conclude there is a fire.*

### 2. Backward Chaining (Goal-Driven)
- Start with a goal and look for facts that support it.
- *Is there a fire? Check if there is smoke.*

---

## 📉 Uncertainty: Fuzzy Logic & Bayesian Networks
Traditional logic is binary (True/False). Real-world AI needs to handle "Maybe."

- **Fuzzy Logic**: Handles degrees of truth (e.g., "Slightly Hot" vs "Very Hot"). Used in washing machines and braking systems.
- **Bayesian Networks**: Uses probability to model dependencies between variables.
    - *If the grass is wet, what is the probability it rained vs the sprinkler was on?*
