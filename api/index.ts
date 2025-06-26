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

app.listen(port, () => {
  console.log(`API server listening at http://localhost:${port}`);
});