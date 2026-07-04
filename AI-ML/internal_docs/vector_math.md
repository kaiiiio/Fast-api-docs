# Vector Math (expanded)

This file explains the numeric operations used when comparing embeddings, with short code examples.

1) Dot product and cosine similarity (recap)

Dot product:

```
dot(a,b) = sum(a[i] * b[i])
```

Cosine similarity:

```
cos_sim(a,b) = dot(a,b) / (||a|| * ||b||)
```

2) Normalization (code)

JavaScript example to normalize a vector:

```javascript
function norm(v) {
  const sumSquares = v.reduce((s,x) => s + x*x, 0);
  const length = Math.sqrt(sumSquares);
  return v.map(x => x / (length || 1e-12));
}
```

3) Compute cosine similarity:

```javascript
function dot(a,b) {
  return a.reduce((s,x,i) => s + x * b[i], 0);
}

function cosine(a,b) {
  return dot(a,b) / (Math.sqrt(dot(a,a)) * Math.sqrt(dot(b,b)));
}
```

4) Example numeric run

```
a = [1,2,3]
b = [2,0,1]
dot = 5
|a| = sqrt(14)
|b| = sqrt(5)
cosine = 5 / (sqrt(14)*sqrt(5)) ≈ 0.5976
```

5) Complexity and scaling
- Brute-force search: O(N * d) per query.
- ANN indexes reduce this substantially for large N.
