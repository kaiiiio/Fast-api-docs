# Accessible React Components

Complete accessible component implementations with ARIA attributes.

## 1. Accessible Accordion

### Question
Build an accessible accordion component that has the right ARIA roles, states, and properties.

### Solution

```jsx
import React, { useState } from 'react';

function AccessibleAccordion({ items }) {
    const [openIndex, setOpenIndex] = useState(null);

    return (
        <div className="accordion" role="region" aria-label="Accordion">
            {items.map((item, index) => {
                const isOpen = openIndex === index;
                const id = `accordion-${index}`;
                const panelId = `panel-${index}`;

                return (
                    <div key={index} className="accordion-item">
                        <h3>
                            <button
                                id={id}
                                className="accordion-trigger"
                                aria-expanded={isOpen}
                                aria-controls={panelId}
                                onClick={() => setOpenIndex(isOpen ? null : index)}
                            >
                                {item.title}
                                <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
                            </button>
                        </h3>
                        <div
                            id={panelId}
                            role="region"
                            aria-labelledby={id}
                            className={`accordion-panel ${isOpen ? 'open' : ''}`}
                            hidden={!isOpen}
                        >
                            {item.content}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
```

### ARIA Attributes Explained

- `role="region"`: Identifies the accordion container
- `aria-expanded`: Indicates if panel is open (true/false)
- `aria-controls`: Links button to panel
- `aria-labelledby`: Links panel to button
- `hidden`: Hides panel when closed

---

## 2. Accessible Tabs

### Question
Build a fully accessible tabs component that has keyboard support according to ARIA specifications.

### Solution

```jsx
import React, { useState } from 'react';

function AccessibleTabs({ tabs }) {
    const [activeIndex, setActiveIndex] = useState(0);

    const handleKeyDown = (e, index) => {
        let newIndex = index;

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                newIndex = (index - 1 + tabs.length) % tabs.length;
                break;
            case 'ArrowRight':
                e.preventDefault();
                newIndex = (index + 1) % tabs.length;
                break;
            case 'Home':
                e.preventDefault();
                newIndex = 0;
                break;
            case 'End':
                e.preventDefault();
                newIndex = tabs.length - 1;
                break;
            default:
                return;
        }

        setActiveIndex(newIndex);
    };

    return (
        <div className="tabs" role="tablist" aria-label="Tabs">
            {tabs.map((tab, index) => {
                const isActive = activeIndex === index;
                const tabId = `tab-${index}`;
                const panelId = `panel-${index}`;

                return (
                    <React.Fragment key={index}>
                        <button
                            id={tabId}
                            role="tab"
                            aria-selected={isActive}
                            aria-controls={panelId}
                            tabIndex={isActive ? 0 : -1}
                            onClick={() => setActiveIndex(index)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                            className={isActive ? 'active' : ''}
                        >
                            {tab.label}
                        </button>
                        <div
                            id={panelId}
                            role="tabpanel"
                            aria-labelledby={tabId}
                            hidden={!isActive}
                            tabIndex={0}
                        >
                            {tab.content}
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    );
}
```

### Keyboard Navigation

- **Arrow Left/Right**: Navigate between tabs
- **Home**: Go to first tab
- **End**: Go to last tab
- **Tab**: Move to tab panel content

---

## 3. Accessible Modal Dialog

### Question
Build a fully-accessible modal dialog component that supports all required keyboard interactions.

### Solution

```jsx
import React, { useEffect, useRef } from 'react';

function AccessibleModal({ isOpen, onClose, title, children }) {
    const modalRef = useRef(null);
    const previousFocusRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            // Save previous focus
            previousFocusRef.current = document.activeElement;
            
            // Focus modal
            modalRef.current?.focus();
            
            // Trap focus
            const handleTab = (e) => {
                if (e.key !== 'Tab') return;
                
                const focusableElements = modalRef.current.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            };

            document.addEventListener('keydown', handleTab);
            document.body.style.overflow = 'hidden';

            return () => {
                document.removeEventListener('keydown', handleTab);
                document.body.style.overflow = '';
                previousFocusRef.current?.focus();
            };
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="modal-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div
                ref={modalRef}
                className="modal-content"
                role="document"
                tabIndex={-1}
            >
                <div className="modal-header">
                    <h2 id="modal-title">{title}</h2>
                    <button
                        onClick={onClose}
                        aria-label="Close dialog"
                    >
                        ×
                    </button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
}
```

