'use client';

import { useState, useEffect } from 'react';
import WarehouseMap from '@/components/WarehouseMap';
import ControlPanel from '@/components/ControlPanel';
import WarehouseReport from '@/components/WarehouseReport';
import HistoryPanel from '@/components/HistoryPanel';
import MobileDashboard from '@/components/MobileDashboard';

export const dynamic = 'force-dynamic';

export default function Home() {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [forceDesktop, setForceDesktop] = useState(false);

  // Определение мобильного устройства
  useEffect(() => {
    const checkMobile = () => {
      // Если принудительно включен десктоп - не переключаем на мобильный вид
      if (forceDesktop) return;
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [forceDesktop]);

  const handleSlotClick = (slotId: string) => {
    setSelectedSlot(slotId);
  };

  const handleUpdate = () => {
    setMapKey(prev => prev + 1); // Перезагружаем карту
  };

  // Если мобильный режим и не включен принудительный десктоп
  if (isMobile && !forceDesktop) {
    return (
      <>
        <MobileDashboard
          onSwitchToMap={() => {
            setForceDesktop(true);
            setIsMobile(false);
          }}
          onOpenHistory={() => setShowHistory(true)}
        />
        {showHistory && (
          <HistoryPanel onClose={() => setShowHistory(false)} onUpdate={handleUpdate} />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
        <header className="bg-white p-4 sm:p-6 rounded-lg shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800">
              Система управления складом v2.1
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
              Управление продукцией на складе экструзии
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => {
                setForceDesktop(false);
                setIsMobile(true);
              }}
              className="md:hidden px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              📱 App
            </button>
            <button
              onClick={() => setShowReport(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              📊 Отчеты
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              📜 История
            </button>
          </div>
        </header>

        {/* Mobile: вертикальная раскладка, Desktop: горизонтальная */}
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {/* Панель управления - на мобильных сверху */}
          <div className="order-1 lg:order-2 lg:col-span-1">
            <ControlPanel selectedSlot={selectedSlot} onUpdate={handleUpdate} />
          </div>

          {/* Карта склада - на мобильных снизу */}
          <div className="order-2 lg:order-1 lg:col-span-2">
            <WarehouseMap refreshTrigger={mapKey} onSlotClick={handleSlotClick} selectedSlot={selectedSlot} />
          </div>
        </div>
      </div>

      {/* Модальное окно отчета */}
      {showReport && (
        <div className="fixed inset-0 z-50">
          <WarehouseReport onClose={() => setShowReport(false)} />
        </div>
      )}

      {/* Модальное окно истории */}
      {showHistory && (
        <div className="fixed inset-0 z-50">
          <HistoryPanel onClose={() => setShowHistory(false)} onUpdate={handleUpdate} />
        </div>
      )}
    </div>
  );
}
