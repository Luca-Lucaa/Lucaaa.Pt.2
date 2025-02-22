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
  Alert,
} from "@mui/material";
import { styled, ThemeProvider, createTheme } from "@mui/material/styles";
import { supabase } from "./supabaseClient";
import ChatMessage from "./ChatMessage";

const LoginForm = lazy(() => import("./LoginForm"));
const EntryList = lazy(() => import("./EntryList"));

const StyledContainer = styled(Container)(({ theme }) => ({
  backgroundColor: "#f0f9ff",
  minHeight: "100vh",
  padding: "15px",
  [theme.breakpoints.down("sm")]: { padding: "10px" },
}));

const StyledAppBar = styled(AppBar)({
  backgroundColor: "#60a5fa",
  borderRadius: "10px",
});

const theme = createTheme({
  palette: {
    primary: { main: "#60a5fa" },
    secondary: { main: "#f472b6" },
    background: { default: "#f0f9ff" },
  },
});

const CustomSnackbar = ({ open, message, onClose }) => (
  <Snackbar open={open} autoHideDuration={3000} onClose={onClose}>
    <Alert severity="info">{message}</Alert>
  </Snackbar>
);

const App = () => {
  const [loggedInUser, setLoggedInUser] = useState(localStorage.getItem("loggedInUser") || null);
  const [role, setRole] = useState(localStorage.getItem("role") || null);
  const [entries, setEntries] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  useEffect(() => {
    if (loggedInUser) {
      const subscription = supabase
        .channel("messages_pt2")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages_pt2" }, (payload) =>
          setMessages((prev) => [...prev, payload.new])
        )
        .subscribe();
      return () => supabase.removeChannel(subscription);
    }
  }, [loggedInUser]);

  const handleLogin = (username, password) => {
    const users = { Admin: "Admino25!", Scholli: "Scholli25", Jamaica05: "Werwer55" };
    if (users[username] === password) {
      setLoggedInUser(username);
      setRole(username === "Admin" ? "Admin" : "Friend");
      localStorage.setItem("loggedInUser", username);
      localStorage.setItem("role", username === "Admin" ? "Admin" : "Friend");
      setSnackbarMessage(`🌟 Willkommen, ${username}!`);
      setSnackbarOpen(true);
    } else {
      setSnackbarMessage("❌ Falsche Daten!");
      setSnackbarOpen(true);
    }
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setRole(null);
    localStorage.clear();
    setSnackbarMessage("👋 Bis bald!");
    setSnackbarOpen(true);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const { error } = await supabase
      .from("messages_pt2")
      .insert([{ sender: loggedInUser, receiver: "Admin", message: newMessage }]);
    if (!error) setNewMessage("");
  };

  return (
    <ThemeProvider theme={theme}>
      <StyledContainer>
        <StyledAppBar position="static">
          <Toolbar>
            <Typography variant="h6">📺 Luca-TV-PT.2</Typography>
            {loggedInUser && (
              <Button onClick={handleLogout} color="inherit" sx={{ ml: "auto" }}>
                👋 Logout
              </Button>
            )}
          </Toolbar>
        </StyledAppBar>
        <Suspense fallback={<Typography>⏳ Lade...</Typography>}>
          {!loggedInUser ? (
            <Grid container justifyContent="center" sx={{ mt: 4 }}>
              <Grid item xs={12} sm={6}>
                <LoginForm handleLogin={handleLogin} />
              </Grid>
            </Grid>
          ) : (
            <>
              <Box sx={{ mt: 2, p: 2, backgroundColor: "#fff", borderRadius: "10px" }}>
                <Typography variant="h6">💬 Chat</Typography>
                <Box sx={{ maxHeight: "200px", overflowY: "auto", mb: 2 }}>
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
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField
                    label="✉️ Nachricht"
                    variant="outlined"
                    fullWidth
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  />
                  <Button variant="contained" onClick={sendMessage}>
                    ➡️
                  </Button>
                </Box>
              </Box>
              <EntryList entries={entries} setEntries={setEntries} role={role} loggedInUser={loggedInUser} />
            </>
          )}
        </Suspense>
        <CustomSnackbar
          open={snackbarOpen}
          message={snackbarMessage}
          onClose={() => setSnackbarOpen(false)}
        />
      </StyledContainer>
    </ThemeProvider>
  );
};

export default App;
