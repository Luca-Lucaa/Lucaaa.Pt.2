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
  TextField,
  Badge,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import BackupIcon from "@mui/icons-material/Backup";
import DescriptionIcon from "@mui/icons-material/Description"; // Icon für Anleitungen
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
  const [selectedUser, setSelectedUser] = useState(role === "Admin" ? "Scholli" : "Admin");
  const [newMessage, setNewMessage] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [entries, setEntries] = useState([]);
  const [file, setFile] = useState(null);
  const [backupAnchorEl, setBackupAnchorEl] = useState(null); // Für Backup-Menü
  const [guidesAnchorEl, setGuidesAnchorEl] = useState(null); // Für Anleitungen-Menü
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const { messages, unreadCount, markAsRead } = useMessages(loggedInUser, selectedUser);

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
      setSelectedUser(username === "Admin" ? "Scholli" : "Admin");
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
        .insert([{ sender: loggedInUser, receiver: selectedUser, message: newMessage, read: false }]);
      if (error) throw error;
      setNewMessage("");
    } catch (error) {
      handleError(error, setSnackbarMessage, setSnackbarOpen);
    }
  };

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase.from("entries").select("*");
      if (error) throw error;
      setEntries(data);
    } catch (error) {
      handleError(error, setSnackbarMessage, setSnackbarOpen);
    }
  };

  useEffect(() => {
    if (loggedInUser) {
      fetchEntries();
    }
  }, [loggedInUser]);

  const exportEntries = () => {
    const dataStr = JSON.stringify(entries, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "backup_entries.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showSnackbar("Backup erfolgreich erstellt!");
    setBackupAnchorEl(null);
  };

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const importBackup = async () => {
    if (!file) {
      showSnackbar("Bitte wählen Sie eine Datei aus.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        for (const entry of jsonData) {
          const { error } = await supabase.from("entries").insert([entry]);
          if (error) throw error;
        }
        setEntries((prev) => [...prev, ...jsonData]);
        showSnackbar("Backup erfolgreich importiert!");
        setFile(null);
        setImportDialogOpen(false);
      } catch (error) {
        handleError(error, setSnackbarMessage, setSnackbarOpen);
      }
    };
    reader.readAsText(file);
  };

  const handleBackupClick = (event) => {
    setBackupAnchorEl(event.currentTarget);
  };

  const handleBackupClose = () => {
    setBackupAnchorEl(null);
  };

  const handleImportOpen = () => {
    setImportDialogOpen(true);
    setBackupAnchorEl(null);
  };

  const handleGuidesClick = (event) => {
    setGuidesAnchorEl(event.currentTarget);
  };

  const handleGuidesClose = () => {
    setGuidesAnchorEl(null);
  };

  // Liste der verfügbaren Anleitungen (statisch definiert)
  const guides = [
    { name: "Anleitung PlockTV", path: "/guides/PlockTV.pdf" },
    { name: "Anleitung TiviMate", path: "/guides/guide2.pdf" },
  ];

  const handleGuideDownload = (path) => {
    window.open(path, "_blank"); // Öffnet die PDF in einem neuen Tab
    setGuidesAnchorEl(null);
  };

  useEffect(() => {
    if (selectedUser && messages.length > 0) {
      markAsRead();
    }
  }, [selectedUser, messages, markAsRead]);

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
            {role === "Admin" && (
              <>
                <Box sx={{ marginRight: 2 }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<BackupIcon />}
                    onClick={handleBackupClick}
                  >
                    Backup
                  </Button>
                  <Menu
                    anchorEl={backupAnchorEl}
                    open={Boolean(backupAnchorEl)}
                    onClose={handleBackupClose}
                  >
                    <MenuItem onClick={exportEntries}>Backup erstellen</MenuItem>
                    <MenuItem onClick={handleImportOpen}>Backup importieren</MenuItem>
                  </Menu>
                </Box>
                <Box sx={{ marginRight: 2 }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<DescriptionIcon />}
                    onClick={handleGuidesClick}
                  >
                    Anleitungen
                  </Button>
                  <Menu
                    anchorEl={guidesAnchorEl}
                    open={Boolean(guidesAnchorEl)}
                    onClose={handleGuidesClose}
                  >
                    {guides.map((guide) => (
                      <MenuItem key={guide.name} onClick={() => handleGuideDownload(guide.path)}>
                        {guide.name}
                      </MenuItem>
                    ))}
                  </Menu>
                </Box>
              </>
            )}
            {loggedInUser && (
              <Button
                onClick={handleLogout}
                color="inherit"
                sx={{ fontSize: { xs: "12px", sm: "16px" } }}
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
                {role === "Admin" ? (
                  <Box sx={{ display: "flex", gap: 1, marginBottom: 2 }}>
                    <Badge badgeContent={unreadCount["Scholli"] || 0} color="error">
                      <Button
                        variant={selectedUser === "Scholli" ? "contained" : "outlined"}
                        color="primary"
                        onClick={() => setSelectedUser("Scholli")}
                      >
                        Scholli {userEmojis["Scholli"]}
                      </Button>
                    </Badge>
                    <Badge badgeContent={unreadCount["Jamaica05"] || 0} color="error">
                      <Button
                        variant={selectedUser === "Jamaica05" ? "contained" : "outlined"}
                        color="primary"
                        onClick={() => setSelectedUser("Jamaica05")}
                      >
                        Jamaica05 {userEmojis["Jamaica05"]}
                      </Button>
                    </Badge>
                  </Box>
                ) : (
                  <Box sx={{ marginBottom: 2 }}>
                    <Badge badgeContent={unreadCount["Admin"] || 0} color="error">
                      <Button
                        variant={selectedUser === "Admin" ? "contained" : "outlined"}
                        color="primary"
                        onClick={() => setSelectedUser("Admin")}
                      >
                        Admin {userEmojis["Admin"]}
                      </Button>
                    </Badge>
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
              <EntryList role={role} loggedInUser={loggedInUser} entries={entries} setEntries={setEntries} />
            </>
          )}
        </Suspense>
        <CustomSnackbar
          open={snackbarOpen}
          message={snackbarMessage}
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
        />
        <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)}>
          <DialogTitle>Backup importieren</DialogTitle>
          <DialogContent>
            <input type="file" accept=".json" onChange={handleFileChange} />
            {file && (
              <Typography sx={{ mt: 2 }}>
                Ausgewählte Datei: {file.name}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setImportDialogOpen(false)} color="secondary">
              Abbrechen
            </Button>
            <Button onClick={importBackup} color="primary" disabled={!file}>
              Importieren
            </Button>
          </DialogActions>
        </Dialog>
      </StyledContainer>
    </ThemeProvider>
  );
};

export default App;
