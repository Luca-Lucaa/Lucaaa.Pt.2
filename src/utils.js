import { supabase } from "./supabaseClient";

// Bestehende Funktionen (angenommen)
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const generateUsername = (loggedInUser) => {
  return `${loggedInUser}-${Math.random().toString(36).slice(-6)}`;
};

export const handleError = (error, showSnackbar) => {
  console.error("Error:", error);
  if (showSnackbar) {
    showSnackbar(`Fehler: ${error.message || "Unbekannter Fehler"}`, "error");
  }
};

// Neue Funktion: Aktualisiert Status und Zahlungsstatus für abgelaufene Einträge
export const updateExpiredEntries = async (entries, setEntries, showSnackbar) => {
  const currentDate = new Date();
  const updates = entries
    .filter((entry) => {
      const validUntil = new Date(entry.validUntil);
      return validUntil < currentDate && (entry.status !== "Inaktiv" || entry.paymentStatus !== "Nicht gezahlt");
    })
    .map((entry) => ({
      id: entry.id,
      status: "Inaktiv",
      paymentStatus: "Nicht gezahlt",
    }));

  if (updates.length === 0) return;

  try {
    for (const update of updates) {
      const { error } = await supabase
        .from("entries")
        .update({ status: update.status, paymentStatus: update.paymentStatus })
        .eq("id", update.id);
      if (error) throw error;
    }
    setEntries((prev) =>
      prev.map((entry) =>
        updates.some((u) => u.id === entry.id)
          ? { ...entry, status: "Inaktiv", paymentStatus: "Nicht gezahlt" }
          : entry
      )
    );
    if (showSnackbar) {
      showSnackbar("Abgelaufene Einträge wurden aktualisiert.", "info");
    }
  } catch (error) {
    handleError(error, showSnackbar);
  }
};
