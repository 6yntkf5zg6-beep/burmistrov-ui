import { Navigate, Route, Routes } from "react-router-dom";
import { AuthorPage } from "./pages/AuthorPage";
import { HomePage } from "./pages/HomePage";
import { RegisterPage } from "./pages/RegisterPage";
import { AppLayout } from "./pages/app/AppLayout";
import { DashboardPage } from "./pages/app/DashboardPage";
import { ClientWorkoutPage } from "./pages/app/client/ClientWorkoutPage";
import { TrainerClientDetail } from "./pages/app/trainer/TrainerClientDetail";
import { TrainerProgramDetail } from "./pages/app/trainer/TrainerProgramDetail";
import { TrainerWorkoutDetail } from "./pages/app/trainer/TrainerWorkoutDetail";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { ScrollToHash } from "./routes/ScrollToHash";

function App() {
  return (
    <>
      <ScrollToHash />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/author" element={<AuthorPage />} />
        <Route path="/register/:token" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/workouts/:workoutId" element={<ClientWorkoutPage />} />
            <Route path="/dashboard/trainer/clients/:clientId" element={<TrainerClientDetail />} />
            <Route path="/dashboard/trainer/programs/:programId" element={<TrainerProgramDetail />} />
            <Route path="/dashboard/trainer/workouts/:workoutId" element={<TrainerWorkoutDetail />} />
          </Route>
        </Route>

        {/* Страницы «Специалисты» и «Отзывы» убраны — старые ссылки ведём на главную. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
