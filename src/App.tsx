import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from './store';
import { deleteTask, setTasks, setLoading, setError } from './store/slices/taskSlice';
import type { Task, TaskStatus } from './store/slices/taskSlice';
import TaskCard from './components/TaskCard';
import { Button } from './components/ui/button';
import { MoonIcon, SunIcon, SearchIcon } from 'lucide-react';
import { Input } from './components/ui/input';

const statusColumns: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const filterTasksWithSubtasks = (allTasks: Task[], query: string): Task[] => {
  const lowerCaseQuery = query.toLowerCase();

  if (!lowerCaseQuery) {
    return allTasks;
  }

  const taskMatchesQuery = (task: Task): boolean => {
    return (
      task.title.toLowerCase().includes(lowerCaseQuery) ||
      (task.description?.toLowerCase().includes(lowerCaseQuery) ?? false)
    );
  };

  const filter = (tasks: Task[]): Task[] => {
    return tasks
      .map(task => {
        const filteredSubtasks = task.subtasks ? filter(task.subtasks) : [];
        if (taskMatchesQuery(task) || filteredSubtasks.length > 0) {
          return { ...task, subtasks: filteredSubtasks };
        }
        return null;
      })
      .filter((task): task is Task => task !== null);
  };

  return filter(allTasks);
};

function App() {
  const dispatch = useAppDispatch();
  const { tasks, loading, error } = useAppSelector((state) => state.tasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Do not override user's manual theme selection
      if (localStorage.getItem('theme')) {
        return;
      }
      setTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

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

  const filteredTasks = filterTasksWithSubtasks(tasks, searchQuery);

  const tasksByStatus = filteredTasks.reduce((acc, task) => {
    if (!task.parentId) { // Only group parent tasks into columns
      (acc[task.status] = acc[task.status] || []).push(task);
    }
    return acc;
  }, {} as Record<TaskStatus, Task[]>);


  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h1 className="text-3xl font-bold">Task Manager</h1>
        <div className="relative w-full md:max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {statusColumns.map((status) => (
            <div key={status} className="bg-muted rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4 capitalize">{status.replace('_', ' ').toLowerCase()}</h2>
              <div className="space-y-4">
                {(tasksByStatus[status] || []).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="fixed bottom-4 right-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </div>
  );
}

export default App;
