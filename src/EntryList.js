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
  Tooltip,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { supabase } from "./supabaseClient";
import { formatDate, generateUsername, useDebounce, handleError } from "./utils";
import { useSnackbar } from "./useSnackbar";
import { OWNER_COLORS } from "./config";

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
  const [editEntry, setEditEntry] = useState(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
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
    setOpenCreateDialog(true); // Öffnet den Dialog
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

  const handleOpenEditDialog = useCallback((entry) => {
    setEditEntry({
      ...entry,
      validUntil: new Date(entry.validUntil).toISOString().split("T")[0],
    });
    setOpenEditDialog(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editEntry.username || !editEntry.password || !editEntry.aliasNotes) {
      showSnackbar("Bitte füllen Sie alle Felder aus.", "error");
      return;
    }
    setIsLoading(true);
    try {
      const updatedEntry = {
        ...editEntry,
        validUntil: new Date(editEntry.validUntil),
      };
      const { error } = await supabase
        .from("entries")
        .update(updatedEntry)
        .eq("id", editEntry.id);
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) => (e.id === editEntry.id ? updatedEntry : e))
      );
      setOpenEditDialog(false);
      showSnackbar("Eintrag erfolgreich bearbeitet!");
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [editEntry, setEntries, showSnackbar]);

  const filteredEntries = useMemo(() => {
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

  const toggleStatus = useCallback(async (entryId, currentStatus) => {
    const newStatus = currentStatus === "Aktiv" ? "Inaktiv" : "Aktiv";
    setIsLoading(true);
    try {
      const { error } = await supabase.from("entries").update({ status: newStatus }).eq("id", entryId);
      if (error) throw error;
      setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, status: newStatus } : e)));
      showSnackbar(`Status auf "${newStatus}" geändert.`);
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [setEntries, showSnackbar]);

  const togglePaymentStatus = useCallback(async (entryId, currentPaymentStatus) => {
    const newPaymentStatus = currentPaymentStatus === "Gezahlt" ? "Nicht gezahlt" : "Gezahlt";
    setIsLoading(true);
    try {
      const updateData = { paymentStatus: newPaymentStatus };
      if (newPaymentStatus === "Gezahlt") updateData.admin_fee = 0;
      const { error } = await supabase.from("entries").update(updateData).eq("id", entryId);
      if (error) throw error;
      setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, ...updateData } : e)));
      showSnackbar(`Zahlungsstatus auf "${newPaymentStatus}" geändert.`);
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [setEntries, showSnackbar]);

  const handleDeleteClick = useCallback((entryId) => {
    setEntryToDelete(entryId);
    setDeleteConfirmOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("entries").delete().eq("id", entryToDelete);
      if (error) throw error;
      setEntries((prev) => prev.filter((e) => e.id !== entryToDelete));
      showSnackbar("Eintrag gelöscht.");
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
      setDeleteConfirmOpen(false);
      setEntryToDelete(null);
    }
  }, [entryToDelete, setEntries, showSnackbar]);

  return (
    <Box sx={{ padding: 2 }}>
      {role !== "Admin" && (
        <>
          <Box sx={{ padding: 0.5, backgroundColor: "#f5f5f5", borderRadius: 2, mb: 1 }}>
            <Typography variant="body2" sx={{ color: "green" }}>
              Gesamtkosten deiner Einträge: {calculateTotalFeesForOwner(loggedInUser)}$ €
            </Typography>
          </Box>
          <Box sx={{ mb: 3, display: "flex", flexDirection: "column", gap: 2 }}>
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
                sx={{ borderRadius: 2 }}
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
                sx={{ borderRadius: 2 }}
              >
                Bestehenden Abonnenten einpflegen
              </Button>
            </Box>
          </Box>
        </>
      )}
      <Box sx={{ mb: 3, display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2 }}>
        <TextField
          label="🔍 Suche nach Benutzername oder Spitzname"
          variant="outlined"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={isLoading}
          sx={{ backgroundColor: "white", borderRadius: 2 }}
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          displayEmpty
          fullWidth
          variant="outlined"
          sx={{ minWidth: 120, backgroundColor: "white", borderRadius: 2 }}
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
          sx={{ minWidth: 120, backgroundColor: "white", borderRadius: 2 }}
        >
          <MenuItem value="">Alle Zahlungen</MenuItem>
          <MenuItem value="Gezahlt">Gezahlt</MenuItem>
          <MenuItem value="Nicht gezahlt">Nicht gezahlt</MenuItem>
        </Select>
      </Box>
      {role === "Admin" && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Ersteller auswählen:
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {uniqueOwners.map((owner) => (
              <Chip
                key={owner}
                label={`${owner} (${countEntriesByOwner(owner)}) - ${calculateTotalFeesForOwner(owner)}$ €`}
                onClick={() => setSelectedUser(owner)}
                color={selectedUser === owner ? "primary" : "default"}
                sx={{ backgroundColor: OWNER_COLORS[owner], "&:hover": { opacity: 0.8 } }}
              />
            ))}
            <Chip label="Alle" onClick={() => setSelectedUser("")} variant="outlined" />
          </Box>
        </Box>
      )}
      <Grid container spacing={2}>
        {filteredEntries.length > 0 ? (
          filteredEntries.map((entry) => (
            <Grid item xs={12} sm={6} md={4} key={entry.id}>
              <Card
                sx={{
                  borderRadius: 2,
                  boxShadow: 3,
                  backgroundColor: OWNER_COLORS[entry.owner] || "#fff",
                  transition: "transform 0.2s",
                  "&:hover": { transform: "scale(1.02)" },
                }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {entry.aliasNotes} ({entry.username})
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Benutzername:</strong> {entry.username}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Passwort:</strong> {entry.password}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Spitzname/Notizen:</strong> {entry.aliasNotes}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Typ:</strong> {entry.type}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Ersteller:</strong> {entry.owner}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Erstellt am:</strong> {formatDate(entry.createdAt)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Gültig bis:</strong> {formatDate(entry.validUntil)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Bouget-Liste:</strong> {entry.bougetList || "Nicht angegeben"}
                  </Typography>
                  {role === "Admin" && (
                    <Typography variant="body2" color="textSecondary">
                      <strong>Admin-Gebühr:</strong>{" "}
                      {entry.admin_fee ? `${entry.admin_fee}$` : "Nicht gesetzt"}
                    </Typography>
                  )}
                  {entry.note && (
                    <Typography variant="body2" color="textSecondary">
                      <strong>Notiz:</strong> {entry.note}
                    </Typography>
                  )}
                  {entry.extensionHistory && entry.extensionHistory.length > 0 && (
                    <Typography variant="body2" color="textSecondary">
                      <strong>Verlängerungsverlauf:</strong>{" "}
                      {entry.extensionHistory.map((date) => formatDate(date)).join(", ")}
                    </Typography>
                  )}
                  <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                    <Chip
                      label={entry.status}
                      size="small"
                      color={entry.status === "Aktiv" ? "success" : "error"}
                    />
                    <Chip
                      label={entry.paymentStatus}
                      size="small"
                      color={entry.paymentStatus === "Gezahlt" ? "success" : "error"}
                    />
                  </Box>
                </CardContent>
                {role === "Admin" && (
                  <CardActions sx={{ justifyContent: "space-between", p: 2 }}>
                    <Tooltip title={`Status: ${entry.status}`}>
                      <IconButton
                        onClick={() => toggleStatus(entry.id, entry.status)}
                        disabled={isLoading}
                      >
                        {entry.status === "Aktiv" ? (
                          <CancelIcon color="error" />
                        ) : (
                          <CheckCircleIcon color="success" />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={`Zahlung: ${entry.paymentStatus}`}>
                      <IconButton
                        onClick={() => togglePaymentStatus(entry.id, entry.paymentStatus)}
                        disabled={isLoading}
                      >
                        {entry.paymentStatus === "Gezahlt" ? (
                          <CancelIcon color="error" />
                        ) : (
                          <CheckCircleIcon color="success" />
                        )}
                      </IconButton>
                    </Tooltip>
                    <IconButton onClick={() => handleOpenEditDialog(entry)} disabled={isLoading}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteClick(entry.id)} disabled={isLoading}>
                      <DeleteIcon color="error" />
                    </IconButton>
                  </CardActions>
                )}
              </Card>
            </Grid>
          ))
        ) : (
          <Typography sx={{ p: 2 }}>🚀 Keine passenden Einträge gefunden.</Typography>
        )}
      </Grid>
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} fullScreen>
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
          <Button onClick={() => setOpenCreateDialog(false)} color="secondary" disabled={isLoading}>
            Abbrechen
          </Button>
          <Button onClick={createEntry} color="primary" disabled={isLoading}>
            {isLoading ? "Speichere..." : "Hinzufügen"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openManualDialog} onClose={() => setOpenManualDialog(false)} fullScreen>
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
          <Button onClick={() => setOpenManualDialog(false)} color="secondary" disabled={isLoading}>
            Abbrechen
          </Button>
          <Button onClick={handleAddManualEntry} color="primary" disabled={isLoading}>
            {isLoading ? "Speichere..." : "Hinzufügen"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} fullScreen>
        <DialogTitle>Eintrag bearbeiten</DialogTitle>
        <DialogContent>
          {editEntry && (
            <>
              <TextField
                label="Benutzername"
                fullWidth
                margin="normal"
                value={editEntry.username}
                onChange={(e) => setEditEntry({ ...editEntry, username: e.target.value })}
                disabled={isLoading}
              />
              <TextField
                label="Passwort"
                fullWidth
                margin="normal"
                type="text"
                value={editEntry.password}
                onChange={(e) => setEditEntry({ ...editEntry, password: e.target.value })}
                disabled={isLoading}
              />
              <TextField
                label="Spitzname, Notizen etc."
                fullWidth
                margin="normal"
                value={editEntry.aliasNotes}
                onChange={(e) => setEditEntry({ ...editEntry, aliasNotes: e.target.value })}
                disabled={isLoading}
              />
              <TextField
                label="Bouget-Liste (z.B. GER, CH, USA, XXX usw... oder Alles)"
                fullWidth
                margin="normal"
                value={editEntry.bougetList || ""}
                onChange={(e) => setEditEntry({ ...editEntry, bougetList: e.target.value })}
                disabled={isLoading}
              />
              <Select
                fullWidth
                margin="normal"
                value={editEntry.type}
                onChange={(e) => setEditEntry({ ...editEntry, type: e.target.value })}
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
                value={editEntry.validUntil}
                onChange={(e) => setEditEntry({ ...editEntry, validUntil: e.target.value })}
                disabled={isLoading}
              />
              {role === "Admin" && (
                <TextField
                  label="Admin-Gebühr ($)"
                  fullWidth
                  margin="normal"
                  type="number"
                  value={editEntry.admin_fee || ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, "");
                    const numValue = value ? parseInt(value) : null;
                    if (numValue > 999) return;
                    setEditEntry({ ...editEntry, admin_fee: numValue });
                  }}
                  inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                  disabled={isLoading}
                />
              )}
              <TextField
                label="Notiz"
                fullWidth
                margin="normal"
                value={editEntry.note || ""}
                onChange={(e) => setEditEntry({ ...editEntry, note: e.target.value })}
                disabled={isLoading}
              />
              <Typography variant="body1">
                <strong>Erstellt am:</strong> {formatDate(editEntry.createdAt)}
              </Typography>
              {isLoading && <Typography>🔄 Speichere...</Typography>}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)} color="secondary" disabled={isLoading}>
            Abbrechen
          </Button>
          <Button onClick={handleSaveEdit} color="primary" disabled={isLoading}>
            {isLoading ? "Speichere..." : "Speichern"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Löschbestätigung</DialogTitle>
        <DialogContent>
          <Typography>Möchten Sie diesen Eintrag wirklich löschen?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="secondary" disabled={isLoading}>
            Abbrechen
          </Button>
          <Button onClick={confirmDelete} color="error" disabled={isLoading}>
            {isLoading ? "Lösche..." : "Löschen"}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={closeSnackbar}>
        <Alert onClose={closeSnackbar} severity={snackbarSeverity} sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EntryList;
