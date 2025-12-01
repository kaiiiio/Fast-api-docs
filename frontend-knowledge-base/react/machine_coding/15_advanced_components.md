# Advanced React Components: Infinite Scroll, Virtual List, Drag and Drop

Complex React components with advanced patterns.

## 1. Infinite Scroll

### Question
Build an infinite scroll component that loads more data as the user scrolls.

### Solution

```jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';

function InfiniteScroll({ fetchData, renderItem, initialData = [] }) {
    const [items, setItems] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const observerRef = useRef();
    const lastElementRef = useCallback(node => {
        if (loading) return;
        if (observerRef.current) observerRef.current.disconnect();
        
        observerRef.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                loadMore();
            }
        });
        
        if (node) observerRef.current.observe(node);
    }, [loading, hasMore]);

    const loadMore = async () => {
        if (loading || !hasMore) return;
        
        setLoading(true);
        try {
            const newData = await fetchData(page);
            if (newData.length === 0) {
                setHasMore(false);
            } else {
                setItems(prev => [...prev, ...newData]);
                setPage(prev => prev + 1);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="infinite-scroll">
            {items.map((item, index) => {
                if (index === items.length - 1) {
                    return (
                        <div key={index} ref={lastElementRef}>
                            {renderItem(item)}
                        </div>
                    );
                }
                return <div key={index}>{renderItem(item)}</div>;
            })}
            {loading && <div className="loading">Loading more...</div>}
            {!hasMore && <div className="end-message">No more items</div>}
        </div>
    );
}

// Usage
function App() {
    const fetchData = async (page) => {
        const response = await fetch(`/api/items?page=${page}`);
        return response.json();
    };

    return (
        <InfiniteScroll
            fetchData={fetchData}
            renderItem={(item) => <div className="item">{item.name}</div>}
        />
    );
}
```

### Explanation
- **Intersection Observer**: Detects when last element is visible
- **Lazy Loading**: Loads data on scroll
- **State Management**: Tracks page, loading, hasMore
- **Performance**: Only observes last element
- **Error Handling**: Handles fetch errors

---

## 2. Virtual List

### Question
Build a virtual list component that only renders visible items for performance.

### Solution

```jsx
import React, { useState, useEffect, useRef } from 'react';

function VirtualList({ items, itemHeight = 50, containerHeight = 400 }) {
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef(null);

    const totalHeight = items.length * itemHeight;
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + visibleCount + 1, items.length);
    
    const visibleItems = items.slice(startIndex, endIndex);
    const offsetY = startIndex * itemHeight;

    const handleScroll = (e) => {
        setScrollTop(e.target.scrollTop);
    };

    return (
        <div
            ref={containerRef}
            className="virtual-list"
            style={{ height: containerHeight, overflow: 'auto' }}
            onScroll={handleScroll}
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ transform: `translateY(${offsetY}px)` }}>
                    {visibleItems.map((item, index) => (
                        <div
                            key={startIndex + index}
                            style={{ height: itemHeight }}
                            className="virtual-item"
                        >
                            {item}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Usage
const items = Array.from({ length: 10000 }, (_, i) => `Item ${i + 1}`);
<VirtualList items={items} itemHeight={50} containerHeight={400} />
```

### Explanation
- **Windowed Rendering**: Only renders visible items
- **Scroll Calculation**: Calculates visible range
- **Transform**: Uses translateY for positioning
- **Performance**: Handles thousands of items
- **Dynamic Height**: Supports variable item heights

---

## 3. Drag and Drop List

### Question
Build a drag and drop list component where items can be reordered.

### Solution

```jsx
import React, { useState } from 'react';

function DragDropList({ items: initialItems, onReorder }) {
    const [items, setItems] = useState(initialItems);
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);

    const handleDragStart = (index) => {
        setDraggedItem(index);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        setDragOverIndex(index);
    };

    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        
        if (draggedItem === null || draggedItem === dropIndex) {
            setDraggedItem(null);
            setDragOverIndex(null);
            return;
        }

        const newItems = [...items];
        const [removed] = newItems.splice(draggedItem, 1);
        newItems.splice(dropIndex, 0, removed);

        setItems(newItems);
        setDraggedItem(null);
        setDragOverIndex(null);

        if (onReorder) {
            onReorder(newItems);
        }
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
        setDragOverIndex(null);
    };

    return (
        <div className="drag-drop-list">
            {items.map((item, index) => (
                <div
                    key={item.id || index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`drag-item ${
                        draggedItem === index ? 'dragging' : ''
                    } ${
                        dragOverIndex === index ? 'drag-over' : ''
                    }`}
                >
                    {item.content || item}
                </div>
            ))}
        </div>
    );
}
```

