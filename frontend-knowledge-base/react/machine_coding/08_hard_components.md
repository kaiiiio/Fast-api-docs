# Hard React Components: Nested Checkboxes, Wordle, Auth Code Input

Complete solutions for hard-level React machine coding questions.

## 1. Nested Checkboxes

### Question
Build a nested checkboxes component with parent-child selection logic.

### Solution

```jsx
import React, { useState, useEffect } from 'react';

function NestedCheckboxes({ data }) {
    const [checkedItems, setCheckedItems] = useState(new Set());

    // Calculate checked state for a node
    const getNodeState = (node) => {
        const allChildren = getAllChildren(node);
        const checkedChildren = allChildren.filter(child => checkedItems.has(child.id));
        
        if (checkedChildren.length === 0) {
            return 'unchecked';
        } else if (checkedChildren.length === allChildren.length) {
            return 'checked';
        } else {
            return 'indeterminate';
        }
    };

    // Get all children recursively
    const getAllChildren = (node) => {
        let children = [];
        if (node.children) {
            node.children.forEach(child => {
                children.push(child);
                children = children.concat(getAllChildren(child));
            });
        }
        return children;
    };

    // Handle checkbox click
    const handleToggle = (node, checked) => {
        const allChildren = getAllChildren(node);
        const nodeIds = [node.id, ...allChildren.map(c => c.id)];

        setCheckedItems(prev => {
            const newSet = new Set(prev);
            if (checked) {
                nodeIds.forEach(id => newSet.add(id));
            } else {
                nodeIds.forEach(id => newSet.delete(id));
            }
            return newSet;
        });
    };

    const renderNode = (node, level = 0) => {
        const state = getNodeState(node);
        const isChecked = checkedItems.has(node.id);
        const isIndeterminate = state === 'indeterminate';

        return (
            <div key={node.id} className="checkbox-node" style={{ marginLeft: `${level * 20}px` }}>
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={isChecked || isIndeterminate}
                        ref={input => {
                            if (input) input.indeterminate = isIndeterminate;
                        }}
                        onChange={(e) => handleToggle(node, e.target.checked)}
                    />
                    <span>{node.label}</span>
                </label>
                {node.children && node.children.map(child => renderNode(child, level + 1))}
            </div>
        );
    };

    return (
        <div className="nested-checkboxes">
            {data.map(node => renderNode(node))}
        </div>
    );
}

// Usage
const checkboxData = [
    {
        id: '1',
        label: 'Parent 1',
        children: [
            { id: '1-1', label: 'Child 1.1' },
            { id: '1-2', label: 'Child 1.2' }
        ]
    },
    {
        id: '2',
        label: 'Parent 2',
        children: [
            {
                id: '2-1',
                label: 'Child 2.1',
                children: [
                    { id: '2-1-1', label: 'Grandchild 2.1.1' }
                ]
            }
        ]
    }
];
```

### CSS

```css
.nested-checkboxes {
    padding: 1rem;
}

.checkbox-node {
    margin: 0.5rem 0;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    user-select: none;
}

.checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
}
```

### Explanation
- **Parent-Child Logic**: Checking parent checks all children
- **Indeterminate State**: Partial selection shows indeterminate
- **Recursive Rendering**: Handles any nesting depth
- **State Management**: Tracks all checked items in Set
- **Visual Hierarchy**: Indentation shows nesting

---

## 2. Wordle Game

### Question
Build Wordle, the word-guessing game that took the world by storm.

### Solution

