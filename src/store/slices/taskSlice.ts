import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface Task {
  id: number
  title: string
  description: string | null
  status: TaskStatus
  order: number
  createdAt: string
  updatedAt: string
  dueDate: string | null
  parentId: number | null
  subtasks: Task[]
}

interface TaskState {
  tasks: Task[]
  loading: boolean
  error: string | null
}

const initialState: TaskState = {
  tasks: [],
  loading: false,
  error: null,
}

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasks: (state, action: PayloadAction<Task[]>) => {
      state.tasks = action.payload
    },
    addTask: (state, action: PayloadAction<Task>) => {
      state.tasks.push(action.payload)
    },
    updateTask: (state, action: PayloadAction<{ id: number; updates: Partial<Task> }>) => {
      const index = state.tasks.findIndex(task => task.id === action.payload.id)
      if (index !== -1) {
        state.tasks[index] = { ...state.tasks[index], ...action.payload.updates }
      }
    },
    deleteTask: (state, action: PayloadAction<number>) => {
      state.tasks = state.tasks.filter(task => task.id !== action.payload)
    },
    reorderTasks: (state, action: PayloadAction<{ sourceId: number; destinationId: number; sourceStatus: TaskStatus; destinationStatus: TaskStatus }>) => {
      const { sourceId, destinationId, sourceStatus, destinationStatus } = action.payload;
      
      const taskIndex = state.tasks.findIndex(task => task.id === sourceId);
      if (taskIndex === -1) return;
      
      const task = state.tasks[taskIndex];
      
      if (sourceStatus !== destinationStatus) {
        task.status = destinationStatus;
      }
      
      const destinationTasks = state.tasks.filter(t => 
        t.status === destinationStatus && !t.parentId
      ).sort((a, b) => a.order - b.order);
      
      const filteredDestinationTasks = destinationTasks.filter(t => t.id !== sourceId);
      
      const destTaskIndex = filteredDestinationTasks.findIndex(t => t.id === destinationId);
      
      if (destTaskIndex >= 0) {
        filteredDestinationTasks.splice(destTaskIndex, 0, task);
      } else {
        filteredDestinationTasks.push(task);
      }
      
      filteredDestinationTasks.forEach((t, index) => {
        const taskToUpdate = state.tasks.find(stateTask => stateTask.id === t.id);
        if (taskToUpdate) {
          taskToUpdate.order = index;
        }
      });
    },
    bulkUpdateTasks: (state, action: PayloadAction<Array<{ id: number; status?: TaskStatus; order?: number }>>) => {
      action.payload.forEach(update => {
        const taskIndex = state.tasks.findIndex(task => task.id === update.id);
        if (taskIndex !== -1) {
          if (update.status) {
            state.tasks[taskIndex].status = update.status;
          }
          if (update.order !== undefined) {
            state.tasks[taskIndex].order = update.order;
          }
        }
      });
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
  },
})

export const { setTasks, addTask, updateTask, deleteTask, reorderTasks, bulkUpdateTasks, setLoading, setError } = taskSlice.actions
export default taskSlice.reducer