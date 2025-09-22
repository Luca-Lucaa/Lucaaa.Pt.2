import { useState, useCallback, useEffect } from "react";

export const useSnackbar = () => {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const showSnackbar = useCallback((message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  const closeSnackbar = useCallback(() => {
    setSnackbarOpen(false);
    setSnackbarMessage("");
    setSnackbarSeverity("success");
  }, []);

  // Automatisches Schließen des Snackbars nach 4000ms
  useEffect(() => {
    if (snackbarOpen) {
      const timer = setTimeout(() => {
        closeSnackbar();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [snackbarOpen, closeSnackbar]);

  return {
    snackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    showSnackbar,
    closeSnackbar,
  };
};
