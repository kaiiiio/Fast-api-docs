# Premium React Components: Complete Solutions

Solutions for premium React components from [GreatFrontEnd.com](https://www.greatfrontend.com/questions/formats/ui-coding).

## 1. Flight Booker

### Question
Build a component that books a flight for specified dates.

### Solution

```jsx
import React, { useState } from 'react';

function FlightBooker() {
    const [tripType, setTripType] = useState('one-way');
    const [departDate, setDepartDate] = useState('');
    const [returnDate, setReturnDate] = useState('');
    const [error, setError] = useState('');

    const today = new Date().toISOString().split('T')[0];

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!departDate) {
            setError('Please select departure date');
            return;
        }

        if (tripType === 'return' && !returnDate) {
            setError('Please select return date');
            return;
        }

        if (tripType === 'return' && returnDate < departDate) {
            setError('Return date must be after departure date');
            return;
        }

        // Book flight
        console.log('Booking flight:', { tripType, departDate, returnDate });
        alert(`Flight booked! Departure: ${departDate}${tripType === 'return' ? `, Return: ${returnDate}` : ''}`);
    };

    return (
        <form onSubmit={handleSubmit} className="flight-booker">
            <div className="trip-type">
                <label>
                    <input
                        type="radio"
                        value="one-way"
                        checked={tripType === 'one-way'}
                        onChange={(e) => {
                            setTripType(e.target.value);
                            setReturnDate('');
                        }}
                    />
                    One-way
                </label>
                <label>
                    <input
                        type="radio"
                        value="return"
                        checked={tripType === 'return'}
                        onChange={(e) => setTripType(e.target.value)}
                    />
                    Return
                </label>
            </div>

            <div className="date-inputs">
                <div>
                    <label>Departure Date</label>
                    <input
                        type="date"
                        value={departDate}
                        min={today}
                        onChange={(e) => {
                            setDepartDate(e.target.value);
                            if (tripType === 'return' && returnDate && e.target.value > returnDate) {
                                setReturnDate('');
                            }
                        }}
                        required
                    />
                </div>

                {tripType === 'return' && (
                    <div>
                        <label>Return Date</label>
                        <input
                            type="date"
                            value={returnDate}
                            min={departDate || today}
                            onChange={(e) => setReturnDate(e.target.value)}
                            required
                        />
                    </div>
                )}
            </div>

            {error && <div className="error">{error}</div>}

            <button type="submit">Book Flight</button>
        </form>
    );
}
```

---

## 2. Generate Table

### Question
Generate a table of numbers given the rows and columns.

### Solution

```jsx
import React, { useState } from 'react';

function GenerateTable() {
    const [rows, setRows] = useState(3);
    const [cols, setCols] = useState(3);

    const generateTable = () => {
        const table = [];
        let count = 1;

        for (let i = 0; i < rows; i++) {
            const row = [];
            for (let j = 0; j < cols; j++) {
                row.push(count++);
            }
            table.push(row);
        }

        return table;
    };

    const table = generateTable();

    return (
        <div className="table-generator">
            <div className="controls">
                <label>
                    Rows:
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={rows}
                        onChange={(e) => setRows(Number(e.target.value))}
                    />
                </label>
                <label>
                    Columns:
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={cols}
                        onChange={(e) => setCols(Number(e.target.value))}
                    />
                </label>
            </div>

            <table className="generated-table">
                <tbody>
                    {table.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {row.map((cell, colIndex) => (
                                <td key={colIndex}>{cell}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
```

---

## 3. Temperature Converter

### Question
Build a temperature converter widget that converts temperature values between Celsius and Fahrenheit.

### Solution

```jsx
import React, { useState } from 'react';

function TemperatureConverter() {
    const [celsius, setCelsius] = useState('');
    const [fahrenheit, setFahrenheit] = useState('');

    const handleCelsiusChange = (value) => {
        setCelsius(value);
        if (value === '') {
            setFahrenheit('');
        } else {
            const f = (parseFloat(value) * 9/5) + 32;
            setFahrenheit(f.toFixed(2));
        }
    };

    const handleFahrenheitChange = (value) => {
        setFahrenheit(value);
        if (value === '') {
            setCelsius('');
        } else {
            const c = (parseFloat(value) - 32) * 5/9;
            setCelsius(c.toFixed(2));
        }
    };

    return (
        <div className="temperature-converter">
            <div className="input-group">
                <label>Celsius</label>
                <input
                    type="number"
                    value={celsius}
                    onChange={(e) => handleCelsiusChange(e.target.value)}
                    placeholder="0"
                />
                <span>°C</span>
            </div>

            <div className="equals">=</div>

            <div className="input-group">
                <label>Fahrenheit</label>
                <input
                    type="number"
                    value={fahrenheit}
                    onChange={(e) => handleFahrenheitChange(e.target.value)}
                    placeholder="32"
                />
                <span>°F</span>
            </div>
        </div>
    );
}
```

---

## 4. Tweet Component

### Question
Build a component that resembles a Tweet from Twitter.

### Solution

```jsx
import React, { useState } from 'react';

function Tweet({ tweet }) {
    const [liked, setLiked] = useState(false);
    const [retweeted, setRetweeted] = useState(false);
    const [likes, setLikes] = useState(tweet.likes || 0);
    const [retweets, setRetweets] = useState(tweet.retweets || 0);

    const handleLike = () => {
        if (liked) {
            setLikes(likes - 1);
        } else {
            setLikes(likes + 1);
        }
        setLiked(!liked);
    };

    const handleRetweet = () => {
        if (retweeted) {
            setRetweets(retweets - 1);
        } else {
            setRetweets(retweets + 1);
        }
        setRetweeted(!retweeted);
    };

    const formatTime = (date) => {
        const now = new Date();
        const diff = now - new Date(date);
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d`;
        if (hours > 0) return `${hours}h`;
        if (minutes > 0) return `${minutes}m`;
        return 'now';
    };

    return (
        <article className="tweet">
            <div className="tweet-header">
                <img src={tweet.avatar} alt={tweet.name} className="avatar" />
                <div className="user-info">
                    <span className="name">{tweet.name}</span>
                    <span className="username">@{tweet.username}</span>
                    <span className="time">· {formatTime(tweet.timestamp)}</span>
                </div>
            </div>

            <div className="tweet-content">
                <p>{tweet.content}</p>
                {tweet.image && (
                    <img src={tweet.image} alt="Tweet" className="tweet-image" />
                )}
            </div>

            <div className="tweet-actions">
                <button className="action-btn">
                    <span>💬</span>
                    <span>{tweet.replies || 0}</span>
                </button>
                <button
                    className={`action-btn ${retweeted ? 'retweeted' : ''}`}
                    onClick={handleRetweet}
                >
                    <span>🔄</span>
                    <span>{retweets}</span>
                </button>
                <button
                    className={`action-btn ${liked ? 'liked' : ''}`}
                    onClick={handleLike}
                >
                    <span>{liked ? '❤️' : '🤍'}</span>
                    <span>{likes}</span>
                </button>
                <button className="action-btn">
                    <span>📤</span>
                </button>
            </div>
        </article>
    );
}
```

---

## 5. Grid Lights

### Question
Build a grid of lights where the lights deactivate in the reverse order they were activated.

### Solution

```jsx
import React, { useState, useEffect } from 'react';

