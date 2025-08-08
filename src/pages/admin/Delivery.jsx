import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Filter,
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  ArrowLeftRight,
  Home,
} from 'lucide-react';
import * as rentalService from '../../services/rentalService';
import * as deliveryService from '../../services/deliveryService';
import useAuthStore from '../../stores/useAuthStore';

const SHIPPING_STATUSES = [
  'all',
  'ready_to_ship',
  'in_transit_to_user',
  'delivered',
  'return_scheduled',
  'in_transit_to_owner',
  'returned',
  'none', // represent null
];

function getShippingBadgeClasses(status) {
  switch (status) {
    case 'ready_to_ship':
      return 'bg-amber-500/20 text-amber-400';
    case 'in_transit_to_user':
      return 'bg-blue-500/20 text-blue-400';
    case 'delivered':
      return 'bg-green-500/20 text-green-400';
    case 'return_scheduled':
      return 'bg-purple-500/20 text-purple-400';
    case 'in_transit_to_owner':
      return 'bg-indigo-500/20 text-indigo-400';
    case 'returned':
      return 'bg-teal-500/20 text-teal-400';
    default:
      return 'bg-gray-600/20 text-gray-300';
  }
}

function prettyShippingStatus(status) {
  if (!status) return 'None';
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function Delivery() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [allRentals, setAllRentals] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [actionLoading, setActionLoading] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShippingFilter, setSelectedShippingFilter] = useState('all');

  useEffect(() => {
    fetchRentals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRentals = async () => {
    setLoading(true);
    try {
      const result = await rentalService.getRentalsByStatus();
      if (result.data) {
        setAllRentals(result.data);
        setRentals(result.data);
      }
    } catch (err) {
      console.error('Error fetching rentals for delivery page:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = allRentals;

    // filter by shipping status
    if (selectedShippingFilter !== 'all') {
      if (selectedShippingFilter === 'none') {
        filtered = filtered.filter((r) => !r.shipping_status);
      } else {
        filtered = filtered.filter((r) => r.shipping_status === selectedShippingFilter);
      }
    }

    // search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((r) => {
        const fullName = `${r.users?.first_name || ''} ${r.users?.last_name || ''}`.toLowerCase();
        return (
          fullName.includes(q) ||
          r.users?.email?.toLowerCase().includes(q) ||
          r.cameras?.name?.toLowerCase().includes(q)
        );
      });
    }

    setRentals(filtered);
  }, [allRentals, selectedShippingFilter, searchTerm]);

  const shippingCounts = useMemo(() => {
    const counts = {
      all: allRentals.length,
      none: 0,
      ready_to_ship: 0,
      in_transit_to_user: 0,
      delivered: 0,
      return_scheduled: 0,
      in_transit_to_owner: 0,
      returned: 0,
    };
    for (const r of allRentals) {
      const key = r.shipping_status || 'none';
      if (counts[key] !== undefined) counts[key] += 1;
    }
    return counts;
  }, [allRentals]);

  const setBusy = (id, action) =>
    setActionLoading((prev) => ({ ...prev, [id]: action }));
  const clearBusy = (id) =>
    setActionLoading((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

  const handleReadyToShip = async (rentalId) => {
    setBusy(rentalId, 'ready');
    try {
      await deliveryService.adminReadyCamera(rentalId, user?.id);
      await fetchRentals();
    } catch (err) {
      console.error('Failed to mark ready_to_ship:', err);
    } finally {
      clearBusy(rentalId);
    }
  };

  const handleTransitToUser = async (rentalId) => {
    setBusy(rentalId, 'outbound');
    try {
      await deliveryService.adminTransitToUser(rentalId, user?.id);
      await fetchRentals();
    } catch (err) {
      console.error('Failed to mark in_transit_to_user:', err);
    } finally {
      clearBusy(rentalId);
    }
  };

  const handleConfirmReturned = async (rentalId) => {
    setBusy(rentalId, 'returned');
    try {
      await deliveryService.adminConfirmReturned(rentalId, user?.id);
      await fetchRentals();
    } catch (err) {
      console.error('Failed to confirm returned:', err);
    } finally {
      clearBusy(rentalId);
    }
  };

  const ShippingCard = ({ rental }) => {
    const shippingStatus = rental.shipping_status || 'none';
    const rentalStatus = rental.rental_status;
    const canReadyToShip = rentalStatus === 'confirmed' && (shippingStatus === 'none' || shippingStatus === 'ready_to_ship');
    const canTransitToUser = rentalStatus === 'confirmed' && shippingStatus === 'ready_to_ship';
    const canConfirmReturned = shippingStatus === 'in_transit_to_owner';

    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors">
        <div className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-white font-semibold text-lg">{rental.cameras?.name || 'Camera'}</h3>
              <p className="text-gray-400 text-sm">{rental.users?.first_name} {rental.users?.last_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getShippingBadgeClasses(shippingStatus)}`}>
                {prettyShippingStatus(rental.shipping_status)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-gray-400" />
              <div>
                <p className="text-white text-sm">₱{rental.total_price?.toFixed(2) || '0.00'}</p>
                <p className="text-gray-400 text-xs">Total Price</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-400" />
              <div>
                <p className="text-white text-sm">{formatDate(rental.start_date)} → {formatDate(rental.end_date)}</p>
                <p className="text-gray-400 text-xs">Rental Period</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {canReadyToShip && (
              <button
                onClick={() => handleReadyToShip(rental.id)}
                disabled={actionLoading[rental.id] === 'ready'}
                className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
              >
                {actionLoading[rental.id] === 'ready' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package size={14} />}
                Ready To Ship
              </button>
            )}

            {canTransitToUser && (
              <button
                onClick={() => handleTransitToUser(rental.id)}
                disabled={actionLoading[rental.id] === 'outbound'}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
              >
                {actionLoading[rental.id] === 'outbound' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck size={14} />}
                In Transit To User
              </button>
            )}

            {canConfirmReturned && (
              <button
                onClick={() => handleConfirmReturned(rental.id)}
                disabled={actionLoading[rental.id] === 'returned'}
                className="flex items-center gap-1 bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
              >
                {actionLoading[rental.id] === 'returned' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Home size={14} />}
                Confirm Returned
              </button>
            )}

            {shippingStatus === 'in_transit_to_user' && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <ArrowLeftRight size={14} /> Awaiting user's delivery confirmation
              </span>
            )}

            {shippingStatus === 'delivered' && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <CheckCircle size={14} /> Rental active; awaiting end date
              </span>
            )}

            {shippingStatus === 'return_scheduled' && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock size={14} /> Return scheduled; awaiting user to send back
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Delivery Management</h1>
          <p className="text-gray-400">Track and control shipping workflow for rentals</p>
        </div>

        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by customer name, email, or camera..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              className="bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-8 py-2 text-white focus:outline-none focus:border-blue-500 appearance-none"
              value={selectedShippingFilter}
              onChange={(e) => setSelectedShippingFilter(e.target.value)}
            >
              {SHIPPING_STATUSES.map((key) => (
                <option key={key} value={key}>
                  {key === 'all' ? 'All Logistics' : key === 'none' ? 'No Shipping Status' : prettyShippingStatus(key)}
                  {typeof shippingCounts[key] === 'number' ? ` (${shippingCounts[key]})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-6 overflow-x-auto">
          <div className="flex space-x-2 min-w-max">
            {SHIPPING_STATUSES.map((key) => (
              <button
                key={key}
                onClick={() => setSelectedShippingFilter(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedShippingFilter === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {key === 'all' ? 'All Logistics' : key === 'none' ? 'No Shipping Status' : prettyShippingStatus(key)}{' '}
                <span className="bg-gray-700 rounded-full px-2 py-0.5 ml-1">{shippingCounts[key] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        {rentals.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto text-gray-500 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No rentals found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'No rentals match your search criteria.' : 'There are no rentals with the selected logistics status.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rentals.map((r) => (
              <ShippingCard key={r.id} rental={r} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}

