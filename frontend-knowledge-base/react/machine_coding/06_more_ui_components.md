# More UI Components: Traffic Light, Like Button, Digital Clock, Dice Roller

Complete solutions for additional React UI components from GreatFrontEnd.

## 1. Traffic Light

### Question
Build a traffic light where the lights switch from green to yellow to red after predetermined intervals and loop indefinitely.

### Solution

```jsx
import React, { useState, useEffect } from 'react';

function TrafficLight() {
    const [currentLight, setCurrentLight] = useState('red');
    
    const lightSequence = [
        { color: 'red', duration: 5000 },
        { color: 'yellow', duration: 2000 },
        { color: 'green', duration: 5000 }
    ];

    useEffect(() => {
        const currentIndex = lightSequence.findIndex(light => light.color === currentLight);
        const currentLightConfig = lightSequence[currentIndex];
        
        const timer = setTimeout(() => {
            const nextIndex = (currentIndex + 1) % lightSequence.length;
            setCurrentLight(lightSequence[nextIndex].color);
        }, currentLightConfig.duration);

        return () => clearTimeout(timer);
    }, [currentLight]);

    return (
        <div className="traffic-light">
            <div className={`light red ${currentLight === 'red' ? 'active' : ''}`} />
            <div className={`light yellow ${currentLight === 'yellow' ? 'active' : ''}`} />
            <div className={`light green ${currentLight === 'green' ? 'active' : ''}`} />
        </div>
    );
}
```

### CSS

```css
.traffic-light {
    width: 100px;
    background: #333;
    border-radius: 10px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 15px;
    align-items: center;
}

.light {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: #444;
    transition: opacity 0.3s;
    opacity: 0.3;
}

.light.active {
    opacity: 1;
    box-shadow: 0 0 20px currentColor;
}

.light.red.active {
    background: #ff4444;
    color: #ff4444;
}

.light.yellow.active {
    background: #ffaa00;
    color: #ffaa00;
}

.light.green.active {
    background: #44ff44;
    color: #44ff44;
}
```

### Explanation
- **State Management**: Tracks current active light
- **Sequence**: Red → Yellow → Green → Red (loop)
- **Timing**: Different durations for each light
- **Auto-advance**: Automatically switches after duration
- **Visual Feedback**: Active light is brighter with glow

---

## 2. Like Button

### Question
Build a Like button that changes appearance based on the states (liked/unliked).

### Solution

```jsx
import React, { useState } from 'react';

function LikeButton({ initialLiked = false, onLikeChange }) {
    const [isLiked, setIsLiked] = useState(initialLiked);
    const [isAnimating, setIsAnimating] = useState(false);

    const handleClick = () => {
        setIsAnimating(true);
        const newLikedState = !isLiked;
        setIsLiked(newLikedState);
        
        if (onLikeChange) {
            onLikeChange(newLikedState);
        }

        setTimeout(() => setIsAnimating(false), 300);
    };

    return (
        <button
            className={`like-button ${isLiked ? 'liked' : ''} ${isAnimating ? 'animate' : ''}`}
            onClick={handleClick}
            aria-label={isLiked ? 'Unlike' : 'Like'}
        >
            <span className="heart-icon">{isLiked ? '❤️' : '🤍'}</span>
            <span className="like-text">{isLiked ? 'Liked' : 'Like'}</span>
        </button>
    );
}
```

### CSS

```css
.like-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: 2px solid #ddd;
    background: white;
    border-radius: 25px;
    cursor: pointer;
    transition: all 0.3s;
    font-size: 1rem;
}

.like-button:hover {
    border-color: #ff6b6b;
    background: #fff5f5;
}

.like-button.liked {
    border-color: #ff6b6b;
    background: #fff5f5;
    color: #ff6b6b;
}

.heart-icon {
    font-size: 1.2rem;
    transition: transform 0.3s;
}

.like-button.animate .heart-icon {
    animation: heartBeat 0.3s ease;
}

@keyframes heartBeat {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.3); }
}
```

