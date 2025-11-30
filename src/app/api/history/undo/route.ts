import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
    try {
        // Находим последнее активное действие
        const lastAction = await (prisma as any).actionHistory.findFirst({
            where: { isUndone: false },
            orderBy: { id: 'desc' }
        });

        if (!lastAction) {
            return NextResponse.json({ error: 'Нет действий для отмены' }, { status: 400 });
        }

        const { action, oldData, newData } = lastAction;

        // Выполняем обратное действие
        if (action === 'create') {
            // Было создано -> удаляем
            await prisma.product.delete({
                where: { id: newData.id }
            });
        } else if (action === 'delete') {
            // Было удалено -> восстанавливаем
            await prisma.product.create({
                data: {
                    slotId: oldData.slotId,
                    floor: oldData.floor,
                    orderNum: oldData.orderNum,
                    rolls: oldData.rolls,
                    meterage: oldData.meterage,
                    density: oldData.density,
                    rollWeight: oldData.rollWeight,
                    comment: oldData.comment
                }
            });
        } else if (action === 'update') {
            // Было обновлено -> возвращаем старые данные
            await prisma.product.update({
                where: { id: oldData.id },
                data: {
                    orderNum: oldData.orderNum,
                    rolls: oldData.rolls,
                    meterage: oldData.meterage,
                    density: oldData.density,
                    rollWeight: oldData.rollWeight,
                    comment: oldData.comment
                }
            });
        } else if (action === 'move') {
            // Было перемещено -> возвращаем назад
            await prisma.product.update({
                where: { id: newData.id }, // ID продукта тот же
                data: {
                    slotId: oldData.slotId,
                    floor: oldData.floor
                }
            });
        }

        // Помечаем как отмененное
        await (prisma as any).actionHistory.update({
            where: { id: lastAction.id },
            data: { isUndone: true }
        });

        return NextResponse.json({ message: 'Действие отменено', action: lastAction });
    } catch (error) {
        console.error('Undo error:', error);
        return NextResponse.json({ error: 'Ошибка отмены действия' }, { status: 500 });
    }
}
