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
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { supabase } from "./supabaseClient";
import { formatDate, generateUsername, useDebounce, handleError } from "./utils";
import { useSnackbar } from "./useSnackbar";
import { OWNER_COLORS } from "./config";
import EntryAccordion from "./EntryAccordion";

const EntryList = ({
  role,
  loggedInUser,
  entries,
  setEntries,
  openCreateDialog,
  setOpenCreateDialog,
  openManualDialog,
  setOpenManualDialog,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
    extensionRequest: null,
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
    extensionRequest: null,
  });

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { showSnackbar } = useSnackbar();

  const filteredEntries = useMemo(() => {
    let filtered = entries;
    if (role !== "Admin") {
      filtered = entries.filter((entry) => entry.owner === loggedInUser);
    }
    if (debouncedSearchTerm) {
      filtered = filtered.filter(
        (entry) =>
          entry.username.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          entry.aliasNotes.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }
    if (statusFilter) {
      filtered = filtered.filter((entry) => entry.status === statusFilter);
    }
    if (paymentFilter) {
      filtered = filtered.filter((entry) => entry.paymentStatus === paymentFilter);
    }
    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [entries, role, loggedInUser, debouncedSearchTerm, statusFilter, paymentFilter]);

  const calculateTotalFeesForOwner = useCallback(
    (owner) => {
      const ownerEntries = entries.filter((entry) => entry.owner === owner);
      return ownerEntries.reduce((total, entry) => total + (entry.admin_fee || 0), 0);
    },
    [entries]
  );

  const countEntriesByOwner = useCallback(
    (owner) => {
      return entries.filter((entry) => entry.owner === owner).length;
    },
    [entries]
  );

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
      extensionRequest: null,
    });
    setOpenCreateDialog(true);
  }, [loggedInUser, setOpenCreateDialog]);

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
      extensionRequest: null,
    });
    setOpenManualDialog(true);
  }, [loggedInUser, setOpenManualDialog]);

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
      setOpenCreateDialog(false);
      showSnackbar("Neuer Abonnent erfolgreich angelegt!");
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [newEntry, setEntries, showSnackbar, setOpenCreateDialog]);

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
      extensionRequest: null,
    };
    try {
      const { data, error } = await supabase.from("entries").insert([newManualEntry]).select();
      if (error) throw error;
      setEntries((prev) => [data[0], ...prev]);
      setOpenManualDialog(false);
      showSnackbar("Bestehender Abonnent erfolgreich eingepflegt!");
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [manualEntry, loggedInUser, role, setEntries, showSnackbar, setOpenManualDialog]);

  return (
    <Box sx={{ p: 3, bgcolor: "#f5f5f5", borderRadius: 2 }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold", color: "#1976d2" }}>
        Abonnenten
      </Typography>
      {role !== "Admin" && (
        <Card sx={{ mb: 3, p: 2, bgcolor: "#e3f2fd", boxShadow: 3, borderRadius: 2 }}>
          <CardContent>
            <Typography variant="body1" sx={{ fontSize: "1.1rem" }}>
              {motivationMessage}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: "#555" }}>
              Gesamtgebühren: {calculateTotalFeesForOwner(loggedInUser).toLocaleString()} €
            </Typography>
          </CardContent>
        </Card>
      )}
      <Box sx={{ mb: 3, display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2 }}>
        <TextField
          label="🔍 Suche nach Benutzername oder Spitzname"
          variant="outlined"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ bgcolor: "#fff", borderRadius: 1 }}
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          displayEmpty
          fullWidth
          sx={{ bgcolor: "#fff", borderRadius: 1 }}
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
          sx={{ bgcolor: "#fff", borderRadius: 1 }}
        >
          <MenuItem value="">Alle Zahlungen</MenuItem>
          <MenuItem value="Gezahlt">Gezahlt</MenuItem>
          <MenuItem value="Nicht gezahlt">Nicht gezahlt</MenuItem>
        </Select>
      </Box>
      <Box sx={{ mb: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Button
          variant="contained"
          color="success"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateEntryDialog}
          disabled={isLoading}
          sx={{ borderRadius: 2, px: 3 }}
        >
          Neuer Abonnent
        </Button>
        {role === "Admin" && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenManualEntryDialog}
            disabled={isLoading}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Bestehender Abonnent
          </Button>
        )}
      </Box>
      {isLoading && (
        <Typography sx={{ textAlign: "center", my: 2 }}>🔄 Lade...</Typography>
      )}
      {filteredEntries.length === 0 ? (
        <Card sx={{ p: 3, textAlign: "center", boxShadow: 3, borderRadius: 2 }}>
          <Typography variant="h6" color="textSecondary">
            Keine Einträge gefunden.
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {filteredEntries.map((entry) => (
            <Grid item xs={12} sm={6} md={4} key={entry.id}>
              <Card
                sx={{
                  borderRadius: 3,
                  boxShadow: 4,
                  bgcolor: role === "Admin" ? OWNER_COLORS[entry.owner] || "#ffffff" : "#ffffff",
                  transition: "transform 0.2s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 6,
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                    {entry.aliasNotes}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Benutzername: {entry.username}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Gültig bis: {formatDate(entry.validUntil)}
                  </Typography>
                  <EntryAccordion
                    entry={entry}
                    role={role}
                    loggedInUser={loggedInUser}
                    setEntries={setEntries}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      <Dialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Neuen Abonnenten anlegen</DialogTitle>
        <DialogContent>
          <TextField
            label="Benutzername"
            fullWidth
            margin="normal"
            value={newEntry.username}
            onChange={(e) => setNewEntry({ ...newEntry, username: e.target.value })}
            disabled={isLoading}
          />
          <TextField
            label="Passwort"
            fullWidth
            margin="normal"
            type="text"
            value={newEntry.password}
            onChange={(e) => setNewEntry({ ...newEntry, password: e.target.value })}
            disabled={isLoading}
          />
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
            value={newEntry.bougetList || ""}
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)} color="secondary" disabled={isLoading}>
            Abbrechen
          </Button>
          <Button onClick={createEntry} color="primary" disabled={isLoading}>
            {isLoading ? "Speichere..." : "Erstellen"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={openManualDialog}
        onClose={() => setOpenManualDialog(false)}
        fullWidth
        maxWidth="sm"
      >
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
            value={manualEntry.bougetList || ""}
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
            value={
              manualEntry.validUntil
                ? new Date(manualEntry.validUntil).toISOString().split("T")[0]
                : ""
            }
            onChange={(e) =>
              setManualEntry({ ...manualEntry, validUntil: new Date(e.target.value) })
            }
            disabled={isLoading}
          />
          {role === "Admin" && (
            <TextField
              label="Admin-Gebühr (€)"
              fullWidth
              margin="normal"
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenManualDialog(false)} color="secondary" disabled={isLoading}>
            Abbrechen
          </Button>
          <Button onClick={handleAddManualEntry} color="primary" disabled={isLoading}>
            {isLoading ? "Speichere..." : "Hinzufügen"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EntryList;
