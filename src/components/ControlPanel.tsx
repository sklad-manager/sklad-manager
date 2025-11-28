'use client';

import { useState, useEffect } from 'react';

interface ControlPanelProps {
    selectedSlot: string | null;
    onUpdate: () => void;
}

export default function ControlPanel({ selectedSlot, onUpdate }: ControlPanelProps) {
    const [floor1, setFloor1] = useState({
        orderNum: '',
        rolls: '',
        meterage: '',
        density: '',
        rollWeight: '',
        comment: '',
    });

    const [floor2, setFloor2] = useState({
        orderNum: '',
        rolls: '',
        meterage: '',
        density: '',
        rollWeight: '',
        comment: '',
    });

    const [searchOrderNum, setSearchOrderNum] = useState('');
    const [message, setMessage] = useState('');

    const loadSlotData = async (slotId: string) => {
        try {
            const res = await fetch(`/api/products?slotId=${slotId}`);
            const data = await res.json();

            const f1 = data.products?.find((p: any) => p.floor === 1);
            const f2 = data.products?.find((p: any) => p.floor === 2);

            setFloor1({
                orderNum: f1?.orderNum || '',
                rolls: f1?.rolls || '',
                meterage: f1?.meterage || '',
                density: f1?.density || '',
                rollWeight: f1?.rollWeight || '',
                comment: f1?.comment || '',
            });

            setFloor2({
                orderNum: f2?.orderNum || '',
                rolls: f2?.rolls || '',
                meterage: f2?.meterage || '',
                density: f2?.density || '',
                rollWeight: f2?.rollWeight || '',
                comment: f2?.comment || '',
            });

            setMessage(`Данные для ячейки ${slotId} загружены`);
        } catch (error) {
            setMessage('Ошибка загрузки данных');
        }
    };

    const handleSave = async () => {
        if (!selectedSlot) {
            setMessage('Выберите ячейку на карте');
            return;
        }

        try {
            let dataToSaveFloor1 = { ...floor1 };
            let dataToSaveFloor2 = { ...floor2 };
            let saveToFloor1 = true;
            let saveToFloor2 = true;

            // Гравитация при ручном вводе
            // Если заполнен 2 этаж, а 1 пустой (и в UI, и мы не сохраняем туда данные)
            if (floor2.orderNum && !floor1.orderNum) {
                const shouldLower = confirm(`Вы заполняете 2-й уровень, но 1-й свободен. Опустить данные на 1-й уровень?`);
                if (shouldLower) {
                    // Переносим данные с 2 на 1
                    dataToSaveFloor1 = { ...floor2 };
                    dataToSaveFloor2 = { orderNum: '', rolls: '', meterage: '', density: '', rollWeight: '', comment: '' }; // Очищаем 2

                    // Обновляем UI состояние тоже, чтобы пользователь видел изменения
                    setFloor1(dataToSaveFloor1);
                    setFloor2(dataToSaveFloor2);
                }
            }

            // Сохраняем этаж 1
            if (dataToSaveFloor1.orderNum) {
                await fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        slotId: selectedSlot,
                        floor: 1,
                        ...dataToSaveFloor1,
                        rolls: dataToSaveFloor1.rolls ? parseInt(dataToSaveFloor1.rolls) : null,
                        meterage: dataToSaveFloor1.meterage ? parseInt(dataToSaveFloor1.meterage) : null,
                        rollWeight: dataToSaveFloor1.rollWeight ? parseFloat(dataToSaveFloor1.rollWeight) : null,
                    }),
                });
            }

            // Сохраняем этаж 2 (если он не был перенесен вниз)
            if (dataToSaveFloor2.orderNum) {
                await fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        slotId: selectedSlot,
                        floor: 2,
                        ...dataToSaveFloor2,
                        rolls: dataToSaveFloor2.rolls ? parseInt(dataToSaveFloor2.rolls) : null,
                        meterage: dataToSaveFloor2.meterage ? parseInt(dataToSaveFloor2.meterage) : null,
                        rollWeight: dataToSaveFloor2.rollWeight ? parseFloat(dataToSaveFloor2.rollWeight) : null,
                    }),
                });
            }

            setMessage('Данные сохранены!');
            onUpdate();
        } catch (error) {
            setMessage('Ошибка сохранения');
        }
    };

    const handleDeleteFloor = async (floor: number) => {
        if (!selectedSlot) return;

        try {
            // Логика "Гравитации"
            if (floor === 1 && floor2.orderNum) {
                const shouldLower = confirm(`Позиция ${floor2.orderNum} находится в воздухе. Опустить её на 1 уровень?`);

                if (shouldLower) {
                    // 1. Удаляем 1 этаж
                    await fetch(`/api/products?slotId=${selectedSlot}&floor=1`, { method: 'DELETE' });

                    // 2. Создаем на 1 этаже данные со 2 этажа
                    await fetch('/api/products', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            slotId: selectedSlot,
                            floor: 1,
                            ...floor2,
                            rolls: floor2.rolls ? parseInt(floor2.rolls) : null,
                            meterage: floor2.meterage ? parseInt(floor2.meterage) : null,
                            rollWeight: floor2.rollWeight ? parseFloat(floor2.rollWeight) : null,
                        }),
                    });

                    // 3. Удаляем 2 этаж
                    await fetch(`/api/products?slotId=${selectedSlot}&floor=2`, { method: 'DELETE' });

                    setMessage('Товар опущен на 1 уровень');
                    onUpdate();
                    loadSlotData(selectedSlot);
                    return;
                }
            }

            // Обычное удаление
            await fetch(`/api/products?slotId=${selectedSlot}&floor=${floor}`, {
                method: 'DELETE',
            });

            setMessage(`Уровень ${floor} очищен`);
            onUpdate();
            loadSlotData(selectedSlot);
        } catch (error) {
            setMessage('Ошибка удаления');
        }
    };

    const handleClear = async () => {
        if (!selectedSlot) {
            setMessage('Выберите ячейку на карте');
            return;
        }

        if (confirm('Вы уверены, что хотите полностью очистить ячейку?')) {
            try {
                await fetch(`/api/products?slotId=${selectedSlot}`, {
                    method: 'DELETE',
                });

                setFloor1({ orderNum: '', rolls: '', meterage: '', density: '', rollWeight: '', comment: '' });
                setFloor2({ orderNum: '', rolls: '', meterage: '', density: '', rollWeight: '', comment: '' });
                setMessage('Ячейка очищена');
                onUpdate();
            } catch (error) {
                setMessage('Ошибка очистки');
            }
        }
    };

    const handleSearch = async () => {
        if (!searchOrderNum) {
            setMessage('Введите номер заказа');
            return;
        }

        try {
            const res = await fetch(`/api/products?orderNum=${searchOrderNum}`);
            const data = await res.json();

            if (data.products && data.products.length > 0) {
                const product = data.products[0];
                setMessage(`Заказ найден в ячейке ${product.slotId}, Уровень ${product.floor}`);
                loadSlotData(product.slotId);
            } else {
                setMessage('Заказ не найден');
            }
        } catch (error) {
            setMessage('Ошибка поиска');
        }
    };

    // Автозагрузка при выборе ячейки (используем useEffect)
    useEffect(() => {
        if (selectedSlot) {
            loadSlotData(selectedSlot);
        }
    }, [selectedSlot]); // Загружаем только при изменении selectedSlot

    return (
        <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow space-y-3 sm:space-y-4 md:space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold">Управление складом</h2>

            {selectedSlot && (
                <div className="p-2 sm:p-3 bg-blue-50 rounded text-sm sm:text-base">
                    <strong>Выбранная ячейка:</strong> {selectedSlot}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Уровень 1 */}
                <div className="space-y-2 sm:space-y-3 sm:border-r sm:pr-4 pb-3 sm:pb-0 border-b sm:border-b-0">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold">Уровень 1 (Нижний)</h3>
                        {floor1.orderNum && (
                            <button
                                onClick={() => handleDeleteFloor(1)}
                                className="text-red-500 hover:text-red-700 text-sm"
                                title="Удалить с 1 уровня"
                            >
                                🗑️
                            </button>
                        )}
                    </div>
                    <input
                        type="text"
                        placeholder="№ Заказа"
                        value={floor1.orderNum}
                        onChange={(e) => setFloor1({ ...floor1, orderNum: e.target.value })}
                        className="w-full p-2 border rounded"
                    />
                    <input
                        type="number"
                        placeholder="Рулоны"
                        value={floor1.rolls}
                        onChange={(e) => setFloor1({ ...floor1, rolls: e.target.value })}
                        className="w-full p-2 border rounded"
                    />
                    <input
                        type="number"
                        placeholder="Метраж"
                        value={floor1.meterage}
                        onChange={(e) => setFloor1({ ...floor1, meterage: e.target.value })}
                        className="w-full p-2 border rounded"
                    />
                    <input
                        type="text"
                        placeholder="Плотность"
                        value={floor1.density}
                        onChange={(e) => setFloor1({ ...floor1, density: e.target.value })}
                        className="w-full p-2 border rounded"
                    />
                    <input
                        type="number"
                        placeholder="Вес рулона"
                        value={floor1.rollWeight}
                        onChange={(e) => setFloor1({ ...floor1, rollWeight: e.target.value })}
                        className="w-full p-2 border rounded"
                    />
                    <input
                        type="text"
                        placeholder="Комментарий"
                        value={floor1.comment}
                        onChange={(e) => setFloor1({ ...floor1, comment: e.target.value })}
                        className="w-full p-2 border rounded"
                    />
                </div>

                {/* Уровень 2 */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold">Уровень 2 (Верхний)</h3>
                        {floor2.orderNum && (
                            <button
                                onClick={() => handleDeleteFloor(2)}
                                className="text-red-500 hover:text-red-700 text-sm"
                                title="Удалить со 2 уровня"
                            >
                                🗑️
                            </button>
                        )}
                    </div>
                    <input
                        type="text"
                        placeholder="№ Заказа"
                        value={floor2.orderNum}
                        onChange={(e) => setFloor2({ ...floor2, orderNum: e.target.value })}
                        className="w-full p-2 border rounded"
                    />
                    <input
                        type="number"
                        placeholder="Рулоны"
                        value={floor2.rolls}
                        onChange={(e) => setFloor2({ ...floor2, rolls: e.target.value })}
                        className="w-full p-2 border rounded"
                    />
                    <input
                        type="number"
                        placeholder="Метраж"
                        value={floor2.meterage}
                        onChange={(e) => setFloor2({ ...floor2, meterage: e.target.value })}
                        className="w-full p-2 border rounded"
                    />
                    <input
                        type="text"
                        placeholder="Плотность"
                        value={floor2.density}
                        onChange={(e) => setFloor2({ ...floor2, density: e.target.value })}
                        className="w-full p-2 border rounded"
                    />
                    <input
                        type="number"
                        placeholder="Вес рулона"
                        value={floor2.rollWeight}
                        onChange={(e) => setFloor2({ ...floor2, rollWeight: e.target.value })}
                        className="w-full p-2 border rounded"
                    />
                    <input
                        type="text"
                        placeholder="Комментарий"
                        value={floor2.comment}
                        onChange={(e) => setFloor2({ ...floor2, comment: e.target.value })}
                        className="w-full p-2 border rounded"
                    />
                </div>
            </div>

            <div className="flex gap-3">
                <button
                    onClick={handleSave}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                    Сохранить
                </button>
            </div>

            <hr />

            <div className="space-y-3">
                <h3 className="font-bold">Поиск по номеру заказа</h3>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Введите № заказа"
                        value={searchOrderNum}
                        onChange={(e) => setSearchOrderNum(e.target.value)}
                        className="flex-1 p-2 border rounded"
                    />
                    <button
                        onClick={handleSearch}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Найти
                    </button>
                </div>
            </div>

            {message && (
                <div className="p-3 bg-blue-100 text-blue-800 rounded">
                    {message}
                </div>
            )}
        </div>
    );
}
