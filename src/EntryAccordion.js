import React, { useState, useCallback } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  Chip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteIcon from "@mui/icons-material/Delete";
import { supabase } from "./supabaseClient";
import { formatDate, handleError } from "./utils";
import { useSnackbar } from "./useSnackbar";
import { OWNER_COLORS } from "./config";

const EntryAccordion = ({ entry, role, loggedInUser, setEntries, isNewEntry }) => {
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editedEntry, setEditedEntry] = useState({
    username: entry.username || "",
    password: entry.password || "",
    aliasNotes: entry.aliasNotes || "",
    type: entry.type || "Premium",
    status: entry.status || "Inaktiv",
    paymentStatus: entry.paymentStatus || "Nicht gezahlt",
    validUntil: entry.validUntil ? new Date(entry.validUntil).toISOString().split("T")[0] : "",
    admin_fee: entry.admin_fee != null ? entry.admin_fee.toString() : "",
    note: entry.note || "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { showSnackbar } = useSnackbar();

  // Check if validUntil is within 30 days from today
  const isExtensionRequestAllowed = useCallback(() => {
    if (!entry.validUntil) return false;
    const validUntilDate = new Date(entry.validUntil);
    const currentDate = new Date(); // Use current date dynamically
    const timeDiff = validUntilDate - currentDate;
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24); // Convert milliseconds to days
    return daysDiff <= 30; // Allow extension request if within 30 days
  }, [entry.validUntil]);

  const handleToggleStatus = useCallback(async () => {
    const newStatus = entry.status === "Aktiv" ? "Inaktiv" : "Aktiv";
    try {
      const { data, error } = await supabase
        .from("entries")
        .update({ status: newStatus })
        .eq("id", entry.id)
        .select()
        .single();
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, status: newStatus } : e))
      );
      showSnackbar(`Status zu ${newStatus} geändert.`, "success");
    } catch (error) {
      console.error("Error toggling status:", error);
      handleError(error, showSnackbar);
      showSnackbar(`Fehler beim Ändern des Status: ${error.message || "Unbekannter Fehler"}`, "error");
    }
  }, [entry, setEntries, showSnackbar]);

  const handleTogglePayment = useCallback(async () => {
    const newPaymentStatus = entry.paymentStatus === "Gezahlt" ? "Nicht gezahlt" : "Gezahlt";
    try {
      const { data, error } = await supabase
        .from("entries")
        .update({ paymentStatus: newPaymentStatus })
        .eq("id", entry.id)
        .select()
        .single();
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, paymentStatus: newPaymentStatus } : e))
      );
      showSnackbar(`Zahlungsstatus zu ${newPaymentStatus} geändert.`, "success");
    } catch (error) {
      console.error("Error toggling payment status:", error);
      handleError(error, showSnackbar);
      showSnackbar(`Fehler beim Ändern des Zahlungsstatus: ${error.message || "Unbekannter Fehler"}`, "error");
    }
  }, [entry, setEntries, showSnackbar]);

  const handleExtensionRequest = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("entries")
        .update({ extensionRequest: { pending: true, approved: false } })
        .eq("id", entry.id)
        .select()
        .single();
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, extensionRequest: data.extensionRequest } : e))
      );
      showSnackbar("Verlängerungsanfrage gesendet.", "success");
    } catch (error) {
      console.error("Error sending extension request:", error);
      handleError(error, showSnackbar);
      showSnackbar(`Fehler beim Senden der Verlängerungsanfrage: ${error.message || "Unbekannter Fehler"}`, "error");
    }
  }, [entry, setEntries, showSnackbar]);

  const updateEntry = useCallback(async () => {
    // Validate inputs
    if (!editedEntry.username.trim()) {
      showSnackbar("Benutzername darf nicht leer sein.", "error");
      return;
    }
    if (!editedEntry.password.trim()) {
      showSnackbar("Passwort darf nicht leer sein.", "error");
      return;
    }
    if (!editedEntry.aliasNotes.trim()) {
      showSnackbar("Spitzname darf nicht leer sein.", "error");
      return;
    }
    const validUntilDate = new Date(editedEntry.validUntil);
    if (isNaN(validUntilDate)) {
      showSnackbar("Bitte ein gültiges Datum eingeben.", "error");
      return;
    }
    const adminFee = editedEntry.admin_fee ? parseInt(editedEntry.admin_fee) : null;
    if (editedEntry.admin_fee && (isNaN(adminFee) || adminFee < 0 || adminFee > 999)) {
      showSnackbar("Admin-Gebühr muss zwischen 0 und 999 liegen.", "error");
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("entries")
        .update({
          username: editedEntry.username,
          password: editedEntry.password,
          aliasNotes: editedEntry.aliasNotes,
          type: editedEntry.type,
          status: editedEntry.status,
          paymentStatus: editedEntry.paymentStatus,
          validUntil: validUntilDate.toISOString(),
          admin_fee: adminFee,
          note: editedEntry.note,
        })
        .eq("id", entry.id)
        .select()
        .single();
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, ...data } : e))
      );
      setOpenEditDialog(false);
      showSnackbar("Eintrag erfolgreich aktualisiert!", "success");
    } catch (error) {
      console.error("Error updating entry:", error);
      handleError(error, showSnackbar);
      showSnackbar(`Fehler beim Aktualisieren des Eintrags: ${error.message || "Unbekannter Fehler"}`, "error");
    } finally {
      setIsLoading(false);
    }
  }, [editedEntry, entry, setEntries, showSnackbar]);

  const handleDeleteEntry = useCallback(async () => {
    if (role !== "Admin") return; // Only Admin can delete
    if (window.confirm(`Möchtest du den Eintrag für ${entry.aliasNotes} wirklich löschen?`)) {
      try {
        const { error } = await supabase.from("entries").delete().eq("id", entry.id);
        if (error) throw error;
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
        showSnackbar("Eintrag erfolgreich gelöscht.", "success");
      } catch (error) {
        console.error("Error deleting entry:", error);
        handleError(error, showSnackbar);
        showSnackbar(`Fehler beim Löschen des Eintrags: ${error.message || "Unbekannter Fehler"}`, "error");
      }
    }
  }, [entry, role, setEntries, showSnackbar]);

  return (
    <Accordion sx={{ bgcolor: OWNER_COLORS[entry.owner] || "#ffffff" }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <Box>
            <Typography>
              <strong>{entry.aliasNotes}</strong> ({entry.username})
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Gültig bis: {formatDate(entry.validUntil)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            {entry.status === "Aktiv" ? (
              <Chip label="Aktiv" color="success" size="small" />
            ) : (
              <Chip label="Inaktiv" color="default" size="small" />
            )}
            {entry.paymentStatus === "Gezahlt" ? (
              <Chip label="Gezahlt" color="primary" size="small" />
            ) : (
              <Chip label="Nicht gezahlt" color="error" size="small" />
            )}
            {entry.extensionRequest?.pending && (
              <Chip label="Verlängerung angefragt" color="warning" size="small" />
            )}
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            p: 2,
            bgcolor: isNewEntry ? "#e0f7ff" : "transparent",
            borderRadius: 1,
            border: isNewEntry ? "1px solid #bbdefb" : "none",
          }}
        >
          <Typography variant="body2">
            <strong>Benutzername:</strong> {entry.username}
          </Typography>
          <Typography variant="body2">
            <strong>Passwort:</strong> {entry.password}
          </Typography>
          <Typography variant="body2">
            <strong>Spitzname/Notizen:</strong> {entry.aliasNotes}
          </Typography>
          <Typography variant="body2">
            <strong>Typ:</strong> {entry.type}
          </Typography>
          <Typography variant="body2">
            <strong>Status:</strong> {entry.status}
          </Typography>
          <Typography variant="body2">
            <strong>Zahlungsstatus:</strong> {entry.paymentStatus}
          </Typography>
          <Typography variant="body2">
            <strong>Gültig bis:</strong> {formatDate(entry.validUntil)}
          </Typography>
          <Typography variant="body2">
            <strong>Ersteller:</strong> {entry.owner}
          </Typography>
          {entry.admin_fee != null && (
            <Typography variant="body2">
              <strong>Admin-Gebühr:</strong> {entry.admin_fee} €
            </Typography>
          )}
          {entry.note && (
            <Typography variant="body2">
              <strong>Notiz:</strong> {entry.note}
            </Typography>
          )}
          <Typography variant="body2">
            <strong>Erstellt am:</strong> {formatDate(entry.createdAt)}
          </Typography>
          {entry.extensionRequest && (
            <Typography variant="body2">
              <strong>Verlängerungsanfrage:</strong>{" "}
              {entry.extensionRequest.pending
                ? "Ausstehend"
                : entry.extensionRequest.approved
                ? "Genehmigt"
                : "Abgelehnt"}
            </Typography>
          )}
          {entry.extensionHistory?.length > 0 && (
            <Box>
              <Typography variant="body2" fontWeight="bold">
                Verlängerungsverlauf:
              </Typography>
              {entry.extensionHistory.map((history, index) => (
                <Typography key={index} variant="body2">
                  Genehmigt am: {formatDate(history.approvalDate)}, Gültig bis: {formatDate(history.validUntil)}
                </Typography>
              ))}
            </Box>
          )}
          <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
            {role === "Admin" && (
              <>
                <Chip
                  label={entry.status === "Aktiv" ? "Deaktivieren" : "Aktivieren"}
                  onClick={handleToggleStatus}
                  color={entry.status === "Aktiv" ? "error" : "success"}
                  size="small"
                />
                <Chip
                  label={entry.paymentStatus === "Gezahlt" ? "Nicht gezahlt setzen" : "Gezahlt setzen"}
                  onClick={handleTogglePayment}
                  color={entry.paymentStatus === "Gezahlt" ? "error" : "success"}
                  size="small"
                />
                <Chip
                  label="Bearbeiten"
                  onClick={() => setOpenEditDialog(true)}
                  color="primary"
                  size="small"
                />
                <Chip
                  label="Löschen"
                  onClick={handleDeleteEntry}
                  color="error"
                  size="small"
                />
              </>
            )}
            {entry.owner === loggedInUser && !entry.extensionRequest?.pending && isExtensionRequestAllowed() && (
              <Chip
                label="Verlängerung anfragen"
                onClick={handleExtensionRequest}
                color="warning"
                size="small"
              />
            )}
          </Box>
        </Box>
      </AccordionDetails>
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Abonnent bearbeiten</DialogTitle>
        <DialogContent>
          <TextField
            label="Benutzername"
            fullWidth
            margin="normal"
            value={editedEntry.username}
            onChange={(e) => setEditedEntry({ ...editedEntry, username: e.target.value })}
            disabled={isLoading}
          />
          <TextField
            label="Passwort"
            fullWidth
            margin="normal"
            value={editedEntry.password}
            onChange={(e) => setEditedEntry({ ...editedEntry, password: e.target.value })}
            disabled={isLoading}
          />
          <TextField
            label="Spitzname, Notizen etc."
            fullWidth
            margin="normal"
            value={editedEntry.aliasNotes}
            onChange={(e) => setEditedEntry({ ...editedEntry, aliasNotes: e.target.value })}
            disabled={isLoading}
          />
          <Select
            fullWidth
            margin="normal"
            value={editedEntry.type}
            onChange={(e) => setEditedEntry({ ...editedEntry, type: e.target.value })}
            disabled={isLoading}
          >
            <MenuItem value="Premium">Premium</MenuItem>
            <MenuItem value="Basic">Basic</MenuItem>
          </Select>
          <Select
            fullWidth
            margin="normal"
            value={editedEntry.status}
            onChange={(e) => setEditedEntry({ ...editedEntry, status: e.target.value })}
            disabled={isLoading}
          >
            <MenuItem value="Aktiv">Aktiv</MenuItem>
            <MenuItem value="Inaktiv">Inaktiv</MenuItem>
          </Select>
          <Select
            fullWidth
            margin="normal"
            value={editedEntry.paymentStatus}
            onChange={(e) => setEditedEntry({ ...editedEntry, paymentStatus: e.target.value })}
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
            value={editedEntry.validUntil}
            onChange={(e) => setEditedEntry({ ...editedEntry, validUntil: e.target.value })}
            disabled={isLoading}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Admin-Gebühr (€)"
            fullWidth
            margin="normal"
            value={editedEntry.admin_fee || ""}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, "");
              setEditedEntry({ ...editedEntry, admin_fee: value });
            }}
            inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
            disabled={isLoading}
          />
          <TextField
            label="Notiz"
            fullWidth
            margin="normal"
            value={editedEntry.note || ""}
            onChange={(e) => setEditedEntry({ ...editedEntry, note: e.target.value })}
            disabled={isLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenEditDialog(false)}
            color="secondary"
            disabled={isLoading}
          >
            Abbrechen
          </Button>
          <Button
            onClick={updateEntry}
            color="primary"
            disabled={isLoading}
          >
            {isLoading ? "Speichere..." : "Speichern"}
          </Button>
        </DialogActions>
      </Dialog>
    </Accordion>
  );
};

export default EntryAccordion;
