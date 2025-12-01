import { Telegraf, Markup } from 'telegraf';
import { PrismaClient } from '@prisma/client';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not found in .env');
    process.exit(1);
}

const bot = new Telegraf(token);
const prisma = new PrismaClient();

// --- Команды ---

// Логгер всех сообщений для отладки
bot.on('text', (ctx, next) => {
    console.log(`📩 Message from ${ctx.from.first_name}: "${ctx.message.text}"`);
    return next();
});

bot.start((ctx) => {
    ctx.reply(
        '👋 Привет! Я бот склада.\n\n' +
        'Что я умею:\n' +
        '🔍 **Поиск:** Просто напиши номер заказа (например: `1949`)\n' +
        '➕ **Добавить:** "Положи [заказ] в [ячейку]"\n' +
        '   Пример: `Положи 2020 в А1`\n' +
        '   🗣 Можно диктовать!\n' +
        '🗑 **Очистить:** "Очисти [ячейку]"\n' +
        '   Пример: `Очисти А1`\n\n' +
        '👇 Или используй меню:',
        Markup.keyboard([
            ['📦 Свободные места', '📊 Статистика']
        ]).resize()
    );
});

// --- Поиск по номеру заказа ---
bot.hears(/^\d+$/, async (ctx) => {
    const orderNum = ctx.message.text;
    try {
        const products = await prisma.product.findMany({
            where: { orderNum: orderNum }
        });

        if (products.length === 0) {
            return ctx.reply(`❌ Заказ ${orderNum} не найден на складе.`);
        }

        const totalRolls = products.reduce((sum, p) => sum + (p.rolls || 0), 0);
        const totalWeight = products.reduce((sum, p) => sum + (p.rollWeight || 0), 0);

        let msg = `📦 **Заказ ${orderNum}**\n`;
        msg += `📍 Рулонов: ${totalRolls}\n`;
        msg += `⚖️ Вес: ${totalWeight} кг\n\n`;
        msg += `**Где лежит:**\n`;

        products.forEach(p => {
            msg += `• ${p.slotId} (${p.floor} эт) — ${p.rolls} шт\n`;
        });

        ctx.replyWithMarkdown(msg);
    } catch (e) {
        console.error(e);
        ctx.reply('Ошибка при поиске.');
    }
});

// --- Добавление: "Положи 2020 в А1" или "Положи 2020 в А1 500" ---
// Гибкий Regex для голоса:
// Ловит: "Положи [заказ] 2020 [в] [ячейку] А1 [вес] 500"
// Вес теперь необязательный
bot.hears(/^(?:Положи|Добавь|Запиши)\s+(?:заказ\s+)?(.+?)\s+(?:в\s+)?(?:ячейку\s+)?([A-Za-zА-Яа-я]\d+)(?:\s+(?:вес\s+)?(\d+))?/i, async (ctx) => {
    const match = ctx.message.text.match(/^(?:Положи|Добавь|Запиши)\s+(?:заказ\s+)?(.+?)\s+(?:в\s+)?(?:ячейку\s+)?([A-Za-zА-Яа-я]\d+)(?:\s+(?:вес\s+)?(\d+))?/i);
    if (!match) return;

    let [, orderNum, slotIdRaw, weightRaw] = match;

    // Транслитерация кириллицы в латиницу для ячейки (А -> A, В -> B и т.д.)
    const map: Record<string, string> = {
        'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E', 'Н': 'H', 'К': 'K', 'М': 'M', 'О': 'O', 'Р': 'P', 'Т': 'T', 'Х': 'X',
        'а': 'A', 'в': 'B', 'с': 'C', 'е': 'E', 'н': 'H', 'к': 'K', 'м': 'M', 'о': 'O', 'р': 'P', 'т': 'T', 'х': 'X'
    };

    let slotId = slotIdRaw.toUpperCase();
    // Заменяем кириллицу на латиницу, если есть
    slotId = slotId.replace(/[А-Яа-я]/g, (char) => map[char] || char);

    const weight = weightRaw ? parseFloat(weightRaw) : 0;

    try {
        // Проверяем 1 этаж
        const floor1 = await prisma.product.findFirst({ where: { slotId, floor: 1 } });
        let targetFloor = 1;

        if (floor1) {
            // 1 этаж занят, проверяем 2
            const floor2 = await prisma.product.findFirst({ where: { slotId, floor: 2 } });
            if (floor2) {
                return ctx.reply(`❌ Ячейка ${slotId} полностью занята!`);
            }
            targetFloor = 2;
        }

        await prisma.product.create({
            data: {
                slotId,
                floor: targetFloor,
                orderNum,
                rolls: 1,
                rollWeight: weight,
                meterage: 0,
                density: '',
                comment: 'Голосовой ввод'
            }
        });

        // Лог
        await (prisma as any).actionHistory.create({
            data: {
                action: 'create',
                slotId,
                floor: targetFloor,
                newData: { slotId, floor: targetFloor, orderNum, rollWeight: weight }
            }
        });

        const weightMsg = weight > 0 ? ` Вес: ${weight} кг.` : '';
        ctx.reply(`✅ Принято! Заказ **${orderNum}** добавлен в **${slotId}** (эт. ${targetFloor}).${weightMsg}`);

    } catch (e) {
        console.error(e);
        ctx.reply('Ошибка при добавлении. Попробуй еще раз.');
    }
});

