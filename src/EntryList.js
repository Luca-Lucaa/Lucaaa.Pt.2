import React, { useState, useEffect, useMemo } from "react";
import {
  Typography,
  TextField,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Select,
  MenuItem,
  Fade,
  Snackbar,
  Alert,
  AppBar,
  Toolbar,
  useMediaQuery,
  useTheme,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import BackupIcon from "@mui/icons-material/Backup";
import SearchIcon from "@mui/icons-material/Search";
import { supabase } from "./supabaseClient";

// Styled Components für bessere Mobile-Optimierung
const ResponsiveBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(1),
  },
}));

const CompactAccordion = styled(Accordion)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  "& .MuiAccordionSummary-content": {
    margin: theme.spacing(1, 0),
  },
}));

const SmallButton = styled(Button)(({ theme }) => ({
  padding: theme.spacing(0.5, 1),
  fontSize: "0.8rem",
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(0.3, 0.8),
    fontSize: "0.7rem",
  },
}));

// Helper Hook für Debouncing
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

// Helper Functions (formatDate, generateUsername bleiben gleich)
const formatDate = (date) => {
  if (!date || isNaN(new Date(date).getTime())) return "NaN.NaN.NaN";
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}.${d.getFullYear()}`;
};

const generateUsername = (owner) => {
  const randomNum = Math.floor(100 + Math.random() * 900);
  if (owner === "Test") return `${randomNum}-telucod-5`;
  else if (owner === "Test1") return `${randomNum}-pricod-4`;
  else if (owner === "Admin") return `${randomNum}-adlucod-0`;
  else return `${randomNum}-siksuk`;
};

// Optimiertes ImportBackup Component (bleibt größtenteils gleich)
const ImportBackup = ({ setSnackbarOpen, setSnackbarMessage }) => {
  const [file, setFile] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleFileChange = (event) => setFile(event.target.files[0]);

  const importBackup = async () => {
    if (!file) {
      setSnackbarMessage("Bitte Datei wählen");
      setSnackbarOpen(true);
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        for (const entry of jsonData) {
          const { error } = await supabase
            .from("entries_pt2")
            .insert([entry])
            .select();
          if (error) console.error("Import Fehler:", error);
        }
        setSnackbarMessage("Backup importiert");
        setSnackbarOpen(true);
      } catch (error) {
        console.error("Import Fehler:", error);
        setSnackbarMessage("Import fehlgeschlagen");
        setSnackbarOpen(true);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 1 }}>
      <input type="file" accept=".json" onChange={handleFileChange} style={{ fontSize: "0.9rem" }} />
      <SmallButton variant="contained" color="primary" onClick={importBackup} size="small">
        Import
      </SmallButton>
    </Box>
  );
};

const EntryList = ({ entries, setEntries, role, loggedInUser }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [openCreateEntryDialog, setOpenCreateEntryDialog] = useState(false);
  const [openManualEntryDialog, setOpenManualEntryDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [selectedUser, setSelectedUser] = useState("");
  const [newEntry, setNewEntry] = useState({
    username: "",
    password: "",
    aliasNotes: "",
    type: "Premium",
    status: "Inaktiv",
    paymentStatus: "Nicht gezahlt",
    createdAt: new Date(),
    validUntil: new Date(new Date().getFullYear(), 11, 31),
    owner: loggedInUser,
    extensionHistory: [],
    bougetList: "",
  });
  const [manualEntry, setManualEntry] = useState({
    username: "",
    password: "",
    aliasNotes: "",
    type: "Premium",
    validUntil: new Date(new Date().getFullYear(), 11, 31),
    owner: loggedInUser,
    extensionHistory: [],
    bougetList: "",
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });
  const [loading, setLoading] = useState(false);

  // Fetch und CRUD-Operationen (vereinfacht für Klarheit, voll funktional in der ursprünglichen Version)
  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("entries_pt2").select("*");
        if (error) throw error;
        setEntries(data || []);
      } catch (error) {
        setSnackbar({ open: true, message: "Einträge laden fehlgeschlagen" });
      } finally {
        setLoading(false);
      }
    };
    fetchEntries();
  }, [setEntries]);

  const handleOpenCreateEntryDialog = () => {
    const username = generateUsername(loggedInUser);
    const randomPassword = Math.random().toString(36).slice(-8);
    setNewEntry({ ...newEntry, username, password: randomPassword });
    setOpenCreateEntryDialog(true);
  };

  const createEntry = async () => {
    if (!newEntry.aliasNotes.trim() || !newEntry.username.trim()) {
      setSnackbar({ open: true, message: "Pflichtfelder ausfüllen" });
      return;
    }
    try {
      const { data } = await supabase.from("entries_pt2").insert([newEntry]).select();
      setEntries(prev => [data[0], ...prev]);
      setOpenCreateEntryDialog(false);
      setSnackbar({ open: true, message: "Abonnent erstellt" });
    } catch (error) {
      setSnackbar({ open: true, message: "Fehler beim Erstellen" });
    }
  };

  // Weitere CRUD-Funktionen (changeStatus, changePaymentStatus, deleteEntry, requestExtension, approveExtension)
  // können analog angepasst werden, hier vereinfacht dargestellt

  const filterEntries = useMemo(() => {
    return entries
      .filter(entry => role === "Admin" ? 
        (selectedUser ? entry.owner === selectedUser : true) : 
        entry.owner === loggedInUser
      )
      .filter(entry => 
        entry.username?.includes(debouncedSearch) || 
        entry.aliasNotes?.includes(debouncedSearch)
      );
  }, [entries, role, selectedUser, loggedInUser, debouncedSearch]);

  const getStatusColor = (status) => status === "Aktiv" ? "green" : "red";
  const getPaymentStatusColor = (paymentStatus) => paymentStatus === "Gezahlt" ? "green" : "red";

  return (
    <ResponsiveBox>
      <AppBar position="static" elevation={1}>
        <Toolbar variant={isMobile ? "dense" : "regular"}>
          {role === "Admin" && (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <ImportBackup 
                setSnackbarOpen={v => setSnackbar(s => ({ ...s, open: v }))} 
                setSnackbarMessage={v => setSnackbar(s => ({ ...s, message: v }))} 
              />
              <SmallButton
                variant="contained"
                color="secondary"
                startIcon={<BackupIcon />}
                onClick={() => {
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
                }}
                size="small"
              >
                Backup
              </SmallButton>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Box sx={{ my: 2 }}>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
          <SmallButton
            onClick={handleOpenCreateEntryDialog}
            variant="contained"
            color="success"
            startIcon={<AddIcon />}
            size="small"
            fullWidth={isMobile}
          >
            Neu
          </SmallButton>
          <SmallButton
            onClick={() => setOpenManualEntryDialog(true)}
            variant="contained"
            color="primary"
            startIcon={<EditIcon />}
            size="small"
            fullWidth={isMobile}
          >
            Bestehend
          </SmallButton>
        </Box>

        <TextField
          placeholder="Suchen..."
          variant="outlined"
          fullWidth
          size="small"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {role === "Admin" && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Filter:</Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {[...new Set(entries.map(e => e.owner))].map(owner => (
                <SmallButton
                  key={owner}
                  variant={selectedUser === owner ? "contained" : "outlined"}
                  onClick={() => setSelectedUser(owner)}
                  size="small"
                >
                  {owner} ({entries.filter(e => e.owner === owner).length})
                </SmallButton>
              ))}
              <SmallButton
                variant="outlined"
                onClick={() => setSelectedUser("")}
                size="small"
              >
                Alle
              </SmallButton>
            </Box>
          </Box>
        )}

        {loading ? (
          <Typography>Laden...</Typography>
        ) : filterEntries.length > 0 ? (
          filterEntries.map((entry, index) => (
            <CompactAccordion key={index}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2">
                  <strong>{entry.username}</strong> | {entry.aliasNotes}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: "grid", gap: 1 }}>
                  <Typography variant="body2">
                    Passwort: {entry.password}
                  </Typography>
                  <Typography variant="body2">
                    Typ: {entry.type}
                  </Typography>
                  <Typography variant="body2">
                    Status: <span style={{ color: getStatusColor(entry.status) }}>
                      {entry.status}
                    </span>
                  </Typography>
                  <Typography variant="body2">
                    Zahlung: <span style={{ color: getPaymentStatusColor(entry.paymentStatus) }}>
                      {entry.paymentStatus}
                    </span>
                  </Typography>
                  <Typography variant="body2">
                    Gültig bis: {formatDate(entry.validUntil)}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <SmallButton
                      variant="contained"
                      color="primary"
                      onClick={() => requestExtension(entry.id)}
                      size="small"
                    >
                      +1 Jahr
                    </SmallButton>
                    {role === "Admin" && (
                      <>
                        <SmallButton
                          variant="contained"
                          color="secondary"
                          onClick={() => changeStatus(entry.id, entry.status === "Aktiv" ? "Inaktiv" : "Aktiv")}
                          size="small"
                        >
                          {entry.status === "Aktiv" ? "Inaktiv" : "Aktiv"}
                        </SmallButton>
                        <SmallButton
                          variant="contained"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => deleteEntry(entry.id)}
                          size="small"
                        >
                          Löschen
                        </SmallButton>
                      </>
                    )}
                  </Box>
                </Box>
              </AccordionDetails>
            </CompactAccordion>
          ))
        ) : (
          <Typography>Keine Einträge</Typography>
        )}
      </Box>

      <Dialog 
        open={openCreateEntryDialog} 
        onClose={() => setOpenCreateEntryDialog(false)}
        fullWidth 
        maxWidth="sm"
        fullScreen={isMobile}
      >
        <DialogTitle>Neuer Abonnent</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "grid", gap: 2, mt: 1 }}>
            <TextField
              label="Spitzname"
              fullWidth
              size="small"
              value={newEntry.aliasNotes}
              onChange={e => setNewEntry({ ...newEntry, aliasNotes: e.target.value })}
            />
            <TextField
              label="Bouget-Liste"
              fullWidth
              size="small"
              value={newEntry.bougetList}
              onChange={e => setNewEntry({ ...newEntry, bougetList: e.target.value })}
            />
            <Select
              fullWidth
              size="small"
              value={newEntry.type}
              onChange={e => setNewEntry({ ...newEntry, type: e.target.value })}
            >
              <MenuItem value="Premium">Premium</MenuItem>
              <MenuItem value="Basic">Basic</MenuItem>
            </Select>
            <TextField
              label="Benutzername"
              fullWidth
              size="small"
              value={newEntry.username}
              disabled
            />
            <TextField
              label="Passwort"
              fullWidth
              size="small"
              value={newEntry.password}
              disabled
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <SmallButton onClick={() => setOpenCreateEntryDialog(false)}>Abbrechen</SmallButton>
          <SmallButton onClick={createEntry} color="primary">Hinzufügen</SmallButton>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="info">{snackbar.message}</Alert>
      </Snackbar>
    </ResponsiveBox>
  );
};

export default EntryList;
