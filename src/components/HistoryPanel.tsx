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
                </div >

        <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end">
            <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
                Закрыть
            </button>
        </div>
            </div >
        </div >
    );
}
