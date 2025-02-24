import React, { useState, useMemo } from "react";
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
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { supabase } from "./supabaseClient";
import { formatDate, generateUsername, useDebounce, handleError } from "./utils";

// Unterkomponente: Eintrag
const EntryAccordion = ({ entry, role, loggedInUser, setEntries, setSnackbarMessage, setSnackbarOpen }) => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false); // Dialog für Löschen
  const [extensionConfirmOpen, setExtensionConfirmOpen] = useState(false); // Dialog für Verlängerung

  const changePaymentStatus = async (entryId, paymentStatus) => {
    try {
      const { error } = await supabase.from("entries").update({ paymentStatus }).eq("id", entryId);
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, paymentStatus } : e))
      );
    } catch (error) {
      handleError(error, setSnackbarMessage, setSnackbarOpen);
    }
  };

  const changeStatus = async (entryId, newStatus) => {
    try {
      const { error } = await supabase.from("entries").update({ status: newStatus }).eq("id", entryId);
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, status: newStatus } : e))
      );
      setSnackbarMessage(`Status erfolgreich auf "${newStatus}" geändert.`);
      setSnackbarOpen(true);
    } catch (error) {
      handleError(error, setSnackbarMessage, setSnackbarOpen);
    }
  };

  const deleteEntry = async (entryId) => {
    try {
      const { error } = await supabase.from("entries").delete().eq("id", entryId);
      if (error) throw error;
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      setDeleteConfirmOpen(false); // Schließe den Dialog nach dem Löschen
      setSnackbarMessage("Eintrag erfolgreich gelöscht.");
      setSnackbarOpen(true);
    } catch (error) {
      handleError(error, setSnackbarMessage, setSnackbarOpen);
    }
  };

  const requestExtension = async (entryId) => {
    // Prüfe, ob das aktuelle Datum ab dem 1. Oktober des aktuellen Jahres ist
    const today = new Date();
    const currentYear = today.getFullYear();
    const octoberFirst = new Date(currentYear, 9, 1); // Monat 9 = Oktober (0-basiert)

    if (today < octoberFirst) {
      setSnackbarMessage("Die Verlängerung ist erst ab dem 01.10. aktiviert.");
      setSnackbarOpen(true);
      return;
    }

    try {
      const { error } = await supabase
        .from("entries")
        .update({ extensionRequest: { pending: true, approved: false } })
        .eq("id", entryId);
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId ? { ...e, extensionRequest: { pending: true, approved: false } } : e
        )
      );
      setSnackbarMessage("Anfrage zur Verlängerung gesendet.");
      setSnackbarOpen(true);
    } catch (error) {
      handleError(error, setSnackbarMessage, setSnackbarOpen);
    }
  };

  const approveExtension = async (entryId) => {
    const currentEntry = entry;
    const newValidUntil = new Date(currentEntry.validUntil);
    newValidUntil.setFullYear(newValidUntil.getFullYear() + 1);

    const updatedEntry = {
      validUntil: newValidUntil.toISOString(),
      extensionRequest: { pending: false, approved: true, approvalDate: new Date().toISOString() },
      extensionHistory: [
        ...(currentEntry.extensionHistory || []),
        { approvalDate: new Date().toISOString(), validUntil: newValidUntil.toISOString() },
      ],
    };

    try {
      const { data, error } = await supabase
        .from("entries")
        .update(updatedEntry)
        .eq("id", entryId)
        .select()
        .single();
      if (error) throw error;

      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, ...data } : e))
      );
      setExtensionConfirmOpen(false); // Schließe den Dialog nach dem Genehmigen
      setSnackbarMessage("Verlängerung genehmigt.");
      setSnackbarOpen(true);
    } catch (error) {
      handleError(error, setSnackbarMessage, setSnackbarOpen);
    }
  };

  const getStatusColor = (status) =>
    status === "Aktiv" ? "green" : status === "Inaktiv" ? "red" : "black";
  const getPaymentStatusColor = (paymentStatus) =>
    paymentStatus === "Gezahlt" ? "green" : paymentStatus === "Nicht gezahlt" ? "red" : "black";

  // Prüfe, ob das aktuelle Datum vor dem 1. Oktober liegt
  const today = new Date();
  const currentYear = today.getFullYear();
  const octoberFirst = new Date(currentYear, 9, 1); // Monat 9 = Oktober (0-basiert)
  const isBeforeOctober = today < octoberFirst;

  return (
    <Accordion sx={{ marginBottom: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: getStatusColor(entry.status),
            }}
          />
          <Typography>
            <strong>Erstellt von:</strong> {entry.owner} <br />
            <strong>Benutzername:</strong> {entry.username} | <strong>Passwort:</strong> {entry.password} |{" "}
            <strong>Spitzname:</strong> {entry.aliasNotes}
            {entry.note && <span style={{ color: "red" }}> ({entry.note})</span>}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Typography style={{ color: "black" }}>
          <strong>Typ:</strong> {entry.type}
        </Typography>
        <Typography style={{ color: "black" }}>
          <strong>Bouget-Liste:</strong> {entry.bougetList}
        </Typography>
        <Typography style={{ color: getStatusColor(entry.status) }}>
          <strong>Status:</strong> {entry.status}
        </Typography>
        <Typography style={{ color: getPaymentStatusColor(entry.paymentStatus) }}>
          <strong>Zahlung:</strong> {entry.paymentStatus}
        </Typography>
        <Typography style={{ color: "black" }}>
          <strong>Erstellt am:</strong> {formatDate(entry.createdAt)}
        </Typography>
        <Typography style={{ color: "black" }}>
          <strong>Gültig bis:</strong> {formatDate(entry.validUntil)}
          {entry.extensionRequest?.pending && (
            <span style={{ color: "orange" }}> (Anfrage beim Admin gestellt)</span>
          )}
          {entry.extensionRequest?.approved && (
            <span style={{ color: "green" }}> (Verlängerung genehmigt)</span>
          )}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, marginTop: 2 }}>
          {isBeforeOctober && (
            <Typography variant="caption" sx={{ color: "gray", fontStyle: "italic" }}>
              Ab 01.10 anwählbar
            </Typography>
          )}
          <Button
            onClick={() => requestExtension(entry.id)}
            variant="contained"
            color="primary"
            disabled={isBeforeOctober}
          >
            +1 Jahr verlängern
          </Button>
        </Box>
        {role === "Admin" && (
          <Box sx={{ marginTop: 2 }}>
            <Button
              onClick={() => changeStatus(entry.id, entry.status === "Aktiv" ? "Inaktiv" : "Aktiv")}
              variant="contained"
              color="secondary"
              sx={{ marginRight: 1 }}
            >
              {entry.status === "Aktiv" ? "Setze Inaktiv" : "Setze Aktiv"}
            </Button>
            <Button
              onClick={() =>
                changePaymentStatus(
                  entry.id,
                  entry.paymentStatus === "Gezahlt" ? "Nicht gezahlt" : "Gezahlt"
                )
              }
              variant="contained"
              color="secondary"
              sx={{ marginRight: 1 }}
            >
              {entry.paymentStatus === "Gezahlt" ? "Setze Nicht gezahlt" : "Setze Gezahlt"}
            </Button>
            <Button
              onClick={() => setDeleteConfirmOpen(true)} // Öffne Dialog für Löschen
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
            >
              Löschen
            </Button>
            <Button
              onClick={() => setExtensionConfirmOpen(true)} // Öffne Dialog für Verlängerung
              variant="contained"
              color="success"
              sx={{ marginLeft: 1 }}
            >
              Verlängerung genehmigen
            </Button>
          </Box>
        )}
        {role === "Admin" && (
          <Box sx={{ marginTop: 2 }}>
            <Typography variant="body2">
              <strong>Verlängerungshistorie:</strong>
            </Typography>
            {entry.extensionHistory?.length > 0 ? (
              entry.extensionHistory.map((extension, idx) => (
                <Typography key={idx} variant="body2">
                  Verlängerung genehmigt am: {formatDate(extension.approvalDate)} | Gültig bis:{" "}
                  {formatDate(extension.validUntil)}
                </Typography>
              ))
            ) : (
              <Typography variant="body2">Keine Verlängerungen vorhanden.</Typography>
            )}
          </Box>
        )}
        {/* Dialog für Bestätigung des Löschens */}
        <Dialog
          open={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          aria-labelledby="delete-confirm-dialog"
        >
          <DialogTitle id="delete-confirm-dialog">Eintrag löschen</DialogTitle>
          <DialogContent>
            <Typography>
              Möchtest du den Eintrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmOpen(false)} color="secondary">
              Abbrechen
            </Button>
            <Button onClick={() => deleteEntry(entry.id)} color="error">
              Löschen
            </Button>
          </DialogActions>
        </Dialog>
        {/* Dialog für Bestätigung der Verlängerung */}
        <Dialog
          open={extensionConfirmOpen}
          onClose={() => setExtensionConfirmOpen(false)}
          aria-labelledby="extension-confirm-dialog"
        >
          <DialogTitle id="extension-confirm-dialog">Verlängerung genehmigen</DialogTitle>
          <DialogContent>
            <Typography>
              Möchtest du die Verlängerung wirklich genehmigen? Dies verlängert die Gültigkeit um ein Jahr.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setExtensionConfirmOpen(false)} color="secondary">
              Abbrechen
            </Button>
            <Button onClick={() => approveExtension(entry.id)} color="success">
              Genehmigen
            </Button>
          </DialogActions>
        </Dialog>
      </AccordionDetails>
    </Accordion>
  );
};

