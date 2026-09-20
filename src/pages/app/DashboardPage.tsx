import { useAuth } from "../../auth/AuthContext";
import { ClientHome } from "./client/ClientHome";
import { TrainerHome } from "./trainer/TrainerHome";

export function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;
  return user.role === "TRAINER" ? <TrainerHome /> : <ClientHome />;
}
