import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Инициализация карты склада по схеме пользователя
export async function POST() {
    try {
        // Создаем или обновляем ячейки склада
        const slots = [];
        const columns = 'ABCDEFGHIJKLMNOPQRSTUVWX'.split('');

        for (let row = 1; row <= 13; row++) {
            for (const col of columns) {
                const cellId = `${col}${row}`;
                let type = 'walkway'; // По умолчанию проход

                // Определяем, является ли ячейка складом
                const colIndex = columns.indexOf(col);

                // Склад: колонки C-X (индексы 2-23)
                if (colIndex >= 2 && colIndex <= 23) {
                    // Строки 2-5 и 8-12 - склад (1-й ряд теперь проход!)
                    if ((row >= 2 && row <= 5) || (row >= 8 && row <= 12)) {
                        type = 'storage';
                    }
                }

                // Исключения: K8-K12 - проход
                if (col === 'K' && row >= 8 && row <= 12) {
                    type = 'walkway';
                }

                slots.push({ id: cellId, type });
            }
        }

        // Используем транзакцию для массового обновления/создания
        // Prisma не поддерживает createMany с update (upsertMany), поэтому делаем updateMany для изменения типов
        // Но так как у нас фиксированная сетка, проще пройтись и обновить типы.
        // Для оптимизации: сначала создаем недостающие, потом обновляем типы.

        // 1. Создаем недостающие (игнорируя существующие)
        await prisma.slot.createMany({
            data: slots,
            skipDuplicates: true
        });

        // 2. Обновляем типы для всех ячеек (чтобы применить изменения схемы к существующим)
        // Это может быть медленно по одной, но для 300 ячеек нормально.
        // Оптимизация: обновить только те, что должны стать walkway, но были storage, и наоборот.
        // Но проще обновить все storage на storage и walkway на walkway группами.

        // Сбросим все в walkway (кроме тех, где есть продукты? нет, схема важнее)
        // Но если там есть продукты, они удалятся каскадно? Нет, если мы просто меняем тип.
        // Prisma update не удаляет связи, если не удаляем саму запись.

        // Обновляем ячейки, которые должны быть storage
        const storageIds = slots.filter(s => s.type === 'storage').map(s => s.id);
        await prisma.slot.updateMany({
            where: { id: { in: storageIds } },
            data: { type: 'storage' }
        });

        // Обновляем ячейки, которые должны быть walkway
        const walkwayIds = slots.filter(s => s.type === 'walkway').map(s => s.id);
        await prisma.slot.updateMany({
            where: { id: { in: walkwayIds } },
            data: { type: 'walkway' }
        });

        return NextResponse.json({
            message: 'Схема склада обновлена',
            count: slots.length
        });

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
