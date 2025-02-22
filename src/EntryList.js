import React, { useState, useEffect, useMemo } from "react";
import {
  Typography,
  TextField,
  Button,
  Divider,
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
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import BackupIcon from "@mui/icons-material/Backup";
import { supabase } from "./supabaseClient";
import { styled } from "@mui/system";

const StyledButton = styled(Button)({
  borderRadius: "20px",
  padding: "8px 16px",
  margin: "5px",
});

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
  if (owner === "Test1") return `${randomNum}-pricod-4`;
  if (owner === "Admin") return `${randomNum}-adlucod-0`;
  return `${randomNum}-siksuk`;
};

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const ImportBackup = ({ setSnackbarOpen, setSnackbarMessage }) => {
  const [file, setFile] = useState(null);

  const handleFileChange = (event) => setFile(event.target.files[0]);

  const importBackup = async () => {
    if (!file) {
      setSnackbarMessage("📤 Bitte wähle eine Datei aus!");
      setSnackbarOpen(true);
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        const { error } = await supabase.from("entries_pt2").insert(jsonData);
        if (error) throw error;
        setSnackbarMessage("✅ Backup erfolgreich importiert!");
        setSnackbarOpen(true);
      } catch (error) {
        setSnackbarMessage("❌ Fehler beim Importieren!");
        setSnackbarOpen(true);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1 }}>
      <input type="file" accept=".json" onChange={handleFileChange} />
      <StyledButton variant="contained" color="primary" onClick={importBackup}>
        📤 Importieren
      </StyledButton>
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
    username: generateUsername(loggedInUser),
    password: Math.random().toString(36).slice(-8),
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
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("entries_pt2").select("*");
      if (error) {
        setSnackbarMessage("❌ Fehler beim Laden der Einträge!");
        setSnackbarOpen(true);
      } else {
        setEntries(data);
      }
      setLoading(false);
    };
    fetchEntries();
  }, []);

  const handleOpenCreateEntryDialog = () => setOpenCreateEntryDialog(true);
  const handleOpenManualEntryDialog = () => setOpenManualEntryDialog(true);

  const createEntry = async () => {
    if (!newEntry.aliasNotes.trim()) {
      setSnackbarMessage("📝 Bitte Spitzname eingeben!");
      setSnackbarOpen(true);
      return;
    }
    const { data, error } = await supabase.from("entries_pt2").insert([newEntry]).select();
    if (error) {
      setSnackbarMessage("❌ Fehler beim Hinzufügen!");
      setSnackbarOpen(true);
    } else {
      setEntries((prev) => [data[0], ...prev]);
      setOpenCreateEntryDialog(false);
      setSnackbarMessage("🎉 Abonnent hinzugefügt!");
      setSnackbarOpen(true);
    }
  };

  const handleAddManualEntry = async () => {
    if (!manualEntry.username || !manualEntry.password || !manualEntry.aliasNotes) {
      setSnackbarMessage("📝 Bitte alle Felder ausfüllen!");
      setSnackbarOpen(true);
      return;
    }
    const newManualEntry = { ...manualEntry, status: "Aktiv", paymentStatus: "Gezahlt", createdAt: new Date() };
    const { data, error } = await supabase.from("entries_pt2").insert([newManualEntry]).select();
    if (error) {
      setSnackbarMessage("❌ Fehler beim Hinzufügen!");
      setSnackbarOpen(true);
    } else {
      setEntries((prev) => [data[0], ...prev]);
      setOpenManualEntryDialog(false);
      setSnackbarMessage("🎉 Bestehender Abonnent eingepflegt!");
      setSnackbarOpen(true);
    }
  };

  const changeStatus = async (entryId, newStatus) => {
    const { error } = await supabase.from("entries_pt2").update({ status: newStatus }).eq("id", entryId);
    if (error) {
      setSnackbarMessage("❌ Fehler beim Status ändern!");
      setSnackbarOpen(true);
    } else {
      setEntries((prev) =>
        prev.map((entry) => (entry.id === entryId ? { ...entry, status: newStatus } : entry))
      );
      setSnackbarMessage(`✅ Status zu "${newStatus}" geändert!`);
      setSnackbarOpen(true);
    }
  };

  const changePaymentStatus = async (entryId, paymentStatus) => {
    const { error } = await supabase.from("entries_pt2").update({ paymentStatus }).eq("id", entryId);
    if (error) {
      setSnackbarMessage("❌ Fehler beim Zahlungsstatus ändern!");
      setSnackbarOpen(true);
    } else {
      setEntries((prev) =>
        prev.map((entry) => (entry.id === entryId ? { ...entry, paymentStatus } : entry))
      );
    }
  };

  const deleteEntry = async (entryId) => {
    const { error } = await supabase.from("entries_pt2").delete().eq("id", entryId);
    if (error) {
      setSnackbarMessage("❌ Fehler beim Löschen!");
      setSnackbarOpen(true);
    } else {
      setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    }
  };

  const filterEntries = useMemo(() => {
    return entries
      .filter((entry) =>
        role === "Admin" ? (selectedUser ? entry.owner === selectedUser : true) : entry.owner === loggedInUser
      )
      .filter(
        (entry) =>
          entry.username.includes(debouncedSearch) || entry.aliasNotes.includes(debouncedSearch)
      );
  }, [entries, role, selectedUser, loggedInUser, debouncedSearch]);

  const uniqueOwners = [...new Set(entries.map((entry) => entry.owner))];
  const countEntriesByOwner = (owner) => entries.filter((entry) => entry.owner === owner).length;

  return (
    <Box sx={{ padding: { xs: 1, sm: 2 } }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          {role === "Admin" && (
            <ImportBackup setSnackbarOpen={setSnackbarOpen} setSnackbarMessage={setSnackbarMessage} />
          )}
          {role === "Admin" && (
            <StyledButton
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
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              💾 Backup
            </StyledButton>
          )}
        </Toolbar>
      </AppBar>
      <Box sx={{ my: 2, display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1 }}>
        <StyledButton
          onClick={handleOpenCreateEntryDialog}
          variant="contained"
          color="success"
          startIcon={<AddIcon />}
          fullWidth={isMobile}
        >
          🌟 Neu
        </StyledButton>
        <StyledButton
          onClick={handleOpenManualEntryDialog}
          variant="contained"
          color="primary"
          startIcon={<EditIcon />}
          fullWidth={isMobile}
        >
          ✏️ Bestehend
        </StyledButton>
        <Typography variant="h6" sx={{ flexGrow: 1, textAlign: "right" }}>
          🎉 {countEntriesByOwner(loggedInUser)} Einträge
        </Typography>
      </Box>
      {role === "Admin" && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6">👥 Ersteller:</Typography>
          {uniqueOwners.map((owner) => (
            <StyledButton
              key={owner}
              variant={selectedUser === owner ? "contained" : "outlined"}
              onClick={() => setSelectedUser(owner)}
            >
              {owner} ({countEntriesByOwner(owner)})
            </StyledButton>
          ))}
          <StyledButton variant="outlined" onClick={() => setSelectedUser("")}>
            Alle
          </StyledButton>
        </Box>
      )}
      <TextField
        label="🔍 Suche"
        variant="outlined"
        fullWidth
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 2 }}
      />
      <Divider sx={{ my: 2 }} />
      {loading ? (
        <Typography>⏳ Lade...</Typography>
      ) : filterEntries.length > 0 ? (
        filterEntries.map((entry) => (
          <Accordion key={entry.id} sx={{ mb: 1, borderRadius: "10px" }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>
                👤 {entry.username} | ✏️ {entry.aliasNotes}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>📦 Typ: {entry.type}</Typography>
              <Typography sx={{ color: entry.status === "Aktiv" ? "green" : "red" }}>
                🚦 Status: {entry.status}
              </Typography>
              <Typography sx={{ color: entry.paymentStatus === "Gezahlt" ? "green" : "red" }}>
                💰 Zahlung: {entry.paymentStatus}
              </Typography>
              <Typography>📅 Erstellt: {formatDate(entry.createdAt)}</Typography>
              <Typography>⏰ Gültig bis: {formatDate(entry.validUntil)}</Typography>
              <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
                <StyledButton
                  onClick={() => changeStatus(entry.id, entry.status === "Aktiv" ? "Inaktiv" : "Aktiv")}
                  variant="contained"
                  color="secondary"
                >
                  {entry.status === "Aktiv" ? "🔴 Inaktiv" : "🟢 Aktiv"}
                </StyledButton>
                <StyledButton
                  onClick={() =>
                    changePaymentStatus(
                      entry.id,
                      entry.paymentStatus === "Gezahlt" ? "Nicht gezahlt" : "Gezahlt"
                    )
                  }
                  variant="contained"
                  color="secondary"
                >
                  {entry.paymentStatus === "Gezahlt" ? "💸 Nicht gezahlt" : "💰 Gezahlt"}
                </StyledButton>
                <StyledButton
                  onClick={() => deleteEntry(entry.id)}
                  variant="contained"
                  color="error"
                  startIcon={<DeleteIcon />}
                >
                  🗑️ Löschen
                </StyledButton>
              </Box>
            </AccordionDetails>
          </Accordion>
        ))
      ) : (
        <Typography>😕 Keine Einträge gefunden</Typography>
      )}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert severity="info">{snackbarMessage}</Alert>
      </Snackbar>
      <Dialog open={openCreateEntryDialog} onClose={() => setOpenCreateEntryDialog(false)} fullWidth>
        <DialogTitle>🌟 Neuen Abonnenten anlegen</DialogTitle>
        <DialogContent>
          <TextField
            label="✏️ Spitzname"
            fullWidth
            margin="normal"
            value={newEntry.aliasNotes}
            onChange={(e) => setNewEntry({ ...newEntry, aliasNotes: e.target.value })}
          />
          <TextField
            label="👤 Benutzername"
            fullWidth
            margin="normal"
            value={newEntry.username}
            disabled
          />
          <TextField
            label="🔑 Passwort"
            fullWidth
            margin="normal"
            value={newEntry.password}
            disabled
          />
        </DialogContent>
        <DialogActions>
          <StyledButton onClick={() => setOpenCreateEntryDialog(false)}>✖️ Abbrechen</StyledButton>
          <StyledButton onClick={createEntry} variant="contained">➕ Hinzufügen</StyledButton>
        </DialogActions>
      </Dialog>
      <Dialog open={openManualEntryDialog} onClose={() => setOpenManualEntryDialog(false)} fullWidth>
        <DialogTitle>✏️ Bestehenden Abonnenten einpflegen</DialogTitle>
        <DialogContent>
          <TextField
            label="👤 Benutzername"
            fullWidth
            margin="normal"
            value={manualEntry.username}
            onChange={(e) => setManualEntry({ ...manualEntry, username: e.target.value })}
          />
          <TextField
            label="🔑 Passwort"
            fullWidth
            margin="normal"
            value={manualEntry.password}
            onChange={(e) => setManualEntry({ ...manualEntry, password: e.target.value })}
          />
          <TextField
            label="✏️ Spitzname"
            fullWidth
            margin="normal"
            value={manualEntry.aliasNotes}
            onChange={(e) => setManualEntry({ ...manualEntry, aliasNotes: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <StyledButton onClick={() => setOpenManualEntryDialog(false)}>✖️ Abbrechen</StyledButton>
          <StyledButton onClick={handleAddManualEntry} variant="contained">➕ Hinzufügen</StyledButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EntryList;
