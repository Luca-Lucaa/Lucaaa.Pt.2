import React, { useState, useMemo, useCallback } from "react";
import {
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Select,
  MenuItem,
  Snackbar,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import { supabase } from "./supabaseClient";
import { formatDate, generateUsername, useDebounce, handleError } from "./utils";
import EntryAccordion from "./EntryAccordion";
import { useSnackbar } from "./useSnackbar";

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
    admin_fee: null, // Standardwert für Admin-Gebühr
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
    admin_fee: null, // Standardwert für Admin-Gebühr
  });
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { snackbarOpen, snackbarMessage, snackbarSeverity, showSnackbar, closeSnackbar } = useSnackbar();

  // Berechne Gesamtkosten für einen bestimmten Ersteller
  const calculateTotalFeesForOwner = useCallback((owner) => {
    const ownerEntries = entries.filter((entry) => entry.owner === owner);
    return ownerEntries.reduce((total, entry) => total + (entry.admin_fee || 0), 0);
  }, [entries]);

  const countEntriesByOwner = useCallback((owner) => {
    return entries.filter((entry) => entry.owner === owner).length;
  }, [entries]);

  const entryCount = countEntriesByOwner(loggedInUser);
  let motivationMessage = "";
  if (entryCount >= 100) {
    motivationMessage = "🎉 Unglaublich! Du hast 100 Einträge erreicht! Du bist ein absoluter Champion!";
  } else if (entryCount >= 90) {
    motivationMessage = "🎉 Beeindruckend! Du hast 90 Einträge! Nur noch 10 bis zu 100! Weiter so!";
  } else if (entryCount >= 80) {
    motivationMessage = "🎉 Fantastisch! 80 Einträge sind erreicht! Nur noch 20 bis zu 100! Bleib dran!";
  } else if (entryCount >= 70) {
    motivationMessage = "🎉 Großartig! Du hast 70 Einträge! Nur noch 30 bis zu 100! Mach weiter!";
  } else if (entryCount >= 60) {
    motivationMessage = "🎉 Hervorragend! 60 Einträge sind erreicht! Nur noch 40 bis zu 100! Weiter so!";
  } else if (entryCount >= 50) {
    motivationMessage = "🎉 Wow! Du hast 50 Einträge! Nur noch 50 bis zu 100! Du rockst das!";
  } else if (entryCount >= 40) {
    motivationMessage = "🎉 Super! 40 Einträge sind erreicht! Nur noch 60 bis zu 100! Bleib motiviert!";
  } else if (entryCount >= 30) {
    motivationMessage = "🎉 Toll! Du hast 30 Einträge! Nur noch 70 bis zu 100! Weiter so!";
  } else if (entryCount >= 25) {
    motivationMessage = "🎉 Wow! Du hast 25 Einträge erreicht! Deine Kreativität kennt keine Grenzen! Mach weiter so!";
  } else if (entryCount >= 20) {
    motivationMessage = "🎉 Großartig! Du hast 20 Einträge! Nur noch 5 bis zu 25! Weiter so!";
  } else if (entryCount >= 15) {
    motivationMessage = "🎉 Fantastisch! 15 Einträge sind erreicht! Nur noch 5 bis zu 20! Lass uns das schaffen!";
  } else if (entryCount >= 10) {
    motivationMessage = "🎉 Super! Du hast bereits 10 Einträge erreicht! Mach weiter so, du bist auf dem besten Weg zu 15!";
  } else if (entryCount >= 5) {
    motivationMessage = "🎉 Gut gemacht! Du hast 5 Einträge erreicht! Nur noch 5 bis zu 10! Weiter so!";
  } else if (entryCount > 0) {
    motivationMessage = `🎉 Du hast ${entryCount} Einträge erstellt! Der nächste Meilenstein ist 5!`;
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
      admin_fee: null, // Standardwert für Admin-Gebühr
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
      admin_fee: null, // Standardwert für Admin-Gebühr
    });
    setOpenManualEntryDialog(true);
  }, [loggedInUser]);

  const createEntry = useCallback(async () => {
    if (!newEntry.aliasNotes.trim() || !newEntry.username.trim()) {
      showSnackbar("Bitte Spitzname und Benutzername eingeben.", "error");
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from("entries").insert([newEntry]).select();
      if (error) throw error;
      setEntries((prev) => [data[0], ...prev]);
      setOpenCreateEntryDialog(false);
      showSnackbar("Neuer Abonnent erfolgreich angelegt!");
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [newEntry, setEntries, showSnackbar]);

  const handleAddManualEntry = useCallback(async () => {
    if (!manualEntry.username || !manualEntry.password || !manualEntry.aliasNotes) {
      showSnackbar("Bitte füllen Sie alle Felder aus.", "error");
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
      admin_fee: manualEntry.admin_fee, // Inkludiere admin_fee
    };
    try {
      const { data, error } = await supabase.from("entries").insert([newManualEntry]).select();
      if (error) throw error;
      setEntries((prev) => [data[0], ...prev]);
      setOpenManualEntryDialog(false);
      showSnackbar("Bestehender Abonnent erfolgreich eingepflegt!");
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [manualEntry, loggedInUser, setEntries, showSnackbar]);

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
      {(role !== "Admin" || loggedInUser === selectedUser) && (
        <Box sx={{ padding: 2, backgroundColor: "#f5f5f5", borderRadius: 2, marginBottom: 2 }}>
          <Typography variant="h6" sx={{ color: "green" }}>
            Gesamtkosten deiner Einträge: {calculateTotalFeesForOwner(loggedInUser)}$ €
          </Typography>
        </Box>
      )}

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
                {owner} ({countEntriesByOwner(owner)}) - Gesamtkosten: {calculateTotalFeesForOwner(owner)}$ €
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
            />
          ))
        ) : (
          <Typography>🚀 Keine passenden Einträge gefunden.</Typography>
        )}
      </Box>
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={closeSnackbar}>
        <Alert onClose={closeSnackbar} severity={snackbarSeverity} sx={{ width: "100%" }}>
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
          <TextField
            label="Admin-Gebühr ($)"
            fullWidth
            margin="normal"
            type="number"
            value={newEntry.admin_fee || ""}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, "");
              const numValue = value ? parseInt(value) : null;
              if (numValue > 999) return;
              setNewEntry({ ...newEntry, admin_fee: numValue });
            }}
            inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
            disabled={isLoading}
          />
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
          <TextField
            label="Admin-Gebühr ($)"
            fullWidth
            margin="normal"
            type="number"
            value={manualEntry.admin_fee || ""}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, "");
              const numValue = value ? parseInt(value) : null;
              if (numValue > 999) return;
              setManualEntry({ ...manualEntry, admin_fee: numValue });
            }}
            inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
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
