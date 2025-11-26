import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Инициализация карты склада по схеме пользователя
export async function POST() {
    try {
        // Проверяем, есть ли уже данные
        const existingSlots = await prisma.slot.count();
        if (existingSlots > 0) {
            return NextResponse.json({ message: 'Склад уже инициализирован' });
        }

        // Создаем ячейки склада по точной схеме из скриншота
        const slots = [];

        // Колонки A-X (24 колонки)
        const columns = 'ABCDEFGHIJKLMNOPQRSTUVWX'.split('');

        for (let row = 1; row <= 13; row++) {
            for (const col of columns) {
                const cellId = `${col}${row}`;
                let type = 'walkway'; // По умолчанию проход

                // Определяем, является ли ячейка складом
                const colIndex = columns.indexOf(col);

                // Склад: колонки C-X (индексы 2-23)
                if (colIndex >= 2 && colIndex <= 23) {
                    // Строки 1-5 и 8-12 - склад
                    if ((row >= 1 && row <= 5) || (row >= 8 && row <= 12)) {
                        type = 'storage';
                    }
                }

                slots.push({ id: cellId, type });
            }
        }

        await prisma.slot.createMany({ data: slots });

        return NextResponse.json({
            message: 'Склад инициализирован',
            count: slots.length
        });
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        return NextResponse.json(
            { error: 'Ошибка инициализации склада' },
            { status: 500 }
        );
    }
}