```jsx
import React, { useState, useEffect } from 'react';

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;
const WORDS = ['REACT', 'HOOKS', 'STATE', 'PROPS', 'RENDER'];

function Wordle() {
    const [targetWord] = useState(() => 
        WORDS[Math.floor(Math.random() * WORDS.length)]
    );
    const [currentGuess, setCurrentGuess] = useState('');
    const [guesses, setGuesses] = useState([]);
    const [gameStatus, setGameStatus] = useState('playing'); // playing, won, lost

    const handleKeyPress = (key) => {
        if (gameStatus !== 'playing') return;

        if (key === 'ENTER') {
            if (currentGuess.length === WORD_LENGTH) {
                submitGuess();
            }
        } else if (key === 'BACKSPACE') {
            setCurrentGuess(prev => prev.slice(0, -1));
        } else if (key.length === 1 && /[A-Z]/.test(key)) {
            if (currentGuess.length < WORD_LENGTH) {
                setCurrentGuess(prev => prev + key);
            }
        }
    };

    const submitGuess = () => {
        const newGuesses = [...guesses, currentGuess];
        setGuesses(newGuesses);
        setCurrentGuess('');

        if (currentGuess === targetWord) {
            setGameStatus('won');
        } else if (newGuesses.length >= MAX_ATTEMPTS) {
            setGameStatus('lost');
        }
    };

    const getLetterStatus = (letter, index, guess) => {
        if (targetWord[index] === letter) {
            return 'correct';
        } else if (targetWord.includes(letter)) {
            return 'present';
        } else {
            return 'absent';
        }
    };

    useEffect(() => {
        const handleKeyboard = (e) => {
            if (e.key === 'Enter') {
                handleKeyPress('ENTER');
            } else if (e.key === 'Backspace') {
                handleKeyPress('BACKSPACE');
            } else if (e.key.match(/[a-z]/i)) {
                handleKeyPress(e.key.toUpperCase());
            }
        };

        window.addEventListener('keydown', handleKeyboard);
        return () => window.removeEventListener('keydown', handleKeyboard);
    }, [currentGuess, guesses, gameStatus]);

    return (
        <div className="wordle">
            <h1>WORDLE</h1>
            
            <div className="game-board">
                {Array(MAX_ATTEMPTS).fill(null).map((_, rowIndex) => {
                    const guess = rowIndex < guesses.length 
                        ? guesses[rowIndex] 
                        : rowIndex === guesses.length 
                            ? currentGuess.padEnd(WORD_LENGTH, ' ')
                            : '';
                    
                    return (
                        <div key={rowIndex} className="word-row">
                            {Array(WORD_LENGTH).fill(null).map((_, colIndex) => {
                                const letter = guess[colIndex] || '';
                                const status = rowIndex < guesses.length
                                    ? getLetterStatus(letter, colIndex, guess)
                                    : '';
                                
                                return (
                                    <div
                                        key={colIndex}
                                        className={`letter-box ${status}`}
                                    >
                                        {letter}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {gameStatus === 'won' && (
                <div className="game-message success">
                    Congratulations! You won!
                </div>
            )}

            {gameStatus === 'lost' && (
                <div className="game-message error">
                    Game Over! The word was: {targetWord}
                </div>
            )}

            <div className="keyboard">
                {['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P',
                  'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L',
                  'ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'].map(key => (
                    <button
                        key={key}
                        className="keyboard-key"
                        onClick={() => handleKeyPress(key)}
                    >
                        {key === 'BACKSPACE' ? '⌫' : key}
                    </button>
                ))}
            </div>
        </div>
    );
}
```

### CSS

```css
.wordle {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    padding: 2rem;
}

.game-board {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.word-row {
    display: flex;
    gap: 0.5rem;
}

.letter-box {
    width: 60px;
    height: 60px;
    border: 2px solid #ddd;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: bold;
    text-transform: uppercase;
    transition: all 0.3s;
}

.letter-box.correct {
    background: #6aaa64;
    color: white;
    border-color: #6aaa64;
}

.letter-box.present {
    background: #c9b458;
    color: white;
    border-color: #c9b458;
}

.letter-box.absent {
    background: #787c7e;
    color: white;
    border-color: #787c7e;
}

.keyboard {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 2rem;
}

.keyboard-key {
    padding: 0.75rem;
    background: #d3d6da;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    min-width: 40px;
}
```