### Explanation
- **Toggle State**: Switches between liked/unliked
- **Visual Feedback**: Different icons and colors
- **Animation**: Heart beat animation on click
- **Callback**: Notifies parent of state change
- **Accessibility**: ARIA labels for screen readers

---

## 3. Digital Clock

### Question
Build a 7-segment digital clock that shows the current time.

### Solution

```jsx
import React, { useState, useEffect } from 'react';

function DigitalClock() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (date) => {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return { hours, minutes, seconds };
    };

    const { hours, minutes, seconds } = formatTime(time);

    return (
        <div className="digital-clock">
            <SevenSegmentDisplay value={hours} />
            <span className="separator">:</span>
            <SevenSegmentDisplay value={minutes} />
            <span className="separator">:</span>
            <SevenSegmentDisplay value={seconds} />
        </div>
    );
}

function SevenSegmentDisplay({ value }) {
    const segments = {
        '0': [1, 1, 1, 1, 1, 1, 0],
        '1': [0, 1, 1, 0, 0, 0, 0],
        '2': [1, 1, 0, 1, 1, 0, 1],
        '3': [1, 1, 1, 1, 0, 0, 1],
        '4': [0, 1, 1, 0, 0, 1, 1],
        '5': [1, 0, 1, 1, 0, 1, 1],
        '6': [1, 0, 1, 1, 1, 1, 1],
        '7': [1, 1, 1, 0, 0, 0, 0],
        '8': [1, 1, 1, 1, 1, 1, 1],
        '9': [1, 1, 1, 1, 0, 1, 1]
    };

    const digitSegments = segments[value] || segments['0'];

    return (
        <div className="seven-segment">
            {digitSegments.map((active, index) => (
                <div
                    key={index}
                    className={`segment segment-${index} ${active ? 'active' : ''}`}
                />
            ))}
        </div>
    );
}
```

### CSS

```css
.digital-clock {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'Courier New', monospace;
}

.seven-segment {
    position: relative;
    width: 60px;
    height: 120px;
}

.segment {
    position: absolute;
    background: #333;
    transition: background 0.2s;
}

.segment.active {
    background: #ff4444;
    box-shadow: 0 0 10px #ff4444;
}

/* Segment positions for 7-segment display */
.segment-0 { top: 0; left: 10px; width: 40px; height: 8px; }
.segment-1 { top: 10px; right: 0; width: 8px; height: 40px; }
.segment-2 { bottom: 10px; right: 0; width: 8px; height: 40px; }
.segment-3 { bottom: 0; left: 10px; width: 40px; height: 8px; }
.segment-4 { bottom: 10px; left: 0; width: 8px; height: 40px; }
.segment-5 { top: 10px; left: 0; width: 8px; height: 40px; }
.segment-6 { top: 56px; left: 10px; width: 40px; height: 8px; }

.separator {
    font-size: 2rem;
    color: #ff4444;
    animation: blink 1s infinite;
}

@keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0.3; }
}
```

### Explanation
- **Real-time Updates**: Updates every second
- **7-Segment Display**: Classic digital clock style
- **Formatting**: Pads numbers with leading zeros
- **Visual Design**: Glowing segments for active digits
- **Separator Animation**: Blinking colons

---

## 4. Dice Roller

### Question
Build a dice roller app that simulates the results of rolling 6-sided dice.

### Solution

