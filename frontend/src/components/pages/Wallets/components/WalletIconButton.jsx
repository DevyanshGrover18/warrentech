import { Wallet } from 'lucide-react';

export default function WalletIconButton({ onClick, title = 'View wallet', className = '' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-blue-50 transition-colors ${className}`}
    >
      <Wallet size={16} className="text-blue-600" />
    </button>
  );
}
