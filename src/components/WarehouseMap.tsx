'use client';

import { useEffect, useState, useRef } from 'react';

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

    const [moveSource, setMoveSource] = useState<{ slotId: string, floor: number } | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1);

    // Состояния для Pan-to-Move
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

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
        // Режим перемещения (Tap-to-Move)
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

    // --- Pan-to-Move Handlers ---
    const handleMouseDown = (e: React.MouseEvent) => {
        // Только левая кнопка мыши (button 0) и только на walkway
        const target = e.target as HTMLElement;
        const isWalkway = target.closest('[data-walkway="true"]');

        if (e.button === 0 && isWalkway && containerRef.current) {
            e.preventDefault();
            setIsDragging(true);
            setDragStart({
                x: e.clientX,
                y: e.clientY,
                scrollLeft: containerRef.current.scrollLeft,
                scrollTop: containerRef.current.scrollTop
            });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && containerRef.current) {
            e.preventDefault();
            const dx = e.clientX - dragStart.x;
            const dy = e.clientY - dragStart.y;

            // Инвертируем движение: тянем влево -> скролл вправо
            containerRef.current.scrollLeft = dragStart.scrollLeft - dx;
            containerRef.current.scrollTop = dragStart.scrollTop - dy;
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // --- Pinch-to-Zoom Handlers ---
    const [touchStartDist, setTouchStartDist] = useState<number | null>(null);
    const [startZoom, setStartZoom] = useState<number>(1);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            setTouchStartDist(dist);
            setStartZoom(zoomLevel);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && touchStartDist !== null) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const scale = dist / touchStartDist;
            const newZoom = Math.min(Math.max(startZoom * scale, 0.5), 3);
            setZoomLevel(newZoom);
        }
    };

    const handleTouchEnd = () => {
        setTouchStartDist(null);
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

    // Группируем по строкам (1-13) и колонкам (A-Z)
    const columns = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
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
            {/* Кнопки управления */}
            {/* Кнопки управления */}
            <div className="absolute top-2 right-2 z-20 flex gap-2 items-center">
                {/* Зум контролы */}
                <div className="flex bg-white rounded shadow border border-gray-300 overflow-hidden mr-2">
                    <button
                        onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))}
                        className="px-2 py-1 hover:bg-gray-100 text-gray-600 border-r border-gray-300"
                        title="Уменьшить"
                    >
                        -
                    </button>
                    <span className="px-2 py-1 text-xs flex items-center text-gray-500 min-w-[3rem] justify-center">
                        {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                        onClick={() => setZoomLevel(prev => Math.min(2, prev + 0.1))}
                        className="px-2 py-1 hover:bg-gray-100 text-gray-600"
                        title="Увеличить"
                    >
                        +
                    </button>
                </div>


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
                    {/* Инструкция при активном перемещении */}
                    {moveSource && (
                        <div className="mb-2 p-2 bg-blue-50 text-blue-800 text-xs sm:text-sm rounded border border-blue-100">
                            Выбрано: {moveSource.slotId} (эт. {moveSource.floor}). Нажмите на другую ячейку для перемещения.
                        </div>
                    )}

                    {/* Контейнер с прокруткой и картой */}
                    <div
                        ref={containerRef}
                        className={`overflow-auto touch-pan-x border border-gray-200 max-h-[70vh] ${isDragging ? 'select-none' : ''}`}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        style={{
                            zoom: zoomLevel
                        }}
                    >
                        <table className="border-collapse table-fixed w-full">
                            <thead>
                                <tr>
                                    {/* Угловая ячейка */}
                                    <th className="bg-gray-50 border border-gray-200 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 min-w-[2rem] sm:min-w-[2.5rem] md:min-w-[3rem] max-w-[2rem] sm:max-w-[2.5rem] md:max-w-[3rem]"></th>
                                    {/* Заголовки колонок */}
                                    {columns.map(col => (
                                        <th
                                            key={col}
                                            className="bg-gray-50 border border-gray-200 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 min-w-[2rem] sm:min-w-[2.5rem] md:min-w-[3rem] max-w-[2rem] sm:max-w-[2.5rem] md:max-w-[3rem] text-[10px] sm:text-xs font-bold text-center align-middle"
                                        >
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((rowSlots, rowIndex) => (
                                    <tr key={rowIndex}>
                                        {/* Заголовок строки (номер) */}
                                        <th
                                            className="bg-gray-50 border border-gray-200 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-[10px] sm:text-xs font-bold text-center align-middle"
                                        >
                                            {rowIndex + 1}
                                        </th>
                                        {/* Ячейки */}
                                        {rowSlots.map(slot => {
                                            // Принудительно считаем Y и Z проходами (не складом)
                                            const isGrayColumn = slot.id.startsWith('Y') || slot.id.startsWith('Z');
                                            const isStorage = slot.type === 'storage' && !isGrayColumn;

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
                                                    title={getTitle(slot)}
                                                    className={`relative border ${selectedSlot === slot.id
                                                        ? 'border-blue-500 border-2 shadow-lg ring-2 ring-blue-300 z-10'
                                                        : 'border-gray-400'
                                                        } w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 min-w-[2rem] sm:min-w-[2.5rem] md:min-w-[3rem] max-w-[2rem] sm:max-w-[2.5rem] md:max-w-[3rem] p-0 align-top transition-all overflow-hidden ${isStorage ? 'bg-white' : 'bg-gray-200'
                                                        }`}
                                                    style={{ backgroundColor: isStorage ? '#fff' : '#e5e7eb' }}
                                                >
                                                    {isStorage ? (
                                                        <>
                                                            {/* Номер ячейки (всегда виден) */}
                                                            <span
                                                                onClick={() => onSlotClick(slot.id)}
                                                                className="absolute top-0 left-0.5 text-[9px] sm:text-[10px] md:text-[11px] font-bold text-gray-700 select-none z-10 cursor-pointer"
                                                            >
                                                                {slot.id}
                                                            </span>

                                                            <div className="flex flex-col h-full w-full pt-1">
                                                                {/* Уровень 2 (Верх) */}
                                                                <div
                                                                    className={`flex-1 flex items-center justify-center pl-2 sm:pl-3 md:pl-4 border-b border-gray-200 transition-colors ${slot.floor2Busy ? 'bg-red-100 cursor-grab active:cursor-grabbing' : 'bg-green-50 cursor-pointer'
                                                                        } ${moveSource?.slotId === slot.id && moveSource?.floor === 2 ? 'ring-2 ring-green-500 z-30' : ''
                                                                        }`}
                                                                    draggable={slot.floor2Busy}
                                                                    onDragStart={(e) => slot.floor2Busy && handleDragStart(e, 2)}
                                                                    onDragOver={!slot.floor2Busy ? handleDragOver : undefined}
                                                                    onDrop={!slot.floor2Busy ? (e) => handleDrop(e, 2) : undefined}
                                                                    onClick={() => handleSlotInteraction(slot, 2)}
                                                                >
                                                                    {slot.floor2Busy && <RollIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 opacity-60" />}
                                                                </div>
                                                                {/* Уровень 1 (Низ) */}
                                                                <div
                                                                    className={`flex-1 flex items-center justify-center pl-2 sm:pl-3 md:pl-4 transition-colors ${slot.floor1Busy ? 'bg-blue-100 cursor-grab active:cursor-grabbing' : 'bg-green-50 cursor-pointer'
                                                                        } ${moveSource?.slotId === slot.id && moveSource?.floor === 1 ? 'ring-2 ring-green-500 z-30' : ''
                                                                        }`}
                                                                    draggable={slot.floor1Busy}
                                                                    onDragStart={(e) => slot.floor1Busy && handleDragStart(e, 1)}
                                                                    onDragOver={!slot.floor1Busy ? handleDragOver : undefined}
                                                                    onDrop={!slot.floor1Busy ? (e) => handleDrop(e, 1) : undefined}
                                                                    onClick={() => handleSlotInteraction(slot, 1)}
                                                                >
                                                                    {slot.floor1Busy && <RollIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 opacity-60" />}
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div
                                                            className="flex items-center justify-center h-full text-[10px] text-gray-300 cursor-move"
                                                            data-walkway="true"
                                                        >
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
