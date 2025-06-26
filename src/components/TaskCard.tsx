import React from 'react'
import type { Task } from '../store/slices/taskSlice'

interface TaskCardProps {
    task: Task
    onEdit: (task: Task) => void
    onDelete: (taskId: number) => void
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete }) => {
    return (
        <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '16px', marginBottom: '16px', backgroundColor: '#f9f9f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>{task.title}</h3>
                <div>
                    <button onClick={() => onEdit(task)} style={{ marginRight: '8px' }}>Edit</button>
                    <button onClick={() => onDelete(task.id)}>Delete</button>
                </div>
            </div>
            {task.description && <p style={{ marginTop: '8px' }}>{task.description}</p>}
            <p style={{ marginTop: '8px', fontSize: '0.9em', color: '#555' }}>Status: {task.status}</p>
            {task.dueDate && <p style={{ fontSize: '0.9em', color: '#555' }}>Due: {new Date(task.dueDate).toLocaleDateString()}</p>}
            {task.subtasks && task.subtasks.length > 0 && (
                <div style={{ marginTop: '16px', paddingLeft: '16px', borderLeft: '2px solid #eee' }}>
                    {task.subtasks.map(subtask => (
                        <TaskCard key={subtask.id} task={subtask} onEdit={onEdit} onDelete={onDelete} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default TaskCard