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
  Card,
  CardContent,
  CardActions,
  Grid,
  Paper,
  Divider,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui.icons-material/Delete";
import { supabase } from "./supabaseClient";
import { formatDate, generateUsername, useDebounce, handleError } from "./utils";
import { useSnackbar } from "./useSnackbar";
import { OWNER_COLORS } from "./config";

const EntryList = ({ role, loggedInUser, entries, setEntries }) => {
  const [openCreateEntryDialog, setOpenCreateEntryDialog] = useState(false);
  const [openManualEntryDialog, setOpenManualEntryDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
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
    admin_fee: null,
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
    admin_fee: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { snackbarOpen, snackbarMessage, snackbarSeverity, showSnackbar, closeSnackbar } = useSnackbar();

  const calculateTotalFeesForOwner = useCallback((owner) => {
    const ownerEntries = entries.filter((entry) => entry.owner === owner);
    return ownerEntries.reduce((total, entry) => total + (entry.admin_fee || 0), 0);
  }, [entries]);

  const countEntriesByOwner = useCallback((owner) => {
    return entries.filter((entry) => entry.owner === owner).length;
  }, [entries]);

  const entryCount = countEntriesByOwner(loggedInUser);

  const milestones = [5, 10, 15, 20, 25, 50, 100];
  const nextMilestone = milestones.find((milestone) => milestone > entryCount) || 100;
  const progressToNext = nextMilestone - entryCount;

  const motivationalPhrases = [
    "Super Arbeit!",
    "Fantastisch gemacht!",
    "Du rockst das!",
    "Unglaublich gut!",
    "Weiter so, Champion!",
    "Beeindruckend!",
    "Toll drauf!",
  ];

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
      admin_fee: null,
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
      admin_fee: null,
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
      showSnackbar("Neuer Abonnent erfolgreich angelegt!", "success");
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
      admin_fee: role === "Admin" ? manualEntry.admin_fee : null,
    };
    try {
      const { data, error } = await supabase.from("entries").insert([newManualEntry]).select();
      if (error) throw error;
      setEntries((prev) => [data[0], ...prev]);
      setOpenManualEntryDialog(false);
      showSnackbar("Bestehender Abonnent erfolgreich eingepflegt!", "success");
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [manualEntry, loggedInUser, role, setEntries, showSnackbar]);

  const handleEditEntry = useCallback((entry) => {
    setSelectedEntry(entry);
    setOpenEditDialog(true);
  }, []);

  const handleUpdateEntry = useCallback(async () => {
    if (!selectedEntry.aliasNotes.trim() || !selectedEntry.username.trim()) {
      showSnackbar("Bitte Spitzname und Benutzername eingeben.", "error");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("entries")
        .update({
          username: selectedEntry.username,
          password: selectedEntry.password,
          aliasNotes: selectedEntry.aliasNotes,
          type: selectedEntry.type,
          status: selectedEntry.status,
          paymentStatus: selectedEntry.paymentStatus,
          validUntil: new Date(selectedEntry.validUntil),
          bougetList: selectedEntry.bougetList,
          admin_fee: selectedEntry.admin_fee,
        })
        .eq("id", selectedEntry.id);
      if (error) throw error;
      setEntries((prev) =>
        prev.map((entry) => (entry.id === selectedEntry.id ? { ...entry, ...selectedEntry } : entry))
      );
      setOpenEditDialog(false);
      showSnackbar("Eintrag erfolgreich aktualisiert!", "success");
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [selectedEntry, setEntries, showSnackbar]);

  const handleDeleteEntry = useCallback(async (entryId) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("entries").delete().eq("id", entryId);
      if (error) throw error;
      setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
      showSnackbar("Eintrag erfolgreich gelöscht!", "success");
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [setEntries, showSnackbar]);

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

  // Statistiken für das Dashboard
  const totalEntries = entries.length;
  const totalFees = entries.reduce((total, entry) => total + (entry.admin_fee || 0), 0);
  const activeEntries = entries.filter((entry) => entry.status === "Aktiv").length;

  return (
    <Box sx={{ padding: 2 }}>
      {/* Admin-Dashboard */}
      {role === "Admin" && (
        <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2, backgroundColor: "#f5f5f5" }}>
          <Typography variant="h5" gutterBottom>
            Admin-Dashboard
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Paper elevation={2} sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
                <Typography variant="h6">Gesamte Einträge</Typography>
                <Typography variant="h4" color="primary">
                  {totalEntries}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper elevation={2} sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
                <Typography variant="h6">Aktive Einträge</Typography>
                <Typography variant="h4" color="success.main">
                  {activeEntries}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper elevation={2} sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
                <Typography variant="h6">Gesamtkosten</Typography>
                <Typography variant="h4" color="error.main">
                  {totalFees}$ €
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Motivationsnachricht */}
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

      {/* Ersteller-Filter für Admin */}
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
                  backgroundColor: OWNER_COLORS[owner] || "#ffffff",
                  "&:hover": {
                    backgroundColor: OWNER_COLORS[owner] || "#ffffff",
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

      {/* Filterleiste */}
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

      {/* Einträge als Karten anzeigen */}
      <Grid container spacing={2}>
        {isLoading && (
          <Grid item xs={12}>
            <Typography>🔄 Lade Einträge...</Typography>
          </Grid>
        )}
        {filterEntries.length > 0 ? (
          filterEntries.map((entry) => (
            <Grid item xs={12} sm={6} md={4} key={entry.id}>
              <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
                <CardContent>
                  <Typography variant="h6">{entry.username}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Spitzname: {entry.aliasNotes}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ersteller: {entry.owner}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Status: {entry.status}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Zahlungsstatus: {entry.paymentStatus}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Gültig bis: {formatDate(entry.validUntil)}
                  </Typography>
                  {entry.admin_fee && (
                    <Typography variant="body2" color="text.secondary">
                      Admin-Gebühr: {entry.admin_fee}$ €
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <Button size="small" color="primary" onClick={() => handleEditEntry(entry)}>
                    Bearbeiten
                  </Button>
                  <IconButton size="small" color="error" onClick={() => handleDeleteEntry(entry.id)}>
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Typography>🚀 Keine passenden Einträge gefunden.</Typography>
          </Grid>
        )}
      </Grid>

      {/* Dialoge */}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={closeSnackbar}>
        <Alert onClose={closeSnackbar} severity={snackbarSeverity} sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
      <Dialog open={openCreateEntryDialog} onClose={() => setOpenCreateEntryDialog(false)} fullWidth maxWidth="sm">
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
            type="text"
            value={newEntry.password}
            disabled
          />
          {role === "Admin" && (
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
      <Dialog open={openManualEntryDialog} onClose={() => setOpenManualEntryDialog(false)} fullWidth maxWidth="sm">
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
            type="text"
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
          {role === "Admin" && (
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
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Eintrag bearbeiten</DialogTitle>
        <DialogContent>
          {selectedEntry && (
            <>
              <TextField
                label="Benutzername"
                fullWidth
                margin="normal"
                value={selectedEntry.username}
                onChange={(e) => setSelectedEntry({ ...selectedEntry, username: e.target.value })}
                disabled={isLoading}
              />
              <TextField
                label="Passwort"
                fullWidth
                margin="normal"
                type="text"
                value={selectedEntry.password}
                onChange={(e) => setSelectedEntry({ ...selectedEntry, password: e.target.value })}
                disabled={isLoading}
              />
              <TextField
                label="Spitzname, Notizen etc."
                fullWidth
                margin="normal"
                value={selectedEntry.aliasNotes}
                onChange={(e) => setSelectedEntry({ ...selectedEntry, aliasNotes: e.target.value })}
                disabled={isLoading}
              />
              <TextField
                label="Bouget-Liste (z.B. GER, CH, USA, XXX usw... oder Alles)"
                fullWidth
                margin="normal"
                value={selectedEntry.bougetList}
                onChange={(e) => setSelectedEntry({ ...selectedEntry, bougetList: e.target.value })}
                disabled={isLoading}
              />
              <Select
                fullWidth
                margin="normal"
                value={selectedEntry.type}
                onChange={(e) => setSelectedEntry({ ...selectedEntry, type: e.target.value })}
                disabled={isLoading}
              >
                <MenuItem value="Premium">Premium</MenuItem>
                <MenuItem value="Basic">Basic</MenuItem>
              </Select>
              <Select
                fullWidth
                margin="normal"
                value={selectedEntry.status}
                onChange={(e) => setSelectedEntry({ ...selectedEntry, status: e.target.value })}
                disabled={isLoading}
              >
                <MenuItem value="Aktiv">Aktiv</MenuItem>
                <MenuItem value="Inaktiv">Inaktiv</MenuItem>
              </Select>
              <Select
                fullWidth
                margin="normal"
                value={selectedEntry.paymentStatus}
                onChange={(e) => setSelectedEntry({ ...selectedEntry, paymentStatus: e.target.value })}
                disabled={isLoading}
              >
                <MenuItem value="Gezahlt">Gezahlt</MenuItem>
                <MenuItem value="Nicht gezahlt">Nicht gezahlt</MenuItem>
              </Select>
              <TextField
                label="Gültig bis"
                fullWidth
                margin="normal"
                type="date"
                value={new Date(selectedEntry.validUntil).toISOString().split("T")[0]}
                onChange={(e) => setSelectedEntry({ ...selectedEntry, validUntil: new Date(e.target.value) })}
                disabled={isLoading}
              />
              {role === "Admin" && (
                <TextField
                  label="Admin-Gebühr ($)"
                  fullWidth
                  margin="normal"
                  type="number"
                  value={selectedEntry.admin_fee || ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, "");
                    const numValue = value ? parseInt(value) : null;
                    if (numValue > 999) return;
                    setSelectedEntry({ ...selectedEntry, admin_fee: numValue });
                  }}
                  inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                  disabled={isLoading}
                />
              )}
              {isLoading && <Typography>🔄 Speichere...</Typography>}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)} color="secondary" disabled={isLoading}>
            Abbrechen
          </Button>
          <Button onClick={handleUpdateEntry} color="primary" disabled={isLoading}>
            {isLoading ? "Speichere..." : "Aktualisieren"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EntryList;
