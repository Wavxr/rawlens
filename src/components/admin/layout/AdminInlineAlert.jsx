import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const VARIANTS = {
  success: {
    container: 'bg-green-900/40 border border-green-700 text-green-100',
    icon: CheckCircle2,
    iconColor: 'text-green-300',
  },
  error: {
    container: 'bg-red-900/40 border border-red-700 text-red-100',
    icon: AlertCircle,
    iconColor: 'text-red-300',
  },
  info: {
    container: 'bg-blue-900/40 border border-blue-700 text-blue-100',
    icon: Info,
    iconColor: 'text-blue-300',
  },
  warning: {
    container: 'bg-amber-900/40 border border-amber-700 text-amber-100',
    icon: AlertCircle,
    iconColor: 'text-amber-300',
  },
};

const AdminInlineAlert = ({ type = 'info', message, onDismiss }) => {
  if (!message) return null;

  const variant = VARIANTS[type] ?? VARIANTS.info;
  const Icon = variant.icon;

  return (
    <div className={`flex items-start gap-3 rounded-xl px-4 py-3 ${variant.container}`}>
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${variant.iconColor}`} />
      <p className="flex-1 text-sm leading-6">{message}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="text-sm text-inherit opacity-80 transition-colors hover:opacity-100"
          aria-label="Dismiss message"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
};

export default AdminInlineAlert;
