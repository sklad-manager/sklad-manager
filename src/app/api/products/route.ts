import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Поиск продукции (по ячейке или номеру заказа)
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const slotId = searchParams.get('slotId');
        const orderNum = searchParams.get('orderNum');

        if (!slotId && !orderNum) {
            return NextResponse.json(
                { error: 'Укажите slotId или orderNum' },
                { status: 400 }
            );
        }

        let products;

        if (orderNum) {
            products = await prisma.product.findMany({
                where: { orderNum },
                include: { slot: true },
            });
        } else if (slotId) {
            products = await prisma.product.findMany({
                where: { slotId: slotId.toUpperCase() },
                include: { slot: true },
            });
        }

        return NextResponse.json({ products });
    } catch (error) {
        console.error('Ошибка поиска:', error);
        return NextResponse.json(
            { error: 'Ошибка поиска продукции' },
            { status: 500 }
        );
    }
}

// POST: Добавить/Обновить продукцию
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { slotId, floor, orderNum, rolls, meterage, density, rollWeight, comment } = body;

        if (!slotId || !floor || !orderNum) {
            return NextResponse.json(
                { error: 'Обязательные поля: slotId, floor, orderNum' },
                { status: 400 }
            );
        }

        // Проверяем существование ячейки
        const slot = await prisma.slot.findUnique({
            where: { id: slotId.toUpperCase() },
        });

        if (!slot) {
            return NextResponse.json(
                { error: 'Ячейка не найдена' },
                { status: 404 }
            );
        }

        // Проверяем, есть ли уже продукция на этом этаже
        const existing = await prisma.product.findFirst({
            where: {
                slotId: slotId.toUpperCase(),
                floor,
            },
        });

        let product;

        if (existing) {
            // Обновляем
            product = await prisma.product.update({
                where: { id: existing.id },
                data: { orderNum, rolls, meterage, density, rollWeight, comment },
            });
        } else {
            // Создаем
            product = await prisma.product.create({
                data: {
                    slotId: slotId.toUpperCase(),
                    floor,
                    orderNum,
                    rolls,
                    meterage,
                    density,
                    rollWeight,
                    comment,
                },
            });
        }

        return NextResponse.json({ product });
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        return NextResponse.json(
            { error: 'Ошибка сохранения продукции' },
            { status: 500 }
        );
    }
}

// DELETE: Удалить продукцию
export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const slotId = searchParams.get('slotId');
        const floor = searchParams.get('floor');

        if (!slotId) {
            return NextResponse.json(
                { error: 'Укажите slotId' },
                { status: 400 }
            );
        }

        const where: any = { slotId: slotId.toUpperCase() };

        if (floor) {
            where.floor = parseInt(floor);
        }

        await prisma.product.deleteMany({ where });

        return NextResponse.json({ message: 'Продукция удалена' });
    } catch (error) {
        console.error('Ошибка удаления:', error);
        return NextResponse.json(
            { error: 'Ошибка удаления продукции' },
            { status: 500 }
        );
    }
}
// PATCH: Перемещение продукции
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, sourceSlotId, sourceFloor, targetSlotId, targetFloor } = body;

        if (action === 'move') {
            if (!sourceSlotId || !sourceFloor || !targetSlotId || !targetFloor) {
                return NextResponse.json({ error: 'Неполные данные для перемещения' }, { status: 400 });
            }

            // 1. Проверяем, занята ли целевая ячейка
            const targetBusy = await prisma.product.findFirst({
                where: {
                    slotId: targetSlotId.toUpperCase(),
                    floor: targetFloor,
                },
            });

            if (targetBusy) {
                return NextResponse.json({ error: 'Целевая ячейка занята' }, { status: 400 });
            }

            // 2. Находим исходный продукт
            const product = await prisma.product.findFirst({
                where: {
                    slotId: sourceSlotId.toUpperCase(),
                    floor: sourceFloor,
                },
            });

            if (!product) {
                return NextResponse.json({ error: 'Продукт не найден' }, { status: 404 });
            }

            // 3. Перемещаем (обновляем запись)
            const updated = await prisma.product.update({
                where: { id: product.id },
                data: {
                    slotId: targetSlotId.toUpperCase(),
                    floor: targetFloor,
                },
            });

            return NextResponse.json({ product: updated });
        }

        return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
    } catch (error) {
        console.error('Ошибка перемещения:', error);
        return NextResponse.json(
            { error: 'Ошибка перемещения продукции' },
            { status: 500 }
        );
    }
}
