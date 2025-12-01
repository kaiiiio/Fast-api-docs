# Advanced React Components: Image Carousel, File Explorer, Data Table

Complete solutions for advanced React machine coding questions.

## 1. Image Carousel

### Question
Build an image carousel that displays a sequence of images with navigation controls.

### Solution

```jsx
import React, { useState, useEffect, useRef } from 'react';

function ImageCarousel({ images, autoPlay = false, interval = 3000 }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const intervalRef = useRef(null);

    useEffect(() => {
        if (autoPlay) {
            intervalRef.current = setInterval(() => {
                setCurrentIndex(prev => (prev + 1) % images.length);
            }, interval);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [autoPlay, interval, images.length]);

    const goToNext = () => {
        setCurrentIndex(prev => (prev + 1) % images.length);
    };

    const goToPrevious = () => {
        setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
    };

    const goToSlide = (index) => {
        setCurrentIndex(index);
    };

    return (
        <div className="carousel">
            <div className="carousel-container">
                <button
                    className="carousel-button carousel-button-prev"
                    onClick={goToPrevious}
                    aria-label="Previous image"
                >
                    ‹
                </button>
                
                <div className="carousel-slide">
                    <img
                        src={images[currentIndex]}
                        alt={`Slide ${currentIndex + 1}`}
                        className="carousel-image"
                    />
                </div>
                
                <button
                    className="carousel-button carousel-button-next"
                    onClick={goToNext}
                    aria-label="Next image"
                >
                    ›
                </button>
            </div>
            
            <div className="carousel-indicators">
                {images.map((_, index) => (
                    <button
                        key={index}
                        className={`indicator ${index === currentIndex ? 'active' : ''}`}
                        onClick={() => goToSlide(index)}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
            
            <div className="carousel-counter">
                {currentIndex + 1} / {images.length}
            </div>
        </div>
    );
}

// Usage
const images = [
    'https://via.placeholder.com/800x400/FF6B6B/FFFFFF?text=Image+1',
    'https://via.placeholder.com/800x400/4ECDC4/FFFFFF?text=Image+2',
    'https://via.placeholder.com/800x400/45B7D1/FFFFFF?text=Image+3',
    'https://via.placeholder.com/800x400/FFA07A/FFFFFF?text=Image+4'
];

function App() {
    return <ImageCarousel images={images} autoPlay={true} interval={3000} />;
}
```

### CSS

```css
.carousel {
    position: relative;
    max-width: 800px;
    margin: 0 auto;
}

.carousel-container {
    position: relative;
    width: 100%;
    overflow: hidden;
    border-radius: 8px;
}

.carousel-slide {
    width: 100%;
    height: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.carousel-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: opacity 0.3s ease;
}

.carousel-button {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(0, 0, 0, 0.5);
    color: white;
    border: none;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    font-size: 2rem;
    cursor: pointer;
    z-index: 10;
    transition: background 0.3s;
}

.carousel-button:hover {
    background: rgba(0, 0, 0, 0.7);
}

.carousel-button-prev {
    left: 20px;
}

.carousel-button-next {
    right: 20px;
}

.carousel-indicators {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 1rem;
}

.indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: none;
    background: #ddd;
    cursor: pointer;
    transition: background 0.3s;
}

.indicator.active {
    background: #007bff;
}

.carousel-counter {
    text-align: center;
    margin-top: 0.5rem;
    color: #666;
    font-size: 0.9rem;
}
```

### Explanation
- **State Management**: Tracks current image index
- **Navigation**: Previous/Next buttons and indicator dots
- **Auto-play**: Optional automatic slide transition
- **Circular Navigation**: Wraps around at ends
- **Cleanup**: Clears interval on unmount

### Visualization
```
┌─────────────────────────┐
│  [‹]  [Image]  [›]     │
│                         │
│  • • ● •               │
│  1 / 4                  │
└─────────────────────────┘
```

---

## 2. File Explorer

### Question
Build a file explorer component to navigate files and directories in a tree-like hierarchical viewer.

### Solution

```jsx
import React, { useState } from 'react';

function FileExplorer({ data }) {
    const [expandedNodes, setExpandedNodes] = useState(new Set());

    const toggleNode = (path) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(path)) {
                newSet.delete(path);
            } else {
                newSet.add(path);
            }
            return newSet;
        });
    };

    const renderNode = (node, path = '') => {
        const currentPath = path ? `${path}/${node.name}` : node.name;
        const isExpanded = expandedNodes.has(currentPath);
        const isDirectory = node.type === 'directory';

        return (
            <div key={currentPath} className="file-node">
                <div
                    className={`node-item ${isDirectory ? 'directory' : 'file'}`}
                    onClick={() => isDirectory && toggleNode(currentPath)}
                >
                    {isDirectory && (
                        <span className="expand-icon">
                            {isExpanded ? '📂' : '📁'}
                        </span>
                    )}
                    {!isDirectory && <span className="file-icon">📄</span>}
                    <span className="node-name">{node.name}</span>
                    {isDirectory && (
                        <span className="expand-arrow">
                            {isExpanded ? '▼' : '▶'}
                        </span>
                    )}
                </div>
                
                {isDirectory && isExpanded && node.children && (
                    <div className="node-children">
                        {node.children.map(child =>
                            renderNode(child, currentPath)
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="file-explorer">
            <h3>File Explorer</h3>
            <div className="file-tree">
                {data.map(node => renderNode(node))}
            </div>
        </div>
    );
}

// Usage
const fileData = [
    {
        name: 'Documents',
        type: 'directory',
        children: [
            {
                name: 'Projects',
                type: 'directory',
                children: [
                    { name: 'project1.txt', type: 'file' },
                    { name: 'project2.txt', type: 'file' }
                ]
            },
            { name: 'resume.pdf', type: 'file' }
        ]
    },
    {
        name: 'Pictures',
        type: 'directory',
        children: [
            { name: 'vacation.jpg', type: 'file' },
            { name: 'family.jpg', type: 'file' }
        ]
    }
];

function App() {
    return <FileExplorer data={fileData} />;
}
```

