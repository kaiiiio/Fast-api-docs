# More Premium React Components

Additional premium component solutions from GreatFrontEnd.

## 1. Birth Year Histogram

### Question
Build a widget that fetches birth year data from an API and plot it on a histogram.

### Solution

```jsx
import React, { useState, useEffect } from 'react';

function BirthYearHistogram() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchBirthYearData();
    }, []);

    const fetchBirthYearData = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/birth-years');
            const years = await response.json();
            setData(processData(years));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const processData = (years) => {
        const counts = {};
        years.forEach(year => {
            counts[year] = (counts[year] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([year, count]) => ({ year: parseInt(year), count }))
            .sort((a, b) => a.year - b.year);
    };

    const maxCount = Math.max(...data.map(d => d.count), 0);
    const maxYear = Math.max(...data.map(d => d.year), 0);
    const minYear = Math.min(...data.map(d => d.year), 0);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="histogram">
            <h2>Birth Year Distribution</h2>
            <div className="chart">
                {data.map(({ year, count }) => {
                    const height = (count / maxCount) * 100;
                    return (
                        <div key={year} className="bar-container">
                            <div
                                className="bar"
                                style={{ height: `${height}%` }}
                                title={`${year}: ${count} people`}
                            />
                            <div className="label">{year}</div>
                        </div>
                    );
                })}
            </div>
            <div className="axis-labels">
                <span>{minYear}</span>
                <span>{maxYear}</span>
            </div>
        </div>
    );
}
```

---

## 2. Selectable Cells

### Question
Build an interface where users can drag to select multiple cells within a grid.

### Solution

```jsx
import React, { useState, useRef } from 'react';

function SelectableCells({ rows = 10, cols = 10 }) {
    const [selectedCells, setSelectedCells] = useState(new Set());
    const [isSelecting, setIsSelecting] = useState(false);
    const [startCell, setStartCell] = useState(null);
    const gridRef = useRef(null);

    const getCellKey = (row, col) => `${row}-${col}`;

    const handleMouseDown = (row, col) => {
        setIsSelecting(true);
        setStartCell({ row, col });
        setSelectedCells(new Set([getCellKey(row, col)]));
    };

    const handleMouseEnter = (row, col) => {
        if (!isSelecting || !startCell) return;

        const newSelected = new Set();
        const minRow = Math.min(startCell.row, row);
        const maxRow = Math.max(startCell.row, row);
        const minCol = Math.min(startCell.col, col);
        const maxCol = Math.max(startCell.col, col);

        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                newSelected.add(getCellKey(r, c));
            }
        }

        setSelectedCells(newSelected);
    };

    const handleMouseUp = () => {
        setIsSelecting(false);
        setStartCell(null);
    };

    return (
        <div
            className="selectable-grid"
            ref={gridRef}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
            {Array(rows).fill(null).map((_, row) =>
                Array(cols).fill(null).map((_, col) => {
                    const key = getCellKey(row, col);
                    const isSelected = selectedCells.has(key);
                    return (
                        <div
                            key={key}
                            className={`cell ${isSelected ? 'selected' : ''}`}
                            onMouseDown={() => handleMouseDown(row, col)}
                            onMouseEnter={() => handleMouseEnter(row, col)}
                        />
                    );
                })
            )}
        </div>
    );
}
```

---

## 3. Tic-tac-toe II (N x N with M to win)

### Question
Build an N x N tic-tac-toe game that requires M consecutive marks to win.

### Solution