### Explanation
- **Game Logic**: 5-letter word guessing
- **Letter Status**: Correct (green), Present (yellow), Absent (gray)
- **Keyboard Input**: Physical and on-screen keyboard
- **Win/Loss**: Tracks game state
- **Visual Feedback**: Color-coded letter boxes

---

## 3. Auth Code Input

### Question
Build an auth code input component that allows users to enter a 6-digit authorization code.

### Solution

```jsx
import React, { useState, useRef, useEffect } from 'react';

function AuthCodeInput({ length = 6, onComplete }) {
    const [codes, setCodes] = useState(Array(length).fill(''));
    const inputRefs = useRef([]);

    const handleChange = (index, value) => {
        // Only allow single digit
        if (value.length > 1) return;
        if (value && !/^\d$/.test(value)) return;

        const newCodes = [...codes];
        newCodes[index] = value;
        setCodes(newCodes);

        // Auto-focus next input
        if (value && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        // Check if all filled
        if (newCodes.every(code => code !== '') && onComplete) {
            onComplete(newCodes.join(''));
        }
    };

    const handleKeyDown = (index, e) => {
        // Handle backspace
        if (e.key === 'Backspace' && !codes[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }

        // Handle paste
        if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            navigator.clipboard.readText().then(text => {
                const digits = text.replace(/\D/g, '').slice(0, length);
                const newCodes = Array(length).fill('');
                digits.split('').forEach((digit, i) => {
                    newCodes[i] = digit;
                });
                setCodes(newCodes);
                if (digits.length === length && onComplete) {
                    onComplete(digits);
                }
            });
        }
    };

    const handleFocus = (index) => {
        inputRefs.current[index]?.select();
    };

    return (
        <div className="auth-code-input">
            {codes.map((code, index) => (
                <input
                    key={index}
                    ref={el => inputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={code}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onFocus={() => handleFocus(index)}
                    className="code-input"
                    autoComplete="off"
                />
            ))}
        </div>
    );
}

// Usage
function App() {
    const handleComplete = (code) => {
        console.log('Auth code:', code);
        // Verify code with backend
    };

    return <AuthCodeInput onComplete={handleComplete} />;
}
```

### CSS

```css
.auth-code-input {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
}

.code-input {
    width: 50px;
    height: 60px;
    text-align: center;
    font-size: 1.5rem;
    font-weight: bold;
    border: 2px solid #ddd;
    border-radius: 8px;
    transition: all 0.2s;
}

.code-input:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.code-input:invalid {
    border-color: #dc3545;
}
```

### Explanation
- **Single Digit Input**: Each input accepts one digit
- **Auto-focus**: Moves to next input on entry
- **Paste Support**: Handles pasting full code
- **Backspace Navigation**: Moves to previous on backspace
- **Validation**: Only accepts digits
- **Completion Callback**: Notifies when all digits entered

---

## 4. Transfer List

### Question
Build a component that allows transferring of items between two lists, bulk selection/unselection of items, and adding of new items.

### Solution

