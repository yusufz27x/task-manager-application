import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Button } from './ui/button';
import { useAppDispatch, useAppSelector } from '../store';
import { setError, updateTask } from '../store/slices/taskSlice';

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

interface TaskEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTaskUpdated: () => void;
    task: Task | null;
    tasks: Task[];
}

const TaskEditModal: React.FC<TaskEditModalProps> = ({ isOpen, onClose, onTaskUpdated, task, tasks }) => {
    const dispatch = useAppDispatch();
    const { error } = useAppSelector((state) => state.tasks);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<TaskStatus>('TODO');
    const [dueDate, setDueDate] = useState<Date | undefined>();
    const [isCalendarOpen, setCalendarOpen] = useState(false);
    const [parentId, setParentId] = useState<number | null>(null);

    // Reset form when task changes or modal opens
    useEffect(() => {
        if (task && isOpen) {
            setTitle(task.title);
            setDescription(task.description || '');
            setStatus(task.status);
            setDueDate(task.dueDate ? new Date(task.dueDate) : undefined);
            setParentId(task.parentId);
        }
    }, [task, isOpen]);

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

        if (!title || !task) {
            dispatch(setError('Title is required.'));
            return;
        }

        try {
            const response = await fetch(`/api/tasks/${task.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    description,
                    status,
                    dueDate: dueDate?.toISOString(),
                    parentId,
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to update task');
            }

            const updatedTask = await response.json();
            dispatch(updateTask({ id: task.id, updates: updatedTask }));
            onTaskUpdated();
            handleClose();
        } catch (e: unknown) {
            dispatch(setError(e instanceof Error ? e.message : String(e)));
        }
    };

    if (!task) return null;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Task</DialogTitle>
                    <DialogDescription>
                        Update the task details below. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} id="edit-task-form" className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-title" className="text-right">
                            Title
                        </Label>
                        <Input
                            id="edit-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-description" className="text-right">
                            Description
                        </Label>
                        <Textarea
                            id="edit-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="col-span-3"
                            placeholder="Optional task description"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-status" className="text-right">
                            Status
                        </Label>
                        <Select onValueChange={(value: TaskStatus) => setStatus(value)} value={status}>
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
                        <Label htmlFor="edit-due-date" className="text-right">
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
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-parent-task" className="text-right">
                            Parent Task
                        </Label>
                        <Select onValueChange={(value) => setParentId(value === "none" ? null : Number(value))} value={parentId ? String(parentId) : "none"}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select parent task (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No parent (standalone task)</SelectItem>
                                {tasks
                                    .filter(t => !t.parentId && t.id !== task?.id) // Only show parent tasks, exclude current task to prevent self-assignment
                                    .map(t => (
                                        <SelectItem key={t.id} value={String(t.id)}>
                                            {t.title}
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
                    <Button type="submit" form="edit-task-form">Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default TaskEditModal; 