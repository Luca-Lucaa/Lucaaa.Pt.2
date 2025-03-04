import React, { useState, useMemo, useCallback } from "react";
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
  Snackbar,
  Alert,
  Chip,
  IconButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { supabase } from "./supabaseClient";
import { formatDate, generateUsername, useDebounce, handleError } from "./utils";
import EntryAccordion from "./EntryAccordion";

const EntryList = ({ role, loggedInUser, entries, setEntries }) => {
  const [openCreateEntryDialog, setOpenCreateEntryDialog] = useState(false);
  const [openManualEntryDialog, setOpenManualEntryDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
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
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Neuer Ladezustand
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const countEntriesByOwner = useCallback((owner) => {
    return entries.filter((entry) => entry.owner === owner).length;
  }, [entries]);

  const entryCount = countEntriesByOwner(loggedInUser);
  let motivationMessage = "";
  if (entryCount >= 10 && entryCount < 15) {
    motivationMessage = "🎉 Super! Du hast bereits 10 Einträge erreicht! Mach weiter so, du bist auf dem besten Weg zu 15!";
  } else if (entryCount >= 15 && entryCount < 20) {
    motivationMessage = "🎉 Fantastisch! 15 Einträge sind erreicht! Nur noch 5 bis zu 20! Lass uns das schaffen!";
  } else if (entryCount >= 20 && entryCount < 25) {
    motivationMessage = "🎉 Großartig! Du hast 20 Einträge! Nur noch 5 bis zu 25! Weiter so!";
  } else if (entryCount >= 25) {
    motivationMessage = "🎉 Wow! Du hast 25 Einträge erreicht! Deine Kreativität kennt keine Grenzen! Mach weiter so!";
  } else if (entryCount > 0) {
    motivationMessage = `🎉 Du hast ${entryCount} Einträge erstellt! Weiter so, der nächste Meilenstein ist 5!`;
  } else {
    motivationMessage = "🎉 Du hast noch keine Einträge erstellt. Lass uns mit dem ersten Eintrag beginnen!";
  }

  const handleOpenCreateEntryDialog = useCallback(() => {
    const username = generateUsername(loggedInUser);
    const randomPassword = Math.random().toString(36).slice(-8);
    setNewEntry({
      username,
      password: randomPassword,
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
    setOpenCreateEntryDialog(true);
  }, [loggedInUser]);

  const handleOpenManualEntryDialog = useCallback(() => {
    setManualEntry({
      username: "",
      password: "",
      aliasNotes: "",
      type: "Premium",
      validUntil: new Date(new Date().getFullYear(), 11, 31),
      owner: loggedInUser,
      extensionHistory: [],
      bougetList: "",
    });
    setOpenManualEntryDialog(true);
  }, [loggedInUser]);

  const createEntry = useCallback(async () => {
    if (!newEntry.aliasNotes.trim() || !newEntry.username.trim()) {
      setSnackbarMessage("Bitte Spitzname und Benutzername eingeben.");
      setSnackbarOpen(true);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from("entries").insert([newEntry]).select();
      if (error) throw error;
      setEntries((prev) => [data[0], ...prev]);
      setOpenCreateEntryDialog(false);
      setSnackbarMessage("Neuer Abonnent erfolgreich angelegt!");
      setSnackbarOpen(true);
    } catch (error) {
      handleError(error, setSnackbarMessage, setSnackbarOpen);
    } finally {
      setIsLoading(false);
    }
  }, [newEntry, setEntries]);

  const handleAddManualEntry = useCallback(async () => {
    if (!manualEntry.username || !manualEntry.password || !manualEntry.aliasNotes) {
      setSnackbarMessage("Bitte füllen Sie alle Felder aus.");
      setSnackbarOpen(true);
      return;
    }
    setIsLoading(true);
    const validUntilDate = new Date(manualEntry.validUntil);
    const newManualEntry = {
      username: manualEntry.username,
      password: manualEntry.password,
      aliasNotes: manualEntry.aliasNotes,
      type: manualEntry.type,
      validUntil: validUntilDate,
      owner: loggedInUser,
      status: "Aktiv",
      paymentStatus: "Gezahlt",
      createdAt: new Date(),
      note: "Dieser Abonnent besteht bereits",
      extensionHistory: [],
      bougetList: manualEntry.bougetList,
    };
    try {
      const { data, error } = await supabase.from("entries").insert([newManualEntry]).select();
      if (error) throw error;
      setEntries((prev) => [data[0], ...prev]);
      setOpenManualEntryDialog(false);
      setSnackbarMessage("Bestehender Abonnent erfolgreich eingepflegt!");
      setSnackbarOpen(true);
    } catch (error) {
      handleError(error, setSnackbarMessage, setSnackbarOpen);
    } finally {
      setIsLoading(false);
    }
  }, [manualEntry, loggedInUser, setEntries]);

  const filterEntries = useMemo(() => {
    return entries
      .filter((entry) =>
        role === "Admin" ? (selectedUser ? entry.owner === selectedUser : true) : entry.owner === loggedInUser
      )
      .filter((entry) =>
        [entry.username, entry.aliasNotes].some((field) =>
          field?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        )
      )
      .filter((entry) => (statusFilter ? entry.status === statusFilter : true))
      .filter((entry) => (paymentFilter ? entry.paymentStatus === paymentFilter : true))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [entries, role, selectedUser, loggedInUser, debouncedSearchTerm, statusFilter, paymentFilter]);

  const uniqueOwners = useMemo(() => [...new Set(entries.map((entry) => entry.owner))], [entries]);

  return (
    <div>
      <Box sx={{ padding: 2, display: "flex", flexDirection: "column", gap: 2, marginBottom: 3 }}>
        <Typography variant="body1" sx={{ fontStyle: "italic", color: "green" }}>
          {motivationMessage}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2 }}>
          <Button
            onClick={handleOpenCreateEntryDialog}
            variant="contained"
            color="success"
            startIcon={<AddIcon />}
            fullWidth
            disabled={isLoading}
          >
            Abonnent anlegen
          </Button>
          <Button
            onClick={handleOpenManualEntryDialog}
            variant="contained"
            color="primary"
            startIcon={<EditIcon />}
            fullWidth
            disabled={isLoading}
          >
            Bestehenden Abonnenten einpflegen
          </Button>
        </Box>
      </Box>
      {role === "Admin" && (
        <Box sx={{ marginBottom: 3, padding: 2 }}>
          <Typography variant="h6">Ersteller filtern:</Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {uniqueOwners.map((owner) => (
              <Button
                key={owner}
                variant="outlined"
                onClick={() => setSelectedUser(owner)}
                color={selectedUser === owner ? "primary" : "default"}
              >
                {owner} ({entries.filter((e) => e.owner === owner).length})
              </Button>
            ))}
            <Button variant="outlined" onClick={() => setSelectedUser("")} fullWidth>
              Alle anzeigen
            </Button>
          </Box>
        </Box>
      )}
      <Box sx={{ marginBottom: 3, padding: 2, display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2 }}>
        <TextField
          label="🔍 Suchen nach Benutzername oder Spitzname"
          variant="outlined"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={isLoading}
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          displayEmpty
          fullWidth
          variant="outlined"
          sx={{ minWidth: 120 }}
          disabled={isLoading}
        >
          <MenuItem value="">Alle Status</MenuItem>
          <MenuItem value="Aktiv">Aktiv</MenuItem>
          <MenuItem value="Inaktiv">Inaktiv</MenuItem>
        </Select>
        <Select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          displayEmpty
          fullWidth
          variant="outlined"
          sx={{ minWidth: 120 }}
          disabled={isLoading}
        >
          <MenuItem value="">Alle Zahlungen</MenuItem>
          <MenuItem value="Gezahlt">Gezahlt</MenuItem>
          <MenuItem value="Nicht gezahlt">Nicht gezahlt</MenuItem>
        </Select>
      </Box>
      <Box sx={{ maxHeight: "60vh", overflowY: "auto", padding: 2 }}>
        {isLoading && <Typography>🔄 Lade Einträge...</Typography>}
        {filterEntries.length > 0 ? (
          filterEntries.map((entry) => (
            <EntryAccordion
              key={entry.id}
              entry={entry}
              role={role}
              loggedInUser={loggedInUser}
              setEntries={setEntries}
              setSnackbarMessage={setSnackbarMessage}
              setSnackbarOpen={setSnackbarOpen}
            />
          ))
        ) : (
          <Typography>🚀 Keine passenden Einträge gefunden.</Typography>
        )}
      </Box>
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)}>
        <Alert onClose={() => setSnackbarOpen(false)} severity="success" sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
      <Dialog open={openCreateEntryDialog} onClose={() => setOpenCreateEntryDialog(false)} fullScreen>
        <DialogTitle>Neuen Abonnenten anlegen</DialogTitle>
        <DialogContent>
          <TextField
            label="Spitzname, Notizen etc."
            fullWidth
            margin="normal"
            value={newEntry.aliasNotes}
            onChange={(e) => setNewEntry({ ...newEntry, aliasNotes: e.target.value })}
            disabled={isLoading}
          />
          <TextField
            label="Bouget-Liste (z.B. GER, CH, USA, XXX usw... oder Alles)"
            fullWidth
            margin="normal"
            value={newEntry.bougetList}
            onChange={(e) => setNewEntry({ ...newEntry, bougetList: e.target.value })}
            disabled={isLoading}
          />
          <Select
            fullWidth
            margin="normal"
            value={newEntry.type}
            onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value })}
            disabled={isLoading}
          >
            <MenuItem value="Premium">Premium</MenuItem>
            <MenuItem value="Basic">Basic</MenuItem>
          </Select>
          <TextField label="Benutzername" fullWidth margin="normal" value={newEntry.username} disabled />
          <TextField label="Passwort" fullWidth margin="normal" type="password" value={newEntry.password} disabled />
          <Typography variant="body1">
            <strong>Aktuelles Datum:</strong> {formatDate(new Date())}
          </Typography>
          <Typography variant="body1">
            <strong>Gültig bis:</strong> {formatDate(newEntry.validUntil)}
          </Typography>
          {isLoading && <Typography>🔄 Speichere...</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateEntryDialog(false)} color="secondary" disabled={isLoading}>
            Abbrechen
          </Button>
          <Button onClick={createEntry} color="primary" disabled={isLoading}>
            {isLoading ? "Speichere..." : "Hinzufügen"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openManualEntryDialog} onClose={() => setOpenManualEntryDialog(false)} fullScreen>
        <DialogTitle>Bestehenden Abonnenten einpflegen</DialogTitle>
        <DialogContent>
          <TextField
            label="Benutzername"
            fullWidth
            margin="normal"
            value={manualEntry.username}
            onChange={(e) => setManualEntry({ ...manualEntry, username: e.target.value })}
            disabled={isLoading}
          />
          <TextField
            label="Passwort"
            fullWidth
            margin="normal"
            type="password"
            value={manualEntry.password}
            onChange={(e) => setManualEntry({ ...manualEntry, password: e.target.value })}
            disabled={isLoading}
          />
          <TextField
            label="Spitzname, Notizen etc."
            fullWidth
            margin="normal"
            value={manualEntry.aliasNotes}
            onChange={(e) => setManualEntry({ ...manualEntry, aliasNotes: e.target.value })}
            disabled={isLoading}
          />
          <TextField
            label="Bouget-Liste (z.B. GER, CH, USA, XXX usw... oder Alles)"
            fullWidth
            margin="normal"
            value={manualEntry.bougetList}
            onChange={(e) => setManualEntry({ ...manualEntry, bougetList: e.target.value })}
            disabled={isLoading}
          />
          <Select
            fullWidth
            margin="normal"
            value={manualEntry.type}
            onChange={(e) => setManualEntry({ ...manualEntry, type: e.target.value })}
            disabled={isLoading}
          >
            <MenuItem value="Premium">Premium</MenuItem>
            <MenuItem value="Basic">Basic</MenuItem>
          </Select>
          <TextField
            label="Gültig bis"
            fullWidth
            margin="normal"
            type="date"
            value={manualEntry.validUntil.toISOString().split("T")[0]}
            onChange={(e) => setManualEntry({ ...manualEntry, validUntil: new Date(e.target.value) })}
            disabled={isLoading}
          />
          <Typography variant="body1">
            <strong>Aktuelles Datum:</strong> {formatDate(new Date())}
          </Typography>
          <Typography variant="body1">
            <strong>Gültig bis:</strong> {formatDate(manualEntry.validUntil)}
          </Typography>
          {isLoading && <Typography>🔄 Speichere...</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenManualEntryDialog(false)} color="secondary" disabled={isLoading}>
            Abbrechen
          </Button>
          <Button onClick={handleAddManualEntry} color="primary" disabled={isLoading}>
            {isLoading ? "Speichere..." : "Hinzufügen"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default EntryList;
