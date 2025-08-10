import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, Sun, Moon } from 'lucide-react';
import { getAllCameras } from '../../services/cameraService';
import { getRentalsForDateRange, groupRentalsByCamera } from '../../services/calendarService';

// Helpers to create month grid
function startOfMonth(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfMonth(date) {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}
function addMonths(date, count) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + count);
  return d;
}
function formatISODate(date) {
  return date.toISOString().split('T')[0];
}
function formatDisplay(date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
function getMonthDaysGrid(currentMonthDate) {
  const start = startOfMonth(currentMonthDate);
  const end = endOfMonth(currentMonthDate);
  const startWeekday = (start.getDay() + 6) % 7; // make Monday=0
  const daysInMonth = end.getDate();
  const cells = [];
  // leading blanks
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), day));
  }
  // trailing blanks to complete weeks
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function overlaps(date, rental) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const start = new Date(rental.start_date);
  const end = new Date(rental.end_date);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return d >= start && d <= end;
}

const StatusPill = ({ status, isDarkMode }) => {
  const lightMap = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
    active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rejected: 'bg-rose-100 text-rose-800 border-rose-200',
    completed: 'bg-slate-100 text-slate-800 border-slate-200',
    cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
  };

  const darkMap = {
    pending: 'bg-amber-900 text-amber-200 border-amber-700',
    confirmed: 'bg-blue-900 text-blue-200 border-blue-700',
    active: 'bg-emerald-900 text-emerald-200 border-emerald-700',
    rejected: 'bg-rose-900 text-rose-200 border-rose-700',
    completed: 'bg-slate-700 text-slate-200 border-slate-600',
    cancelled: 'bg-slate-700 text-slate-400 border-slate-600',
  };

  const map = isDarkMode ? darkMap : lightMap;
  return (
    <span className={`px-2 py-0.5 text-xs border rounded ${map[status] || (isDarkMode ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-slate-100 text-slate-700 border-slate-200')}`}>
      {status}
    </span>
  );
};

