import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const tasks = [
    {
      title: 'Task 1',
      description: 'Task 1 with high priority',
      completed: false,
    },
    {
      title: 'Task 2',
      description: 'Task 2 with medium priority',
      completed: false,
    },
    {
      title: 'Task 3',
      description: 'Task 3 with low priority',
      completed: false,
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