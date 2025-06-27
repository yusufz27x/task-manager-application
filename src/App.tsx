import { useEffect, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './store';
import { deleteTask, setTasks, setLoading, setError } from './store/slices/taskSlice';
import type { Task, TaskStatus } from './store/slices/taskSlice';
import TaskCard from './components/TaskCard';
import { Button } from './components/ui/button';
import { MoonIcon, SunIcon, SearchIcon, PlusIcon } from 'lucide-react';
import { Input } from './components/ui/input';
import { LoadingSpinner } from './components/ui/spinner';
import AddTaskModal from './components/AddTaskModal';
import TaskEditModal from './components/TaskEditModal';
import { Toaster, toast } from 'react-hot-toast';

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
  const { tasks, loading } = useAppSelector((state) => state.tasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
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

  const fetchTasks = useCallback(async () => {
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
      const errorMessage = e instanceof Error ? e.message : String(e);
      dispatch(setError(errorMessage));
      toast.error(`Failed to fetch tasks: ${errorMessage}`);
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleEdit = (task: Task) => {
    setTaskToEdit(task);
    setIsEditTaskModalOpen(true);
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
        <h1 className="text-3xl font-bold">Task Management App</h1>
        <div className="flex items-center gap-4">
          <div className="relative w-full md:max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setIsAddTaskModalOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" /> Add Task
          </Button>
        </div>
      </div>
      {loading && <LoadingSpinner message="Fetching tasks..." />}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {statusColumns.map((status) => (
            <div key={status} className="bg-muted rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4 capitalize">{status.replace('_', ' ').toLowerCase()}</h2>
              <div className="space-y-4">
                {(tasksByStatus[status] || []).length > 0 ? (
                  (tasksByStatus[status] || []).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      searchQuery={searchQuery}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No tasks found</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        onTaskAdded={fetchTasks}
        tasks={tasks}
      />
      <TaskEditModal
        isOpen={isEditTaskModalOpen}
        onClose={() => {
          setIsEditTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        onTaskUpdated={fetchTasks}
        task={taskToEdit}
        tasks={tasks}
      />
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
      <Toaster 
        position="bottom-center"
        toastOptions={{
          className: '',
          duration: 4000,
          style: {
            background: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            border: '2px solid hsl(var(--border))',
            borderRadius: '8px',
            padding: '16px 20px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            minWidth: '300px',
            maxWidth: '500px',
          },
          success: {
            style: {
              background: 'hsl(var(--background))',
              color: 'hsl(var(--foreground))',
              border: '2px solid hsl(142.1 76.2% 36.3%)',
              boxShadow: '0 10px 15px -3px rgba(34, 197, 94, 0.2), 0 4px 6px -2px rgba(34, 197, 94, 0.1)',
            },
            iconTheme: {
              primary: 'hsl(142.1 76.2% 36.3%)',
              secondary: 'hsl(var(--background))',
            },
          },
          error: {
            style: {
              background: 'hsl(var(--background))',
              color: 'hsl(var(--foreground))',
              border: '2px solid hsl(0 84.2% 60.2%)',
              boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.2), 0 4px 6px -2px rgba(239, 68, 68, 0.1)',
            },
            iconTheme: {
              primary: 'hsl(0 84.2% 60.2%)',
              secondary: 'hsl(var(--background))',
            },
          },
        }}
      />
    </div>
  );
}

export default App;
