# More React Components: Job Board, Transfer List, Signup Form, Memory Game

Additional React component solutions.

## 1. Job Board

### Question
Build a job board that displays the latest job postings from Hacker News.

### Solution

```jsx
import React, { useState, useEffect } from 'react';

function JobBoard() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchJobs() {
            try {
                setLoading(true);
                // Fetch job IDs from Hacker News
                const response = await fetch('https://hacker-news.firebaseio.com/v0/jobstories.json');
                const jobIds = await response.json();
                
                // Fetch first 20 jobs
                const jobPromises = jobIds.slice(0, 20).map(id =>
                    fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
                        .then(res => res.json())
                );
                
                const jobData = await Promise.all(jobPromises);
                setJobs(jobData.filter(job => job && !job.deleted));
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchJobs();
    }, []);

    const formatTime = (timestamp) => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString();
    };

    if (loading) return <div className="loading">Loading jobs...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="job-board">
            <h1>Hacker News Job Board</h1>
            <div className="jobs-list">
                {jobs.map(job => (
                    <div key={job.id} className="job-card">
                        <h3>
                            <a href={job.url} target="_blank" rel="noopener noreferrer">
                                {job.title}
                            </a>
                        </h3>
                        <div className="job-meta">
                            <span>Posted: {formatTime(job.time)}</span>
                            {job.by && <span>By: {job.by}</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
```

### CSS

```css
.job-board {
    max-width: 800px;
    margin: 2rem auto;
    padding: 2rem;
}

.jobs-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.job-card {
    padding: 1.5rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: white;
    transition: box-shadow 0.2s;
}

.job-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.job-card h3 {
    margin: 0 0 0.5rem 0;
}

.job-card a {
    color: #007bff;
    text-decoration: none;
}

.job-card a:hover {
    text-decoration: underline;
}

.job-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.9rem;
    color: #666;
}
```

---

## 2. Signup Form

### Question
Build a signup form that does validation on user details and submits to a back end API.

### Solution

```jsx
import React, { useState } from 'react';

function SignupForm() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        } else if (formData.name.trim().length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
            newErrors.password = 'Password must contain uppercase, lowercase, and number';
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleBlur = (e) => {
        const { name } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
        
        // Validate on blur
        validate();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validate()) {
            return;
        }

        setIsSubmitting(true);
        setSubmitStatus(null);

        try {
            const response = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Signup failed');
            }

            setSubmitStatus('success');
            setFormData({ name: '', email: '', password: '', confirmPassword: '' });
        } catch (error) {
            setSubmitStatus('error');
            setErrors({ submit: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="signup-form">
            <h2>Sign Up</h2>

            <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={errors.name && touched.name ? 'error' : ''}
                />
                {errors.name && touched.name && (
                    <span className="error-message">{errors.name}</span>
                )}
            </div>

            <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={errors.email && touched.email ? 'error' : ''}
                />
                {errors.email && touched.email && (
                    <span className="error-message">{errors.email}</span>
                )}
            </div>

            <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={errors.password && touched.password ? 'error' : ''}
                />
                {errors.password && touched.password && (
                    <span className="error-message">{errors.password}</span>
                )}
            </div>

            <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={errors.confirmPassword && touched.confirmPassword ? 'error' : ''}
                />
                {errors.confirmPassword && touched.confirmPassword && (
                    <span className="error-message">{errors.confirmPassword}</span>
                )}
            </div>

            {submitStatus === 'success' && (
                <div className="success-message">
                    Account created successfully!
                </div>
            )}

            {errors.submit && (
                <div className="error-message">{errors.submit}</div>
            )}

            <button type="submit" disabled={isSubmitting} className="submit-button">
                {isSubmitting ? 'Creating Account...' : 'Sign Up'}
            </button>
        </form>
    );
}
```

---

## 3. Memory Game

### Question
Build a memory game where the player needs to match pairs of cards.

### Solution

