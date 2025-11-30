'use client';

import { useState, useEffect } from 'react';

interface ReportData {
    stats: {
        totalRolls: number;
        totalWeight: number;
        totalMeterage: number;
        occupancyRate: number;
        totalItems: number;
    };
    items: Array<{
        id: number;
        slotId: string;
        floor: number;
        orderNum: string;
        rolls: number;
        meterage: number;
        density: string;
        rollWeight: number;
        comment: string;
    }>;
}

export default function WarehouseReport({ onClose }: { onClose: () => void }) {
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [sortField, setSortField] = useState<keyof ReportData['items'][0]>('slotId');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    useEffect(() => {
        fetch('/api/report')
            .then(res => res.json())
            .then(data => {
                setData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const handleSort = (field: keyof ReportData['items'][0]) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedItems = data?.items
        .filter(item => item.orderNum.toLowerCase().includes(filter.toLowerCase()) || item.slotId.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => {
            const aValue = a[sortField];
            const bValue = b[sortField];
            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

    const exportToCSV = () => {
        if (!data) return;
        const headers = ['Ячейка', 'Этаж', '№ Заказа', 'Рулоны', 'Метраж', 'Плотность', 'Вес', 'Комментарий'];
        const csvContent = [
            headers.join(','),
            ...data.items.map(item => [
                item.slotId,
                item.floor,
                item.orderNum,
                item.rolls,
                item.meterage,
                item.density,
                item.rollWeight,
                `"${item.comment || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `warehouse_report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    if (loading) return <div className="p-8 text-center">Загрузка данных...</div>;
    if (!data) return <div className="p-8 text-center text-red-600">Ошибка загрузки данных</div>;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h2 className="text-xl font-bold text-gray-800">Отчет по складу</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    {/* Статистика */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded border border-blue-100">
                            <div className="text-sm text-blue-600 font-medium">Всего рулонов</div>
                            <div className="text-2xl font-bold text-blue-900">{data.stats.totalRolls}</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded border border-green-100">
                            <div className="text-sm text-green-600 font-medium">Общий вес</div>
                            <div className="text-2xl font-bold text-green-900">{data.stats.totalWeight} кг</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded border border-purple-100">
                            <div className="text-sm text-purple-600 font-medium">Общий метраж</div>
                            <div className="text-2xl font-bold text-purple-900">{data.stats.totalMeterage} м</div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded border border-orange-100">
                            <div className="text-sm text-orange-600 font-medium">Заполненность</div>
                            <div className="text-2xl font-bold text-orange-900">{data.stats.occupancyRate}%</div>
                        </div>
                    </div>

                    {/* Фильтры и экспорт */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-4 justify-between">
                        <input
                            type="text"
                            placeholder="Поиск по заказу или ячейке..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            className="border p-2 rounded w-full sm:w-64"
                        />
                        <button
                            onClick={exportToCSV}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center justify-center gap-2"
                        >
                            <span>📥</span> Скачать CSV
                        </button>
                    </div>

                    {/* Таблица */}
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    {[
                                        { id: 'slotId', label: 'Ячейка' },
                                        { id: 'floor', label: 'Этаж' },
                                        { id: 'orderNum', label: '№ Заказа' },
                                        { id: 'rolls', label: 'Рулоны' },
                                        { id: 'meterage', label: 'Метраж' },
                                        { id: 'density', label: 'Плотность' },
                                        { id: 'rollWeight', label: 'Вес' },
                                        { id: 'comment', label: 'Комментарий' },
                                    ].map(col => (
                                        <th
                                            key={col.id}
                                            className="px-4 py-3 cursor-pointer hover:bg-gray-100"
                                            onClick={() => handleSort(col.id as any)}
                                        >
                                            <div className="flex items-center gap-1">
                                                {col.label}
                                                {sortField === col.id && (
                                                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedItems?.map((item) => (
                                    <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900">{item.slotId}</td>
                                        <td className="px-4 py-3">{item.floor}</td>
                                        <td className="px-4 py-3">{item.orderNum}</td>
                                        <td className="px-4 py-3">{item.rolls}</td>
                                        <td className="px-4 py-3">{item.meterage}</td>
                                        <td className="px-4 py-3">{item.density}</td>
                                        <td className="px-4 py-3">{item.rollWeight}</td>
                                        <td className="px-4 py-3 truncate max-w-xs" title={item.comment}>{item.comment}</td>
                                    </tr>
                                ))}
                                {sortedItems?.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                            Ничего не найдено
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
