import { BrowserRouter, Routes, Route } from "react-router";
import Workspace from "./Workspace";
import SignIn from "./components/SignIn";
import SignUp from "./components/SignUp";
import RequireAuth from "./middleware/RequireAuth";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route
            path="/:threadId?"
            element={
              <RequireAuth>
                <Workspace />
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