function GridLights({ size = 5 }) {
    const [lights, setLights] = useState(Array(size * size).fill(false));
    const [activationOrder, setActivationOrder] = useState([]);
    const [isDeactivating, setIsDeactivating] = useState(false);

    const toggleLight = (index) => {
        if (isDeactivating || lights[index]) return;

        const newLights = [...lights];
        newLights[index] = true;
        setLights(newLights);
        setActivationOrder([...activationOrder, index]);
    };

    const deactivateLights = () => {
        if (activationOrder.length === 0) return;

        setIsDeactivating(true);
        const order = [...activationOrder].reverse();

        order.forEach((index, i) => {
            setTimeout(() => {
                setLights(prev => {
                    const newLights = [...prev];
                    newLights[index] = false;
                    return newLights;
                });

                if (i === order.length - 1) {
                    setIsDeactivating(false);
                    setActivationOrder([]);
                }
            }, i * 300);
        });
    };

    return (
        <div className="grid-lights">
            <div className="grid" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
                {lights.map((isOn, index) => (
                    <div
                        key={index}
                        className={`light ${isOn ? 'on' : 'off'}`}
                        onClick={() => toggleLight(index)}
                    />
                ))}
            </div>
            <button
                onClick={deactivateLights}
                disabled={activationOrder.length === 0 || isDeactivating}
            >
                Deactivate
            </button>
        </div>
    );
}
```

---

## 6. Analog Clock

### Question
Build an analog clock where the hands update and move like a real clock.

### Solution

```jsx
import React, { useState, useEffect } from 'react';

