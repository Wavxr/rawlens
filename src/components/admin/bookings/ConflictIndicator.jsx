import { AlertTriangle, Calendar, Users } from 'lucide-react';

const ConflictIndicator = ({ 
  conflicts, 
  isDarkMode = false, 
  className = '', 
  size = 'default' 
}) => {
  if (!conflicts || conflicts.length === 0) return null;

  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    default: 'text-sm px-3 py-2',
    large: 'text-base px-4 py-3'
  };

  const iconSizes = {
    small: 'w-3 h-3',
    default: 'w-4 h-4',
    large: 'w-5 h-5'
  };

  // Theme styles
  const getThemeStyles = () => {
    if (isDarkMode) {
      return {
        container: 'bg-red-900/20 border-red-700 text-red-200',
        icon: 'text-red-400',
        text: 'text-red-200',
        badge: 'bg-red-800 text-red-200'
      };
    } else {
      return {
        container: 'bg-red-50 border-red-200 text-red-800',
        icon: 'text-red-600',
        text: 'text-red-700',
        badge: 'bg-red-100 text-red-800'
      };
    }
  };

  const styles = getThemeStyles();

  const formatConflictSummary = () => {
    if (conflicts.length === 1) {
      const conflict = conflicts[0];
      const startDate = new Date(conflict.start_date).toLocaleDateString();
      const endDate = new Date(conflict.end_date).toLocaleDateString();
      
      return {
        title: 'Booking Conflict',
        description: `Conflicts with existing booking from ${startDate} to ${endDate}`,
        customer: conflict.customer_name || 
                 (conflict.users ? `${conflict.users.first_name} ${conflict.users.last_name}`.trim() : '') ||
                 'Unknown Customer'
      };
    } else {
      return {
        title: 'Multiple Conflicts',
        description: `Conflicts with ${conflicts.length} existing bookings`,
        customer: null
      };
    }
  };

  const conflictInfo = formatConflictSummary();

  return (
    <div className={`
      border rounded-lg flex items-start gap-2 
      ${styles.container} 
      ${sizeClasses[size]} 
      ${className}
    `}>
      <AlertTriangle className={`${iconSizes[size]} ${styles.icon} flex-shrink-0 mt-0.5`} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`font-medium ${styles.text}`}>
            {conflictInfo.title}
          </span>
          <span className={`
            inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
            ${styles.badge}
          `}>
            {conflicts.length}
          </span>
        </div>
        
        <p className={`text-xs ${styles.text} opacity-90`}>
          {conflictInfo.description}
        </p>
        
        {conflictInfo.customer && (
          <div className={`flex items-center gap-1 mt-1 text-xs ${styles.text} opacity-75`}>
            <Users className="w-3 h-3" />
            <span>{conflictInfo.customer}</span>
          </div>
        )}
        
        {conflicts.length > 1 && (
          <details className="mt-2">
            <summary className={`cursor-pointer text-xs ${styles.text} opacity-90 hover:opacity-100`}>
              View all conflicts
            </summary>
            <div className="mt-2 space-y-1">
              {conflicts.map((conflict, index) => {
                const startDate = new Date(conflict.start_date).toLocaleDateString();
                const endDate = new Date(conflict.end_date).toLocaleDateString();
                const customer = conflict.customer_name || 
                               (conflict.users ? `${conflict.users.first_name} ${conflict.users.last_name}`.trim() : '') ||
                               'Unknown Customer';
                
                return (
                  <div key={conflict.id || index} className={`text-xs ${styles.text} opacity-75 pl-2 border-l-2 border-current`}>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{startDate} - {endDate}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Users className="w-3 h-3" />
                      <span>{customer}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

export default ConflictIndicator;
