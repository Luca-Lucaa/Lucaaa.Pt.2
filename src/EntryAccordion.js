// EntryAccordion.js
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
import { supabase } from "./supabaseClient";
import { formatDate, handleError } from "./utils";
import { useSnackbar } from "./useSnackbar";

const EntryAccordion = ({ entry, role, loggedInUser, setEntries }) => {
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editedEntry, setEditedEntry] = useState({
    username: entry.username || "",
    password: entry.password || "",
    aliasNotes: entry.aliasNotes || "",
    bougetList: entry.bougetList || "",
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
    const currentDate = new Date(); // Updated to use actual current date
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
      handleError(error, showSnackbar);
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
      handleError(error, showSnackbar);
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
      handleError(error, showSnackbar);
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
      const updatedData = {
        username: editedEntry.username,
        password: editedEntry.password,
        aliasNotes: editedEntry.aliasNotes,
        bougetList: editedEntry.bougetList,
        type: editedEntry.type,
        status: editedEntry.status,
        paymentStatus: editedEntry.paymentStatus,
        validUntil: new Date(editedEntry.validUntil).toISOString(),
        admin_fee: adminFee,
        note: editedEntry.note,
      };
      const { data, error } = await supabase
        .from("entries")
        .update(updatedData)
        .eq("id", entry.id)
        .select()
        .single();
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, ...data } : e))
      );
      showSnackbar("Eintrag erfolgreich bearbeitet!", "success");
      setOpenEditDialog(false);
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [editedEntry, entry.id, setEntries, showSnackbar]);

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ width: "40%", flexShrink: 0 }}>
          {entry.aliasNotes || "Unbekannt"} ({entry.type})
        </Typography>
        <Typography sx={{ color: "text.secondary" }}>
          Gültig bis: {formatDate(entry.validUntil)}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography><strong>Benutzername:</strong> {entry.username}</Typography>
          <Typography><strong>Passwort:</strong> {entry.password}</Typography>
          <Typography><strong>Bouget-Liste:</strong> {entry.bougetList || "Keine"}</Typography>
          <Typography><strong>Status:</strong> {entry.status}</Typography>
          <Typography><strong>Zahlungsstatus:</strong> {entry.paymentStatus}</Typography>
          <Typography><strong>Erstellt am:</strong> {formatDate(entry.createdAt)}</Typography>
          <Typography><strong>Ersteller:</strong> {entry.owner}</Typography>
          <Typography><strong>Admin-Gebühr:</strong> {entry.admin_fee ? `${entry.admin_fee} €` : "Keine"}</Typography>
          <Typography><strong>Notiz:</strong> {entry.note || "Keine"}</Typography>
          {entry.extensionHistory && entry.extensionHistory.length > 0 && (
            <Box>
              <Typography><strong>Verlängerungshistorie:</strong></Typography>
              {entry.extensionHistory.map((hist, index) => (
                <Typography key={index} variant="body2">
                  Genehmigt am {formatDate(hist.approvalDate)} bis {formatDate(hist.validUntil)}
                </Typography>
              ))}
            </Box>
          )}
          {entry.extensionRequest?.pending && (
            <Typography color="warning.main"><strong>Verlängerungsanfrage ausstehend</strong></Typography>
          )}
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {role === "Admin" && (
              <>
                <Chip
                  label={entry.status === "Aktiv" ? "Inaktiv setzen" : "Aktiv setzen"}
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
          <TextField
            label="Bouget-Liste (z.B. GER, CH, USA, XXX usw... oder Alles)"
            fullWidth
            margin="normal"
            value={editedEntry.bougetList || ""}
            onChange={(e) => setEditedEntry({ ...editedEntry, bougetList: e.target.value })}
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
