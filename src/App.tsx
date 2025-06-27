import { useEffect, useState, useCallback } from 'react';
import { 
  DndContext, 
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useAppDispatch, useAppSelector } from './store';
import { deleteTask, setTasks, setLoading, setError, reorderTasks, bulkUpdateTasks } from './store/slices/taskSlice';
import type { Task, TaskStatus } from './store/slices/taskSlice';
import TaskCard, { DroppableColumn } from './components/TaskCard';
import { Button } from './components/ui/button';
import { MoonIcon, SunIcon, SearchIcon, PlusIcon } from 'lucide-react';
import { Input } from './components/ui/input';
import { LoadingSpinner } from './components/ui/spinner';
import AddTaskModal from './components/AddTaskModal';
import TaskEditModal from './components/TaskEditModal';
import { Toaster, toast } from 'react-hot-toast';

const statusColumns: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const getStatusDisplayName = (status: TaskStatus): string => {
  switch (status) {
    case 'TODO':
      return 'To Do';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
};

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
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = active.data.current?.task;
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTask = active.data.current?.task as Task;
    const overType = over.data.current?.type;

    if (!activeTask) return;

    // Handle dropping on a column
    if (overType === 'column') {
      const newStatus = over.id as TaskStatus;
      if (activeTask.status !== newStatus) {
        // Update task status and move to end of column
        const tasksInNewStatus = tasks.filter(t => t.status === newStatus && !t.parentId);
        const newOrder = tasksInNewStatus.length;



        // Update locally first for immediate feedback
        dispatch(reorderTasks({
          sourceId: activeTask.id,
          destinationId: -1, // -1 means append to end
          sourceStatus: activeTask.status,
          destinationStatus: newStatus
        }));

        // Update on server using individual update
        try {
          const response = await fetch(`/api/tasks/${activeTask.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: activeTask.title,
              description: activeTask.description,
              status: newStatus,
              order: newOrder,
              dueDate: activeTask.dueDate,
              parentId: activeTask.parentId
            })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          await response.json();
          toast.success(`Task moved to ${getStatusDisplayName(newStatus)}`);
        } catch (error) {
          console.error('Failed to update task:', error);
          toast.error('Failed to update task');
          // Revert the change
          await fetchTasks();
        }
      }
      return;
    }

    // Handle dropping on another task (reordering)
    if (overType === 'task') {
      const overTask = over.data.current?.task as Task;
      if (activeTask.id === overTask.id) return;

      // Only allow reordering within the same status
      if (activeTask.status === overTask.status) {
        const statusTasks = tasks.filter(t => t.status === activeTask.status && !t.parentId);
        const activeIndex = statusTasks.findIndex(t => t.id === activeTask.id);
        const overIndex = statusTasks.findIndex(t => t.id === overTask.id);

        if (activeIndex !== -1 && overIndex !== -1) {
          const newTasks = arrayMove(statusTasks, activeIndex, overIndex);
          
          // Update order values
          const updates = newTasks.map((task, index) => ({ id: task.id, order: index }));



          // Update locally first
          dispatch(bulkUpdateTasks(updates));

          // Update on server using individual calls
          try {
            for (const update of updates) {
              const task = tasks.find(t => t.id === update.id);
              if (task) {
                const response = await fetch(`/api/tasks/${task.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: task.title,
                    description: task.description,
                    status: task.status,
                    order: update.order,
                    dueDate: task.dueDate,
                    parentId: task.parentId
                  })
                });
                
                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }
              }
            }
            

            toast.success('Tasks reordered successfully');
          } catch (error) {
            console.error('Failed to reorder tasks:', error);
            toast.error('Failed to reorder tasks');
            // Revert the change
            await fetchTasks();
          }
        }
      } else {
        // If different statuses, treat as status change
        const newStatus = overTask.status;
        const tasksInNewStatus = tasks.filter(t => t.status === newStatus && !t.parentId);
        const newOrder = tasksInNewStatus.length;



        // Update locally first for immediate feedback
        dispatch(reorderTasks({
          sourceId: activeTask.id,
          destinationId: -1,
          sourceStatus: activeTask.status,
          destinationStatus: newStatus
        }));

        // Update on server using individual update
        try {
          const response = await fetch(`/api/tasks/${activeTask.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: activeTask.title,
              description: activeTask.description,
              status: newStatus,
              order: newOrder,
              dueDate: activeTask.dueDate,
              parentId: activeTask.parentId
            })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          await response.json();
          toast.success(`Task moved to ${getStatusDisplayName(newStatus)}`);
        } catch (error) {
          console.error('Failed to update task status:', error);
          toast.error('Failed to update task');
          // Revert the change
          await fetchTasks();
        }
      }
    }
  };

  const filteredTasks = filterTasksWithSubtasks(tasks, searchQuery);

  const tasksByStatus = filteredTasks.reduce((acc, task) => {
    if (!task.parentId) { // Only group parent tasks into columns
      (acc[task.status] = acc[task.status] || []).push(task);
    }
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  // Sort tasks by order within each status
  Object.keys(tasksByStatus).forEach(status => {
    tasksByStatus[status as TaskStatus].sort((a, b) => a.order - b.order);
  });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h1 className="text-3xl font-bold">Task Management App</h1>
          <div className="flex items-center gap-4">
            <div className="relative w-full md:max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
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
            {statusColumns.map((status) => {
              const statusTasks = tasksByStatus[status] || [];
              return (
                <SortableContext
                  key={status}
                  items={statusTasks.map(task => task.id.toString())}
                  strategy={verticalListSortingStrategy}
                >
                  <DroppableColumn
                    status={status}
                    tasks={statusTasks}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    searchQuery={searchQuery}
                  />
                </SortableContext>
              );
            })}
          </div>
        )}
        <DragOverlay>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isDragDisabled={true}
            />
          ) : null}
        </DragOverlay>
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
          containerStyle={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
          }}
          toastOptions={{
            className: '',
            duration: 4000,
            style: {
              background: 'hsla(var(--background), 0.95)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              color: 'hsl(var(--foreground))',
              border: '2px solid hsla(var(--border), 0.3)',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
              minWidth: '280px',
              maxWidth: '90vw',
            },
            success: {
              style: {
                background: 'hsla(var(--background), 0.95)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: 'hsl(var(--foreground))',
                border: '2px solid hsla(142.1, 76.2%, 36.3%, 0.6)',
                boxShadow: '0 10px 15px -3px rgba(34, 197, 94, 0.3), 0 4px 6px -2px rgba(34, 197, 94, 0.2)',
              },
              iconTheme: {
                primary: 'hsl(142.1 76.2% 36.3%)',
                secondary: 'hsl(var(--background))',
              },
            },
            error: {
              style: {
                background: 'hsla(var(--background), 0.95)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: 'hsl(var(--foreground))',
                border: '2px solid hsla(0, 84.2%, 60.2%, 0.6)',
                boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.3), 0 4px 6px -2px rgba(239, 68, 68, 0.2)',
              },
              iconTheme: {
                primary: 'hsl(0 84.2% 60.2%)',
                secondary: 'hsl(var(--background))',
              },
            },
          }}
        />
      </div>
    </DndContext>
  );
}

export default App;