```jsx
import React, { useState, useEffect } from 'react';

function MemoryGame({ size = 4 }) {
    const [cards, setCards] = useState([]);
    const [flipped, setFlipped] = useState(new Set());
    const [matched, setMatched] = useState(new Set());
    const [firstCard, setFirstCard] = useState(null);
    const [moves, setMoves] = useState(0);
    const [gameWon, setGameWon] = useState(false);

    // Initialize cards
    useEffect(() => {
        const symbols = ['🍎', '🍌', '🍇', '🍊', '🍓', '🥝', '🍑', '🥭'];
        const selectedSymbols = symbols.slice(0, size * size / 2);
        const cardPairs = [...selectedSymbols, ...selectedSymbols];
        
        // Shuffle
        const shuffled = cardPairs.sort(() => Math.random() - 0.5);
        
        setCards(shuffled.map((symbol, index) => ({
            id: index,
            symbol,
            isFlipped: false
        })));
    }, [size]);

    const handleCardClick = (cardId) => {
        if (flipped.has(cardId) || matched.has(cardId)) return;
        if (flipped.size >= 2) return;

        const newFlipped = new Set(flipped);
        newFlipped.add(cardId);
        setFlipped(newFlipped);
        setMoves(prev => prev + 1);

        if (firstCard === null) {
            setFirstCard(cardId);
        } else {
            // Check for match
            const card1 = cards[firstCard];
            const card2 = cards[cardId];

            if (card1.symbol === card2.symbol) {
                // Match found
                setMatched(prev => new Set([...prev, firstCard, cardId]));
                setFlipped(new Set());
                setFirstCard(null);

                // Check win condition
                if (matched.size + 2 === cards.length) {
                    setTimeout(() => setGameWon(true), 500);
                }
            } else {
                // No match - flip back
                setTimeout(() => {
                    setFlipped(new Set());
                    setFirstCard(null);
                }, 1000);
            }
        }
    };

    const resetGame = () => {
        setFlipped(new Set());
        setMatched(new Set());
        setFirstCard(null);
        setMoves(0);
        setGameWon(false);
        // Reinitialize cards
        const symbols = ['🍎', '🍌', '🍇', '🍊', '🍓', '🥝', '🍑', '🥭'];
        const selectedSymbols = symbols.slice(0, size * size / 2);
        const cardPairs = [...selectedSymbols, ...selectedSymbols];
        const shuffled = cardPairs.sort(() => Math.random() - 0.5);
        setCards(shuffled.map((symbol, index) => ({
            id: index,
            symbol,
            isFlipped: false
        })));
    };

    return (
        <div className="memory-game">
            <div className="game-header">
                <div>Moves: {moves}</div>
                <button onClick={resetGame}>Reset</button>
            </div>

            {gameWon && (
                <div className="win-message">
                    Congratulations! You won in {moves} moves!
                </div>
            )}

            <div className="cards-grid" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
                {cards.map(card => {
                    const isFlipped = flipped.has(card.id) || matched.has(card.id);
                    return (
                        <div
                            key={card.id}
                            className={`card ${isFlipped ? 'flipped' : ''} ${matched.has(card.id) ? 'matched' : ''}`}
                            onClick={() => handleCardClick(card.id)}
                        >
                            <div className="card-front">?</div>
                            <div className="card-back">{card.symbol}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
```

### CSS

```css
.memory-game {
    max-width: 600px;
    margin: 2rem auto;
    padding: 2rem;
}

.game-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
}

.cards-grid {
    display: grid;
    gap: 1rem;
    margin-bottom: 2rem;
}

.card {
    aspect-ratio: 1;
    position: relative;
    cursor: pointer;
    perspective: 1000px;
}

.card-front,
.card-back {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    border-radius: 8px;
    transition: transform 0.3s;
}

.card-front {
    background: #4a90e2;
    color: white;
}

.card-back {
    background: white;
    transform: rotateY(180deg);
    border: 2px solid #ddd;
}

.card.flipped .card-front {
    transform: rotateY(180deg);
}

.card.flipped .card-back {
    transform: rotateY(0);
}

.card.matched {
    opacity: 0.6;
    cursor: default;
}
```

---

## 4. Undoable Counter

### Question
Build a counter with a history of the values and ability to undo/redo actions.

### Solution

```jsx
import React, { useState } from 'react';

function UndoableCounter() {
    const [history, setHistory] = useState([0]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const currentValue = history[currentIndex];
    const canUndo = currentIndex > 0;
    const canRedo = currentIndex < history.length - 1;

    const updateValue = (newValue) => {
        // Remove any history after current index (when undoing then making new change)
        const newHistory = history.slice(0, currentIndex + 1);
        newHistory.push(newValue);
        setHistory(newHistory);
        setCurrentIndex(newHistory.length - 1);
    };

    const increment = () => updateValue(currentValue + 1);
    const decrement = () => updateValue(currentValue - 1);
    const reset = () => updateValue(0);

    const undo = () => {
        if (canUndo) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const redo = () => {
        if (canRedo) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    return (
        <div className="undoable-counter">
            <div className="counter-display">
                <h2>Count: {currentValue}</h2>
            </div>

            <div className="counter-controls">
                <button onClick={decrement}>-</button>
                <button onClick={increment}>+</button>
                <button onClick={reset}>Reset</button>
            </div>

            <div className="history-controls">
                <button onClick={undo} disabled={!canUndo}>
                    Undo
                </button>
                <button onClick={redo} disabled={!canRedo}>
                    Redo
                </button>
            </div>

            <div className="history-list">
                <h3>History:</h3>
                <ul>
                    {history.map((value, index) => (
                        <li
                            key={index}
                            className={index === currentIndex ? 'current' : ''}
                        >
                            {value}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
```

### Explanation
- **History Array**: Stores all state values
- **Current Index**: Tracks position in history
- **Undo/Redo**: Navigate through history
- **Branching**: New changes remove future history
- **Visual Feedback**: Highlights current state

---

## Key Patterns

1. **API Integration**: Fetching and displaying data
2. **Form Validation**: Complex validation rules
3. **Game Logic**: Matching, win conditions
4. **History Management**: Undo/redo functionality
5. **State Management**: Complex state relationships
6. **User Feedback**: Loading, error, success states

## Best Practices

- ✅ Handle loading and error states
- ✅ Validate forms thoroughly
- ✅ Provide clear user feedback
- ✅ Handle edge cases
- ✅ Optimize API calls
- ✅ Make accessible

