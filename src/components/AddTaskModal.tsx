import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from './ui/button';
import { useAppDispatch, useAppSelector } from '../store';
import { setError } from '../store/slices/taskSlice';
import toast from 'react-hot-toast';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { format } from 'date-fns';
import type { Task, TaskStatus } from '../store/slices/taskSlice';

interface AddTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTaskAdded: () => void;
    tasks: Task[];
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onTaskAdded, tasks }) => {
    const dispatch = useAppDispatch();
    const { error } = useAppSelector((state) => state.tasks);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<TaskStatus>('TODO');
    const [dueDate, setDueDate] = useState<Date | undefined>();
    const [isCalendarOpen, setCalendarOpen] = useState(false);
    const [parentId, setParentId] = useState<number | null>(null);

    const handleClose = () => {
        setTitle('');
        setDescription('');
        setStatus('TODO');
        setDueDate(undefined);
        setParentId(null);
        dispatch(setError(null));
        onClose();
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        dispatch(setError(null));

        if (!title) {
            const errorMessage = 'Title is required.';
            dispatch(setError(errorMessage));
            toast.error(errorMessage);
            return;
        }

        // Calculate order based on whether this is a subtask or not
        let newOrder;
        if (parentId) {
            // For subtasks, find the highest order among siblings
            const parentTask = tasks.find(t => t.id === parentId);
            const siblings = parentTask?.subtasks || [];
            newOrder = (siblings[siblings.length - 1]?.order || 0) + 1;
        } else {
            // For parent tasks, find the highest order among tasks with the same status
            const tasksInStatus = tasks.filter(t => t.status === status && !t.parentId).sort((a, b) => a.order - b.order);
            newOrder = (tasksInStatus[tasksInStatus.length - 1]?.order || 0) + 1;
        }

        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    description,
                    status,
                    dueDate: dueDate?.toISOString(),
                    order: newOrder,
                    parentId,
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to create task');
            }

            const taskType = parentId ? 'Subtask' : 'Task';
            toast.success(`${taskType} "${title}" created successfully`);
            
            onTaskAdded();
            handleClose();
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            dispatch(setError(errorMessage));
            toast.error(`Failed to create task: ${errorMessage}`);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Task</DialogTitle>
                    <DialogDescription>
                        Fill in the details below to create a new task. Click create when you're done.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} id="add-task-form" className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">
                            Title
                        </Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">
                            Description
                        </Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="col-span-3"
                            placeholder="Optional task description"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status" className="text-right">
                            Status
                        </Label>
                        <Select onValueChange={(value: TaskStatus) => setStatus(value)} defaultValue={status}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="TODO">To Do</SelectItem>
                                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                <SelectItem value="COMPLETED">Completed</SelectItem>
                                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="due-date" className="text-right">
                            Due Date
                        </Label>
                        <Popover open={isCalendarOpen} onOpenChange={setCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={`col-span-3 justify-start text-left font-normal ${!dueDate && "text-muted-foreground"}`}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={dueDate}
                                    onSelect={(date) => {
                                        setDueDate(date);
                                        setCalendarOpen(false);
                                    }}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="parent-task" className="text-right">
                            Parent Task
                        </Label>
                        <Select onValueChange={(value) => setParentId(value === "none" ? null : Number(value))} value={parentId ? String(parentId) : "none"}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select parent task (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No parent (standalone task)</SelectItem>
                                {tasks
                                    .filter(task => !task.parentId) // Only show parent tasks, not subtasks
                                    .map(task => (
                                        <SelectItem key={task.id} value={String(task.id)}>
                                            {task.title}
                                        </SelectItem>
                                    ))
                                }
                            </SelectContent>
                        </Select>
                    </div>
                </form>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <DialogFooter>
                    <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                    <Button type="submit" form="add-task-form">Create Task</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AddTaskModal;