### CSS

```css
.file-explorer {
    max-width: 400px;
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.file-tree {
    margin-top: 1rem;
}

.file-node {
    margin-left: 1rem;
}

.node-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.2s;
}

.node-item:hover {
    background: #f0f0f0;
}

.node-item.directory {
    font-weight: 600;
}

.node-item.file {
    cursor: default;
    color: #666;
}

.expand-icon,
.file-icon {
    font-size: 1.2rem;
}

.node-name {
    flex: 1;
}

.expand-arrow {
    font-size: 0.8rem;
    color: #999;
}

.node-children {
    margin-left: 1.5rem;
    border-left: 1px solid #e0e0e0;
    padding-left: 0.5rem;
}
```

### Explanation
- **Tree Structure**: Recursive rendering of nested nodes
- **Expand/Collapse**: Toggle directory visibility
- **State Management**: Set to track expanded paths
- **Visual Hierarchy**: Indentation shows nesting
- **Icons**: Different icons for files and directories

### Visualization
```
📁 Documents ▶
  📁 Projects ▶
    📄 project1.txt
    📄 project2.txt
  📄 resume.pdf
📁 Pictures ▶
```

---

## 3. Data Table with Pagination

### Question
Build a users data table with pagination features.

### Solution

```jsx
import React, { useState, useMemo } from 'react';

function DataTable({ data, itemsPerPage = 10 }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Calculate pagination
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    // Sort data
    const sortedData = useMemo(() => {
        if (!sortConfig.key) return data;

        return [...data].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [data, sortConfig]);

    // Get paginated data
    const paginatedData = sortedData.slice(startIndex, endIndex);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const goToPage = (page) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return '⇅';
        return sortConfig.direction === 'asc' ? '↑' : '↓';
    };

    if (data.length === 0) {
        return <div className="empty-state">No data available</div>;
    }

    const columns = Object.keys(data[0]);

    return (
        <div className="data-table">
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            {columns.map(column => (
                                <th
                                    key={column}
                                    onClick={() => handleSort(column)}
                                    className="sortable"
                                >
                                    {column.charAt(0).toUpperCase() + column.slice(1)}
                                    <span className="sort-icon">{getSortIcon(column)}</span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.map((row, index) => (
                            <tr key={index}>
                                {columns.map(column => (
                                    <td key={column}>{row[column]}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="pagination">
                <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    Previous
                </button>
                
                <div className="page-numbers">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                            key={page}
                            onClick={() => goToPage(page)}
                            className={currentPage === page ? 'active' : ''}
                        >
                            {page}
                        </button>
                    ))}
                </div>
                
                <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    Next
                </button>
            </div>

            <div className="table-info">
                Showing {startIndex + 1} to {Math.min(endIndex, data.length)} of {data.length} entries
            </div>
        </div>
    );
}

// Usage
const userData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25 },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', age: 35 },
    // ... more data
];

function App() {
    return <DataTable data={userData} itemsPerPage={5} />;
}
```

### CSS

```css
.data-table {
    width: 100%;
}

.table-container {
    overflow-x: auto;
    border: 1px solid #ddd;
    border-radius: 4px;
}

table {
    width: 100%;
    border-collapse: collapse;
}

thead {
    background: #f5f5f5;
}

th {
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    border-bottom: 2px solid #ddd;
}

th.sortable {
    cursor: pointer;
    user-select: none;
}

th.sortable:hover {
    background: #e9e9e9;
}

.sort-icon {
    margin-left: 0.5rem;
    font-size: 0.8rem;
    color: #666;
}

td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #e0e0e0;
}

tr:hover {
    background: #f9f9f9;
}

.pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
}

.page-numbers {
    display: flex;
    gap: 0.25rem;
}

.pagination button {
    padding: 0.5rem 1rem;
    border: 1px solid #ddd;
    background: white;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
}

.pagination button:hover:not(:disabled) {
    background: #f0f0f0;
}

.pagination button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.pagination button.active {
    background: #007bff;
    color: white;
    border-color: #007bff;
}

.table-info {
    text-align: center;
    margin-top: 1rem;
    color: #666;
    font-size: 0.9rem;
}
```

### Explanation
- **Pagination**: Splits data into pages
- **Sorting**: Click headers to sort columns
- **State Management**: Tracks current page and sort config
- **Memoization**: Optimizes sorting calculation
- **Responsive**: Handles large datasets efficiently

### Visualization
```
┌─────────────────────────────────┐
│ Name ↑  Email      Age          │
├─────────────────────────────────┤
│ John    john@...   30           │
│ Jane    jane@...   25           │
├─────────────────────────────────┤
│ [Prev] [1][2][3] [Next]         │
│ Showing 1 to 5 of 15 entries    │
└─────────────────────────────────┘
```

---

## Key Advanced Patterns

1. **useRef**: For interval management and DOM references
2. **useMemo**: For expensive calculations
3. **Recursive Components**: For tree structures
4. **Complex State**: Managing multiple related states
5. **Performance Optimization**: Memoization and efficient rendering
6. **Accessibility**: ARIA labels and keyboard navigation

## Best Practices

- ✅ Use useMemo for expensive calculations
- ✅ Clean up intervals and event listeners
- ✅ Handle edge cases (empty data, single page)
- ✅ Optimize re-renders
- ✅ Make components accessible
- ✅ Provide loading and error states

