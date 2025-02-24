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
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import BackupIcon from "@mui/icons-material/Backup";
import DescriptionIcon from "@mui/icons-material/Description"; // Icon für Anleitungen
import MenuIcon from "@mui/icons-material/Menu"; // Icon für mobiles Menü
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"; // Icon für Accordion
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
  const [menuAnchorEl, setMenuAnchorEl] = useState(null); // Einheitliches Menü für mobile Geräte
  const [guidesAnchorEl, setGuidesAnchorEl] = useState(null); // Für Anleitungen-Menü (Desktop und Mobile)
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false); // Zustand für den Accordion des Chats

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
    setMenuAnchorEl(null);
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

  const handleMenuClick = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setGuidesAnchorEl(null); // Schließe auch das Anleitungen-Menü, falls offen
  };

  const handleImportOpen = () => {
    setImportDialogOpen(true);
    setMenuAnchorEl(null);
  };

  const handleGuidesClick = (event) => {
    setGuidesAnchorEl(event.currentTarget || menuAnchorEl); // Unterstützt sowohl Desktop als auch Mobile
  };

  const handleGuidesClose = () => {
    setGuidesAnchorEl(null);
  };

  // Liste der verfügbaren Anleitungen (statisch definiert)
  const guides = [
    { name: "Anleitung PlockTV", path: "/guides/PlockTV.pdf" },
    { name: "Anleitung 2", path: "/guides/guide2.pdf" },
  ];

  const handleGuideDownload = (path) => {
    window.open(path, "_blank"); // Öffnet die PDF in einem neuen Tab
    setGuidesAnchorEl(null);
    setMenuAnchorEl(null); // Schließe beide Menüs
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // Bildschirmgröße < 600px

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
            <Typography variant="h6">Luca-TV</Typography>
            {loggedInUser && (
              <Typography
                variant="h6"
                sx={{ marginLeft: "auto", marginRight: 2, fontSize: { xs: "14px", sm: "16px" } }}
              >
                {userEmojis[loggedInUser]} {loggedInUser}
              </Typography>
            )}
            {loggedInUser && (
              <Box sx={{ marginRight: 2 }}>
                {isMobile ? (
                  // Mobiles Menü (Hamburger-Icon mit Dropdown)
                  <IconButton
                    variant="contained"
                    color="secondary"
                    onClick={handleMenuClick}
                    sx={{ p: 0.5 }}
                  >
                    <MenuIcon />
                  </IconButton>
                ) : (
                  // Desktop-Ansicht: Separate Buttons
                  <>
                    {role === "Admin" && (
                      <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<BackupIcon />}
                        onClick={handleMenuClick}
                        sx={{ mr: 1 }}
                      >
                        Backup
                      </Button>
                    )}
                    <Button
                      variant="contained"
                      color="secondary"
                      startIcon={<DescriptionIcon />}
                      onClick={handleGuidesClick}
                    >
                      Anleitungen
                    </Button>
                  </>
                )}
                {isMobile ? (
                  <Menu
                    anchorEl={menuAnchorEl}
                    open={Boolean(menuAnchorEl)}
                    onClose={handleMenuClose}
                  >
                    {role === "Admin" && (
                      <>
                        <MenuItem onClick={exportEntries}>Backup erstellen</MenuItem>
                        <MenuItem onClick={handleImportOpen}>Backup importieren</MenuItem>
                      </>
                    )}
                    <MenuItem onClick={() => {
                      handleGuidesClick({ currentTarget: menuAnchorEl });
                      setMenuAnchorEl(null);
                    }}>
                      Anleitungen
                    </MenuItem>
                  </Menu>
                ) : (
                  <>
                    <Menu
                      anchorEl={menuAnchorEl}
                      open={Boolean(menuAnchorEl)}
                      onClose={handleMenuClose}
                    >
                      {role === "Admin" && (
                        <>
                          <MenuItem onClick={exportEntries}>Backup erstellen</MenuItem>
                          <MenuItem onClick={handleImportOpen}>Backup importieren</MenuItem>
                        </>
                      )}
                    </Menu>
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
                  </>
                )}
              </Box>
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
              <Accordion expanded={chatExpanded} onChange={() => setChatExpanded(!chatExpanded)} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Chatverlauf mit {selectedUser}</Typography>
                  {role === "Admin" && ( // Nur für Admin sichtbar
                    <Box sx={{ display: "flex", gap: 1, ml: 2 }}>
                      <Badge badgeContent={unreadCount["Scholli"] || 0} color="error">
                        <Button
                          variant={selectedUser === "Scholli" ? "contained" : "outlined"}
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation(); // Verhindert, dass der Accordion toggled wird
                            setSelectedUser("Scholli");
                          }}
                          sx={{ minWidth: 0, p: 0.5 }}
                        >
                          Scholli {userEmojis["Scholli"]}
                        </Button>
                      </Badge>
                      <Badge badgeContent={unreadCount["Jamaica05"] || 0} color="error">
                        <Button
                          variant={selectedUser === "Jamaica05" ? "contained" : "outlined"}
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation(); // Verhindert, dass der Accordion toggled wird
                            setSelectedUser("Jamaica05");
                          }}
                          sx={{ minWidth: 0, p: 0.5 }}
                        >
                          Jamaica05 {userEmojis["Jamaica05"]}
                        </Button>
                      </Badge>
                    </Box>
                  )}
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ maxHeight: "50vh", overflowY: "auto", mb: 2 }}>
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
                </AccordionDetails>
              </Accordion>
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