```jsx
import React, { useState } from 'react';

function TicTacToeNxN({ size = 5, winLength = 4 }) {
    const [board, setBoard] = useState(Array(size).fill(null).map(() => Array(size).fill(null)));
    const [currentPlayer, setCurrentPlayer] = useState('X');
    const [winner, setWinner] = useState(null);
    const [winningCells, setWinningCells] = useState([]);

    const checkWinner = (board, row, col, player) => {
        const directions = [
            [[0, 1], [0, -1]], // horizontal
            [[1, 0], [-1, 0]], // vertical
            [[1, 1], [-1, -1]], // diagonal \
            [[1, -1], [-1, 1]] // diagonal /
        ];

        for (let dir of directions) {
            let cells = [{ row, col }];
            let count = 1;

            for (let [dx, dy] of dir) {
                let r = row + dx;
                let c = col + dy;

                while (
                    r >= 0 && r < size &&
                    c >= 0 && c < size &&
                    board[r][c] === player
                ) {
                    cells.push({ row: r, col: c });
                    count++;
                    r += dx;
                    c += dy;
                }
            }

            if (count >= winLength) {
                return cells;
            }
        }

        return null;
    };

    const handleCellClick = (row, col) => {
        if (board[row][col] || winner) return;

        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = currentPlayer;
        setBoard(newBoard);

        const winning = checkWinner(newBoard, row, col, currentPlayer);
        if (winning) {
            setWinner(currentPlayer);
            setWinningCells(winning);
        } else {
            setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
        }
    };

    const reset = () => {
        setBoard(Array(size).fill(null).map(() => Array(size).fill(null)));
        setCurrentPlayer('X');
        setWinner(null);
        setWinningCells([]);
    };

    const isWinningCell = (row, col) => {
        return winningCells.some(cell => cell.row === row && cell.col === col);
    };

    return (
        <div className="tic-tac-toe-nxn">
            <div className="game-info">
                {winner ? (
                    <div>Winner: {winner}</div>
                ) : (
                    <div>Current Player: {currentPlayer}</div>
                )}
                <button onClick={reset}>Reset</button>
            </div>

            <div className="board" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
                {board.map((row, rowIndex) =>
                    row.map((cell, colIndex) => (
                        <div
                            key={`${rowIndex}-${colIndex}`}
                            className={`cell ${isWinningCell(rowIndex, colIndex) ? 'winning' : ''}`}
                            onClick={() => handleCellClick(rowIndex, colIndex)}
                        >
                            {cell}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
```

---

## 4. Progress Bars IV (Concurrent with pause/resume)

### Question
Build a list of progress bars that fill up gradually concurrently, up to a limit of 3 and allows for pausing and resuming.

### Solution

```jsx
import React, { useState, useEffect, useRef } from 'react';

function ProgressBarsConcurrent() {
    const [bars, setBars] = useState([]);
    const [activeBars, setActiveBars] = useState(new Set());
    const intervalsRef = useRef({});

    const addBar = () => {
        const newBar = {
            id: Date.now(),
            progress: 0,
            isPaused: false
        };
        setBars(prev => [...prev, newBar]);
        
        if (activeBars.size < 3) {
            startProgress(newBar.id);
        }
    };

    const startProgress = (id) => {
        if (intervalsRef.current[id]) return;

        setActiveBars(prev => new Set([...prev, id]));

        intervalsRef.current[id] = setInterval(() => {
            setBars(prev => prev.map(bar => {
                if (bar.id === id && !bar.isPaused) {
                    const newProgress = Math.min(bar.progress + 1, 100);
                    if (newProgress === 100) {
                        clearInterval(intervalsRef.current[id]);
                        delete intervalsRef.current[id];
                        setActiveBars(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(id);
                            return newSet;
                        });
                        // Start next waiting bar
                        startNextWaiting();
                    }
                    return { ...bar, progress: newProgress };
                }
                return bar;
            }));
        }, 50);
    };

    const startNextWaiting = () => {
        const waitingBar = bars.find(bar => 
            bar.progress < 100 && 
            !activeBars.has(bar.id) && 
            !bar.isPaused
        );
        if (waitingBar && activeBars.size < 3) {
            startProgress(waitingBar.id);
        }
    };

    const togglePause = (id) => {
        setBars(prev => prev.map(bar => {
            if (bar.id === id) {
                const newPaused = !bar.isPaused;
                if (!newPaused && activeBars.size < 3) {
                    startProgress(id);
                }
                return { ...bar, isPaused: newPaused };
            }
            return bar;
        }));
    };

    const removeBar = (id) => {
        if (intervalsRef.current[id]) {
            clearInterval(intervalsRef.current[id]);
            delete intervalsRef.current[id];
        }
        setActiveBars(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });
        setBars(prev => prev.filter(bar => bar.id !== id));
        startNextWaiting();
    };

    useEffect(() => {
        return () => {
            Object.values(intervalsRef.current).forEach(interval => {
                clearInterval(interval);
            });
        };
    }, []);

    return (
        <div className="progress-bars-concurrent">
            <button onClick={addBar}>Add Progress Bar</button>
            <div className="bars-list">
                {bars.map(bar => (
                    <div key={bar.id} className="progress-bar-container">
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${bar.progress}%` }}
                            />
                        </div>
                        <div className="progress-info">
                            <span>{bar.progress}%</span>
                            <button onClick={() => togglePause(bar.id)}>
                                {bar.isPaused ? 'Resume' : 'Pause'}
                            </button>
                            <button onClick={() => removeBar(bar.id)}>Remove</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
