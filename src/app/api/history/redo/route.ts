import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
    try {
        // Находим последнее отмененное действие (самое старое из "будущих" или самое новое из отмененных?)
        // Undo делает isUndone=true для последнего.
        // Redo должно брать последнее действие с isUndone=true, которое идет СРАЗУ после активных?
        // Или просто самое последнее по ID, если оно isUndone=true?

        // Логика стека:
        // 1. Action A (isUndone=false)
        // 2. Action B (isUndone=false) -> Undo -> (isUndone=true)
        // Теперь Redo должно найти Action B.

        const lastUndoneAction = await (prisma as any).actionHistory.findFirst({
            where: { isUndone: true },
            orderBy: { id: 'asc' } // Берем самое старое из отмененных? Нет.
            // Если мы сделали Undo 3 раза:
            // 3. C (true)
            // 2. B (true)
            // 1. A (true)
            // Redo должно вернуть A? Нет, C. Мы идем назад во времени при Undo, и вперед при Redo.
            // Стоп.
            // История: [A, B, C]
            // Undo C -> [A, B, C(undone)]
            // Undo B -> [A, B(undone), C(undone)]
            // Redo -> должно вернуть B.
            // Значит ищем ПЕРВОЕ действие с isUndone=true, у которого ПРЕДЫДУЩЕЕ действие (id-1) имеет isUndone=false?
            // Или просто ищем самое "раннее" из отмененных? 
            // В примере выше: B и C отменены. B раньше C (по ID). Значит берем B.

        });

        // Уточнение:
        // ID: 1, 2, 3
        // Undo 3 -> 3 is undone.
        // Undo 2 -> 2 is undone.
        // Список undone: 2, 3.
        // Redo должно вернуть 2.
        // Значит ищем findFirst where isUndone=true orderBy id ASC.

        if (!lastUndoneAction) {
            return NextResponse.json({ error: 'Нет действий для повтора' }, { status: 400 });
        }

        const { action, oldData, newData } = lastUndoneAction;

        // Повторяем действие (применяем newData)
        if (action === 'create') {
            // Создаем заново
            await prisma.product.create({
                data: {
                    slotId: newData.slotId,
                    floor: newData.floor,
                    orderNum: newData.orderNum,
                    rolls: newData.rolls,
                    meterage: newData.meterage,
                    density: newData.density,
                    rollWeight: newData.rollWeight,
                    comment: newData.comment
                }
            });
        } else if (action === 'delete') {
            // Удаляем снова
            await prisma.product.delete({
                where: { id: oldData.id } // ID может измениться при пересоздании? Да.
                // Проблема: Если мы отменили удаление, мы пересоздали продукт с НОВЫМ ID.
                // А в oldData старый ID.
                // При Redo (удалении) мы не найдем продукт по старому ID.
                // ЭТО ПРОБЛЕМА.

                // Решение: Искать продукт по параметрам (slotId, floor, orderNum)?
                // Или при Undo (восстановлении) обновлять ID в истории? Сложно.

                // Упрощение: Искать продукт в той же ячейке.
            });
            // Поиск для удаления:
            const productToDelete = await prisma.product.findFirst({
                where: {
                    slotId: oldData.slotId,
                    floor: oldData.floor,
                    orderNum: oldData.orderNum
                }
            });
            if (productToDelete) {
                await prisma.product.delete({ where: { id: productToDelete.id } });
            }

        } else if (action === 'update') {
            // Применяем новые данные
            await prisma.product.update({
                where: { id: newData.id },
                data: {
                    orderNum: newData.orderNum,
                    rolls: newData.rolls,
                    meterage: newData.meterage,
                    density: newData.density,
                    rollWeight: newData.rollWeight,
                    comment: newData.comment
                }
            });
        } else if (action === 'move') {
            // Перемещаем вперед
            let productId = newData.id;

            if (!productId) {
                // Если ID нет, ищем продукт в старой позиции (oldData)
                const product = await prisma.product.findFirst({
                    where: {
                        slotId: oldData.slotId,
                        floor: oldData.floor
                    }
                });
                if (product) productId = product.id;
            }

            if (productId) {
                await prisma.product.update({
                    where: { id: productId },
                    data: {
                        slotId: newData.slotId,
                        floor: newData.floor
                    }
                });
            } else {
                return NextResponse.json({ error: 'Продукт для перемещения не найден' }, { status: 400 });
            }
        }

        // Помечаем как активное (не отмененное)
        await (prisma as any).actionHistory.update({
            where: { id: lastUndoneAction.id },
            data: { isUndone: false }
        });

        return NextResponse.json({ message: 'Действие повторено', action: lastUndoneAction });
    } catch (error) {
        console.error('Redo error:', error);
        return NextResponse.json({ error: 'Ошибка повтора действия' }, { status: 500 });
    }
}