const EntryList = ({ role, loggedInUser, entries, setEntries }) => {
  const [openCreateEntryDialog, setOpenCreateEntryDialog] = useState(false);
  const [openManualEntryDialog, setOpenManualEntryDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
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
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Funktion zur Zählung der Einträge des Benutzers
  const countEntriesByOwner = (owner) => {
    return entries.filter((entry) => entry.owner === owner).length;
  };

  // Motivationsnachricht basierend auf der Anzahl der Einträge
  const entryCount = countEntriesByOwner(loggedInUser);
  let motivationMessage = "";
  if (entryCount >= 10 && entryCount < 15) {
    motivationMessage =
      "🎉 Super! Du hast bereits 10 Einträge erreicht! Mach weiter so, du bist auf dem besten Weg zu 15!";
  } else if (entryCount >= 15 && entryCount < 20) {
    motivationMessage =
      "🎉 Fantastisch! 15 Einträge sind erreicht! Nur noch 5 bis zu 20! Lass uns das schaffen!";
  } else if (entryCount >= 20 && entryCount < 25) {
    motivationMessage =
      "🎉 Großartig! Du hast 20 Einträge! Nur noch 5 bis zu 25! Weiter so!";
  } else if (entryCount >= 25) {
    motivationMessage =
      "🎉 Wow! Du hast 25 Einträge erreicht! Deine Kreativität kennt keine Grenzen! Mach weiter so!";
  } else if (entryCount > 0) {
    motivationMessage = `🎉 Du hast ${entryCount} Einträge erstellt! Weiter so, der nächste Meilenstein ist 5!`;
  } else {
    motivationMessage =
      "🎉 Du hast noch keine Einträge erstellt. Lass uns mit dem ersten Eintrag beginnen!";
  }

  const handleOpenCreateEntryDialog = () => {
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
  };

  const handleOpenManualEntryDialog = () => {
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
  };

  const createEntry = async () => {
    if (!newEntry.aliasNotes.trim() || !newEntry.username.trim()) {
      setSnackbarMessage("Bitte Spitzname und Benutzername eingeben.");
      setSnackbarOpen(true);
      return;
    }
    try {
      const { data, error } = await supabase.from("entries").insert([newEntry]).select();
      if (error) throw error;
      setEntries((prev) => [data[0], ...prev]);
      setOpenCreateEntryDialog(false);
      setSnackbarMessage("Neuer Abonnent erfolgreich angelegt!");
      setSnackbarOpen(true);
    } catch (error) {
      handleError(error, setSnackbarMessage, setSnackbarOpen);
    }
  };

  const handleAddManualEntry = async () => {
    if (!manualEntry.username || !manualEntry.password || !manualEntry.aliasNotes) {
      setSnackbarMessage("Bitte füllen Sie alle Felder aus.");
      setSnackbarOpen(true);
      return;
    }
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
    }
  };

  const filterEntries = useMemo(() => {
    return entries
      .filter((entry) =>
        role === "Admin" ? (selectedUser ? entry.owner === selectedUser : true) : entry.owner === loggedInUser
      )
      .filter((entry) =>
        [entry.username, entry.aliasNotes].some((field) =>
          field?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        )
      );
  }, [entries, role, selectedUser, loggedInUser, debouncedSearchTerm]);

  const uniqueOwners = [...new Set(entries.map((entry) => entry.owner))];

  return (
    <div>
      <Box
        sx={{
          padding: 2,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          marginBottom: 3,
        }}
      >
        {/* Motivationsnachricht anzeigen */}
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
          >
            Abonnent anlegen
          </Button>
          <Button
            onClick={handleOpenManualEntryDialog}
            variant="contained"
            color="primary"
            startIcon={<EditIcon />}
            fullWidth
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
      <TextField
        label="🔍 Suchen nach Benutzername oder Spitzname"
        variant="outlined"
        fullWidth
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ marginBottom: 3, padding: 2 }}
      />
      <Box sx={{ maxHeight: "60vh", overflowY: "auto", padding: 2 }}>
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
          />
          <TextField
            label="Bouget-Liste (z.B. GER, CH, USA, XXX usw... oder Alles)"
            fullWidth
            margin="normal"
            value={newEntry.bougetList}
            onChange={(e) => setNewEntry({ ...newEntry, bougetList: e.target.value })}
          />
          <Select
            fullWidth
            margin="normal"
            value={newEntry.type}
            onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value })}
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateEntryDialog(false)} color="secondary">
            Abbrechen
          </Button>
          <Button onClick={createEntry} color="primary">
            Hinzufügen
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
          />
          <TextField
            label="Passwort"
            fullWidth
            margin="normal"
            type="password"
            value={manualEntry.password}
            onChange={(e) => setManualEntry({ ...manualEntry, password: e.target.value })}
          />
          <TextField
            label="Spitzname, Notizen etc."
            fullWidth
            margin="normal"
            value={manualEntry.aliasNotes}
            onChange={(e) => setManualEntry({ ...manualEntry, aliasNotes: e.target.value })}
          />
          <TextField
            label="Bouget-Liste (z.B. GER, CH, USA, XXX usw... oder Alles)"
            fullWidth
            margin="normal"
            value={manualEntry.bougetList}
            onChange={(e) => setManualEntry({ ...manualEntry, bougetList: e.target.value })}
          />
          <Select
            fullWidth
            margin="normal"
            value={manualEntry.type}
            onChange={(e) => setManualEntry({ ...manualEntry, type: e.target.value })}
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
          />
          <Typography variant="body1">
            <strong>Aktuelles Datum:</strong> {formatDate(new Date())}
          </Typography>
          <Typography variant="body1">
            <strong>Gültig bis:</strong> {formatDate(manualEntry.validUntil)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenManualEntryDialog(false)} color="secondary">
            Abbrechen
          </Button>
          <Button onClick={handleAddManualEntry} color="primary">
            Hinzufügen
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default EntryList;
