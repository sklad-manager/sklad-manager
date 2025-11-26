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
}

export default function WarehouseMap({ onSlotClick }: WarehouseMapProps) {
    const [map, setMap] = useState<SlotData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMap();
    }, []);

    const loadMap = async () => {
        try {
            const res = await fetch('/api/map');
            const data = await res.json();
            setMap(data.map || []);
        } catch (error) {
            console.error('Ошибка загрузки карты:', error);
        } finally {
            setLoading(false);
        }
    };

    const getColor = (slot: SlotData) => {
        if (slot.type === 'walkway') {
            return slot.floor1Busy || slot.floor2Busy ? '#ff6961' : '#eeeeee';
        }

        if (slot.floor1Busy && slot.floor2Busy) return '#f4c7c3'; // Оба этажа
        if (slot.floor1Busy || slot.floor2Busy) return '#fef7cc'; // Один этаж
        return '#c9ead5'; // Свободно
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
        return lines.join('\\n');
    };

    if (loading) {
        return <div className="p-4 text-center">Загрузка карты...</div>;
    }

    if (map.length === 0) {
        return (
            <div className="p-4 text-center">
                <p>Склад не инициализирован.</p>
                <button
                    onClick={async () => {
                        await fetch('/api/init', { method: 'POST' });
                        loadMap();
                    }}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Инициализировать склад
                </button>
            </div>
        );
    }

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
        <div className="overflow-x-auto bg-white p-4 rounded-lg shadow">
            <table className="border-collapse">
                <thead>
                    <tr>
                        <th className="border border-gray-300 w-8 h-8 text-xs bg-gray-100"></th>
                        {columns.map(col => (
                            <th key={col} className="border border-gray-300 w-8 h-8 text-xs bg-gray-100">
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((rowSlots, rowIndex) => (
                        <tr key={rowIndex}>
                            <td className="border border-gray-300 w-8 h-8 text-xs text-center bg-gray-100 font-bold">
                                {rowIndex + 1}
                            </td>
                            {rowSlots.map(slot => {
                                const isStorage = slot.type === 'storage';
                                const isBusy = slot.floor1Busy || slot.floor2Busy;

                                return (
                                    <td
                                        key={slot.id}
                                        onClick={() => isStorage && onSlotClick(slot.id)}
                                        title={getTitle(slot)}
                                        className={`border border-gray-400 w-8 h-8 text-center text-xs transition ${isStorage ? 'cursor-pointer hover:brightness-90 font-semibold' : 'text-gray-400 text-[10px]'
                                            }`}
                                        style={{ backgroundColor: getColor(slot) }}
                                    >
                                        {isStorage || isBusy ? slot.id : ''}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            <button
                onClick={loadMap}
                className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
                Обновить карту
            </button>
        </div>
    );
}
