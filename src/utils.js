import { supabase } from "./supabaseClient";
import React from "react";

export const formatDate = (dateString) => {
  if (!dateString) return "Kein Datum";
  const date = new Date(dateString);
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const generateUsername = (baseName) => {
  const randomNum = Math.floor(Math.random() * 1000);
  return `${baseName.toLowerCase().replace(/[^a-z]/g, "")}${randomNum}`;
};

export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const handleError = (error, showSnackbar) => {
  console.error("Fehler:", error.message);
  showSnackbar(`❌ Fehler: ${error.message}`, "error");
};

export const updateExpiredEntries = async (entries, setEntries, showSnackbar) => {
  const currentDate = new Date();
  const expired = entries.filter((entry) => {
    if (!entry.validUntil) return false;
    const validUntil = new Date(entry.validUntil);
    return validUntil < currentDate && entry.status !== "Abgelaufen";
  });

  if (expired.length > 0) {
    try {
      const updates = expired.map((entry) => ({
        id: entry.id,
        status: "Abgelaufen",
      }));
      const { error } = await supabase
        .from("entries")
        .update(updates, { returning: "representation" })
        .in("id", expired.map((e) => e.id));
      if (error) throw error;

      setEntries((prev) =>
        prev.map((e) =>
          expired.find((exp) => exp.id === e.id)
            ? { ...e, status: "Abgelaufen" }
            : e
        )
      );
      showSnackbar(`${expired.length} Einträge wurden als abgelaufen markiert!`);
    } catch (error) {
      handleError(error, showSnackbar);
    }
  }
};

export const useMessages = (loggedInUser, selectedUser) => {
  const [messages, setMessages] = React.useState([]);
  const [unreadCount, setUnreadCount] = React.useState({});

  React.useEffect(() => {
    if (!loggedInUser || !selectedUser) {
      setMessages([]);
      setUnreadCount({});
      return;
    }

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .or(`sender.eq.${loggedInUser},receiver.eq.${loggedInUser}`)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setMessages(data.filter((msg) => (msg.sender === selectedUser && msg.receiver === loggedInUser) || (msg.sender === loggedInUser && msg.receiver === selectedUser)) || []);
      } catch (error) {
        handleError(error, (msg) => console.log(msg));
        setMessages([]);
      }
    };

    const subscribe = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          fetchMessages();
        }
      )
      .subscribe();

    fetchMessages();

    return () => {
      supabase.removeChannel(subscribe);
    };
  }, [loggedInUser, selectedUser]);

  React.useEffect(() => {
    if (!loggedInUser || !selectedUser) {
      setUnreadCount({});
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("receiver", { count: "exact" })
          .eq("receiver", loggedInUser)
          .eq("read", false);
        if (error) throw error;
        setUnreadCount((prev) => ({
          ...prev,
          [selectedUser]: data.length || 0,
        }));
      } catch (error) {
        handleError(error, (msg) => console.log(msg));
        setUnreadCount((prev) => ({ ...prev, [selectedUser]: 0 }));
      }
    };

    fetchUnreadCount();
  }, [loggedInUser, selectedUser, messages]);

  const markAsRead = async () => {
    if (!loggedInUser || !selectedUser) return;
    try {
      const { error } = await supabase
        .from("messages")
        .update({ read: true })
        .eq("receiver", loggedInUser)
        .eq("sender", selectedUser)
        .eq("read", false);
      if (error) throw error;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.receiver === loggedInUser && msg.sender === selectedUser && !msg.read
            ? { ...msg, read: true }
            : msg
        )
      );
    } catch (error) {
      handleError(error, (msg) => console.log(msg));
    }
  };

  return { messages, unreadCount, markAsRead };
};
