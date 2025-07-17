import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

// Formatiert ein Datum im deutschen Format (DD.MM.YYYY)
export const formatDate = (date) => {
  if (!date || isNaN(new Date(date).getTime())) return "NaN.NaN.NaN";
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}.${d.getFullYear()}`;
};

// Generiert einen eindeutigen Benutzernamen basierend auf dem Owner
export const generateUsername = (owner) => {
  const randomNum = Math.floor(100 + Math.random() * 900);
  try {
    switch (owner) {
      case "Scholli":
        return `${randomNum}-telucod-5`;
      case "Jamaica05":
        return `${randomNum}-pricod-4`;
      case "Admin":
        return `${randomNum}-adlucod-0`;
      default:
        return `${randomNum}-siksuk`;
    }
  } catch (error) {
    console.error("Fehler bei generateUsername:", error);
    return `${randomNum}-default`;
  }
};

// Fehlerbehandlung mit Snackbar-Unterstützung
export const handleError = (error, showSnackbar) => {
  console.error("Fehler:", error);
  if (showSnackbar) {
    const message = error.message || "Ein Fehler ist aufgetreten.";
    showSnackbar(message, "error");
  }
};

// Aktualisiert Status und Zahlungsstatus für abgelaufene Einträge
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

// Hook für Nachrichtenverwaltung mit Echtzeit-Updates
export const useMessages = (loggedInUser, selectedUser, withRealtime = true) => {
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState({});

  const fetchMessages = async () => {
    if (!loggedInUser || !selectedUser) return;
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender.eq.${loggedInUser},receiver.eq.${selectedUser}),and(sender.eq.${selectedUser},receiver.eq.${loggedInUser})`
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      setMessages(data || []);

      // Zähle ungelesene Nachrichten vom Gesprächspartner
      const unread = data
        ? data.filter((msg) => msg.sender === selectedUser && !msg.read).length
        : 0;
      setUnreadCount((prev) => ({ ...prev, [selectedUser]: unread }));
    } catch (error) {
      handleError(error);
    }
  };

  useEffect(() => {
    fetchMessages();
    if (!withRealtime || !loggedInUser) return;

    const subscription = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMessage = payload.new;
          setMessages((prev) => [...prev, newMessage]);
          if (
            newMessage.sender === selectedUser &&
            newMessage.receiver === loggedInUser
          ) {
            setUnreadCount((prev) => ({
              ...prev,
              [selectedUser]: (prev[selectedUser] || 0) + 1,
            }));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) =>
          setMessages((prev) =>
            prev.map((msg) => (msg.id === payload.new.id ? payload.new : msg))
          )
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        (payload) =>
          setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id))
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, [loggedInUser, selectedUser]);

  const markAsRead = async () => {
    try {
      const { error } = await supabase
        .from("messages")
        .update({ read: true })
        .eq("receiver", loggedInUser)
        .eq("sender", selectedUser)
        .eq("read", false);
      if (error) throw error;
      setUnreadCount((prev) => ({ ...prev, [selectedUser]: 0 }));
      setMessages((prev) =>
        prev.map((msg) =>
          msg.sender === selectedUser && msg.receiver === loggedInUser && !msg.read
            ? { ...msg, read: true }
            : msg
        )
      );
    } catch (error) {
      handleError(error);
    }
  };

  return { messages, unreadCount, fetchMessages, markAsRead };
};

// Debounce-Hook für Eingabeverzögerung
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};
