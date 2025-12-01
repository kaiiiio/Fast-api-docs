# Two Pointers: ASCII Visualization

## Scenario: Two Sum (Sorted Array)
Target: 9

### Step 1: Start at ends
```
[ 2,  7, 11, 15 ]
  ^           ^
  L           R

Sum = 2 + 15 = 17
17 > 9  => Too big! Move R left.
```

### Step 2: Shrink from right
```
[ 2,  7, 11, 15 ]
  ^       ^
  L       R

Sum = 2 + 11 = 13
13 > 9  => Too big! Move R left.
```

### Step 3: Found it!
```
[ 2,  7, 11, 15 ]
  ^   ^
  L   R

Sum = 2 + 7 = 9
9 == 9  => Match! Return [0, 1]
```
