import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';

interface Task {
    id: number;
    title: string;
    description: string;
    status: string;
}

const Dashboard = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [title, setTitle] = useState('');
    const { request, loading, error } = useFetch();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const fetchTasks = useCallback(async () => {
        try {
            const data = await request('http://localhost:3000/tasks');
            setTasks(data);
        } catch (err) {
            console.error(err);
        }
    }, [request]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await request('http://localhost:3000/tasks', {
                method: 'POST',
                body: { title },
            });
            setTitle('');
            fetchTasks();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await request(`http://localhost:3000/tasks/${id}`, {
                method: 'DELETE',
            });
            fetchTasks();
        } catch (err) {
            console.error(err);
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
