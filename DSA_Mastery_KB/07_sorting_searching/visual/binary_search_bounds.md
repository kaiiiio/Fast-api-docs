# Binary Search: The Bounds

"Halving the search space."

Target: **7**
Array: `[1, 3, 5, 7, 9, 11]`

## Step 1
`L=0`, `R=5`. `Mid=2` (Val: 5).
5 < 7. Target is to the RIGHT.
`L = Mid + 1 = 3`.

```
[1, 3, 5, 7, 9, 11]
          ^  ^   ^
          L  M   R
```

## Step 2
`L=3`, `R=5`. `Mid=4` (Val: 9).
9 > 7. Target is to the LEFT.
`R = Mid - 1 = 3`.

```
[1, 3, 5, 7, 9, 11]
          ^
        L,R,M
```

## Step 3
`L=3`, `R=3`. `Mid=3` (Val: 7).
7 == 7. **FOUND!**
