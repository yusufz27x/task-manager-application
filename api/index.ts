import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const port = 3001; // TODO: need to update this with env variables for deployment

app.use(express.json());

// GET /api/tasks - Retrieve all tasks
app.get('/api/tasks', async (req, res) => {
  const tasks = await prisma.task.findMany({
    orderBy: { order: 'asc' },
    include: { subtasks: true },
  });
  res.json(tasks);
});

// POST /api/tasks - Create a new task
app.post('/api/tasks', async (req, res) => {
  const { title, description, status, order, dueDate, parentId } = req.body;
  try {
    const newTask = await prisma.task.create({
      data: {
        title,
        description,
        status,
        order, // TODO: Calculate order from redux global state - will do in frontend
        dueDate: dueDate ? new Date(dueDate) : null,
        parentId: parentId || null,
      },
    });
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PUT /api/tasks/:id - Update a task
app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, status, order, dueDate, parentId } = req.body;
  try {
    const updatedTask = await prisma.task.update({
      where: { id: Number(id) },
      data: {
        title,
        description,
        status,
        order,
        dueDate: dueDate ? new Date(dueDate) : null,
        parentId: parentId || null,
      },
    });
    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/tasks/:id - Delete a task
app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.task.delete({
      where: { id: Number(id) },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

app.listen(port, () => {
  console.log(`API server listening at http://localhost:${port}`);
});