# Fast & Slow Pointers: The Race

## Scenario: Detect Cycle
Track: 1 -> 2 -> 3 -> 4 -> 5 -> 3 (Cycle!)

### Step 1: Start Line
```
[ 1 ] -> [ 2 ] -> [ 3 ] -> [ 4 ] -> [ 5 ]
  ^
 S,F
```

### Step 2: Gunshot
Slow moves 1 step. Fast moves 2 steps.
```
[ 1 ] -> [ 2 ] -> [ 3 ] -> [ 4 ] -> [ 5 ]
           ^        ^
           S        F
```

### Step 3: Lap 2
```
[ 1 ] -> [ 2 ] -> [ 3 ] -> [ 4 ] -> [ 5 ] -> [ 3 ]...
                    ^                 ^
                    S                 F
```

### Step 4: Collision!
Fast laps Slow. They meet at Node 5.
**Cycle Detected!**