```jsx
import React, { useState } from 'react';

function DiceRoller() {
    const [diceValues, setDiceValues] = useState([1]);
    const [isRolling, setIsRolling] = useState(false);
    const [history, setHistory] = useState([]);

    const rollDice = () => {
        setIsRolling(true);
        
        // Animate rolling
        const rollInterval = setInterval(() => {
            setDiceValues(prev => 
                prev.map(() => Math.floor(Math.random() * 6) + 1)
            );
        }, 100);

        // Stop after animation
        setTimeout(() => {
            clearInterval(rollInterval);
            const finalValues = diceValues.map(() => Math.floor(Math.random() * 6) + 1);
            setDiceValues(finalValues);
            setIsRolling(false);
            
            const sum = finalValues.reduce((a, b) => a + b, 0);
            setHistory(prev => [{ values: finalValues, sum }, ...prev].slice(0, 10));
        }, 1000);
    };

    const addDice = () => {
        setDiceValues([...diceValues, 1]);
    };

    const removeDice = () => {
        if (diceValues.length > 1) {
            setDiceValues(diceValues.slice(0, -1));
        }
    };

    const total = diceValues.reduce((sum, val) => sum + val, 0);

    return (
        <div className="dice-roller">
            <div className="controls">
                <button onClick={addDice} disabled={isRolling}>+ Dice</button>
                <button onClick={rollDice} disabled={isRolling}>
                    {isRolling ? 'Rolling...' : 'Roll Dice'}
                </button>
                <button onClick={removeDice} disabled={isRolling || diceValues.length === 1}>
                    - Dice
                </button>
            </div>
            
            <div className={`dice-container ${isRolling ? 'rolling' : ''}`}>
                {diceValues.map((value, index) => (
                    <div key={index} className="dice">
                        <div className={`dice-face face-${value}`}>
                            {Array(value).fill(null).map((_, i) => (
                                <span key={i} className="dot" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="total">Total: {total}</div>
            
            {history.length > 0 && (
                <div className="history">
                    <h3>Recent Rolls</h3>
                    <ul>
                        {history.map((roll, index) => (
                            <li key={index}>
                                {roll.values.join(', ')} = {roll.sum}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
```

### CSS

```css
.dice-roller {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    padding: 2rem;
}

.controls {
    display: flex;
    gap: 1rem;
}

.controls button {
    padding: 0.75rem 1.5rem;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.controls button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.dice-container {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: center;
}

.dice-container.rolling {
    animation: shake 0.1s infinite;
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
}

.dice {
    width: 80px;
    height: 80px;
    perspective: 200px;
}

.dice-face {
    width: 100%;
    height: 100%;
    background: white;
    border: 2px solid #333;
    border-radius: 8px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    padding: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.dot {
    width: 12px;
    height: 12px;
    background: #333;
    border-radius: 50%;
    margin: auto;
}

/* Dice face patterns */
.face-1 .dot:nth-child(1) { grid-column: 2; grid-row: 2; }
.face-2 .dot:nth-child(1) { grid-column: 1; grid-row: 1; }
.face-2 .dot:nth-child(2) { grid-column: 3; grid-row: 3; }
.face-3 .dot:nth-child(1) { grid-column: 1; grid-row: 1; }
.face-3 .dot:nth-child(2) { grid-column: 2; grid-row: 2; }
.face-3 .dot:nth-child(3) { grid-column: 3; grid-row: 3; }
.face-4 .dot:nth-child(1) { grid-column: 1; grid-row: 1; }
.face-4 .dot:nth-child(2) { grid-column: 3; grid-row: 1; }
.face-4 .dot:nth-child(3) { grid-column: 1; grid-row: 3; }
.face-4 .dot:nth-child(4) { grid-column: 3; grid-row: 3; }
.face-5 .dot:nth-child(1) { grid-column: 1; grid-row: 1; }
.face-5 .dot:nth-child(2) { grid-column: 3; grid-row: 1; }
.face-5 .dot:nth-child(3) { grid-column: 2; grid-row: 2; }
.face-5 .dot:nth-child(4) { grid-column: 1; grid-row: 3; }
.face-5 .dot:nth-child(5) { grid-column: 3; grid-row: 3; }
.face-6 .dot:nth-child(1) { grid-column: 1; grid-row: 1; }
.face-6 .dot:nth-child(2) { grid-column: 3; grid-row: 1; }
.face-6 .dot:nth-child(3) { grid-column: 1; grid-row: 2; }
.face-6 .dot:nth-child(4) { grid-column: 3; grid-row: 2; }
.face-6 .dot:nth-child(5) { grid-column: 1; grid-row: 3; }
.face-6 .dot:nth-child(6) { grid-column: 3; grid-row: 3; }

.total {
    font-size: 1.5rem;
    font-weight: bold;
}

.history {
    width: 100%;
    max-width: 400px;
}

.history ul {
    list-style: none;
    padding: 0;
}

.history li {
    padding: 0.5rem;
    border-bottom: 1px solid #ddd;
}
```

