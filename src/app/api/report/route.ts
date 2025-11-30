import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Получаем все ячейки с товарами
        const slots = await prisma.slot.findMany({
            include: {
                products: true
            }
        });

        // Статистика
        let totalRolls = 0;
        let totalWeight = 0;
        let totalMeterage = 0;
        let occupiedSlots = 0;
        let totalStorageSlots = 0;

        // Список товаров для таблицы
        const items: any[] = [];

        slots.forEach(slot => {
            if (slot.type === 'storage') {
                totalStorageSlots++;
                if (slot.products.length > 0) {
                    occupiedSlots++;
                }
            }

            slot.products.forEach(product => {
                totalRolls += product.rolls || 0;
                totalWeight += product.rollWeight || 0;
                totalMeterage += product.meterage || 0;

                items.push({
                    id: product.id,
                    slotId: slot.id,
                    floor: product.floor,
                    orderNum: product.orderNum,
                    rolls: product.rolls,
                    meterage: product.meterage,
                    density: product.density,
                    rollWeight: product.rollWeight,
                    comment: product.comment
                });
            });
        });

        const stats = {
            totalRolls,
            totalWeight: Math.round(totalWeight * 100) / 100,
            totalMeterage,
            occupancyRate: totalStorageSlots > 0 ? Math.round((occupiedSlots / totalStorageSlots) * 100) : 0,
            totalItems: items.length
        };

        return NextResponse.json({ stats, items });
    } catch (error) {
        console.error('Error fetching report:', error);
        return NextResponse.json(
            { error: 'Failed to fetch report data' },
            { status: 500 }
        );
    }
}
