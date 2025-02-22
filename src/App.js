import React, { useState, useEffect, Suspense, lazy } from "react";
import {
  Container,
  Typography,
  Grid,
  AppBar,
  Toolbar,
  Button,
  Snackbar,
  Box,
  Badge,
} from "@mui/material";
import { styled, ThemeProvider, createTheme } from "@mui/material/styles";
import { supabase } from "./supabaseClient";
import ChatIcon from "@mui/icons-material/Chat"; // Importiere ChatIcon für Buttons
import ChatMessage from "./ChatMessage"; // Importiere die ChatMessage-Komponente

// Dynamischer Import der Komponenten
const LoginForm = lazy(() => import("./LoginForm"));
const EntryList = lazy(() => import("./EntryList"));

// Styling
const StyledContainer = styled(Container)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  minHeight: "100vh",
  padding: "20px",
  color: theme.palette.text.primary,
}));

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
}));

// Benutzer-Emojis
const userEmojis = {
  Admin: "👑",
  Scholli: "🚀",
  Jamaica05: "🎩",
};

// Erstellen des Themes
const theme = createTheme({
  palette: {
    primary: {
      main: "#3b82f6", // Ihre Hauptfarbe
    },
    secondary: {
      main: "#dc004e", // Ihre Sekundärfarbe
    },
    background: {
      default: "#e0e7ff", // Hintergrundfarbe der Anwendung
      paper: "#ffffff", // Hintergrundfarbe für Papierelemente
    },
    text: {
      primary: "#333", // Textfarbe
    },
  },
});

// Wiederverwendbare Snackbar-Komponente
const CustomSnackbar = ({ open, message, onClose, severity = "success" }) => (
  <Snackbar open={open} autoHideDuration={4000} onClose={onClose}>
    <Alert onClose={onClose} severity={severity} sx={{ width: "100%" }}>
      {message}
    </Alert>
  </Snackbar>
);