const Modal = ({ open, onClose, children, title, isDarkMode }) => {
  if (!open) return null;
  
  const bgColor = isDarkMode ? 'bg-gray-900' : 'bg-white';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-slate-200';
  const textColor = isDarkMode ? 'text-gray-100' : 'text-slate-800';
  const iconColor = isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-slate-500 hover:text-slate-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative rounded-lg shadow-xl w-full max-w-2xl mx-4 border ${bgColor} ${borderColor}`}>
        <div className={`px-5 py-3 border-b flex items-center justify-between ${borderColor}`}>
          <h3 className={`font-semibold ${textColor}`}>{title}</h3>
          <button onClick={onClose} className={iconColor}>✕</button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-auto">{children}</div>
      </div>
    </div>
  );
};

const CameraMiniCalendar = ({ camera, monthDate, rentals, onDayClick, isDarkMode }) => {
  const cells = useMemo(() => getMonthDaysGrid(monthDate), [monthDate]);
  const label = formatDisplay(monthDate);

  // Filter rentals to show active, confirmed, and completed
  const filteredRentals = useMemo(() => {
    return rentals.filter(rental => 
      ['active', 'confirmed', 'completed'].includes(rental.rental_status)
    );
  }, [rentals]);

  // Get status colors for different rental statuses
  const getStatusColor = (status) => {
    if (isDarkMode) {
      switch(status) {
        case 'active': return 'bg-emerald-900/50 border-emerald-700';
        case 'confirmed': return 'bg-blue-900/50 border-blue-700';
        case 'completed': return 'bg-slate-700 border-slate-600';
        default: return 'bg-slate-800 border-slate-700';
      }
    } else {
      switch(status) {
        case 'active': return 'bg-emerald-200/50 border-emerald-300';
        case 'confirmed': return 'bg-blue-200/50 border-blue-300';
        case 'completed': return 'bg-slate-200 border-slate-300';
        default: return 'bg-slate-100 border-slate-200';
      }
    }
  };

  const bgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-slate-200';
  const textColor = isDarkMode ? 'text-gray-100' : 'text-slate-800';
  const secondaryTextColor = isDarkMode ? 'text-gray-400' : 'text-slate-500';
  const iconColor = isDarkMode ? 'text-gray-500' : 'text-slate-400';
  const dayTextColor = isDarkMode ? 'text-gray-300' : 'text-slate-600';
  const dayBgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const dayHoverBg = isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-slate-50';
  const emptyDayBg = isDarkMode ? 'bg-gray-900' : 'bg-slate-50';
  const dotColor = (status) => {
    if (status === 'active') return isDarkMode ? 'bg-emerald-500' : 'bg-emerald-500';
    if (status === 'confirmed') return isDarkMode ? 'bg-blue-500' : 'bg-blue-500';
    return isDarkMode ? 'bg-slate-400' : 'bg-slate-500';
  };

  return (
    <div className={`border rounded-xl overflow-hidden shadow-sm ${bgColor} ${borderColor}`}>
      <div className={`p-3 flex items-center gap-3 border-b ${borderColor}`}>
        {camera.image_url ? (
          <img src={camera.image_url} alt={camera.name} className="w-10 h-10 rounded object-cover" onError={(e)=>{e.currentTarget.style.display='none';}} />
        ) : (
          <div className={`w-10 h-10 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-slate-100'}`} />
        )}
        <div className="flex-1">
          <div className={`font-medium ${textColor}`}>{camera.name}</div>
          <div className={`text-xs ${secondaryTextColor}`}>{label}</div>
        </div>
        <CalendarIcon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className={`grid grid-cols-7 text-xs px-3 pt-3 ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} className="text-center font-medium pb-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 p-3 pt-1">
        {cells.map((date, idx) => {
          const dayNumber = date ? date.getDate() : '';
          const dayRentals = date ? filteredRentals.filter(r => overlaps(date, r)) : [];
          const hasAny = dayRentals.length > 0;
          
          // Determine color based on rental status (priority: active > confirmed > completed)
          let dayClass = '';
          if (hasAny) {
            const statuses = [...new Set(dayRentals.map(r => r.rental_status))];
            if (statuses.includes('active')) {
              dayClass = getStatusColor('active');
            } else if (statuses.includes('confirmed')) {
              dayClass = getStatusColor('confirmed');
            } else if (statuses.includes('completed')) {
              dayClass = getStatusColor('completed');
            }
          }

          const rentalTextColor = (status) => {
            if (status === 'active') return isDarkMode ? 'text-emerald-200' : 'text-emerald-800';
            if (status === 'confirmed') return isDarkMode ? 'text-blue-200' : 'text-blue-800';
            return isDarkMode ? 'text-slate-300' : 'text-slate-700';
          };
          const rentalBorderColor = (status) => {
            if (status === 'active') return isDarkMode ? 'border-emerald-800/50' : 'border-emerald-200';
            if (status === 'confirmed') return isDarkMode ? 'border-blue-800/50' : 'border-blue-200';
            return isDarkMode ? 'border-slate-700' : 'border-slate-200';
          };

          return (
            <button
              key={idx}
              onClick={() => date && onDayClick(date, dayRentals)}
              className={`h-16 rounded-lg border flex flex-col items-center justify-between p-1 transition ${
                date ? `${dayBgColor} ${dayHoverBg}` : `${emptyDayBg} cursor-default`
              } ${hasAny ? dayClass : (isDarkMode ? 'border-gray-700' : 'border-slate-200')}`}
              disabled={!date}
            >
              <div className={`w-full flex justify-between items-center text-[11px] ${dayTextColor}`}>
                <span>{dayNumber}</span>
                {hasAny && (
                  <span className="inline-flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      dayRentals.some(r => r.rental_status === 'active') 
                        ? dotColor('active') 
                        : dayRentals.some(r => r.rental_status === 'confirmed')
                        ? dotColor('confirmed')
                        : 'bg-slate-500'
                    }`} />
                    {dayRentals.length}
                  </span>
                )}
              </div>
              <div className="w-full space-y-0.5 overflow-hidden">
                {dayRentals.slice(0,2).map(r => (
                  <div 
                    key={r.id} 
                    className={`truncate text-[10px] px-1 py-0.5 rounded border ${
                      isDarkMode ? 'bg-gray-700' : 'bg-white'
                    } ${rentalTextColor(r.rental_status)} ${rentalBorderColor(r.rental_status)}`}
                  >
                    {new Date(r.start_date).getDate()}–{new Date(r.end_date).getDate()} {r.users?.first_name || ''}
                  </div>
                ))}
                {dayRentals.length > 2 && (
                  <div className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-slate-500'}`}>
                    +{dayRentals.length - 2} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const Calendar = () => {
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [loading, setLoading] = useState(true);
  const [cameras, setCameras] = useState([]);
  const [rentalsByCamera, setRentalsByCamera] = useState({});
  const [modalState, setModalState] = useState({ open: false, date: null, rentals: [], camera: null });
  const [error, setError] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  const monthStartIso = useMemo(() => formatISODate(startOfMonth(monthDate)), [monthDate]);
  const monthEndIso = useMemo(() => formatISODate(endOfMonth(monthDate)), [monthDate]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [camRes, rentRes] = await Promise.all([
          getAllCameras(),
          getRentalsForDateRange(monthStartIso, monthEndIso, ['active', 'confirmed', 'completed']),
        ]);
        if (!mounted) return;
        if (camRes.error) throw camRes.error;
        if (rentRes.error) throw rentRes.error;
        setCameras(camRes.data || []);
        setRentalsByCamera(groupRentalsByCamera(rentRes.data || []));
      } catch (e) {
        console.error(e);
        setError(e.message || 'Failed to load calendar');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [monthStartIso, monthEndIso]);

  const onDayClick = (camera, date, rentals) => {
    // Filter rentals to show active, confirmed, and completed in modal
    const filteredRentals = rentals.filter(rental => 
      ['active', 'confirmed', 'completed'].includes(rental.rental_status)
    );
    setModalState({ open: true, date, rentals: filteredRentals, camera });
  };

  const monthLabel = formatDisplay(monthDate);

  const bgColor = isDarkMode ? 'bg-gray-900' : 'bg-slate-100';
  const textColor = isDarkMode ? 'text-gray-100' : 'text-slate-800';
  const secondaryTextColor = isDarkMode ? 'text-gray-400' : 'text-slate-600';
  const buttonBg = isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-slate-200';
  const buttonBorder = isDarkMode ? 'border-gray-700' : 'border-slate-300';
  const buttonTextColor = isDarkMode ? 'text-gray-300' : 'text-slate-700';
  const errorBg = isDarkMode ? 'bg-rose-900/30 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700';
  const loadingTextColor = isDarkMode ? 'text-gray-400' : 'text-slate-600';

  return (
    <div className={`p-6 min-h-screen ${bgColor}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button
            className={`p-2 rounded border ${buttonBg} ${buttonBorder} ${buttonTextColor}`}
            onClick={() => setMonthDate(prev => addMonths(prev, -1))}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className={`text-xl font-semibold ${textColor}`}>{monthLabel}</div>
          <button
            className={`p-2 rounded border ${buttonBg} ${buttonBorder} ${buttonTextColor}`}
            onClick={() => setMonthDate(prev => addMonths(prev, 1))}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className={`text-sm ${secondaryTextColor}`}>Click a date to view bookings</div>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded border ${buttonBg} ${buttonBorder} ${buttonTextColor}`}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {error && (
        <div className={`mb-4 p-3 rounded border ${errorBg}`}>
          {error}
        </div>
      )}

      {loading ? (
        <div className={`flex items-center justify-center py-20 ${loadingTextColor}`}>
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading calendars...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cameras.map((camera) => (
            <CameraMiniCalendar
              key={camera.id}
              camera={camera}
              monthDate={monthDate}
              rentals={(rentalsByCamera[camera.id] || [])}
              onDayClick={(date, rentals) => onDayClick(camera, date, rentals)}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>
      )}

      <Modal
        open={modalState.open}
        onClose={() => setModalState({ open: false, date: null, rentals: [], camera: null })}
        title={modalState.date ? `${modalState.camera?.name} — ${modalState.date.toLocaleDateString()}` : 'Booking Details'}
        isDarkMode={isDarkMode}
      >
        {modalState.rentals.length === 0 ? (
          <div className={isDarkMode ? 'text-gray-400' : 'text-slate-600'}>
            No active, confirmed, or completed bookings on this date.
          </div>
        ) : (
          <div className="space-y-3">
            {modalState.rentals.map(r => {
              const fullName = `${r.users?.first_name || ''} ${r.users?.last_name || ''}`.trim() || r.users?.email;
              const dateRange = `${new Date(r.start_date).toLocaleDateString()} — ${new Date(r.end_date).toLocaleDateString()}`;
              const cardBg = isDarkMode ? 'bg-gray-800/50' : 'bg-white';
              const cardBorder = isDarkMode ? 'border-gray-700' : 'border-slate-200';
              const nameColor = isDarkMode ? 'text-gray-100' : 'text-slate-800';
              const dateColor = isDarkMode ? 'text-gray-300' : 'text-slate-600';
              const labelColor = isDarkMode ? 'text-gray-400' : 'text-slate-500';
              const priceColor = isDarkMode ? 'text-gray-200' : 'text-slate-800';
              const refColor = isDarkMode ? 'text-gray-500' : 'text-slate-500';
              
              return (
                <div key={r.id} className={`border rounded-lg p-3 ${cardBg} ${cardBorder}`}>
                  <div className="flex items-center justify-between">
                    <div className={`font-medium ${nameColor}`}>{fullName || 'User'}</div>
                    <StatusPill status={r.rental_status} isDarkMode={isDarkMode} />
                  </div>
                  <div className={`mt-1 text-sm ${dateColor}`}>{dateRange}</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className={`text-sm ${labelColor}`}>Price per day</div>
                      <div className={`font-medium ${priceColor}`}>
                        {typeof r.price_per_day === 'number' ? `₱${r.price_per_day.toFixed(2)}` : '—'}
                      </div>
                    </div>
                    <div>
                      <div className={`text-sm ${labelColor}`}>Total price</div>
                      <div className={`font-medium ${priceColor}`}>
                        {typeof r.total_price === 'number' ? `₱${r.total_price.toFixed(2)}` : '—'}
                      </div>
                    </div>
                  </div>
                  <div className={`mt-2 text-xs ${refColor}`}>Ref: {r.id}</div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Calendar;