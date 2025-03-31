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
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import { supabase } from "./supabaseClient";
import { formatDate, generateUsername, useDebounce, handleError } from "./utils";
import EntryAccordion from "./EntryAccordion";
import { useSnackbar } from "./useSnackbar";
import { OWNER_COLORS } from "./config"; // Import der Farben

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
    return ownerEntries.reduce((-total, entry) => total + (entry.admin_fee || 0), 0);
  }, [entries]);

  const countEntriesByOwner = useCallback((owner) => {
    return entries.filter((entry) => entry.owner === owner).length;
  }, [entries]);

  const entryCount = countEntriesByOwner(loggedInUser);

  // Definierte Meilensteine
  const milestones = [5, 10, 15, 20, 25, 50, 100];
  const nextMilestone = milestones.find((milestone) => milestone > entryCount) || 100;
  const progressToNext = nextMilestone - entryCount;

  // Zufällige motivierende Phrasen
  const motivationalPhrases = [
    "Super Arbeit!",
    "Fantastisch gemacht!",
    "Du rockst das!",
    "Unglaublich gut!",
    "Weiter so, Champion!",
    "Beeindruckend!",
    "Toll drauf!",
  ];

  // Generiere eine Motivationsnachricht und memoiziere sie
  const motivationMessage = useMemo(() => {
    const randomPhrase = motivationalPhrases[Math.floor(Math.random() * motivationalPhrases.length)];
    if (entryCount === 0) {
      return "🎉 Du hast noch keine Einträge erstellt. Lass uns mit dem ersten beginnen!";
    } else if (entryCount >= 100) {
      return `🎉 ${randomPhrase} Du hast ${entryCount} Einträge erreicht! Du bist ein wahrer Meister!`;
    } else {
      return `🎉 ${randomPhrase} Du hast ${entryCount} Einträge erreicht! Nur noch ${progressToNext} bis ${nextMilestone}!`;
    }
  }, [entryCount]);

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
      admin_fee: role === "Admin" ? manualEntry.admin_fee : null, // Nur Admin kann admin_fee setzen
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
  }, [manualEntry, loggedInUser, role, setEntries, showSnackbar]);

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
        <Box sx={{ padding: 0.5, backgroundColor: "#f5f5f5", borderRadius: 2, marginBottom: 0.5 }}>
          <Typography variant="body2" sx={{ color: "green" }}>
            Gesamtkosten deiner Einträge: {calculateTotalFeesForOwner(loggedInUser)}$ €
          </Typography>
        </Box>
      )}

      <Box sx={{ padding: 2, display: "flex", flexDirection: "column", gap: 2, marginBottom: 3 }}>
        <Chip
          label={motivationMessage}
          color="success"
          variant="outlined"
          sx={{ fontStyle: "italic", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}
        />
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
                sx={{
                  backgroundColor: OWNER_COLORS[owner] || "#ffffff", // Farbe nur für Admin
                  "&:hover": {
                    backgroundColor: OWNER_COLORS[owner] || "#ffffff", // Hover-Effekt behält die Farbe
                  },
                }}
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
          <TextField
            label="Passwort"
            fullWidth
            margin="normal"
            type="text" // Sichtbar für neue Einträge
            value={newEntry.password}
            disabled
          />
          {role === "Admin" && ( // Nur für Admins sichtbar
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
          )}
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
            type="text" // Geändert von "password" zu "text", um das Passwort sichtbar zu machen
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
          {role === "Admin" && ( // Nur für Admins sichtbar
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
          )}
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
