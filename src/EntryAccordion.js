import React, { useState, useCallback } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { supabase } from "./supabaseClient";
import { formatDate, handleError } from "./utils";

const EntryAccordion = ({ entry, role, loggedInUser, setEntries, setSnackbarMessage, setSnackbarOpen }) => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [extensionConfirmOpen, setExtensionConfirmOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [adminEditDialogOpen, setAdminEditDialogOpen] = useState(false);
  const [editedAliasNotes, setEditedAliasNotes] = useState(entry.aliasNotes);
  const [adminEditedEntry, setAdminEditedEntry] = useState({ ...entry });
  const [isLoading, setIsLoading] = useState(false);

  const changePaymentStatus = useCallback(async (entryId, paymentStatus) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("entries").update({ paymentStatus }).eq("id", entryId);
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, paymentStatus } : e))
      );
    } catch (error) {
      handleError(error, setSnackbarMessage, setSnackbarOpen);
    } finally {
      setIsLoading(false);
    }
  }, [setEntries, setSnackbarMessage, setSnackbarOpen]);

  const changeStatus = useCallback(async (entryId, newStatus) => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }, [setEntries, setSnackbarMessage, setSnackbarOpen]);

  const deleteEntry = useCallback(async (entryId) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("entries").delete().eq("id", entryId);
      if (error) throw error;
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      setDeleteConfirmOpen(false);
      setSnackbarMessage("Eintrag erfolgreich gelöscht.");
      setSnackbarOpen(true);
    } catch (error) {
      handleError(error, setSnackbarMessage, setSnackbarOpen);
    } finally {
      setIsLoading(false);
    }
  }, [setEntries, setSnackbarMessage, setSnackbarOpen]);

  const requestExtension = useCallback(async (entryId) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const octoberFirst = new Date(currentYear, 9, 1);

    if (today < octoberFirst) {
      setSnackbarMessage("Die Verlängerung ist erst ab dem 01.10. aktiviert.");
      setSnackbarOpen(true);
      return;
    }

    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }, [setEntries, setSnackbarMessage, setSnackbarOpen]);

  const approveExtension = useCallback(async (entryId) => {
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

    setIsLoading(true);
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
      setExtensionConfirmOpen(false);
      setSnackbarMessage("Verlängerung genehmigt.");
      setSnackbarOpen(true);
    } catch (error) {
      handleError(error, setSnackbarMessage, setSnackbarOpen);
    } finally {
      setIsLoading(false);
    }
  }, [entry, setEntries, setSnackbarMessage, setSnackbarOpen]);

  const updateAliasNotes = useCallback(async () => {
    if (!editedAliasNotes.trim()) {
      setSnackbarMessage("Spitzname darf nicht leer sein.");
      setSnackbarOpen(true);
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("entries")
        .update({ aliasNotes: editedAliasNotes })
        .eq("id", entry.id);
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, aliasNotes: editedAliasNotes } : e))
      );
      setEditDialogOpen(false);
      setSnackbarMessage("Spitzname erfolgreich aktualisiert.");
      setSnackbarOpen(true);
    } catch (error) {
      handleError(error, setSnackbarMessage, setSnackbarOpen);
    } finally {
      setIsLoading(false);
    }
  }, [entry.id, editedAliasNotes, setEntries, setSnackbarMessage, setSnackbarOpen]);

  const updateEntryByAdmin = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("entries")
        .update({
          username: adminEditedEntry.username,
          password: adminEditedEntry.password,
          aliasNotes: adminEditedEntry.aliasNotes,
          type: adminEditedEntry.type,
          status: adminEditedEntry.status,
          paymentStatus: adminEditedEntry.paymentStatus,
          validUntil: adminEditedEntry.validUntil,
          bougetList: adminEditedEntry.bougetList,
          note: adminEditedEntry.note,
          admin_fee: adminEditedEntry.adminFee,
        })
        .eq("id", entry.id)
        .select()
        .single();
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, ...data } : e))
      );
      setAdminEditDialogOpen(false);
      setSnackbarMessage("Eintrag erfolgreich aktualisiert.");
      setSnackbarOpen(true);
    } catch (error) {
      handleError(error, setSnackbarMessage, setSnackbarOpen);
    } finally {
      setIsLoading(false);
    }
  }, [entry.id, adminEditedEntry, setEntries, setSnackbarMessage, setSnackbarOpen]);

  const getStatusColor = (status) =>
    status === "Aktiv" ? "green" : status === "Inaktiv" ? "red" : "black";
  const getPaymentStatusColor = (paymentStatus) =>
    paymentStatus === "Gezahlt" ? "green" : paymentStatus === "Nicht gezahlt" ? "red" : "black";

  const today = new Date();
  const currentYear = today.getFullYear();
  const octoberFirst = new Date(currentYear, 9, 1);
  const isBeforeOctober = today < octoberFirst;
  const isOwner = entry.owner === loggedInUser;

  return (
    <Accordion sx={{ marginBottom: 2, borderRadius: 2, boxShadow: 1 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
          <Typography sx={{ flexGrow: 1 }}>
            <strong>{entry.aliasNotes}</strong> ({entry.username})
          </Typography>
          <Chip
            label={entry.status}
            size="small"
            sx={{ backgroundColor: getStatusColor(entry.status), color: "white" }}
          />
          <Chip
            label={entry.paymentStatus}
            size="small"
            sx={{ backgroundColor: getPaymentStatusColor(entry.paymentStatus), color: "white" }}
          />
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <Typography>
            <strong>Erstellt von:</strong> {entry.owner}
          </Typography>
          <Typography>
            <strong>Typ:</strong> {entry.type}
          </Typography>
          <Typography>
            <strong>Benutzername:</strong> {entry.username}
          </Typography>
          <Typography>
            <strong>Passwort:</strong> {entry.password}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography>
              <strong>Spitzname:</strong> {entry.aliasNotes}
            </Typography>
            {isOwner && (
              <IconButton size="small" onClick={() => setEditDialogOpen(true)} disabled={isLoading}>
                <EditIcon />
              </IconButton>
            )}
          </Box>
          <Typography>
            <strong>Bouget-Liste:</strong> {entry.bougetList || "Nicht angegeben"}
          </Typography>
          <Typography sx={{ color: getStatusColor(entry.status) }}>
            <strong>Status:</strong> {entry.status}
          </Typography>
          <Typography sx={{ color: getPaymentStatusColor(entry.paymentStatus) }}>
            <strong>Zahlung:</strong> {entry.paymentStatus}
          </Typography>
          <Typography>
            <strong>Erstellt am:</strong> {formatDate(entry.createdAt)}
          </Typography>
          <Typography>
            <strong>Gültig bis:</strong> {formatDate(entry.validUntil)}
            {entry.extensionRequest?.pending && (
              <span style={{ color: "orange" }}> (Verlängerung angefragt)</span>
            )}
            {entry.extensionRequest?.approved && (
              <span style={{ color: "green" }}> (Verlängert)</span>
            )}
          </Typography>
          {(role === "Admin" || isOwner) && (
            <Typography>
              <strong>Admin-Gebühr:</strong> {entry.admin_fee ? `${entry.admin_fee}$` : "Nicht gesetzt"}
            </Typography>
          )}
          {entry.note && (
            <Typography sx={{ gridColumn: "span 2", color: "red" }}>
              <strong>Notiz:</strong> {entry.note}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, marginTop: 2 }}>
          {isBeforeOctober && (
            <Typography variant="caption" sx={{ color: "gray", fontStyle: "italic" }}>
              Ab 01.10 anwählbar
            </Typography>
          )}
          <Button
            onClick={() => requestExtension(entry.id)}
            variant="outlined"
            color="primary"
            disabled={isBeforeOctober || isLoading}
            size="small"
          >
            +1 Jahr verlängern
          </Button>
        </Box>
        {role === "Admin" && (
          <Box sx={{ marginTop: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button
              onClick={() => changeStatus(entry.id, entry.status === "Aktiv" ? "Inaktiv" : "Aktiv")}
              variant="contained"
              color="secondary"
              size="small"
              disabled={isLoading}
            >
              {entry.status === "Aktiv" ? "Inaktiv setzen" : "Aktiv setzen"}
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
              size="small"
              disabled={isLoading}
            >
              {entry.paymentStatus === "Gezahlt" ? "Nicht gezahlt setzen" : "Gezahlt setzen"}
            </Button>
            <Button
              onClick={() => setDeleteConfirmOpen(true)}
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              size="small"
              disabled={isLoading}
            >
              Löschen
            </Button>
            <Button
              onClick={() => setExtensionConfirmOpen(true)}
              variant="contained"
              color="success"
              size="small"
              disabled={isLoading}
            >
              Verlängerung genehmigen
            </Button>
            <Button
              onClick={() => setAdminEditDialogOpen(true)}
              variant="contained"
              color="primary"
              startIcon={<EditIcon />}
              size="small"
              disabled={isLoading}
            >
              Bearbeiten
            </Button>
          </Box>
        )}
        {role === "Admin" && entry.extensionHistory?.length > 0 && (
          <Box sx={{ marginTop: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: "bold" }}>
              Verlängerungshistorie:
            </Typography>
            {entry.extensionHistory.map((extension, idx) => (
              <Typography key={idx} variant="body2">
                Genehmigt: {formatDate(extension.approvalDate)} | Gültig bis: {formatDate(extension.validUntil)}
              </Typography>
            ))}
          </Box>
        )}
        {isLoading && <Typography>🔄 Aktualisiere...</Typography>}
        <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
          <DialogTitle>Eintrag löschen</DialogTitle>
          <DialogContent>
            <Typography>Möchtest du den Eintrag wirklich löschen? Dies kann nicht rückgängig gemacht werden.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmOpen(false)} color="secondary" disabled={isLoading}>
              Abbrechen
            </Button>
            <Button onClick={() => deleteEntry(entry.id)} color="error" disabled={isLoading}>
              {isLoading ? "Lösche..." : "Löschen"}
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog open={extensionConfirmOpen} onClose={() => setExtensionConfirmOpen(false)}>
          <DialogTitle>Verlängerung genehmigen</DialogTitle>
          <DialogContent>
            <Typography>Möchtest du die Verlängerung um ein Jahr genehmigen?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setExtensionConfirmOpen(false)} color="secondary" disabled={isLoading}>
              Abbrechen
            </Button>
            <Button onClick={() => approveExtension(entry.id)} color="success" disabled={isLoading}>
              {isLoading ? "Genehmige..." : "Genehmigen"}
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
          <DialogTitle>Spitzname bearbeiten</DialogTitle>
          <DialogContent>
            <TextField
              label="Spitzname, Notizen etc."
              fullWidth
              margin="normal"
              value={editedAliasNotes}
              onChange={(e) => setEditedAliasNotes(e.target.value)}
              disabled={isLoading}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)} color="secondary" disabled={isLoading}>
              Abbrechen
            </Button>
            <Button onClick={updateAliasNotes} color="primary" disabled={isLoading}>
              {isLoading ? "Speichere..." : "Speichern"}
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog open={adminEditDialogOpen} onClose={() => setAdminEditDialogOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Eintrag bearbeiten (Admin)</DialogTitle>
          <DialogContent>
            <TextField
              label="Benutzername"
              fullWidth
              margin="normal"
              value={adminEditedEntry.username}
              onChange={(e) => setAdminEditedEntry({ ...adminEditedEntry, username: e.target.value })}
              disabled={isLoading}
            />
            <TextField
              label="Passwort"
              fullWidth
              margin="normal"
              type="password"
              value={adminEditedEntry.password}
              onChange={(e) => setAdminEditedEntry({ ...adminEditedEntry, password: e.target.value })}
              disabled={isLoading}
            />
            <TextField
              label="Spitzname, Notizen etc."
              fullWidth
              margin="normal"
              value={adminEditedEntry.aliasNotes}
              onChange={(e) => setAdminEditedEntry({ ...adminEditedEntry, aliasNotes: e.target.value })}
              disabled={isLoading}
            />
            <TextField
              label="Bouget-Liste (z.B. GER, CH, USA, XXX usw... oder Alles)"
              fullWidth
              margin="normal"
              value={adminEditedEntry.bougetList || ""}
              onChange={(e) => setAdminEditedEntry({ ...adminEditedEntry, bougetList: e.target.value })}
              disabled={isLoading}
            />
            <Select
              fullWidth
              margin="normal"
              value={adminEditedEntry.type}
              onChange={(e) => setAdminEditedEntry({ ...adminEditedEntry, type: e.target.value })}
              disabled={isLoading}
            >
              <MenuItem value="Premium">Premium</MenuItem>
              <MenuItem value="Basic">Basic</MenuItem>
            </Select>
            <Select
              fullWidth
              margin="normal"
              value={adminEditedEntry.status}
              onChange={(e) => setAdminEditedEntry({ ...adminEditedEntry, status: e.target.value })}
              disabled={isLoading}
            >
              <MenuItem value="Aktiv">Aktiv</MenuItem>
              <MenuItem value="Inaktiv">Inaktiv</MenuItem>
            </Select>
            <Select
              fullWidth
              margin="normal"
              value={adminEditedEntry.paymentStatus}
              onChange={(e) => setAdminEditedEntry({ ...adminEditedEntry, paymentStatus: e.target.value })}
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
              value={adminEditedEntry.validUntil ? new Date(adminEditedEntry.validUntil).toISOString().split("T")[0] : ""}
              onChange={(e) => setAdminEditedEntry({ ...adminEditedEntry, validUntil: new Date(e.target.value).toISOString() })}
              disabled={isLoading}
            />
            <TextField
              label="Admin-Gebühr ($)"
              fullWidth
              margin="normal"
              value={adminEditedEntry.adminFee || ""}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, "");
                const numValue = value ? parseInt(value) : null;
                if (numValue > 999) return;
                setAdminEditedEntry({ ...adminEditedEntry, adminFee: numValue });
              }}
              inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
              disabled={isLoading}
            />
            <TextField
              label="Notiz"
              fullWidth
              margin="normal"
              value={adminEditedEntry.note || ""}
              onChange={(e) => setAdminEditedEntry({ ...adminEditedEntry, note: e.target.value })}
              disabled={isLoading}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAdminEditDialogOpen(false)} color="secondary" disabled={isLoading}>
              Abbrechen
            </Button>
            <Button onClick={updateEntryByAdmin} color="primary" disabled={isLoading}>
              {isLoading ? "Speichere..." : "Speichern"}
            </Button>
          </DialogActions>
        </Dialog>
      </AccordionDetails>
    </Accordion>
  );
};

export default EntryAccordion;
