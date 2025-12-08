import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Получить карту склада со статусами
export const dynamic = 'force-dynamic';
export async function GET() {
    try {
        const slots = await prisma.slot.findMany({
            include: {
                products: true,
            },
            orderBy: {
                id: 'asc',
            },
        });

        // Формируем карту с информацией о занятости
        const map = slots.map(slot => {
            const floor1 = slot.products.find(p => p.floor === 1);
            const floor2 = slot.products.find(p => p.floor === 2);

            return {
                id: slot.id,
                type: slot.type,
                floor1Busy: !!floor1,
                floor2Busy: !!floor2,
                floor1Data: floor1 || null,
                floor2Data: floor2 || null,
            };
        });

        return NextResponse.json({ map });
    } catch (error) {
        console.error('Ошибка получения карты:', error);
        return NextResponse.json(
            { error: `Ошибка получения карты склада: ${error instanceof Error ? error.message : String(error)}` },
            { status: 500 }
        );
    }
}
