import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';

interface Task {
    id: number;
    title: string;
    description: string;
    status: string;
}

/**
 * Dashboard Page: Protected route for task management.
 * Provides functionality to view, add, and delete tasks.
 */
const Dashboard = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [title, setTitle] = useState('');
    const { request, loading, error } = useFetch();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    /**
     * Fetches user-specific tasks from the backend.
     * Stability: useCallback prevents infinite loops in the useEffect.
     */
    const fetchTasks = useCallback(async () => {
        try {
            const data = await request('http://localhost:3000/tasks');
            setTasks(data);
        } catch (err) {
            console.error('Failed to fetch tasks:', err);
        }
    }, [request]);

    // Load tasks on component mount
    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // Clear session and redirect to login
    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    /**
     * Submits a new task to the server.
     */
    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        try {
            await request('http://localhost:3000/tasks', {
                method: 'POST',
                body: { title },
            });
            setTitle(''); // Reset input
            fetchTasks(); // Refresh list
        } catch (err) {
            console.error('Failed to create task:', err);
        }
    };

    /**
     * Deletes a task by ID.
     */
    const handleDelete = async (id: number) => {
        try {
            await request(`http://localhost:3000/tasks/${id}`, {
                method: 'DELETE',
            });
            fetchTasks();
        } catch (err) {
            console.error('Failed to delete task:', err);
        }
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Welcome, {user.name || user.email}</h1>
                <button onClick={handleLogout} className="logout-btn">Logout</button>
            </header>

            <div className="task-form">
                <h3>Create New Task</h3>
                <form onSubmit={handleAddTask}>
                    <input
                        type="text"
                        placeholder="What needs to be done?"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                    <button type="submit">Add Task</button>
                </form>
            </div>

            <div className="task-list">
                <h3>Your Tasks</h3>
                {loading && <p>Loading tasks...</p>}
                {error && <p className="error-text">{error}</p>}
                {!loading && tasks.length === 0 && <p>No tasks yet.</p>}
                <ul>
                    {tasks.map((task) => (
                        <li key={task.id} className="task-item">
                            <span>{task.title}</span>
                            <button onClick={() => handleDelete(task.id)} className="delete-btn">Delete</button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default Dashboard;