```jsx
import React, { useState } from 'react';

function TransferList({ initialLeft = [], initialRight = [] }) {
    const [leftItems, setLeftItems] = useState(initialLeft);
    const [rightItems, setRightItems] = useState(initialRight);
    const [leftSelected, setLeftSelected] = useState(new Set());
    const [rightSelected, setRightSelected] = useState(new Set());
    const [newItem, setNewItem] = useState('');

    const transferToRight = () => {
        const itemsToTransfer = leftItems.filter((_, index) => leftSelected.has(index));
        setRightItems([...rightItems, ...itemsToTransfer]);
        setLeftItems(leftItems.filter((_, index) => !leftSelected.has(index)));
        setLeftSelected(new Set());
    };

    const transferToLeft = () => {
        const itemsToTransfer = rightItems.filter((_, index) => rightSelected.has(index));
        setLeftItems([...leftItems, ...itemsToTransfer]);
        setRightItems(rightItems.filter((_, index) => !rightSelected.has(index)));
        setRightSelected(new Set());
    };

    const toggleLeftSelection = (index) => {
        setLeftSelected(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const toggleRightSelection = (index) => {
        setRightSelected(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const selectAllLeft = () => {
        setLeftSelected(new Set(leftItems.map((_, i) => i)));
    };

    const selectAllRight = () => {
        setRightSelected(new Set(rightItems.map((_, i) => i)));
    };

    const addNewItem = () => {
        if (newItem.trim()) {
            setLeftItems([...leftItems, newItem.trim()]);
            setNewItem('');
        }
    };

    return (
        <div className="transfer-list">
            <div className="list-container">
                <div className="list-panel">
                    <div className="list-header">
                        <input
                            type="text"
                            value={newItem}
                            onChange={(e) => setNewItem(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addNewItem()}
                            placeholder="Add new item..."
                        />
                        <button onClick={addNewItem}>Add</button>
                        <button onClick={selectAllLeft}>Select All</button>
                    </div>
                    <div className="list-items">
                        {leftItems.map((item, index) => (
                            <label key={index} className="list-item">
                                <input
                                    type="checkbox"
                                    checked={leftSelected.has(index)}
                                    onChange={() => toggleLeftSelection(index)}
                                />
                                <span>{item}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="transfer-buttons">
                    <button
                        onClick={transferToRight}
                        disabled={leftSelected.size === 0}
                    >
                        →
                    </button>
                    <button
                        onClick={transferToLeft}
                        disabled={rightSelected.size === 0}
                    >
                        ←
                    </button>
                </div>

                <div className="list-panel">
                    <div className="list-header">
                        <span>Selected Items</span>
                        <button onClick={selectAllRight}>Select All</button>
                    </div>
                    <div className="list-items">
                        {rightItems.map((item, index) => (
                            <label key={index} className="list-item">
                                <input
                                    type="checkbox"
                                    checked={rightSelected.has(index)}
                                    onChange={() => toggleRightSelection(index)}
                                />
                                <span>{item}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
```

### CSS

```css
.transfer-list {
    max-width: 800px;
    margin: 2rem auto;
}

.list-container {
    display: flex;
    gap: 2rem;
    align-items: flex-start;
}

.list-panel {
    flex: 1;
    border: 1px solid #ddd;
    border-radius: 4px;
    min-height: 300px;
}

.list-header {
    padding: 1rem;
    border-bottom: 1px solid #ddd;
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.list-header input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.list-items {
    max-height: 400px;
    overflow-y: auto;
    padding: 0.5rem;
}

.list-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    cursor: pointer;
    border-radius: 4px;
}

.list-item:hover {
    background: #f0f0f0;
}

.transfer-buttons {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    justify-content: center;
    padding-top: 4rem;
}

.transfer-buttons button {
    padding: 0.75rem 1rem;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1.2rem;
}

.transfer-buttons button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
```

### Explanation
- **Two Lists**: Left (available) and Right (selected)
- **Transfer**: Move items between lists
- **Bulk Selection**: Select all functionality
- **Add Items**: Add new items to left list
- **State Management**: Tracks selections separately
- **Visual Feedback**: Disabled buttons when no selection

---

## Key Hard Patterns

1. **Complex State**: Multiple related states
2. **Recursive Logic**: Nested structures
3. **Game Logic**: Win/loss conditions
4. **Input Management**: Multiple inputs with auto-focus
5. **Bulk Operations**: Select all, transfer multiple
6. **Real-time Updates**: Immediate feedback

## Best Practices

- ✅ Handle complex state relationships
- ✅ Provide clear visual feedback
- ✅ Support keyboard navigation
- ✅ Handle edge cases
- ✅ Optimize for performance
- ✅ Make accessible

