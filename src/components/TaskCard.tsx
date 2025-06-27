import React from 'react'
import { MoreHorizontal, AlertTriangle, AlertCircle } from "lucide-react"
import type { Task } from '../store/slices/taskSlice'
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (taskId: number) => void
  isSubtask?: boolean
  searchQuery?: string
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete, isSubtask = false, searchQuery = '' }) => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    const selfMatches = lowerCaseQuery && (
        task.title.toLowerCase().includes(lowerCaseQuery) ||
        (task.description?.toLowerCase().includes(lowerCaseQuery) ?? false)
    );

    const shouldHighlight = isSubtask && selfMatches;

    return (
        <Card className={`${isSubtask ? "bg-muted/50 shadow-sm" : ""} ${shouldHighlight ? "animate-highlight" : ""}`}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
                <div className="space-y-1">
                    <CardTitle className={isSubtask ? "text-base font-medium" : ""}>{task.title}</CardTitle>
                    {task.description && <CardDescription>{task.description}</CardDescription>}
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(task)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-red-500 focus:text-red-500">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            {task.subtasks && task.subtasks.length > 0 && (
                <CardContent>
                    <div className="space-y-4 pl-4 border-l-2">
                        {task.subtasks.map(subtask => (
                            <TaskCard key={subtask.id} task={subtask} onEdit={onEdit} onDelete={onDelete} isSubtask searchQuery={searchQuery} />
                        ))}
                    </div>
                </CardContent>
            )}
            <CardFooter>
                <div className="flex justify-between w-full items-center text-sm text-muted-foreground">
                    {task.dueDate ? (() => {
                        const due = new Date(task.dueDate);
                        const today = new Date();
                        due.setHours(0, 0, 0, 0);
                        today.setHours(0, 0, 0, 0);

                        const diffTime = due.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        let color = "";
                        let Icon = null;

                        if (diffDays < 0) {
                            color = "text-orange-500";
                            Icon = <AlertTriangle className="h-4 w-4" />;
                        } else if (diffDays <= 3) {
                            color = "text-red-500";
                            Icon = <AlertCircle className="h-4 w-4" />;
                        }

                        return (
                            <div className={`flex items-center gap-1 ${color}`}>
                                {Icon}
                                <p>Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                            </div>
                        );
                    })() : <div />}
                    <Badge variant="outline" className="capitalize">{task.status.replace(/_/g, ' ').toLowerCase()}</Badge>
                </div>
            </CardFooter>
        </Card>
    )
}

export default TaskCard