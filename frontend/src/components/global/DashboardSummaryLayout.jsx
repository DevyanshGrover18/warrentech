import { Link } from "react-router-dom";

export function DashboardGreetingCard({ title, name, message }) {
  return (
    <div className="h-full rounded-xl border border-gray-100 bg-gray-50 p-5 sm:p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <h2 className="mt-2 text-2xl font-semibold text-gray-900">
        {name || "Welcome"}
      </h2>
      <p className="mt-3 text-sm leading-6 text-gray-600">{message}</p>
    </div>
  );
}

export function DashboardStatCard({ card, loading }) {
  return (
    <Link to={card.path}>
      <div
        className="h-full rounded-xl shadow-card p-4 sm:p-5 text-white transition-transform hover:scale-102"
        style={{ background: card.bg }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="bg-white p-2 rounded-md inline-flex items-center justify-center mb-3 shadow-sm">
              <span style={{ color: card.bg }}>{card.icon}</span>
            </div>
            <h3 className="text-sm font-semibold mb-1 text-white/90">
              {card.title}
            </h3>
            {loading ? (
              <div className="animate-pulse bg-white/20 h-8 w-16 rounded-md" />
            ) : (
              <p className="text-2xl sm:text-2xl font-bold">{card.count}</p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function DashboardSummaryLayout({
  greetingTitle = "Good to see you",
  greetingName,
  greetingMessage,
  cards,
  loading,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,40%)_minmax(0,60%)] gap-4">
      <DashboardGreetingCard
        title={greetingTitle}
        name={greetingName}
        message={greetingMessage}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((card, index) => (
          <DashboardStatCard card={card} loading={loading} key={index} />
        ))}
      </div>
    </div>
  );
}
