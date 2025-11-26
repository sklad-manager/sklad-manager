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
            // Сохраняем оба этажа
            if (floor1.orderNum) {
                await fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        slotId: selectedSlot,
                        floor: 1,
                        ...floor1,
                        rolls: floor1.rolls ? parseInt(floor1.rolls) : null,
                        meterage: floor1.meterage ? parseInt(floor1.meterage) : null,
                        rollWeight: floor1.rollWeight ? parseFloat(floor1.rollWeight) : null,
                    }),
                });
            }

            if (floor2.orderNum) {
                await fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        slotId: selectedSlot,
                        floor: 2,
                        ...floor2,
                        rolls: floor2.rolls ? parseInt(floor2.rolls) : null,
                        meterage: floor2.meterage ? parseInt(floor2.meterage) : null,
                        rollWeight: floor2.rollWeight ? parseFloat(floor2.rollWeight) : null,
                    }),
                });
            }

            setMessage('Данные сохранены!');
            onUpdate();
        } catch (error) {
            setMessage('Ошибка сохранения');
        }
    };

    const handleClear = async () => {
        if (!selectedSlot) {
            setMessage('Выберите ячейку на карте');
            return;
        }

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
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <h2 className="text-2xl font-bold">Управление складом</h2>

            {selectedSlot && (
                <div className="p-3 bg-blue-50 rounded">
                    <strong>Выбранная ячейка:</strong> {selectedSlot}
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                {/* Уровень 1 */}
                <div className="space-y-3 border-r pr-4">
                    <h3 className="font-bold">Уровень 1 (Нижний)</h3>
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
                    <h3 className="font-bold">Уровень 2 (Верхний)</h3>
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
                <button
                    onClick={handleClear}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    Очистить ячейку
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