// --- Перемещение: "Перемести с C4 2 в C5 1" ---
bot.hears(/^(?:Перемести|Переложи|Передвинь)\s+(?:с\s+)?(?:ячейки\s+)?([A-Za-zА-Яа-я]\d+)\s+(\d)\s+(?:в\s+)?(?:ячейку\s+)?([A-Za-zА-Яа-я]\d+)\s+(\d)/i, async (ctx) => {
    const match = ctx.message.text.match(/^(?:Перемести|Переложи|Передвинь)\s+(?:с\s+)?(?:ячейки\s+)?([A-Za-zА-Яа-я]\d+)\s+(\d)\s+(?:в\s+)?(?:ячейку\s+)?([A-Za-zА-Яа-я]\d+)\s+(\d)/i);
    if (!match) return;

    let [, sourceSlotRaw, sourceFloorRaw, targetSlotRaw, targetFloorRaw] = match;

    // Транслитерация
    const map: Record<string, string> = {
        'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E', 'Н': 'H', 'К': 'K', 'М': 'M', 'О': 'O', 'Р': 'P', 'Т': 'T', 'Х': 'X',
        'а': 'A', 'в': 'B', 'с': 'C', 'е': 'E', 'н': 'H', 'к': 'K', 'м': 'M', 'о': 'O', 'р': 'P', 'т': 'T', 'х': 'X'
    };

    let sourceSlot = sourceSlotRaw.toUpperCase().replace(/[А-Яа-я]/g, (char) => map[char] || char);
    let targetSlot = targetSlotRaw.toUpperCase().replace(/[А-Яа-я]/g, (char) => map[char] || char);

    const sourceFloor = parseInt(sourceFloorRaw);
    const targetFloor = parseInt(targetFloorRaw);

    try {
        // Проверяем, есть ли товар в исходной ячейке
        const sourceProduct = await prisma.product.findFirst({
            where: { slotId: sourceSlot, floor: sourceFloor }
        });

        if (!sourceProduct) {
            return ctx.reply(`❌ В ячейке ${sourceSlot} (эт. ${sourceFloor}) ничего нет!`);
        }

        // Проверяем, свободна ли целевая ячейка
        const targetProduct = await prisma.product.findFirst({
            where: { slotId: targetSlot, floor: targetFloor }
        });

        if (targetProduct) {
            return ctx.reply(`❌ Ячейка ${targetSlot} (эт. ${targetFloor}) уже занята!`);
        }

        // Перемещаем
        await prisma.product.update({
            where: { id: sourceProduct.id },
            data: {
                slotId: targetSlot,
                floor: targetFloor
            }
        });

        // Лог
        await (prisma as any).actionHistory.create({
            data: {
                action: 'move',
                slotId: sourceSlot,
                floor: sourceFloor,
                oldData: { slotId: sourceSlot, floor: sourceFloor, id: sourceProduct.id },
                newData: { slotId: targetSlot, floor: targetFloor, id: sourceProduct.id }
            }
        });

        ctx.reply(`✅ Перемещено! ${sourceSlot} (эт. ${sourceFloor}) → ${targetSlot} (эт. ${targetFloor})`);

    } catch (e) {
        console.error(e);
        ctx.reply('Ошибка при перемещении.');
    }
});

// --- Очистка: "Очисти А1" ---
bot.hears(/Очисти\s+(\S+)/i, async (ctx) => {
    const slotIdRaw = ctx.match[1].toUpperCase();

    // Транслитерация и тут нужна
    const map: Record<string, string> = {
        'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E', 'Н': 'H', 'К': 'K', 'М': 'M', 'О': 'O', 'Р': 'P', 'Т': 'T', 'Х': 'X',
        'а': 'A', 'в': 'B', 'с': 'C', 'е': 'E', 'н': 'H', 'к': 'K', 'м': 'M', 'о': 'O', 'р': 'P', 'т': 'T', 'х': 'X'
    };
    let slotId = slotIdRaw.replace(/[А-Яа-я]/g, (char) => map[char] || char);

    try {
        const { count } = await prisma.product.deleteMany({
            where: { slotId }
        });

        if (count > 0) {
            // Лог (упрощенно, без деталей удаленного)
            await (prisma as any).actionHistory.create({
                data: {
                    action: 'delete',
                    slotId,
                    floor: 0, // Оба этажа
                    oldData: { note: 'Cleared via bot' }
                }
            });
            ctx.reply(`🗑 Ячейка **${slotId}** очищена (удалено записей: ${count}).`);
        } else {
            ctx.reply(`🤷‍♂️ Ячейка **${slotId}** и так пустая.`);
        }
    } catch (e) {
        console.error(e);
        ctx.reply('Ошибка очистки.');
    }
});

// --- Статистика ---
bot.hears('📊 Статистика', async (ctx) => {
    try {
        const totalProducts = await prisma.product.count();
        const totalWeight = await prisma.product.aggregate({
            _sum: { rollWeight: true }
        });

        ctx.reply(
            `📊 **Сводка по складу:**\n\n` +
            `📦 Всего записей: ${totalProducts}\n` +
            `⚖️ Общий вес: ${totalWeight._sum.rollWeight || 0} кг`
        );
    } catch (e) {
        ctx.reply('Ошибка получения статистики');
    }
});

// --- Свободные места ---
bot.hears('📦 Свободные места', async (ctx) => {
    // Это сложный запрос, упростим: найдем все занятые и вычислим свободные
    // Для демо просто скажем "Функция в разработке" или покажем первые 5 свободных
    ctx.reply('🔍 Ищу свободные ячейки... (функция в разработке)');
});

// Запуск
bot.launch();
console.log('🤖 Bot started!');

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
