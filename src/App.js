import React, { useState, useEffect, Suspense, lazy, useCallback } from "react";
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
  Badge,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import BackupIcon from "@mui/icons-material/Backup";
import DescriptionIcon from "@mui/icons-material/Description";
import MenuIcon from "@mui/icons-material/Menu";
import ChatIcon from "@mui/icons-material/Chat";
import { styled, ThemeProvider, createTheme } from "@mui/material/styles";
import { supabase } from "./supabaseClient";
import { useMessages, handleError } from "./utils";
import { USER_CREDENTIALS, USER_EMOJIS, THEME_CONFIG_LIGHT, GUIDES } from "./config";
import { useSnackbar } from "./useSnackbar";
import CompactChatList from "./CompactChatList";

const LoginForm = lazy(() => import("./LoginForm"));
const EntryList = lazy(() => import("./EntryList"));
const AdminDashboard = lazy(() => import("./AdminDashboard"));

const StyledContainer = styled(Container)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  minHeight: "100vh",
  padding: "20px",
  color: theme.palette.text.primary,
}));

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
}));

const CustomSnackbar = ({ open, message, onClose, severity }) => (
  <Snackbar open={open} autoHideDuration={4000} onClose={onClose}>
    <Alert onClose={onClose} severity={severity} sx={{ width: "100%" }}>
      {message}
    </Alert>
  </Snackbar>
);

