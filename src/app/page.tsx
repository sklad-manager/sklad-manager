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
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="bg-white p-6 rounded-lg shadow">
          <h1 className="text-4xl font-bold text-gray-800">
            Система управления складом
          </h1>
          <p className="text-gray-600 mt-2">
            Управление продукцией на складе экструзии
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <WarehouseMap key={mapKey} onSlotClick={handleSlotClick} />
          </div>

          <div>
            <ControlPanel selectedSlot={selectedSlot} onUpdate={handleUpdate} />
          </div>
        </div>
      </div>
    </div>
  );
}
