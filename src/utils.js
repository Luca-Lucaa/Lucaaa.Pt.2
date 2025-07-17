import { supabase } from "./supabaseClient";

// Bestehende Funktionen
export const formatDate = (date) => {
  if (!date) return "Kein Datum";
  try {
    return new Date(date).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch (error) {
    console.error("Fehler beim Formatieren des Datums:", error);
    return "Ungültiges Datum";
  }
};

export const generateUsername = (loggedInUser) => {
  if (!loggedInUser) return `user-${Math.random().toString(36).slice(-6)}`;
  return `${loggedInUser}-${Math.random().toString(36).slice(-6)}`;
};

export const handleError = (error, showSnackbar) => {
  console.error("Error:", error);
  if (showSnackbar) {
    showSnackbar(`Fehler: ${error.message || "Unbekannter Fehler"}`, "error");
  }
};

// Funktion zum Aktualisieren abgelaufener Einträge
export const updateExpiredEntries = async (entries, setEntries, showSnackbar) => {
  const currentDate = new Date();
  const updates = entries
    .filter((entry) => {
      if (!entry.validUntil) return false;
      try {
        const validUntil = new Date(entry.validUntil);
        return validUntil < currentDate && (entry.status !== "Inaktiv" || entry.paymentStatus !== "Nicht gezahlt");
      } catch (error) {
        console.error(`Ungültiges Datum in Eintrag ${entry.id}:`, error);
        return false;
      }
    })
    .map((entry) => ({
      id: entry.id,
      status: "Inaktiv",
      paymentStatus: "Nicht gezahlt",
    }));

  if (updates.length === 0) return;

  try {
    const { error } = await supabase
      .from("entries")
      .upsert(updates, { onConflict: "id", update: ["status", "paymentStatus"] });
    if (error) throw error;
    setEntries((prev) =>
      prev.map((entry) =>
        updates.some((u) => u.id === entry.id)
          ? { ...entry, status: "Inaktiv", paymentStatus: "Nicht gezahlt" }
          : entry
      )
    );
    if (showSnackbar) {
      showSnackbar(`Abgelaufene Einträge (${updates.length}) wurden aktualisiert.`, "info");
    }
  } catch (error) {
    handleError(error, showSnackbar);
  }
};
