import { createBrowserRouter } from "react-router-dom";
import LanguageLayout from "./layouts/LanguageLayout";
import RequireAuth from "./auth/RequireAuth";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";

export const router = createBrowserRouter([
  {
    path: "/:lang",
    element: <LanguageLayout />, // PUBLIC LAYER
    children: [
      // ⭐ PUBLIC INDEX ROUTE (fixes your loop)
      {
        index: true,
        element: <LandingPage />,
      },
      // PUBLIC ROUTES
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      // PROTECTED ROUTES
      {
        element: <RequireAuth />,
        children: [
          { path: "dashboard", element: <DashboardPage /> },
        ],
      },
    ],
  },
]);
