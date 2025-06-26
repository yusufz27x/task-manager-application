import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const port = 3001;

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

app.listen(port, () => {
  console.log(`API server listening at http://localhost:${port}`);
});