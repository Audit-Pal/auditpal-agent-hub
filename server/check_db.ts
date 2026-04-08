import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const report = await prisma.report.findFirst({
        orderBy: { submittedAt: 'desc' },
    })
    console.log(JSON.stringify(report, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
