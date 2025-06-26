import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const tasks = [
    {
      title: 'Task 1',
      description: 'To-do task',
      status: 'TODO',
      order: 1,
    },
    {
      title: 'Task 2',
      description: 'In progress task',
      status: 'IN_PROGRESS',
      order: 2,
    },
    {
      title: 'Task 3',
      description: 'Completed task',
      status: 'COMPLETED',
      order: 3,
    },
  ]

  for (const task of tasks) {
    await prisma.task.create({
      data: task,
    })
  }

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })