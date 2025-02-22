import React, { useState, Suspense, lazy } from "react";
import {
  Container,
  Typography,
  Grid,
  AppBar,
  Toolbar,
  Button,
  Snackbar,
  Box,
  Alert,
  TextField,
} from "@mui/material";
import { styled, ThemeProvider, createTheme } from "@mui/material/styles";
import { supabase } from "./supabaseClient";
import ChatMessage from "./ChatMessage";
import { useMessages, handleError } from "./utils";

const LoginForm = lazy(() => import("./LoginForm"));
const EntryList = lazy(() => import("./EntryList"));

const StyledContainer = styled(Container)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  minHeight: "100vh",
  padding: "20px",
  color: theme.palette.text.primary,
}));

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
}));

const userEmojis = {
  Admin: "👑",
  Scholli: "🚀",
  Jamaica05: "🎩",
};

const theme = createTheme({
  palette: {
    primary: { main: "#3b82f6" },
    secondary: { main: "#dc004e" },
    background: { default: "#e0e7ff", paper: "#ffffff" },
    text: { primary: "#333" },
  },
});

const CustomSnackbar = ({ open, message, onClose, severity = "success" }) => (
  <Snackbar open={open} autoHideDuration={4000} onClose={onClose}>
    <Alert onClose={onClose} severity={severity} sx={{ width: "100%" }}>
      {message}
    </Alert>
  </Snackbar>
);

const App = () => {
  const [loggedInUser, setLoggedInUser] = useState(() => localStorage.getItem("loggedInUser") || null);
  const [role, setRole] = useState(() => localStorage.getItem("role") || null);
  const [selectedUser, setSelectedUser] = useState("Scholli"); // Standardmäßig Scholli ausgewählt
  const [newMessage, setNewMessage] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const { messages } = useMessages(loggedInUser, selectedUser);

  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleLogin = (username, password) => {
    const users = {
      Admin: "Admino25!",
      Scholli: "Scholli25",
      Jamaica05: "Werwer55",
    };
    if (users[username] === password) {
      setLoggedInUser(username);
      setRole(username === "Admin" ? "Admin" : "Friend");
      localStorage.setItem("loggedInUser", username);
      localStorage.setItem("role", username === "Admin" ? "Admin" : "Friend");
      showSnackbar(`✅ Willkommen, ${username}!`);
    } else {
      showSnackbar("❌ Ungültige Zugangsdaten", "error");
    }
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setRole(null);
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("role");
    showSnackbar("🔓 Erfolgreich abgemeldet!");
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) {
      showSnackbar("❌ Nachricht darf nicht leer sein", "error");
      return;
    }
    try {
      const { error } = await supabase
        .from("messages")
        .insert([{ sender: loggedInUser, receiver: selectedUser, message: newMessage }]);
      if (error) throw error;
      setNewMessage("");
    } catch (error) {
      handleError(error, setSnackbarMessage, setSnackbarOpen);
    }
  };

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
              <Button
                onClick={handleLogout}
                color="inherit"
                sx={{ fontSize: { xs: "12px", sm: "14px" } }}
              >
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
              <Box
                sx={{
                  marginTop: 2,
                  marginBottom: 2,
                  border: "1px solid #ccc",
                  borderRadius: 2,
                  padding: 2,
                  backgroundColor: "background.paper",
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Chatverlauf mit {selectedUser}
                </Typography>
                {role === "Admin" && (
                  <Box sx={{ display: "flex", gap: 1, marginBottom: 2 }}>
                    <Button
                      variant={selectedUser === "Scholli" ? "contained" : "outlined"}
                      color="primary"
                      onClick={() => setSelectedUser("Scholli")}
                    >
                      Scholli {userEmojis["Scholli"]}
                    </Button>
                    <Button
                      variant={selectedUser === "Jamaica05" ? "contained" : "outlined"}
                      color="primary"
                      onClick={() => setSelectedUser("Jamaica05")}
                    >
                      Jamaica05 {userEmojis["Jamaica05"]}
                    </Button>
                  </Box>
                )}
                <Box sx={{ maxHeight: "50vh", overflowY: "auto", marginBottom: 2 }}>
                  {messages.map((msg) => (
                    <ChatMessage
                      key={msg.id}
                      message={msg.message}
                      sender={msg.sender}
                      timestamp={msg.created_at}
                      isOwnMessage={msg.sender === loggedInUser}
                    />
                  ))}
                </Box>
                <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1 }}>
                  <TextField
                    label="Neue Nachricht"
                    variant="outlined"
                    fullWidth
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={sendMessage}
                    sx={{ width: { xs: "100%", sm: "auto" } }}
                    disabled={!newMessage.trim()}
                  >
                    Senden
                  </Button>
                </Box>
              </Box>
              <EntryList role={role} loggedInUser={loggedInUser} />
            </>
          )}
        </Suspense>
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
