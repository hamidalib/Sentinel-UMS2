import React, { useCallback, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { Button } from "./components/ui/button.jsx"

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const handleLoginSuccess = useCallback((newToken) => {
    setToken(newToken);
  }, []);

  return (
    <div className="h-screen flex items-center justify-center bg-gray-900 text-white text-3xl font-bold">
      <div className="space-y-4 text-center">
        <p>Tailwind + Shadcn are working 🎉</p>
        <Button className="cursor-pointer bg-red-500">Test Button</Button>
      </div>
    </div>
  );
  

  // return (
  //   <Router>
  //     <Routes>
  //       <Route
  //         path="/"
  //         element={!token ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/dashboard" replace />}
  //       />
  //       <Route
  //         path="/dashboard"
  //         element={token ? <Dashboard /> : <Navigate to="/" replace />}
  //       />
  //     </Routes>
  //   </Router>
  // );
}

export default App;