const App = () => {
  // Zustand für Benutzer & Rollen
  const [loggedInUser, setLoggedInUser] = useState(
    () => localStorage.getItem("loggedInUser") || null
  );
  const [role, setRole] = useState(() => localStorage.getItem("role") || null);
  const [entries, setEntries] = useState([]); // Einträge werden jetzt von Supabase abgerufen
  const [chatUser, setChatUser] = useState(null); // Aktuell ausgewählter Chat-Partner
  const [chatMessages, setChatMessages] = useState([]); // Nachrichten für den aktuellen Chat
  const [newMessage, setNewMessage] = useState(""); // Eingabe für neue Nachricht
  const [unreadMessages, setUnreadMessages] = useState({}); // Ungelesene Nachrichten pro Benutzer

  // Zustand für Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  // Funktion zum Anzeigen von Snackbar-Nachrichten
  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // Nachrichten von Supabase abrufen
  const fetchMessages = useCallback(async (user) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("messages_pt2")
        .select("*")
        .or(`sender.eq.${user},receiver.eq.${user}`)
        .or(`sender.eq.${loggedInUser},receiver.eq.${user}`)
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error("Fehler beim Abrufen der Nachrichten: " + error.message);
      }
      setChatMessages(data);
    } catch (error) {
      console.error(error);
      showSnackbar(error.message, "error");
    }
  }, [loggedInUser]);

  // Ungelesene Nachrichten abrufen
  const fetchUnreadMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("messages_pt2")
        .select("sender, receiver")
        .eq("receiver", "Admin")
        .neq("sender", "Admin");
      if (error) throw error;
      const unreadCount = data.reduce((acc, msg) => {
        acc[msg.sender] = (acc[msg.sender] || 0) + 1;
        return acc;
      }, {});
      setUnreadMessages(unreadCount);
    } catch (error) {
      showSnackbar("Fehler beim Laden ungelesener Nachrichten.", "error");
    }
  }, []);

  // Realtime-Updates für Nachrichten
  useEffect(() => {
    if (loggedInUser) {
      fetchUnreadMessages();

      const subscription = supabase
        .channel("messages_pt2")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages_pt2" },
          (payload) => {
            const newMessage = payload.new;
            if (newMessage.receiver === "Admin" && newMessage.sender !== "Admin") {
              setChatMessages((prev) =>
                chatUser === newMessage.sender ? [...prev, newMessage] : prev
              );
              if (chatUser !== newMessage.sender) {
                setUnreadMessages((prev) => ({
                  ...prev,
                  [newMessage.sender]: (prev[newMessage.sender] || 0) + 1,
                }));
              }
            }
          }
        )
        .subscribe();

      // Initiale Nachrichten laden, wenn ein Chat-Partner ausgewählt ist
      if (chatUser) {
        fetchMessages(chatUser);
      }

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [loggedInUser, chatUser, fetchMessages, fetchUnreadMessages]);

  // Login-Logik
  const handleLogin = (username, password) => {
    const users = {
      Admin: "Admino25!",
      Scholli: "Scholli25",
      Jamaica05: "Werwer55",
    };

    if (users[username] === password) {
      setLoggedInUser(username);
      setRole(username === "Admin" ? "Admin" : "Friend");

      // Zustand im localStorage speichern
      localStorage.setItem("loggedInUser", username);
      localStorage.setItem("role", username === "Admin" ? "Admin" : "Friend");

      // Snackbar anzeigen
      showSnackbar(`✅ Willkommen, ${username}!`);
    } else {
      // Snackbar für falsches Passwort anzeigen
      showSnackbar("❌ Ungültige Zugangsdaten", "error");
    }
  };

  // Logout-Logik
  const handleLogout = () => {
    setLoggedInUser(null);
    setRole(null);
    setChatUser(null); // Chat-Partner zurücksetzen
    setChatMessages([]); // Nachrichten zurücksetzen
    setUnreadMessages({}); // Ungelesene Nachrichten zurücksetzen

    // Zustand aus localStorage entfernen
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("role");

    // Snackbar anzeigen
    showSnackbar("🔓 Erfolgreich abgemeldet!");
  };

  // Funktion zum Senden einer Nachricht
  const sendMessage = async () => {
    if (!newMessage.trim() || !chatUser) {
      showSnackbar("❌ Nachricht oder Chat-Partner fehlt", "error");
      return;
    }

    try {
      const { error } = await supabase.from("messages_pt2").insert([
        {
          sender: loggedInUser,
          receiver: chatUser,
          message: newMessage,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        throw new Error("Fehler beim Senden der Nachricht: " + error.message);
      }
      setNewMessage(""); // Eingabefeld leeren
    } catch (error) {
      console.error(error);
      showSnackbar(error.message, "error");
    }
  };

  const handleSelectChatUser = (user) => {
    setChatUser(user);
    fetchMessages(user);
    setUnreadMessages((prev) => ({ ...prev, [user]: 0 })); // Ungelesene Nachrichten zurücksetzen
  };

  const uniqueOwners = [...new Set(entries.map((entry) => entry.owner))];

  return (
    <ThemeProvider theme={theme}>
      <StyledContainer>
        <StyledAppBar position="static">
          <Toolbar>
            <Typography variant="h6">Eintragsverwaltung</Typography>
            {loggedInUser && (
              <Typography
                variant="h6"
                sx={{ marginLeft: "auto", marginRight: 2, fontSize: { xs: "14px", sm: "16px" } }}
              >
                {userEmojis[loggedInUser]} {loggedInUser}
              </Typography>
            )}
            {loggedInUser && (
              <Button onClick={handleLogout} color="inherit" sx={{ fontSize: { xs: "12px", sm: "14px" } }}>
                🔓 Logout
              </Button>
            )}
          </Toolbar>
        </StyledAppBar>
        <Suspense fallback={<div>🔄 Lade...</div>}>
          {!loggedInUser ? (
            <Grid container justifyContent="center" style={{ marginTop: "20px" }}>
              <Grid item xs={12} sm={6} md={4}>
                <LoginForm handleLogin={handleLogin} />
              </Grid>
            </Grid>
          ) : (
            <>
              {/* Chat nach oben versetzen */}
              <Box
                sx={{
                  marginTop: 2,
                  marginBottom: 2,
                  border: "1px solid #ccc",
                  borderRadius: 2,
                  padding: 2,
                  backgroundColor: "#fff",
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Chatverlauf mit {chatUser || "Kein Partner"}
                </Typography>

                {/* Auswahl des Chat-Partners als Buttons (nur für Admin) */}
                {role === "Admin" && (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                    {uniqueOwners
                      .filter((owner) => owner !== "Admin")
                      .map((owner) => (
                        <Badge
                          key={owner}
                          badgeContent={unreadMessages[owner] || 0}
                          color="error"
                          invisible={!unreadMessages[owner]}
                        >
                          <Button
                            variant={chatUser === owner ? "contained" : "outlined"}
                            onClick={() => handleSelectChatUser(owner)}
                            size="small"
                            startIcon={<ChatIcon />}
                          >
                            {owner}
                          </Button>
                        </Badge>
                      ))}
                    {uniqueOwners.filter((owner) => owner !== "Admin").length === 0 && (
                      <Typography variant="body2">Keine Ersteller verfügbar.</Typography>
                    )}
                  </Box>
                )}

                {/* Scrollbarer Bereich für den Chatverlauf */}
                <Box sx={{ maxHeight: { xs: "200px", sm: "300px" }, overflowY: "auto", marginBottom: 2 }}>
                  {chatMessages.map((msg) => (
                    <ChatMessage
                      key={msg.id}
                      message={msg.message}
                      sender={msg.sender}
                      timestamp={msg.created_at}
                      isOwnMessage={msg.sender === loggedInUser}
                    />
                  ))}
                </Box>

                {/* Eingabefeld für neue Nachrichten */}
                {chatUser && (
                  <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1, alignItems: "center" }}>
                    <TextField
                      label="Neue Nachricht"
                      variant="outlined"
                      fullWidth
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          sendMessage();
                        }
                      }}
                      size="small"
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={sendMessage}
                      sx={{ width: { xs: "100%", sm: "auto" } }}
                    >
                      Senden
                    </Button>
                  </Box>
                )}
              </Box>

              {/* EntryList-Komponente */}
              <EntryList
                entries={entries}
                setEntries={setEntries}
                role={role}
                loggedInUser={loggedInUser}
                tableName="entries_pt2"
              />
            </>
          )}
        </Suspense>
        {/* Snackbar für Feedback */}
        <CustomSnackbar
          open={snackbarOpen}
          message={snackbarMessage}
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
        />
      </StyledContainer>
    </ThemeProvider>
  );
};

export default App;