function AnalogClock() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const hours = time.getHours() % 12;
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();

    const hourAngle = (hours * 30) + (minutes * 0.5);
    const minuteAngle = minutes * 6;
    const secondAngle = seconds * 6;

    return (
        <div className="analog-clock">
            <svg width="200" height="200" viewBox="0 0 200 200">
                {/* Clock face */}
                <circle cx="100" cy="100" r="95" fill="white" stroke="black" strokeWidth="2" />
                
                {/* Hour markers */}
                {Array.from({ length: 12 }).map((_, i) => {
                    const angle = (i * 30) - 90;
                    const x1 = 100 + 80 * Math.cos(angle * Math.PI / 180);
                    const y1 = 100 + 80 * Math.sin(angle * Math.PI / 180);
                    const x2 = 100 + 90 * Math.cos(angle * Math.PI / 180);
                    const y2 = 100 + 90 * Math.sin(angle * Math.PI / 180);
                    return (
                        <line
                            key={i}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="black"
                            strokeWidth="2"
                        />
                    );
                })}

                {/* Hour hand */}
                <line
                    x1="100"
                    y1="100"
                    x2={100 + 40 * Math.cos((hourAngle - 90) * Math.PI / 180)}
                    y2={100 + 40 * Math.sin((hourAngle - 90) * Math.PI / 180)}
                    stroke="black"
                    strokeWidth="4"
                    strokeLinecap="round"
                />

                {/* Minute hand */}
                <line
                    x1="100"
                    y1="100"
                    x2={100 + 60 * Math.cos((minuteAngle - 90) * Math.PI / 180)}
                    y2={100 + 60 * Math.sin((minuteAngle - 90) * Math.PI / 180)}
                    stroke="black"
                    strokeWidth="3"
                    strokeLinecap="round"
                />

                {/* Second hand */}
                <line
                    x1="100"
                    y1="100"
                    x2={100 + 70 * Math.cos((secondAngle - 90) * Math.PI / 180)}
                    y2={100 + 70 * Math.sin((secondAngle - 90) * Math.PI / 180)}
                    stroke="red"
                    strokeWidth="1"
                    strokeLinecap="round"
                />

                {/* Center dot */}
                <circle cx="100" cy="100" r="5" fill="black" />
            </svg>
        </div>
    );
}
```

---

## 7. Connect Four

### Question
Build a game for two players who take turns to drop colored discs from the top into a vertically suspended board/grid.

### Solution

```jsx
import React, { useState } from 'react';

