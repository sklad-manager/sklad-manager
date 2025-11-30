'use client';

import { useState, useEffect } from 'react';

interface HistoryAction {
    id: number;
    action: string;
    slotId: string;
    floor: number | null;
    oldData: any;
    newData: any;
    timestamp: string;
}

export default function HistoryPanel({ onClose, onUpdate }: { onClose: () => void, onUpdate: () => void }) {
    const [history, setHistory] = useState<HistoryAction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const res = await fetch('/api/history?limit=100');
            const data = await res.json();
            setHistory(data.history || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getActionLabel = (action: string) => {
        const labels: Record<string, string> = {
            'create': 'Создание',
            'update': 'Изменение',
            'delete': 'Удаление',
            'move': 'Перемещение'
        };
        return labels[action] || action;
    };

    const formatTimestamp = (ts: string) => {
        const date = new Date(ts);
        return date.toLocaleString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getDetails = (item: HistoryAction) => {
        if (item.action === 'move') {
            const from = `${item.oldData?.slotId || '?'} (эт.${item.oldData?.floor || '?'})`;
            const to = `${item.newData?.slotId || '?'} (эт.${item.newData?.floor || '?'})`;
            return `${from} → ${to}`;
        }
        if (item.action === 'create') {
            return `Заказ: ${item.newData?.orderNum || '?'}`;
        }
        if (item.action === 'delete') {
            return `Заказ: ${item.oldData?.orderNum || '?'}`;
        }
        return `${item.slotId} (эт.${item.floor})`;
    };

    if (loading) return <div className="p-8 text-center">Загрузка истории...</div>;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h2 className="text-xl font-bold text-gray-800">История действий</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    {history.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">История пуста</div>
                    ) : (
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3">Дата/Время</th>
                                        <th className="px-4 py-3">Действие</th>
                                        <th className="px-4 py-3">Ячейка</th>
                                        <th className="px-4 py-3">Детали</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((item) => (
                                        <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                                                {formatTimestamp(item.timestamp)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${item.action === 'create' ? 'bg-green-100 text-green-800' :
                                                        item.action === 'delete' ? 'bg-red-100 text-red-800' :
                                                            item.action === 'move' ? 'bg-blue-100 text-blue-800' :
                                                                'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {getActionLabel(item.action)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-mono">{item.slotId}</td>
                                            <td className="px-4 py-3 text-xs">{getDetails(item)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    );
}