### Explanation
- **Multiple Dice**: Can add/remove dice
- **Roll Animation**: Shake animation during roll
- **Random Values**: Generates random 1-6 values
- **History**: Tracks recent rolls
- **Total Calculation**: Sums all dice values
- **Visual Design**: Realistic dice faces with dots

---

## 5. Mortgage Calculator

### Question
Build a calculator that computes the monthly mortgage for a loan.

### Solution

```jsx
import React, { useState, useMemo } from 'react';

function MortgageCalculator() {
    const [principal, setPrincipal] = useState(300000);
    const [interestRate, setInterestRate] = useState(3.5);
    const [loanTerm, setLoanTerm] = useState(30);

    const monthlyPayment = useMemo(() => {
        if (principal <= 0 || interestRate < 0 || loanTerm <= 0) {
            return 0;
        }

        const monthlyRate = interestRate / 100 / 12;
        const numberOfPayments = loanTerm * 12;

        if (monthlyRate === 0) {
            return principal / numberOfPayments;
        }

        const payment = principal * 
            (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
            (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

        return payment;
    }, [principal, interestRate, loanTerm]);

    const totalPayment = monthlyPayment * loanTerm * 12;
    const totalInterest = totalPayment - principal;

    return (
        <div className="mortgage-calculator">
            <h2>Mortgage Calculator</h2>
            
            <div className="input-group">
                <label>
                    Loan Amount ($)
                    <input
                        type="number"
                        value={principal}
                        onChange={(e) => setPrincipal(Number(e.target.value))}
                        min="0"
                        step="1000"
                    />
                </label>
            </div>

            <div className="input-group">
                <label>
                    Annual Interest Rate (%)
                    <input
                        type="number"
                        value={interestRate}
                        onChange={(e) => setInterestRate(Number(e.target.value))}
                        min="0"
                        max="100"
                        step="0.1"
                    />
                </label>
            </div>

            <div className="input-group">
                <label>
                    Loan Term (years)
                    <input
                        type="number"
                        value={loanTerm}
                        onChange={(e) => setLoanTerm(Number(e.target.value))}
                        min="1"
                        max="50"
                    />
                </label>
            </div>

            <div className="results">
                <div className="result-item">
                    <span className="label">Monthly Payment:</span>
                    <span className="value">
                        ${monthlyPayment.toFixed(2)}
                    </span>
                </div>
                <div className="result-item">
                    <span className="label">Total Payment:</span>
                    <span className="value">
                        ${totalPayment.toFixed(2)}
                    </span>
                </div>
                <div className="result-item">
                    <span className="label">Total Interest:</span>
                    <span className="value">
                        ${totalInterest.toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    );
}
```

### CSS

```css
.mortgage-calculator {
    max-width: 500px;
    margin: 2rem auto;
    padding: 2rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.input-group {
    margin-bottom: 1.5rem;
}

.input-group label {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-weight: 500;
}

.input-group input {
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
}

.results {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 2px solid #e0e0e0;
}

.result-item {
    display: flex;
    justify-content: space-between;
    padding: 1rem 0;
    border-bottom: 1px solid #f0f0f0;
}

.result-item .value {
    font-size: 1.25rem;
    font-weight: bold;
    color: #007bff;
}
```

### Explanation
- **Mortgage Formula**: Uses standard amortization formula
- **Real-time Calculation**: Updates as inputs change
- **Memoization**: Optimizes calculation with useMemo
- **Multiple Results**: Shows monthly, total, and interest
- **Input Validation**: Handles edge cases (zero rate, etc.)

---

## Key Patterns

1. **State Management**: Multiple related states
2. **Real-time Updates**: useEffect for timers
3. **Animations**: CSS animations and transitions
4. **Calculations**: Complex formulas with memoization
5. **User Interaction**: Multiple input controls
6. **Visual Feedback**: Animations and state changes

## Best Practices

- ✅ Use useMemo for expensive calculations
- ✅ Clean up intervals and timers
- ✅ Handle edge cases in formulas
- ✅ Provide visual feedback
- ✅ Make components accessible
- ✅ Optimize re-renders

