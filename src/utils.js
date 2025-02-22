// utils.js
import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

// Zentrale Fehlerbehandlung
export const handleError = (error, setSnackbarMessage, setSnackbarOpen) => {
  console.error("Fehler:", error);
  if (setSnackbarMessage && setSnackbarOpen) {
    setSnackbarMessage(error.message || "Ein Fehler ist aufgetreten.");
    setSnackbarOpen(true);
  }
};

// Hook für Nachrichtenabruf
export const useMessages = (loggedInUser, selectedUser, withRealtime = true) => {
  const [messages, setMessages] = useState([]);

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
      setMessages(data);
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
        (payload) => setMessages((prev) => [...prev, payload.new])
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

  return { messages, fetchMessages };
};

// Debounce-Hook
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// Datum formatieren
export const formatDate = (date) => {
  if (!date || isNaN(new Date(date).getTime())) return "NaN.NaN.NaN";
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}.${d.getFullYear()}`;
};

// Benutzername generieren
export const generateUsername = (owner) => {
  const randomNum = Math.floor(100 + Math.random() * 900);
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
};