```

---

## 5. Data Table IV (Pagination, Sorting, Filtering)

### Question
Build a generalized data table with pagination, sorting and filtering features.

### Solution

```jsx
import React, { useState, useMemo } from 'react';

function DataTable({ data, columns, pageSize = 10 }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [filters, setFilters] = useState({});

    const filteredData = useMemo(() => {
        return data.filter(row => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value) return true;
                const cellValue = String(row[key]).toLowerCase();
                return cellValue.includes(value.toLowerCase());
            });
        });
    }, [data, filters]);

    const sortedData = useMemo(() => {
        if (!sortConfig.key) return filteredData;

        return [...filteredData].sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredData, sortConfig]);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedData.slice(start, start + pageSize);
    }, [sortedData, currentPage, pageSize]);

    const totalPages = Math.ceil(sortedData.length / pageSize);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleFilter = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
        setCurrentPage(1);
    };

    return (
        <div className="data-table">
            <div className="filters">
                {columns.map(col => (
                    <input
                        key={col.key}
                        type="text"
                        placeholder={`Filter ${col.label}...`}
                        value={filters[col.key] || ''}
                        onChange={(e) => handleFilter(col.key, e.target.value)}
                    />
                ))}
            </div>

            <table>
                <thead>
                    <tr>
                        {columns.map(col => (
                            <th
                                key={col.key}
                                onClick={() => handleSort(col.key)}
                                className={sortConfig.key === col.key ? `sort-${sortConfig.direction}` : ''}
                            >
                                {col.label}
                                {sortConfig.key === col.key && (
                                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {paginatedData.map((row, index) => (
                        <tr key={index}>
                            {columns.map(col => (
                                <td key={col.key}>{row[col.key]}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="pagination">
                <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                >
                    Previous
                </button>
                <span>
                    Page {currentPage} of {totalPages}
                </span>
                <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                >
                    Next
                </button>
            </div>
        </div>
    );
}
```

---

## 6. Image Carousel III (Minimal DOM)

### Question
Build an image carousel that smoothly transitions between images that has a minimal DOM footprint.

### Solution

```jsx
import React, { useState, useEffect } from 'react';

function ImageCarouselMinimal({ images }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(0);

    const next = () => {
        setDirection(1);
        setCurrentIndex(prev => (prev + 1) % images.length);
    };

    const prev = () => {
        setDirection(-1);
        setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
    };

    const goTo = (index) => {
        setDirection(index > currentIndex ? 1 : -1);
        setCurrentIndex(index);
    };

    // Auto-play
    useEffect(() => {
        const timer = setInterval(next, 3000);
        return () => clearInterval(timer);
    }, [currentIndex]);

    // Only render current, previous, and next images
    const visibleImages = [
        (currentIndex - 1 + images.length) % images.length,
        currentIndex,
        (currentIndex + 1) % images.length
    ];

    return (
        <div className="carousel-minimal">
            <div className="carousel-container">
                {visibleImages.map((imgIndex, position) => {
                    const offset = position - 1; // -1, 0, 1
                    const isActive = offset === 0;
                    
                    return (
                        <div
                            key={`${imgIndex}-${currentIndex}`}
                            className={`carousel-slide ${isActive ? 'active' : ''}`}
                            style={{
                                transform: `translateX(${offset * 100}%)`,
                                opacity: isActive ? 1 : 0.3,
                                zIndex: isActive ? 2 : 1
                            }}
                        >
                            <img src={images[imgIndex]} alt={`Slide ${imgIndex}`} />
                        </div>
                    );
                })}
            </div>

            <button className="prev" onClick={prev}>‹</button>
            <button className="next" onClick={next}>›</button>

            <div className="indicators">
                {images.map((_, index) => (
                    <button
                        key={index}
                        className={index === currentIndex ? 'active' : ''}
                        onClick={() => goTo(index)}
                    />
                ))}
            </div>
        </div>
    );
}
```

---

## Key Patterns

1. **Data Visualization**: Histograms, charts
2. **Drag Selection**: Mouse events for selection
3. **Game Logic**: Win conditions, board state
4. **Concurrent Operations**: Managing multiple async operations
5. **Table Features**: Sorting, filtering, pagination
6. **Performance**: Minimal DOM, efficient rendering

## Best Practices

- ✅ Optimize for large datasets
- ✅ Handle concurrent operations
- ✅ Provide smooth animations
- ✅ Manage state efficiently
- ✅ Clean up intervals/timers
- ✅ Handle edge cases