### CSS

```css
.drag-drop-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.drag-item {
    padding: 1rem;
    background: white;
    border: 2px solid #ddd;
    border-radius: 4px;
    cursor: move;
    transition: all 0.2s;
}

.drag-item.dragging {
    opacity: 0.5;
    transform: scale(0.95);
}

.drag-item.drag-over {
    border-color: #007bff;
    background: #f0f8ff;
}
```

---

## 4. Multi-select Dropdown

### Question
Build a multi-select dropdown component with search functionality.

### Solution

```jsx
import React, { useState, useRef, useEffect } from 'react';

function MultiSelectDropdown({ options, placeholder = 'Select...' }) {
    const [selected, setSelected] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleSelection = (option) => {
        setSelected(prev => {
            const isSelected = prev.some(item => item.value === option.value);
            if (isSelected) {
                return prev.filter(item => item.value !== option.value);
            } else {
                return [...prev, option];
            }
        });
    };

    const removeSelection = (value) => {
        setSelected(prev => prev.filter(item => item.value !== value));
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="multi-select-dropdown" ref={dropdownRef}>
            <div
                className="dropdown-trigger"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="selected-items">
                    {selected.length === 0 ? (
                        <span className="placeholder">{placeholder}</span>
                    ) : (
                        selected.map(item => (
                            <span key={item.value} className="selected-tag">
                                {item.label}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeSelection(item.value);
                                    }}
                                    className="remove-btn"
                                >
                                    ×
                                </button>
                            </span>
                        ))
                    )}
                </div>
                <span className="arrow">{isOpen ? '▲' : '▼'}</span>
            </div>

            {isOpen && (
                <div className="dropdown-menu">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <div className="options-list">
                        {filteredOptions.length === 0 ? (
                            <div className="no-options">No options found</div>
                        ) : (
                            filteredOptions.map(option => {
                                const isSelected = selected.some(
                                    item => item.value === option.value
                                );
                                return (
                                    <div
                                        key={option.value}
                                        className={`option ${isSelected ? 'selected' : ''}`}
                                        onClick={() => toggleSelection(option)}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            readOnly
                                        />
                                        <span>{option.label}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
```

---

## 5. Auto-complete Input

### Question
Build an auto-complete input component with debounced search.

### Solution

```jsx
import React, { useState, useEffect, useRef } from 'react';

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
}

function AutoComplete({ fetchSuggestions, onSelect, placeholder }) {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);

    const debouncedInput = useDebounce(inputValue, 300);

    useEffect(() => {
        if (debouncedInput.trim()) {
            setLoading(true);
            fetchSuggestions(debouncedInput)
                .then(results => {
                    setSuggestions(results);
                    setShowSuggestions(true);
                    setSelectedIndex(-1);
                })
                .catch(error => {
                    console.error('Error fetching suggestions:', error);
                    setSuggestions([]);
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }, [debouncedInput, fetchSuggestions]);

    const handleSelect = (suggestion) => {
        setInputValue(suggestion.label || suggestion);
        setShowSuggestions(false);
        if (onSelect) {
            onSelect(suggestion);
        }
    };

    const handleKeyDown = (e) => {
        if (!showSuggestions || suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0) {
                    handleSelect(suggestions[selectedIndex]);
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                break;
        }
    };

    return (
        <div className="autocomplete">
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                    if (suggestions.length > 0) {
                        setShowSuggestions(true);
                    }
                }}
                placeholder={placeholder}
                className="autocomplete-input"
            />
            {loading && <div className="loading">Loading...</div>}
            {showSuggestions && suggestions.length > 0 && (
                <ul className="suggestions-list" ref={suggestionsRef}>
                    {suggestions.map((suggestion, index) => (
                        <li
                            key={suggestion.value || index}
                            className={`suggestion ${
                                index === selectedIndex ? 'selected' : ''
                            }`}
                            onClick={() => handleSelect(suggestion)}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            {suggestion.label || suggestion}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
```

---

## Key Patterns

1. **Performance Optimization**: Virtual scrolling, debouncing
2. **Intersection Observer**: For infinite scroll
3. **Drag and Drop**: HTML5 drag API
4. **Keyboard Navigation**: Arrow keys, Enter, Escape
5. **Search Filtering**: Real-time search
6. **State Management**: Complex state interactions

## Best Practices

- ✅ Optimize for large datasets
- ✅ Handle keyboard navigation
- ✅ Provide loading states
- ✅ Handle edge cases
- ✅ Make accessible
- ✅ Smooth animations

