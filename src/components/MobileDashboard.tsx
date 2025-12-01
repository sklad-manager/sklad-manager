'use client';

import { useState, useEffect } from 'react';

interface Product {
    id: number;
    slotId: string;
    floor: number;
    orderNum: string;
    rolls?: number;
    meterage?: number;
    density?: string;
    rollWeight?: number;
    comment?: string;
}

interface MobileDashboardProps {
    onSwitchToMap: () => void;
    onOpenHistory: () => void;
}

export default function MobileDashboard({ onSwitchToMap, onOpenHistory }: MobileDashboardProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'dashboard' | 'slot' | 'list'>('dashboard');
    const [currentSlot, setCurrentSlot] = useState<string | null>(null);
    const [slotData, setSlotData] = useState<Product[]>([]);
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Поиск
    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setLoading(true);
        setMessage('');

        const query = searchQuery.trim().toUpperCase();

        // Проверка: это ячейка или заказ?
        // Ячейка: 1-2 буквы + цифра (A1, B12, AA1)
        const isSlot = /^[A-Z]{1,2}\d+$/.test(query);

        try {
            if (isSlot) {
                // Загружаем ячейку
                const res = await fetch(`/api/products?slotId=${query}`);
                const data = await res.json();
                setSlotData(data.products || []);
                setCurrentSlot(query);
                setViewMode('slot');
            } else {
                // Ищем заказ
                const res = await fetch(`/api/products?orderNum=${query}`);
                const data = await res.json();
                if (data.products && data.products.length > 0) {
                    setSearchResults(data.products);
                    setViewMode('list');
                } else {
                    setMessage('Ничего не найдено');
                }
            }
        } catch (err) {
            setMessage('Ошибка поиска');
        } finally {
            setLoading(false);
        }
    };

    // Компонент карточки товара
    const ProductCard = ({ product, onDelete }: { product: Product, onDelete: () => void }) => (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <div className="text-xs text-gray-500 font-medium">
                        {product.slotId} • Этаж {product.floor}
                    </div>
                    <div className="text-lg font-bold text-gray-800">
                        {product.orderNum}
                    </div>
                </div>
                <button
                    onClick={onDelete}
                    className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100"
                >
                    🗑️
                </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                {product.rolls && <div>Рулоны: <span className="font-medium text-gray-900">{product.rolls}</span></div>}
                {product.meterage && <div>Метраж: <span className="font-medium text-gray-900">{product.meterage}</span></div>}
                {product.density && <div>Плотность: <span className="font-medium text-gray-900">{product.density}</span></div>}
                {product.rollWeight && <div>Вес: <span className="font-medium text-gray-900">{product.rollWeight}</span></div>}
            </div>
            {product.comment && (
                <div className="mt-2 text-sm text-gray-500 bg-gray-50 p-2 rounded">
                    {product.comment}
                </div>
            )}
        </div>
    );

    // Удаление товара
    const handleDelete = async (product: Product) => {
        if (!confirm(`Удалить заказ ${product.orderNum} из ячейки ${product.slotId}?`)) return;

        try {
            const res = await fetch(`/api/products?slotId=${product.slotId}&floor=${product.floor}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                // Обновляем данные
                if (viewMode === 'slot' && currentSlot) {
                    const res = await fetch(`/api/products?slotId=${currentSlot}`);
                    const data = await res.json();
                    setSlotData(data.products || []);
                } else if (viewMode === 'list') {
                    setSearchResults(prev => prev.filter(p => p.id !== product.id));
                }
            }
        } catch (e) {
            alert('Ошибка удаления');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white p-4 shadow-sm sticky top-0 z-10">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-xl font-bold text-gray-800">Склад</h1>
                    <div className="flex gap-2">
                        <button onClick={onOpenHistory} className="p-2 text-gray-600 bg-gray-100 rounded-lg">
                            📜
                        </button>
                        <button onClick={onSwitchToMap} className="p-2 text-blue-600 bg-blue-50 rounded-lg font-medium text-sm">
                            Карта
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="relative">
                    <input
                        type="text"
                        placeholder="Поиск (Заказ или Ячейка A1)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-3 pl-10 bg-gray-100 rounded-xl border-none focus:ring-2 focus:ring-blue-500 text-lg"
                    />
                    <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
                </form>
            </div>

            {/* Content */}
            <div className="p-4">
                {loading && <div className="text-center py-8 text-gray-500">Загрузка...</div>}

                {message && (
                    <div className="bg-blue-50 text-blue-800 p-4 rounded-xl mb-4 text-center">
                        {message}
                    </div>
                )}

                {viewMode === 'dashboard' && !loading && !message && (
                    <div className="text-center py-10">
                        <div className="text-6xl mb-4">📦</div>
                        <h3 className="text-xl font-bold text-gray-700 mb-2">Готов к работе</h3>
                        <p className="text-gray-500">Введите номер заказа или ячейку для начала работы</p>
                    </div>
                )}

                {viewMode === 'list' && (
                    <div>
                        <h2 className="text-lg font-bold mb-3 text-gray-700">Результаты поиска ({searchResults.length})</h2>
                        {searchResults.map(product => (
                            <ProductCard key={product.id} product={product} onDelete={() => handleDelete(product)} />
                        ))}
                    </div>
                )}

                {viewMode === 'slot' && currentSlot && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-800">Ячейка {currentSlot}</h2>
                            <button
                                onClick={() => setViewMode('dashboard')}
                                className="text-gray-500"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Этаж 2 (Верхний) */}
                        <div className="mb-4">
                            <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Этаж 2 (Верхний)</h3>
                            {slotData.find(p => p.floor === 2) ? (
                                <ProductCard
                                    product={slotData.find(p => p.floor === 2)!}
                                    onDelete={() => handleDelete(slotData.find(p => p.floor === 2)!)}
                                />
                            ) : (
                                <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400">
                                    Пусто
                                    {/* Тут можно добавить кнопку "Добавить" */}
                                </div>
                            )}
                        </div>

                        {/* Этаж 1 (Нижний) */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Этаж 1 (Нижний)</h3>
                            {slotData.find(p => p.floor === 1) ? (
                                <ProductCard
                                    product={slotData.find(p => p.floor === 1)!}
                                    onDelete={() => handleDelete(slotData.find(p => p.floor === 1)!)}
                                />
                            ) : (
                                <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400">
                                    Пусто
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
