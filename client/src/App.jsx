import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { routes } from "./routes/routes.jsx";
import "react-toastify/dist/ReactToastify.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {routes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
      </Routes>
      <ToastContainer position="top-right" autoClose={2500} newestOnTop pauseOnFocusLoss={false} />
    </BrowserRouter>
  );
}