### Accessibility Features

- **Focus Trap**: Tab key stays within modal
- **Escape Key**: Closes modal
- **Click Outside**: Closes modal
- **ARIA Labels**: Proper labeling
- **Focus Management**: Returns focus to trigger

---

## 4. Accessible File Explorer

### Question
Build a semi-accessible file explorer component that has the right ARIA roles, states, and properties.

### Solution

```jsx
import React, { useState } from 'react';

function AccessibleFileExplorer({ files }) {
    const [expanded, setExpanded] = useState(new Set());

    const toggleExpand = (path) => {
        setExpanded(prev => {
            const newSet = new Set(prev);
            if (newSet.has(path)) {
                newSet.delete(path);
            } else {
                newSet.add(path);
            }
            return newSet;
        });
    };

    const renderTree = (items, level = 0, path = '') => {
        return (
            <ul role="group" aria-label={`Directory level ${level}`}>
                {items.map((item, index) => {
                    const itemPath = path ? `${path}/${item.name}` : item.name;
                    const isExpanded = expanded.has(itemPath);
                    const hasChildren = item.children && item.children.length > 0;

                    return (
                        <li key={itemPath} role="treeitem">
                            <div
                                role={hasChildren ? 'button' : undefined}
                                aria-expanded={hasChildren ? isExpanded : undefined}
                                aria-label={item.name}
                                onClick={() => hasChildren && toggleExpand(itemPath)}
                                style={{ paddingLeft: `${level * 20}px` }}
                            >
                                {hasChildren && (
                                    <span aria-hidden="true">
                                        {isExpanded ? '📂' : '📁'}
                                    </span>
                                )}
                                {!hasChildren && <span aria-hidden="true">📄</span>}
                                <span>{item.name}</span>
                            </div>
                            {hasChildren && isExpanded && (
                                <div role="group">
                                    {renderTree(item.children, level + 1, itemPath)}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        );
    };

    return (
        <div className="file-explorer" role="tree" aria-label="File explorer">
            {renderTree(files)}
        </div>
    );
}
```

---

## 5. Accessible Progress Bars

### Question
Build accessible progress bars with proper ARIA attributes.

### Solution

```jsx
import React from 'react';

function AccessibleProgressBar({ value, max = 100, label }) {
    const percentage = Math.round((value / max) * 100);

    return (
        <div className="progress-bar-container">
            <div className="progress-bar-label">
                <span id="progress-label">{label}</span>
                <span aria-hidden="true">{percentage}%</span>
            </div>
            <div
                role="progressbar"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={max}
                aria-labelledby="progress-label"
                className="progress-bar"
            >
                <div
                    className="progress-fill"
                    style={{ width: `${percentage}%` }}
                    aria-hidden="true"
                />
            </div>
        </div>
    );
}
```

---

## ARIA Best Practices

### Roles

```jsx
// Landmark roles
<nav role="navigation">Navigation</nav>
<main role="main">Main content</main>
<aside role="complementary">Sidebar</aside>

// Widget roles
<button role="button">Button</button>
<div role="dialog">Modal</div>
<div role="tablist">Tabs</div>
```

### States and Properties

```jsx
// States
<div aria-expanded={isOpen}>Expandable</div>
<div aria-selected={isSelected}>Selectable</div>
<div aria-disabled={isDisabled}>Disabled</div>
<div aria-hidden={isHidden}>Hidden</div>

// Properties
<div aria-label="Description">Element</div>
<div aria-labelledby="label-id">Element</div>
<div aria-describedby="desc-id">Element</div>
<div aria-controls="target-id">Control</div>
```

### Live Regions

```jsx
// Announce dynamic content
<div role="alert" aria-live="assertive">
    Error message
</div>

<div role="status" aria-live="polite">
    Status update
</div>
```

## Keyboard Navigation

### Tab Order

```jsx
// Control tab order
<button tabIndex={0}>Focusable</button>
<button tabIndex={-1}>Not focusable</button>
<button tabIndex={1}>Focus first</button>
```

### Keyboard Shortcuts

```jsx
function KeyboardShortcuts() {
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, []);
}
```

## Best Practices

1. **Semantic HTML**: Use proper HTML elements
2. **ARIA Labels**: Provide descriptive labels
3. **Keyboard Navigation**: Support keyboard access
4. **Focus Management**: Manage focus properly
5. **Screen Readers**: Test with screen readers
6. **Color Contrast**: Ensure sufficient contrast

