import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Badge,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import BackupIcon from "@mui/icons-material/Backup";
import ChatIcon from "@mui/icons-material/Chat";
import { supabase } from "./supabaseClient";

// Helper functions
const formatDate = (date) => {
  if (!date || isNaN(new Date(date).getTime())) return "Ungültig";
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
      setSnackbarMessage("Bitte Datei auswählen.");
      setSnackbarOpen(true);
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        for (const entry of jsonData) {
          const { error } = await supabase.from("entries_pt2").insert([entry]).select();
          if (error) throw error;
        }
        setSnackbarMessage("Backup importiert!");
        setSnackbarOpen(true);
      } catch (error) {
        setSnackbarMessage("Fehler beim Import.");
        setSnackbarOpen(true);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, p: 1 }}>
      <input type="file" accept=".json" onChange={handleFileChange} style={{ fontSize: "0.9rem" }} />
      <Button variant="contained" onClick={importBackup} size="small">
        Import
      </Button>
    </Box>
  );
};

const EntryList = ({ entries, setEntries, role, loggedInUser }) => {
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
  const [chatUser, setChatUser] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [unreadMessages, setUnreadMessages] = useState({});
  const debouncedSearch = useDebounce(searchTerm, 300);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("entries_pt2").select("*");
      if (error) throw error;
      setEntries(data);
      console.log("Geladene Einträge:", data); // Debugging
    } catch (error) {
      setSnackbarMessage("Fehler beim Laden der Einträge.");
      setSnackbarOpen(true);
      console.error("Fehler beim Laden:", error);
    } finally {
      setLoading(false);
    }
  }, [setEntries]);

  const fetchMessages = useCallback(async (user) => {
    try {
      const { data, error } = await supabase
        .from("messages_pt2")
        .select("*")
        .or(`sender.eq.${user},receiver.eq.${user}`)
        .or(`sender.eq.Admin,receiver.eq.${user}`)
        .order("timestamp", { ascending: true });
      if (error) throw error;
      setChatMessages(data);
    } catch (error) {
      setSnackbarMessage("Fehler beim Laden der Nachrichten.");
      setSnackbarOpen(true);
    }
  }, []);

  const fetchUnreadMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("messages_pt2")
        .select("sender, receiver")
        .eq("receiver", "Admin")
        .neq("sender", "Admin");
      if (error) throw error;
      const unreadCount = data.reduce((acc, msg) => {
        acc[msg.sender] = (acc[msg.sender] || 0) + 1;
        return acc;
      }, {});
      setUnreadMessages(unreadCount);
    } catch (error) {
      setSnackbarMessage("Fehler beim Laden ungelesener Nachrichten.");
      setSnackbarOpen(true);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    if (role === "Admin") fetchUnreadMessages();
  }, [fetchEntries, fetchUnreadMessages, role]);

  useEffect(() => {
    if (role !== "Admin") return;

    const subscription = supabase
      .channel("messages_pt2")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages_pt2" },
        (payload) => {
          const newMessage = payload.new;
          if (newMessage.receiver === "Admin" && newMessage.sender !== "Admin") {
            setChatMessages((prev) =>
              chatUser === newMessage.sender ? [...prev, newMessage] : prev
            );
            if (chatUser !== newMessage.sender) {
              setUnreadMessages((prev) => ({
                ...prev,
                [newMessage.sender]: (prev[newMessage.sender] || 0) + 1,
              }));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [chatUser, role]);

  const handleOpenCreateEntryDialog = () => {
    const username = generateUsername(loggedInUser);
    const randomPassword = Math.random().toString(36).slice(-8);
    setNewEntry({ ...newEntry, username, password: randomPassword });
    setOpenCreateEntryDialog(true);
  };

  const handleOpenManualEntryDialog = () => {
    setOpenManualEntryDialog(true);
  };

  const createEntry = async () => {
    if (!newEntry.aliasNotes.trim() || !newEntry.username.trim()) {
      setSnackbarMessage("Spitzname und Benutzername erforderlich.");
      setSnackbarOpen(true);
      return;
    }
    try {
      const { data, error } = await supabase.from("entries_pt2").insert([newEntry]).select();
      if (error) throw error;
      setEntries((prev) => [data[0], ...prev]);
      setOpenCreateEntryDialog(false);
      setSnackbarMessage("Abonnent hinzugefügt!");
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage("Fehler beim Hinzufügen.");
      setSnackbarOpen(true);
    }
  };

  const handleAddManualEntry = async () => {
    if (!manualEntry.username || !manualEntry.password || !manualEntry.aliasNotes) {
      setSnackbarMessage("Alle Felder ausfüllen.");
      setSnackbarOpen(true);
      return;
    }
    const newManualEntry = {
      ...manualEntry,
      status: "Aktiv",
      paymentStatus: "Gezahlt",
      createdAt: new Date(),
      note: "Bestehender Abonnent",
    };
    try {
      const { data, error } = await supabase.from("entries_pt2").insert([newManualEntry]).select();
      if (error) throw error;
      setEntries((prev) => [data[0], ...prev]);
      setOpenManualEntryDialog(false);
      setSnackbarMessage("Abonnent eingepflegt!");
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage("Fehler beim Einpflegen.");
      setSnackbarOpen(true);
    }
  };

  const changePaymentStatus = async (entryId, paymentStatus) => {
    try {
      const { error } = await supabase.from("entries_pt2").update({ paymentStatus }).eq("id", entryId);
      if (error) throw error;
      setEntries((prev) =>
        prev.map((entry) => (entry.id === entryId ? { ...entry, paymentStatus } : entry))
      );
    } catch (error) {
      setSnackbarMessage("Fehler beim Zahlungsstatus.");
      setSnackbarOpen(true);
    }
  };

  const changeStatus = async (entryId, newStatus) => {
    try {
      const { error } = await supabase.from("entries_pt2").update({ status: newStatus }).eq("id", entryId);
      if (error) throw error;
      setEntries((prev) =>
        prev.map((entry) => (entry.id === entryId ? { ...entry, status: newStatus } : entry))
      );
      setSnackbarMessage(`Status zu "${newStatus}" geändert.`);
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage("Fehler beim Status.");
      setSnackbarOpen(true);
    }
  };

  const deleteEntry = async (entryId) => {
    try {
      const { error } = await supabase.from("entries_pt2").delete().eq("id", entryId);
      if (error) throw error;
      setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    } catch (error) {
      setSnackbarMessage("Fehler beim Löschen.");
      setSnackbarOpen(true);
    }
  };

  const requestExtension = async (entryId) => {
    try {
      const { error } = await supabase
        .from("entries_pt2")
        .update({ extensionRequest: { pending: true, approved: false } })
        .eq("id", entryId);
      if (error) throw error;
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId ? { ...entry, extensionRequest: { pending: true, approved: false } } : entry
        )
      );
      setSnackbarMessage("Verlängerung angefragt.");
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage("Fehler bei Anfrage.");
      setSnackbarOpen(true);
    }
  };

  const approveExtension = async (entryId) => {
    const entry = entries.find((e) => e.id === entryId);
    const newValidUntil = new Date(entry.validUntil);
    newValidUntil.setFullYear(newValidUntil.getFullYear() + 1);
    const updatedEntry = {
      validUntil: newValidUntil,
      extensionRequest: { pending: false, approved: true, approvalDate: new Date() },
      extensionHistory: [...(entry.extensionHistory || []), { approvalDate: new Date(), validUntil: newValidUntil }],
    };
    try {
      const { error } = await supabase.from("entries_pt2").update(updatedEntry).eq("id", entryId);
      if (error) throw error;
      setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, ...updatedEntry } : e)));
      setSnackbarMessage("Verlängerung genehmigt.");
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage("Fehler bei Genehmigung.");
      setSnackbarOpen(true);
    }
  };

  const getStatusColor = (status) => (status === "Aktiv" ? "green" : status === "Inaktiv" ? "red" : "black");
  const getPaymentStatusColor = (paymentStatus) =>
    paymentStatus === "Gezahlt" ? "green" : paymentStatus === "Nicht gezahlt" ? "red" : "black";

  const filterEntries = useMemo(() => {
    return entries
      .filter((entry) =>
        role === "Admin" ? (selectedUser ? entry.owner === selectedUser : true) : entry.owner === loggedInUser
      )
      .filter(
        (entry) =>
          entry.username?.includes(debouncedSearch) || entry.aliasNotes?.includes(debouncedSearch)
      );
  }, [entries, role, selectedUser, loggedInUser, debouncedSearch]);

  const uniqueOwners = [...new Set(entries.map((entry) => entry.owner))];
  const countEntriesByOwner = (owner) => entries.filter((entry) => entry.owner === owner).length;

  const exportEntries = () => {
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
  };

  const entryCount = countEntriesByOwner(loggedInUser);
  const motivationMessage =
    entryCount >= 25
      ? "🎉 Wow! 25+ Einträge!"
      : entryCount >= 20
      ? "🎉 Super! 20+ Einträge!"
      : entryCount >= 15
      ? "🎉 Toll! 15+ Einträge!"
      : entryCount >= 10
      ? "🎉 Gut! 10+ Einträge!"
      : entryCount > 0
      ? `🎉 ${entryCount} Einträge!`
      : "🎉 Los geht's!";

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatUser) return;
    const message = {
      sender: "Admin",
      receiver: chatUser,
      text: newMessage,
      timestamp: new Date(),
    };
    try {
      const { error } = await supabase.from("messages_pt2").insert([message]);
      if (error) throw error;
      setChatMessages((prev) => [...prev, message]);
      setNewMessage("");
    } catch (error) {
      setSnackbarMessage("Fehler beim Senden der Nachricht.");
      setSnackbarOpen(true);
    }
  };

  const handleSelectChatUser = (user) => {
    setChatUser(user);
    fetchMessages(user);
    setUnreadMessages((prev) => ({ ...prev, [user]: 0 }));
  };

  return (
    <Box sx={{ p: 1, maxWidth: "100%", overflowX: "hidden" }}>
      <AppBar position="static" sx={{ mb: 2 }}>
        <Toolbar sx={{ flexDirection: "column", alignItems: "stretch", p: 1 }}>
          {role === "Admin" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <ImportBackup setSnackbarOpen={setSnackbarOpen} setSnackbarMessage={setSnackbarMessage} />
              <Button variant="contained" onClick={exportEntries} size="small" startIcon={<BackupIcon />}>
                Backup
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Button
            onClick={handleOpenCreateEntryDialog}
            variant="contained"
            color="success"
            size="large"
            startIcon={<AddIcon />}
          >
            Neu
          </Button>
          <Button
            onClick={handleOpenManualEntryDialog}
            variant="contained"
            color="primary"
            size="large"
            startIcon={<EditIcon />}
          >
            Bestehend
          </Button>
        </Box>
        <Typography variant="h6" align="center">
          {motivationMessage}
        </Typography>
      </Box>

      {role === "Admin" && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1">Filter:</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {uniqueOwners.map((owner) => (
              <Button
                key={owner}
                variant={selectedUser === owner ? "contained" : "outlined"}
                onClick={() => setSelectedUser(owner)}
                size="small"
              >
                {owner} ({countEntriesByOwner(owner)})
              </Button>
            ))}
            <Button variant="outlined" onClick={() => setSelectedUser("")} size="small">
              Alle
            </Button>
          </Box>
        </Box>
      )}

      <TextField
        label="Suche"
        variant="outlined"
        fullWidth
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 2 }}
        size="small"
      />

      {/* Chat-Bereich für Admin */}
      {role === "Admin" && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1">Chats:</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1 }}>
            {uniqueOwners
              .filter((owner) => owner !== "Admin")
              .map((owner) => (
                <Badge
                  key={owner}
                  badgeContent={unreadMessages[owner] || 0}
                  color="error"
                  invisible={!unreadMessages[owner]}
                >
                  <Button
                    variant={chatUser === owner ? "contained" : "outlined"}
                    onClick={() => handleSelectChatUser(owner)}
                    size="small"
                    startIcon={<ChatIcon />}
                  >
                    {owner}
                  </Button>
                </Badge>
              ))}
            {uniqueOwners.filter((owner) => owner !== "Admin").length === 0 && (
              <Typography variant="body2">Keine Ersteller verfügbar.</Typography>
            )}
          </Box>

          {chatUser && (
            <Box sx={{ border: "1px solid #ccc", p: 1, borderRadius: 1, maxHeight: 200, overflowY: "auto" }}>
              {chatMessages.length > 0 ? (
                chatMessages.map((msg, idx) => (
                  <Typography
                    key={idx}
                    variant="body2"
                    sx={{ textAlign: msg.sender === "Admin" ? "right" : "left", mb: 1 }}
                  >
                    <strong>{msg.sender}:</strong> {msg.text} ({formatDate(msg.timestamp)})
                  </Typography>
                ))
              ) : (
                <Typography variant="body2" color="textSecondary">
                  Keine Nachrichten bisher.
                </Typography>
              )}
            </Box>
          )}
          {chatUser && (
            <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
              <TextField
                label="Nachricht"
                fullWidth
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                size="small"
              />
              <Button variant="contained" onClick={sendMessage} size="small">
                Senden
              </Button>
            </Box>
          )}
        </Box>
      )}

      {loading ? (
        <Typography>Lade...</Typography>
      ) : filterEntries.length > 0 ? (
        filterEntries.map((entry) => (
          <Accordion key={entry.id} sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2">
                <strong>{entry.owner}</strong> | {entry.username} | {entry.aliasNotes}
                {entry.note && <span style={{ color: "red" }}> ({entry.note})</span>}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="textSecondary">
                Typ: {entry.type} | Bouget: {entry.bougetList || "N/A"}
              </Typography>
              <Typography variant="body2" sx={{ color: getStatusColor(entry.status) }}>
                Status: {entry.status}
              </Typography>
              <Typography variant="body2" sx={{ color: getPaymentStatusColor(entry.paymentStatus) }}>
                Zahlung: {entry.paymentStatus}
              </Typography>
              <Typography variant="body2">Erstellt: {formatDate(entry.createdAt)}</Typography>
              <Typography variant="body2">
                Gültig bis: {formatDate(entry.validUntil)}
                {entry.extensionRequest?.pending && <span style={{ color: "orange" }}> (Anfrage)</span>}
                {entry.extensionRequest?.approved && <span style={{ color: "green" }}> (Genehmigt)</span>}
              </Typography>
              <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 1 }}>
                <Button onClick={() => requestExtension(entry.id)} variant="outlined" size="small">
                  +1 Jahr
                </Button>
                {role === "Admin" && (
                  <>
                    <Button
                      onClick={() => changeStatus(entry.id, entry.status === "Aktiv" ? "Inaktiv" : "Aktiv")}
                      variant="outlined"
                      size="small"
                    >
                      {entry.status === "Aktiv" ? "Inaktiv" : "Aktiv"}
                    </Button>
                    <Button
                      onClick={() =>
                        changePaymentStatus(
                          entry.id,
                          entry.paymentStatus === "Gezahlt" ? "Nicht gezahlt" : "Gezahlt"
                        )
                      }
                      variant="outlined"
                      size="small"
                    >
                      {entry.paymentStatus === "Gezahlt" ? "Nicht gezahlt" : "Gezahlt"}
                    </Button>
                    <Button onClick={() => deleteEntry(entry.id)} variant="outlined" color="error" size="small">
                      <DeleteIcon fontSize="small" />
                    </Button>
                    <Button onClick={() => approveExtension(entry.id)} variant="outlined" color="success" size="small">
                      Genehmigen
                    </Button>
                  </>
                )}
              </Box>
              {role === "Admin" && entry.extensionHistory?.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption">Historie:</Typography>
                  {entry.extensionHistory.map((ext, idx) => (
                    <Typography key={idx} variant="body2">
                      {formatDate(ext.approvalDate)} - {formatDate(ext.validUntil)}
                    </Typography>
                  ))}
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        ))
      ) : (
        <Typography>Keine Einträge.</Typography>
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="info" sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <Dialog open={openCreateEntryDialog} onClose={() => setOpenCreateEntryDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Neuer Abonnent</DialogTitle>
        <DialogContent>
          <TextField
            label="Spitzname"
            fullWidth
            margin="dense"
            value={newEntry.aliasNotes}
            onChange={(e) => setNewEntry({ ...newEntry, aliasNotes: e.target.value })}
            size="small"
          />
          <TextField
            label="Bouget-Liste"
            fullWidth
            margin="dense"
            value={newEntry.bougetList}
            onChange={(e) => setNewEntry({ ...newEntry, bougetList: e.target.value })}
            size="small"
          />
          <Select
            fullWidth
            value={newEntry.type}
            onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value })}
            size="small"
            margin="dense"
          >
            <MenuItem value="Premium">Premium</MenuItem>
            <MenuItem value="Basic">Basic</MenuItem>
          </Select>
          <TextField label="Benutzer" fullWidth margin="dense" value={newEntry.username} disabled size="small" />
          <TextField label="Passwort" fullWidth margin="dense" value={newEntry.password} disabled size="small" />
          <Typography variant="body2">Gültig bis: {formatDate(newEntry.validUntil)}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateEntryDialog(false)} size="small">
            Abbrechen
          </Button>
          <Button onClick={createEntry} color="primary" size="small">
            Hinzufügen
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openManualEntryDialog} onClose={() => setOpenManualEntryDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Bestehender Abonnent</DialogTitle>
        <DialogContent>
          <TextField
            label="Benutzer"
            fullWidth
            margin="dense"
            value={manualEntry.username}
            onChange={(e) => setManualEntry({ ...manualEntry, username: e.target.value })}
            size="small"
          />
          <TextField
            label="Passwort"
            fullWidth
            margin="dense"
            value={manualEntry.password}
            onChange={(e) => setManualEntry({ ...manualEntry, password: e.target.value })}
            size="small"
          />
          <TextField
            label="Spitzname"
            fullWidth
            margin="dense"
            value={manualEntry.aliasNotes}
            onChange={(e) => setManualEntry({ ...manualEntry, aliasNotes: e.target.value })}
            size="small"
          />
          <TextField
            label="Bouget-Liste"
            fullWidth
            margin="dense"
            value={manualEntry.bougetList}
            onChange={(e) => setManualEntry({ ...manualEntry, bougetList: e.target.value })}
            size="small"
          />
          <Select
            fullWidth
            value={manualEntry.type}
            onChange={(e) => setManualEntry({ ...manualEntry, type: e.target.value })}
            size="small"
            margin="dense"
          >
            <MenuItem value="Premium">Premium</MenuItem>
            <MenuItem value="Basic">Basic</MenuItem>
          </Select>
          <TextField
            label="Gültig bis"
            fullWidth
            margin="dense"
            type="date"
            value={manualEntry.validUntil.toISOString().split("T")[0]}
            onChange={(e) => setManualEntry({ ...manualEntry, validUntil: new Date(e.target.value) })}
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenManualEntryDialog(false)} size="small">
            Abbrechen
          </Button>
          <Button onClick={handleAddManualEntry} color="primary" size="small">
            Hinzufügen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EntryList;