function ConnectFour({ rows = 6, cols = 7, winLength = 4 }) {
    const [board, setBoard] = useState(Array(rows).fill(null).map(() => Array(cols).fill(null)));
    const [currentPlayer, setCurrentPlayer] = useState('red');
    const [winner, setWinner] = useState(null);

    const dropPiece = (col) => {
        if (winner) return;

        const newBoard = board.map(row => [...row]);
        
        // Find lowest empty row in column
        for (let row = rows - 1; row >= 0; row--) {
            if (newBoard[row][col] === null) {
                newBoard[row][col] = currentPlayer;
                setBoard(newBoard);

                if (checkWinner(newBoard, row, col, currentPlayer)) {
                    setWinner(currentPlayer);
                } else {
                    setCurrentPlayer(currentPlayer === 'red' ? 'yellow' : 'red');
                }
                break;
            }
        }
    };

    const checkWinner = (board, row, col, player) => {
        const directions = [
            [[0, 1], [0, -1]], // horizontal
            [[1, 0], [-1, 0]], // vertical
            [[1, 1], [-1, -1]], // diagonal \
            [[1, -1], [-1, 1]] // diagonal /
        ];

        for (let dir of directions) {
            let count = 1;

            for (let [dx, dy] of dir) {
                let r = row + dx;
                let c = col + dy;

                while (
                    r >= 0 && r < rows &&
                    c >= 0 && c < cols &&
                    board[r][c] === player
                ) {
                    count++;
                    r += dx;
                    c += dy;
                }
            }

            if (count >= winLength) return true;
        }

        return false;
    };

    const reset = () => {
        setBoard(Array(rows).fill(null).map(() => Array(cols).fill(null)));
        setCurrentPlayer('red');
        setWinner(null);
    };

    return (
        <div className="connect-four">
            <div className="game-info">
                {winner ? (
                    <div>Winner: {winner}</div>
                ) : (
                    <div>Current Player: {currentPlayer}</div>
                )}
                <button onClick={reset}>Reset</button>
            </div>

            <div className="board">
                <div className="columns">
                    {Array(cols).fill(null).map((_, col) => (
                        <div
                            key={col}
                            className="column"
                            onClick={() => dropPiece(col)}
                        >
                            {Array(rows).fill(null).map((_, row) => (
                                <div
                                    key={`${row}-${col}`}
                                    className={`cell ${board[row][col] || 'empty'}`}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
```

---

## 8. Pixel Art

### Question
Build a pixel art drawing tool where users can paint pixels with selected colors.

### Solution

```jsx
import React, { useState } from 'react';

function PixelArt({ gridSize = 20 }) {
    const [selectedColor, setSelectedColor] = useState('#000000');
    const [pixels, setPixels] = useState(
        Array(gridSize).fill(null).map(() => Array(gridSize).fill('#ffffff'))
    );
    const [isDrawing, setIsDrawing] = useState(false);

    const colors = [
        '#000000', '#ffffff', '#ff0000', '#00ff00',
        '#0000ff', '#ffff00', '#ff00ff', '#00ffff'
    ];

    const handlePixelClick = (row, col) => {
        const newPixels = pixels.map(r => [...r]);
        newPixels[row][col] = selectedColor;
        setPixels(newPixels);
    };

    const handlePixelMouseEnter = (row, col) => {
        if (isDrawing) {
            handlePixelClick(row, col);
        }
    };

    const clear = () => {
        setPixels(Array(gridSize).fill(null).map(() => Array(gridSize).fill('#ffffff')));
    };

    return (
        <div className="pixel-art">
            <div className="controls">
                <div className="color-picker">
                    {colors.map(color => (
                        <div
                            key={color}
                            className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setSelectedColor(color)}
                        />
                    ))}
                </div>
                <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                />
                <button onClick={clear}>Clear</button>
            </div>

            <div
                className="pixel-grid"
                style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
                onMouseDown={() => setIsDrawing(true)}
                onMouseUp={() => setIsDrawing(false)}
                onMouseLeave={() => setIsDrawing(false)}
            >
                {pixels.map((row, rowIndex) =>
                    row.map((color, colIndex) => (
                        <div
                            key={`${rowIndex}-${colIndex}`}
                            className="pixel"
                            style={{ backgroundColor: color }}
                            onClick={() => handlePixelClick(rowIndex, colIndex)}
                            onMouseEnter={() => handlePixelMouseEnter(rowIndex, colIndex)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
```

---

## 9. Whack-A-Mole

### Question
Build a popular arcade game where players attempt to hit moles as they pop up from holes in a board.

### Solution

```jsx
import React, { useState, useEffect } from 'react';

function WhackAMole({ gridSize = 3, gameDuration = 30 }) {
    const [moles, setMoles] = useState(Array(gridSize * gridSize).fill(false));
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(gameDuration);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (!isPlaying) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setIsPlaying(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isPlaying]);

    useEffect(() => {
        if (!isPlaying) return;

        const moleInterval = setInterval(() => {
            const randomIndex = Math.floor(Math.random() * (gridSize * gridSize));
            setMoles(prev => {
                const newMoles = [...prev];
                newMoles[randomIndex] = true;
                return newMoles;
            });

            setTimeout(() => {
                setMoles(prev => {
                    const newMoles = [...prev];
                    newMoles[randomIndex] = false;
                    return newMoles;
                });
            }, 1000);
        }, 800);

        return () => clearInterval(moleInterval);
    }, [isPlaying, gridSize]);

    const whackMole = (index) => {
        if (moles[index] && isPlaying) {
            setMoles(prev => {
                const newMoles = [...prev];
                newMoles[index] = false;
                return newMoles;
            });
            setScore(prev => prev + 1);
        }
    };

    const startGame = () => {
        setScore(0);
        setTimeLeft(gameDuration);
        setIsPlaying(true);
        setMoles(Array(gridSize * gridSize).fill(false));
    };

    return (
        <div className="whack-a-mole">
            <div className="game-info">
                <div>Score: {score}</div>
                <div>Time: {timeLeft}s</div>
                {!isPlaying && (
                    <button onClick={startGame}>
                        {timeLeft === 0 ? 'Play Again' : 'Start Game'}
                    </button>
                )}
            </div>

            <div
                className="mole-grid"
                style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
            >
                {moles.map((hasMole, index) => (
                    <div
                        key={index}
                        className="hole"
                        onClick={() => whackMole(index)}
                    >
                        {hasMole && <div className="mole">🐹</div>}
                    </div>
                ))}
            </div>
        </div>
    );
}
```

---

## 10. Users Database

### Question
Build a UI to filter, create, update, and delete users.

### Solution

```jsx
import React, { useState } from 'react';

function UsersDatabase() {
    const [users, setUsers] = useState([
        { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' }
    ]);
    const [filter, setFilter] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: '', email: '', role: 'User' });

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(filter.toLowerCase()) ||
        user.email.toLowerCase().includes(filter.toLowerCase())
    );

    const handleCreate = () => {
        const newUser = {
            id: Date.now(),
            ...formData
        };
        setUsers([...users, newUser]);
        setFormData({ name: '', email: '', role: 'User' });
    };

    const handleUpdate = (id) => {
        setUsers(users.map(user =>
            user.id === id ? { ...user, ...formData } : user
        ));
        setEditingId(null);
        setFormData({ name: '', email: '', role: 'User' });
    };

    const handleDelete = (id) => {
        setUsers(users.filter(user => user.id !== id));
    };

    const startEdit = (user) => {
        setEditingId(user.id);
        setFormData({ name: user.name, email: user.email, role: user.role });
    };

    return (
        <div className="users-database">
            <div className="controls">
                <input
                    type="text"
                    placeholder="Filter users..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>

            <div className="user-form">
                <input
                    type="text"
                    placeholder="Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                </select>
                {editingId ? (
                    <>
                        <button onClick={() => handleUpdate(editingId)}>Update</button>
                        <button onClick={() => {
                            setEditingId(null);
                            setFormData({ name: '', email: '', role: 'User' });
                        }}>Cancel</button>
                    </>
                ) : (
                    <button onClick={handleCreate}>Create User</button>
                )}
            </div>

            <table className="users-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredUsers.map(user => (
                        <tr key={user.id}>
                            <td>{user.name}</td>
                            <td>{user.email}</td>
                            <td>{user.role}</td>
                            <td>
                                <button onClick={() => startEdit(user)}>Edit</button>
                                <button onClick={() => handleDelete(user.id)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
```

---

## Key Patterns

1. **Form Handling**: Controlled inputs, validation
2. **State Management**: Complex state with arrays/objects
3. **Game Logic**: Win conditions, turn-based gameplay
4. **Real-time Updates**: Timers, intervals
5. **User Interactions**: Click, drag, keyboard
6. **Data Manipulation**: CRUD operations

## Best Practices

- ✅ Handle edge cases
- ✅ Provide user feedback
- ✅ Optimize performance
- ✅ Make accessible
- ✅ Clean up timers/intervals
- ✅ Validate inputs

