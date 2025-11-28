'use client';

import { useEffect, useState } from 'react';

interface SlotData {
    id: string;
    type: string;
    floor1Busy: boolean;
    floor2Busy: boolean;
    floor1Data: any;
    floor2Data: any;
}

interface WarehouseMapProps {
    onSlotClick: (slotId: string) => void;
    selectedSlot?: string | null;
}

// Иконка рулона (Lucide Cylinder без заливки) - адаптивный размер
const RollIcon = ({ className = "" }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`text-gray-700 ${className}`}
    >
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v14a9 3 0 0 0 18 0V5" />
    </svg>
);

export default function WarehouseMap({ onSlotClick, selectedSlot }: WarehouseMapProps) {
    const [map, setMap] = useState<SlotData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMoveMode, setIsMoveMode] = useState(false);
    const [moveSource, setMoveSource] = useState<{ slotId: string, floor: number } | null>(null);

    useEffect(() => {
        loadMap();
    }, []);

    const loadMap = async () => {
        try {
            const res = await fetch('/api/map', { cache: 'no-store' });
            const data = await res.json();
            setMap(data.map || []);
        } catch (error) {
            console.error('Ошибка загрузки карты:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMove = async (sourceSlotId: string, sourceFloor: number, targetSlotId: string, targetFloor: number) => {
        if (sourceSlotId === targetSlotId && sourceFloor === targetFloor) return;

        // Находим исходную ячейку для проверки гравитации
        const sourceSlotData = map.find(s => s.id === sourceSlotId);
        const shouldCheckSourceGravity = sourceSlotData && sourceFloor === 1 && sourceSlotData.floor2Busy;

        // Находим целевую ячейку
        const targetSlotData = map.find(s => s.id === targetSlotId);
        // Проверка занятости целевой ячейки
        const isTargetBusy = targetFloor === 1 ? targetSlotData?.floor1Busy : targetSlotData?.floor2Busy;

        if (isTargetBusy) {
            alert('Целевая ячейка занята!');
            setMoveSource(null);
            return;
        }

        let finalTargetFloor = targetFloor;

        // Гравитация целевой ячейки: Если кладем на 2 этаж, а 1 пустой
        if (targetFloor === 2 && targetSlotData && !targetSlotData.floor1Busy) {
            const shouldLower = confirm(`1-й уровень свободен. Опустить товар вниз?`);
            if (shouldLower) {
                finalTargetFloor = 1;
            }
        }

        try {
            setLoading(true);
            // 1. Основное перемещение
            const res = await fetch('/api/products', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'move',
                    sourceSlotId,
                    sourceFloor,
                    targetSlotId,
                    targetFloor: finalTargetFloor
                }),
            });

            const result = await res.json();
            if (!res.ok) {
                alert(result.error || 'Ошибка перемещения');
            } else {
                // Если успешно переместили, проверяем исходную ячейку
                if (shouldCheckSourceGravity) {
                    await loadMap();
                    const shouldLowerSource = confirm(`В исходной ячейке ${sourceSlotId} на 2-м уровне остался товар. Опустить его вниз?`);

                    if (shouldLowerSource) {
                        setLoading(true);
                        await fetch('/api/products', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'move',
                                sourceSlotId: sourceSlotId,
                                sourceFloor: 2,
                                targetSlotId: sourceSlotId,
                                targetFloor: 1
                            }),
                        });
                    }
                }

                await loadMap();
            }
        } catch (error) {
            alert('Ошибка соединения');
        } finally {
            setLoading(false);
            setMoveSource(null); // Сброс выбора после перемещения
        }
    };

    const handleSlotInteraction = (slot: SlotData, floor: number) => {
        if (!isMoveMode) {
            // Обычный режим: просто выбираем ячейку для просмотра
            // Но клик по этажу тоже должен выбирать ячейку
            onSlotClick(slot.id);
            return;
        }

        // Режим перемещения
        if (!moveSource) {
            // Выбор источника
            const isBusy = floor === 1 ? slot.floor1Busy : slot.floor2Busy;
            if (isBusy) {
                setMoveSource({ slotId: slot.id, floor });
            } else {
                // Если кликнули в пустоту в режиме перемещения - можно просто выбрать ячейку
                onSlotClick(slot.id);
            }
        } else {
            // Выбор цели
            // Если кликнули туда же - отмена
            if (moveSource.slotId === slot.id && moveSource.floor === floor) {
                setMoveSource(null);
                return;
            }

            // Выполняем перемещение
            handleMove(moveSource.slotId, moveSource.floor, slot.id, floor);
        }
    };

    const getTitle = (slot: SlotData) => {
        const lines = [];
        if (slot.floor1Busy && slot.floor1Data) {
            lines.push(`--- УРОВЕНЬ 1 ---`);
            lines.push(`№ Заказа: ${slot.floor1Data.orderNum}`);
            if (slot.floor1Data.rolls) lines.push(`Рулоны: ${slot.floor1Data.rolls}`);
            if (slot.floor1Data.meterage) lines.push(`Метраж: ${slot.floor1Data.meterage}`);
            if (slot.floor1Data.density) lines.push(`Плотность: ${slot.floor1Data.density}`);
            if (slot.floor1Data.rollWeight) lines.push(`Вес рулона: ${slot.floor1Data.rollWeight}`);
            if (slot.floor1Data.comment) lines.push(`Комментарий: ${slot.floor1Data.comment}`);
        }
        if (slot.floor2Busy && slot.floor2Data) {
            if (lines.length > 0) lines.push('');
            lines.push(`--- УРОВЕНЬ 2 ---`);
            lines.push(`№ Заказа: ${slot.floor2Data.orderNum}`);
            if (slot.floor2Data.rolls) lines.push(`Рулоны: ${slot.floor2Data.rolls}`);
            if (slot.floor2Data.meterage) lines.push(`Метраж: ${slot.floor2Data.meterage}`);
            if (slot.floor2Data.density) lines.push(`Плотность: ${slot.floor2Data.density}`);
            if (slot.floor2Data.rollWeight) lines.push(`Вес рулона: ${slot.floor2Data.rollWeight}`);
            if (slot.floor2Data.comment) lines.push(`Комментарий: ${slot.floor2Data.comment}`);
        }
        return lines.join('\n');
    };

    // Группируем по строкам (1-13) и колонкам (A-X)
    const columns = 'ABCDEFGHIJKLMNOPQRSTUVWX'.split('');
    const rows: SlotData[][] = [];

    for (let row = 1; row <= 13; row++) {
        const rowSlots: SlotData[] = [];
        for (const col of columns) {
            const cellId = `${col}${row}`;
            const slot = map.find(s => s.id === cellId);
            if (slot) {
                rowSlots.push(slot);
            }
        }
        rows.push(rowSlots);
    }

    return (
        <div className="relative bg-white p-2 sm:p-4 rounded-lg shadow min-h-[400px] sm:min-h-[500px]">
            {/* Кнопка переключения режима */}
            <div className="absolute top-2 right-2 z-20 flex gap-2">
                <button
                    onClick={() => {
                        setIsMoveMode(!isMoveMode);
                        setMoveSource(null);
                    }}
                    className={`px-3 py-1 rounded text-xs sm:text-sm font-bold shadow transition-colors ${isMoveMode
                            ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                >
                    {isMoveMode ? '🖐️ Перемещение' : '👆 Просмотр'}
                </button>
            </div>

            {loading && (
                <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center backdrop-blur-[1px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            )}

            {map.length === 0 && !loading ? (
                <div className="p-4 text-center">
                    <p className="text-sm sm:text-base">Склад не инициализирован.</p>
                    <button
                        onClick={async () => {
                            try {
                                setLoading(true);
                                const res = await fetch('/api/init', { method: 'POST' });
                                const data = await res.json();

                                if (!res.ok) {
                                    alert(data.error || 'Ошибка инициализации');
                                } else {
                                    alert(data.message || 'Схема склада обновлена!');
                                    await loadMap();
                                }
                            } catch (e) {
                                alert('Ошибка соединения с сервером');
                            } finally {
                                setLoading(false);
                            }
                        }}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm sm:text-base"
                    >
                        Инициализировать склад
                    </button>
                </div>
            ) : (
                <>
                    {/* Инструкция для режима перемещения */}
                    {isMoveMode && (
                        <div className="mb-2 p-2 bg-blue-50 text-blue-800 text-xs sm:text-sm rounded border border-blue-100">
                            {moveSource
                                ? `Выбрано: ${moveSource.slotId} (эт. ${moveSource.floor}). Нажмите на другую ячейку для перемещения.`
                                : 'Нажмите на товар, чтобы выбрать его для перемещения.'}
                        </div>
                    )}

                    {/* Контейнер с горизонтальной прокруткой */}
                    <div className="overflow-x-auto -mx-2 sm:mx-0 touch-pan-x">
                        <div className="inline-block min-w-full px-2 sm:px-0">
                            <table className="border-collapse">
                                <thead>
                                    <tr>
                                        {/* Адаптивные размеры: mobile 32px, tablet 40px, desktop 48px */}
                                        <th className="border border-gray-300 w-8 h-6 sm:w-10 sm:h-7 md:w-12 md:h-8 text-[10px] sm:text-xs bg-gray-100 sticky left-0 z-10"></th>
                                        {columns.map(col => (
                                            <th key={col} className="border border-gray-300 w-8 h-6 sm:w-10 sm:h-7 md:w-12 md:h-8 text-[10px] sm:text-xs bg-gray-100">
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((rowSlots, rowIndex) => (
                                        <tr key={rowIndex}>
                                            <td className="border border-gray-300 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-[10px] sm:text-xs text-center bg-gray-100 font-bold sticky left-0 z-10">
                                                {rowIndex + 1}
                                            </td>
                                            {rowSlots.map(slot => {
                                                const isStorage = slot.type === 'storage';

                                                const handleDragStart = (e: React.DragEvent, floor: number) => {
                                                    e.dataTransfer.setData('application/json', JSON.stringify({
                                                        slotId: slot.id,
                                                        floor: floor
                                                    }));
                                                    e.dataTransfer.effectAllowed = 'move';
                                                };

                                                const handleDragOver = (e: React.DragEvent) => {
                                                    e.preventDefault();
                                                    e.dataTransfer.dropEffect = 'move';
                                                };

                                                const handleDrop = async (e: React.DragEvent, targetFloor: number) => {
                                                    e.preventDefault();
                                                    const data = e.dataTransfer.getData('application/json');
                                                    if (!data) return;

                                                    const { slotId: sourceSlotId, floor: sourceFloor } = JSON.parse(data);
                                                    handleMove(sourceSlotId, sourceFloor, slot.id, targetFloor);
                                                };

                                                return (
                                                    <td
                                                        key={slot.id}
                                                        // Обработчик клика на ячейку в целом (для совместимости, но основные клики внутри)
                                                        // onClick={() => isStorage && onSlotClick(slot.id)} 
                                                        title={getTitle(slot)}
                                                        className={`relative border ${selectedSlot === slot.id
                                                                ? 'border-blue-500 border-2 shadow-lg ring-2 ring-blue-300 z-20'
                                                                : 'border-gray-400'
                                                            } w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 p-0 align-top transition-all ${isStorage ? 'bg-white' : 'bg-gray-100'
                                                            }`}
                                                        style={{ backgroundColor: isStorage ? '#fff' : '#eeeeee' }}
                                                    >
                                                        {isStorage ? (
                                                            <>
                                                                {/* Номер ячейки (всегда виден) */}
                                                                <span
                                                                    onClick={() => onSlotClick(slot.id)}
                                                                    className="absolute top-0 left-0.5 text-[6px] sm:text-[7px] md:text-[8px] font-bold text-gray-500 select-none z-10 cursor-pointer"
                                                                >
                                                                    {slot.id}
                                                                </span>

                                                                <div className="flex flex-col h-full w-full pt-1">
                                                                    {/* Уровень 2 (Верх) */}
                                                                    <div
                                                                        className={`flex-1 flex items-center justify-center pl-2 sm:pl-3 md:pl-4 border-b border-gray-200 transition-colors ${slot.floor2Busy ? 'bg-red-100 cursor-grab active:cursor-grabbing' : 'bg-green-50 cursor-pointer'
                                                                            } ${moveSource?.slotId === slot.id && moveSource?.floor === 2 ? 'ring-2 ring-green-500 z-30' : ''
                                                                            }`}
                                                                        draggable={slot.floor2Busy && !isMoveMode}
                                                                        onDragStart={(e) => slot.floor2Busy && !isMoveMode && handleDragStart(e, 2)}
                                                                        onDragOver={!slot.floor2Busy && !isMoveMode ? handleDragOver : undefined}
                                                                        onDrop={!slot.floor2Busy && !isMoveMode ? (e) => handleDrop(e, 2) : undefined}
                                                                        onClick={() => handleSlotInteraction(slot, 2)}
                                                                    >
                                                                        {slot.floor2Busy && <RollIcon className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />}
                                                                    </div>
                                                                    {/* Уровень 1 (Низ) */}
                                                                    <div
                                                                        className={`flex-1 flex items-center justify-center pl-2 sm:pl-3 md:pl-4 transition-colors ${slot.floor1Busy ? 'bg-red-100 cursor-grab active:cursor-grabbing' : 'bg-green-50 cursor-pointer'
                                                                            } ${moveSource?.slotId === slot.id && moveSource?.floor === 1 ? 'ring-2 ring-green-500 z-30' : ''
                                                                            }`}
                                                                        draggable={slot.floor1Busy && !isMoveMode}
                                                                        onDragStart={(e) => slot.floor1Busy && !isMoveMode && handleDragStart(e, 1)}
                                                                        onDragOver={!slot.floor1Busy && !isMoveMode ? handleDragOver : undefined}
                                                                        onDrop={!slot.floor1Busy && !isMoveMode ? (e) => handleDrop(e, 1) : undefined}
                                                                        onClick={() => handleSlotInteraction(slot, 1)}
                                                                    >
                                                                        {slot.floor1Busy && <RollIcon className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />}
                                                                    </div>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full text-[10px] text-gray-300">
                                                                {/* Walkway */}
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="mt-3 sm:mt-4">
                        <button
                            onClick={loadMap}
                            className="w-full sm:w-auto px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm sm:text-base"
                        >
                            Обновить данные
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
