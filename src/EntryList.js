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
  AppBar,
  Toolbar,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { supabase } from "./supabaseClient";
import { formatDate, generateUsername, useDebounce, handleError } from "./utils";

// Unterkomponente: Backup-Import
const ImportBackup = ({ setEntries, setSnackbarMessage, setSnackbarOpen }) => {
  const [file, setFile] = useState(null);

  const handleFileChange = (event) => setFile(event.target.files[0]);

  const importBackup = async () => {
    if (!file) {
      setSnackbarMessage("Bitte wählen Sie eine Datei aus.");
      setSnackbarOpen(true);
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        for (const entry of jsonData) {
          const { error } = await supabase.from("entries").insert([entry]);
          if (error) throw error;
        }
        setEntries((prev) => [...prev, ...jsonData]);
        setSnackbarMessage("Backup erfolgreich importiert!");
        setSnackbarOpen(true);
      } catch (error) {
        handleError(error, setSnackbarMessage, setSnackbarOpen);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <input type="file" accept=".json" onChange={handleFileChange} />
      <Button variant="contained" color="primary" onClick={importBackup} sx={{ marginLeft: 2 }}>
        Backup importieren
      </Button>
    </Box>
  );
};

// Unterkomponente: Eintrag
const EntryAccordion = ({ entry, role, loggedInUser, setEntries, setSnackbarMessage, setSnackbarOpen }) => {
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
    } catch (error) {
      handleError(error, setSnackbarMessage, setSnackbarOpen);
    }
  };

  const requestExtension = async (entryId) => {
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

  return (
    <Accordion sx={{ marginBottom: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>
          <strong>Erstellt von:</strong> {entry.owner} <br />
          <strong>Benutzername:</strong> {entry.username} | <strong>Passwort:</strong> {entry.password} |{" "}
          <strong>Spitzname:</strong> {entry.aliasNotes}
          {entry.note && <span style={{ color: "red" }}> ({entry.note})</span>}
        </Typography>
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
        <Button
          onClick={() => requestExtension(entry.id)}
          variant="contained"
          color="primary"
          sx={{ marginTop: 2 }}
        >
          +1 Jahr verlängern
        </Button>
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
              onClick={() => deleteEntry(entry.id)}
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
            >
              Löschen
            </Button>
            <Button
              onClick={() => approveExtension(entry.id)}
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
  const [loading, setLoading] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

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
      <AppBar position="static">
        <Toolbar>
          {role === "Admin" && (
            <ImportBackup
              setEntries={setEntries}
              setSnackbarOpen={setSnackbarOpen}
              setSnackbarMessage={setSnackbarMessage}
            />
          )}
        </Toolbar>
      </AppBar>
      <Box
        sx={{
          padding: 2,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          marginBottom: 3,
        }}
      >
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
        {loading ? (
          <Typography>🚀 Lade Einträge...</Typography>
        ) : filterEntries.length > 0 ? (
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
