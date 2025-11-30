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
            // Проверяем, существует ли продукт
            const product = await prisma.product.findUnique({ where: { id: newData.id } });
            if (product) {
                await prisma.product.delete({
                    where: { id: newData.id }
                });
            }
            // Если продукта нет, считаем, что отмена уже произошла (или продукт удален вручную)
        } else if (action === 'delete') {
            // Было удалено -> восстанавливаем
            // Проверяем, свободна ли ячейка
            const busy = await prisma.product.findFirst({
                where: { slotId: oldData.slotId, floor: oldData.floor }
            });
            if (busy) {
                return NextResponse.json({ error: `Ячейка ${oldData.slotId} (эт.${oldData.floor}) уже занята` }, { status: 400 });
            }

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
            const product = await prisma.product.findUnique({ where: { id: oldData.id } });
            if (!product) {
                return NextResponse.json({ error: 'Продукт не найден (возможно, был удален)' }, { status: 400 });
            }

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
            const product = await prisma.product.findUnique({ where: { id: newData.id } });
            if (!product) {
                return NextResponse.json({ error: 'Продукт не найден (возможно, был удален)' }, { status: 400 });
            }

            // Проверяем, свободна ли старая ячейка
            const busy = await prisma.product.findFirst({
                where: { slotId: oldData.slotId, floor: oldData.floor }
            });
            if (busy) {
                return NextResponse.json({ error: `Исходная ячейка ${oldData.slotId} (эт.${oldData.floor}) уже занята` }, { status: 400 });
            }

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
    } catch (error: any) {
        console.error('Undo error:', error);
        return NextResponse.json({ error: error.message || 'Ошибка отмены действия' }, { status: 500 });
    }
}
