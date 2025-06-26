import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './store';
import { deleteTask, setTasks, setLoading, setError } from './store/slices/taskSlice';
import type { Task } from './store/slices/taskSlice';
import TaskCard from './components/TaskCard';

function App() {
  const dispatch = useAppDispatch();
  const { tasks, loading, error } = useAppSelector((state) => state.tasks);

  useEffect(() => {
    const fetchTasks = async () => {
      dispatch(setLoading(true));
      dispatch(setError(null));
      try {
        const response = await fetch('/api/tasks');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Task[] = await response.json();
        dispatch(setTasks(data));
      } catch (e: unknown) {
        dispatch(setError(e instanceof Error ? e.message : String(e)));
      } finally {
        dispatch(setLoading(false));
      }
    };

    fetchTasks();
  }, [dispatch]);

  const handleEdit = (task: Task) => {
    // TODO: Implement task editing functionality
    console.log('Edit task:', task);
  };

  const handleDelete = async (taskId: number) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      dispatch(deleteTask(taskId));
    } catch (e: unknown) {
      dispatch(setError(e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Task Manager</h1>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {!loading && !error && (
        <div>
          {tasks
            // Do not display subtasks twice
            .filter((task) => !task.parentId)
            .map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export default App;
