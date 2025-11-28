'use client';

import { useState } from 'react';
import WarehouseMap from '@/components/WarehouseMap';
import ControlPanel from '@/components/ControlPanel';

export default function Home() {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [mapKey, setMapKey] = useState(0);

  const handleSlotClick = (slotId: string) => {
    setSelectedSlot(slotId);
  };

  const handleUpdate = () => {
    setMapKey(prev => prev + 1); // Перезагружаем карту
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
        <header className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800">
            Система управления складом
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
            Управление продукцией на складе экструзии
          </p>
        </header>

        {/* Mobile: вертикальная раскладка, Desktop: горизонтальная */}
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {/* Панель управления - на мобильных сверху */}
          <div className="order-1 lg:order-2 lg:col-span-1">
            <ControlPanel selectedSlot={selectedSlot} onUpdate={handleUpdate} />
          </div>

          {/* Карта склада - на мобильных снизу */}
          <div className="order-2 lg:order-1 lg:col-span-2">
            <WarehouseMap key={mapKey} onSlotClick={handleSlotClick} selectedSlot={selectedSlot} />
          </div>
        </div>
      </div>
    </div>
  );
}