const App = () => {
  const [loggedInUser, setLoggedInUser] = useState(() => localStorage.getItem("loggedInUser") || null);
  const [role, setRole] = useState(() => localStorage.getItem("role") || null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [file, setFile] = useState(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [guidesAnchorEl, setGuidesAnchorEl] = useState(null);
  const [chatAnchorEl, setChatAnchorEl] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openManualDialog, setOpenManualDialog] = useState(false);

  const { messages, unreadCount, markAsRead } = useMessages(loggedInUser, selectedUser);
  const { snackbarOpen, snackbarMessage, snackbarSeverity, showSnackbar, closeSnackbar } = useSnackbar();

  const theme = createTheme(THEME_CONFIG_LIGHT);

  const handleLogin = useCallback((username, password) => {
    if (USER_CREDENTIALS[username] && USER_CREDENTIALS[username] === password) {
      setLoggedInUser(username);
      setRole(username === "Admin" ? "Admin" : "Friend");
      setSelectedUser(username === "Admin" ? "Scholli" : "Admin"); // Default chat partner
      localStorage.setItem("loggedInUser", username);
      localStorage.setItem("role", username === "Admin" ? "Admin" : "Friend");
      showSnackbar(`✅ Willkommen, ${username}!`);
    } else {
      showSnackbar("❌ Ungültige Zugangsdaten", "error");
    }
  }, [showSnackbar]);

  const handleLogout = useCallback(() => {
    setLoggedInUser(null);
    setRole(null);
    setSelectedUser(null);
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("role");
    showSnackbar("🔓 Erfolgreich abgemeldet!");
  }, [showSnackbar]);

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from("entries").select("*");
      if (error) throw error;
      setEntries(data);
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    if (loggedInUser) {
      fetchEntries();
    }
  }, [loggedInUser, fetchEntries]);

  const exportEntries = useCallback(() => {
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
  }, [entries, showSnackbar]);

  const handleFileChange = useCallback((event) => {
    setFile(event.target.files[0]);
  }, []);

  const importBackup = useCallback(async () => {
    if (!file) {
      showSnackbar("Bitte wählen Sie eine Datei aus.", "error");
      return;
    }
    setIsLoading(true);
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
        handleError(error, showSnackbar);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  }, [file, showSnackbar]);

  const handleMenuClick = useCallback((event) => {
    setMenuAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleGuidesClick = useCallback((event) => {
    setGuidesAnchorEl(event.currentTarget);
  }, []);

  const handleGuidesClose = () => {
    setGuidesAnchorEl(null);
  };

  const handleChatClick = useCallback((event) => {
    setChatAnchorEl(event.currentTarget);
    markAsRead(selectedUser);
  }, [markAsRead, selectedUser]);

  const handleChatClose = () => {
    setChatAnchorEl(null);
  };

  const openGuide = (path) => {
    window.open(path, "_blank");
    setGuidesAnchorEl(null);
  };

  const themeLocal = useTheme();
  const isMobile = useMediaQuery(themeLocal.breakpoints.down("sm"));

  return (
    <ThemeProvider theme={theme}>
      <StyledContainer maxWidth="lg">
        <StyledAppBar position="static">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1, fontSize: { xs: "16px", sm: "20px" } }}>
              Abonnenten Dashboard
            </Typography>
            {loggedInUser && role === "Admin" && (
              <IconButton
                color="inherit"
                onClick={handleMenuClick}
                sx={{ mr: 1 }}
                aria-label="Backup-Menü öffnen"
              >
                <BackupIcon />
              </IconButton>
            )}
            <Menu
              anchorEl={menuAnchorEl}
              open={Boolean(menuAnchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={exportEntries}>Backup erstellen</MenuItem>
              <MenuItem onClick={() => setImportDialogOpen(true)}>Backup importieren</MenuItem>
            </Menu>
            {loggedInUser && (
              <IconButton
                color="inherit"
                onClick={handleGuidesClick}
                sx={{ mr: 1 }}
                aria-label="Anleitungen-Menü öffnen"
              >
                <DescriptionIcon />
              </IconButton>
            )}
            <Menu
              anchorEl={guidesAnchorEl}
              open={Boolean(guidesAnchorEl)}
              onClose={handleGuidesClose}
            >
              {GUIDES.map((guide) => (
                <MenuItem key={guide.name} onClick={() => openGuide(guide.path)}>
                  {guide.name}
                </MenuItem>
              ))}
            </Menu>
            {loggedInUser && (
              <Box sx={{ display: "flex", alignItems: "center", mr: 1 }}>
                <Badge badgeContent={Object.values(unreadCount).reduce((a, b) => a + b, 0)} color="error">
                  <IconButton
                    color="inherit"
                    onClick={handleChatClick}
                    aria-label="Chat-Menü öffnen"
                  >
                    <ChatIcon />
                  </IconButton>
                </Badge>
                <Menu
                  anchorEl={chatAnchorEl}
                  open={Boolean(chatAnchorEl)}
                  onClose={handleChatClose}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                  sx={{ maxWidth: "90vw", maxHeight: "80vh" }}
                >
                  <Box sx={{ p: 2, minWidth: { xs: 250, sm: 400 } }}>
                    {role === "Admin" ? (
                      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
                        <Badge badgeContent={unreadCount["Scholli"] || 0} color="error">
                          <Button
                            variant={selectedUser === "Scholli" ? "contained" : "outlined"}
                            color="primary"
                            onClick={() => setSelectedUser("Scholli")}
                            sx={{ minWidth: 0, p: 0.5, borderRadius: 2 }}
                            aria-label="Chat mit Scholli öffnen"
                          >
                            Scholli {USER_EMOJIS["Scholli"] || ""}
                          </Button>
                        </Badge>
                        <Badge badgeContent={unreadCount["Jamaica05"] || 0} color="error">
                          <Button
                            variant={selectedUser === "Jamaica05" ? "contained" : "outlined"}
                            color="primary"
                            onClick={() => setSelectedUser("Jamaica05")}
                            sx={{ minWidth: 0, p: 0.5, borderRadius: 2 }}
                            aria-label="Chat mit Jamaica05 öffnen"
                          >
                            Jamaica05 {USER_EMOJIS["Jamaica05"] || ""}
                          </Button>
                        </Badge>
                      </Box>
                    ) : (
                      <Box sx={{ mb: 2 }}>
                        <Button
                          variant={selectedUser === "Admin" ? "contained" : "outlined"}
                          color="primary"
                          onClick={() => setSelectedUser("Admin")}
                          sx={{ minWidth: 0, p: 0.5, borderRadius: 2 }}
                          aria-label="Chat mit Admin öffnen"
                        >
                          Admin {USER_EMOJIS["Admin"] || ""}
                        </Button>
                      </Box>
                    )}
                    {selectedUser ? (
                      <CompactChatList
                        messages={messages}
                        loggedInUser={loggedInUser}
                        selectedUser={selectedUser}
                      />
                    ) : (
                      <Typography>Bitte wählen Sie einen Benutzer aus.</Typography>
                    )}
                  </Box>
                </Menu>
              </Box>
            )}
            {loggedInUser && (
              <Button
                onClick={handleLogout}
                color="inherit"
                sx={{ fontSize: { xs: "12px", sm: "16px" }, borderRadius: 2 }}
                aria-label="Abmelden"
              >
                🔓 Logout
              </Button>
            )}
          </Toolbar>
        </StyledAppBar>
        <Suspense fallback={<Typography>🔄 Lade...</Typography>}>
          {isLoading && <Typography sx={{ mt: 2 }>🔄 Lade Daten...</Typography>}
          {!loggedInUser ? (
            <Grid container justifyContent="center" sx={{ mt: 4 }}>
              <Grid item xs={12} sm={6} md={4}>
                <LoginForm handleLogin={handleLogin} />
              </Grid>
            </Grid>
          ) : (
            <Box sx={{ mt: 2 }}>
              {role === "Admin" ? (
                <>
                  <AdminDashboard
                    entries={entries}
                    loggedInUser={loggedInUser}
                    setOpenCreateDialog={setOpenCreateDialog}
                    setOpenManualDialog={setOpenManualDialog}
                    setEntries={setEntries}
                  />
                  <EntryList
                    role={role}
                    loggedInUser={loggedInUser}
                    entries={entries}
                    setEntries={setEntries}
                    openCreateDialog={openCreateDialog}
                    setOpenCreateDialog={setOpenCreateDialog}
                    openManualDialog={openManualDialog}
                    setOpenManualDialog={setOpenManualDialog}
                  />
                </>
              ) : (
                <EntryList
                  role={role}
                  loggedInUser={loggedInUser}
                  entries={entries}
                  setEntries={setEntries}
                  openCreateDialog={openCreateDialog}
                  setOpenCreateDialog={setOpenCreateDialog}
                  openManualDialog={openManualDialog}
                  setOpenManualDialog={setOpenManualDialog}
                />
              )}
            </Box>
          )}
        </Suspense>
        <CustomSnackbar
          open={snackbarOpen}
          message={snackbarMessage}
          onClose={closeSnackbar}
          severity={snackbarSeverity}
        />
        <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)}>
          <DialogTitle>Backup importieren</DialogTitle>
          <DialogContent>
            <input type="file" accept=".json" onChange={handleFileChange} disabled={isLoading} />
            {file && (
              <Typography sx={{ mt: 2 }}>
                Ausgewählte Datei: {file.name}
              </Typography>
            )}
            {isLoading && <Typography>🔄 Importiere...</Typography>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setImportDialogOpen(false)} color="secondary" disabled={isLoading}>
              Abbrechen
            </Button>
            <Button onClick={importBackup} color="primary" disabled={isLoading || !file}>
              {isLoading ? "Importiere..." : "Importieren"}
            </Button>
          </DialogActions>
        </Dialog>
      </StyledContainer>
    </ThemeProvider>
  );
};

export default App;
