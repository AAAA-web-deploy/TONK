import Dashboard from "./dashboard-client";

export const metadata = {
  title: "TONK visitor dashboard",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return <Dashboard />;
}
