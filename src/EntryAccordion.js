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

const EntryAccordion = ({ entry, role, loggedInUser, setEntries, owners }) => {
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
    owner: entry.owner || loggedInUser || "",
  });
  const { showSnackbar } = useSnackbar();

  // Check if validUntil is within 30 days from today
  const isExtensionRequestAllowed = useCallback(() => {
    if (!entry.validUntil) return false;
    try {
      const validUntilDate = new Date(entry.validUntil);
      const currentDate = new Date();
      const timeDiff = validUntilDate - currentDate;
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24); // Convert milliseconds to days
      return daysDiff <= 30 && daysDiff >= 0; // Allow extension request if within 30 days and not expired
    } catch (error) {
      console.error(`Ungültiges Datum in Eintrag ${entry.id}:`, error);
      return false;
    }
  }, [entry.validUntil, entry.id]);

  const handleToggleStatus = useCallback(async () => {
    if (!entry.id) {
      showSnackbar("Eintrag-ID fehlt.", "error");
      return;
    }
    const newStatus = entry.status === "Aktiv" ? "Inaktiv" : "Aktiv";
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }, [entry, setEntries, showSnackbar]);

  const handleTogglePayment = useCallback(async () => {
    if (!entry.id) {
      showSnackbar("Eintrag-ID fehlt.", "error");
      return;
    }
    const newPaymentStatus = entry.paymentStatus === "Gezahlt" ? "Nicht gezahlt" : "Gezahlt";
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }, [entry, setEntries, showSnackbar]);

  const handleExtensionRequest = useCallback(async () => {
    if (!entry.id) {
      showSnackbar("Eintrag-ID fehlt.", "error");
      return;
    }
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }, [entry, setEntries, showSnackbar]);

  const updateEntry = useCallback(async () => {
    if (!entry.id) {
      showSnackbar("Eintrag-ID fehlt.", "error");
      return;
    }
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
    if (!editedEntry.owner && role === "Admin") {
      showSnackbar("Ersteller muss ausgewählt werden.", "error");
      return;
    }
    const validUntilDate = new Date(editedEntry.validUntil);
    if (isNaN(validUntilDate)) {
      showSnackbar("Bitte ein gültiges Datum eingeben.", "error");
      return;
    }
    const adminFee = editedEntry.admin_fee ? parseInt(editedEntry.admin_fee) : null;
    if (editedEntry.admin_fee && (isNaN(adminFee) || adminFee < 0 || adminFee > 999)) {
      showSnackbar("Admin-Gebühr muss zwischen 0 und 999 € liegen.", "error");
      return;
    }

    // Check for unique username constraint
    if (editedEntry.username !== entry.username) {
      try {
        const { data: existingEntry, error: checkError } = await supabase
          .from("entries")
          .select("id")
          .eq("username", editedEntry.username.trim())
          .single();
        if (checkError && checkError.code !== "PGRST116") { // PGRST116: No rows found
          showSnackbar(`Fehler beim Überprüfen des Benutzernamens: ${checkError.message}`, "error");
          return;
        }
        if (existingEntry) {
          showSnackbar("Benutzername existiert bereits.", "error");
          return;
        }
      } catch (error) {
        handleError(error, showSnackbar);
        return;
      }
    }

    const updatedEntry = {
      username: editedEntry.username.trim(),
      password: editedEntry.password.trim(),
      aliasNotes: editedEntry.aliasNotes.trim(),
      bougetList: editedEntry.bougetList ? editedEntry.bougetList.trim() : "",
      type: editedEntry.type,
      status: editedEntry.status,
      paymentStatus: editedEntry.paymentStatus,
      validUntil: validUntilDate.toISOString(),
      admin_fee: adminFee,
      note: editedEntry.note ? editedEntry.note.trim() : "",
      owner: role === "Admin" ? editedEntry.owner : entry.owner, // Only update owner if Admin
    };

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("entries")
        .update(updatedEntry)
        .eq("id", entry.id)
        .select()
        .single();
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, ...data } : e))
      );
      setOpenEditDialog(false);
      showSnackbar("Abonnent erfolgreich aktualisiert.", "success");
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [editedEntry, entry, role, setEntries, showSnackbar]);

  return (
    <Accordion sx={{ mt: 1, borderRadius: 2, boxShadow: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ fontWeight: "medium" }}>Details</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography
            variant="body2"
            sx={{
              color: entry.status === "Aktiv" ? "success.main" : "error.main",
            }}
          >
            Status: {entry.status || "Unbekannt"}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: entry.paymentStatus === "Gezahlt" ? "success.main" : "error.main",
            }}
          >
            Zahlungsstatus: {entry.paymentStatus || "Unbekannt"}
          </Typography>
          <Typography variant="body2">Passwort: {entry.password || "Keines"}</Typography>
          <Typography variant="body2">Typ: {entry.type || "Unbekannt"}</Typography>
          <Typography variant="body2">Ersteller: {entry.owner || "Keiner"}</Typography>
          <Typography variant="body2">Bouget-Liste: {entry.bougetList || "Keine"}</Typography>
          <Typography variant="body2">Admin-Gebühr: {entry.admin_fee != null ? `${entry.admin_fee} €` : "Keine"}</Typography>
          <Typography variant="body2">Erstellt am: {formatDate(entry.createdAt)}</Typography>
          <Typography variant="body2">Notiz: {entry.note || "Keine"}</Typography>
          <Typography variant="body2">Verlängerungsanfrage: {entry.extensionRequest?.pending ? "Ausstehend" : "Keine"}</Typography>
          {entry.extensionHistory?.length > 0 && (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: "bold" }}>Verlängerungsverlauf:</Typography>
              {entry.extensionHistory.map((ext, index) => (
                <Typography key={index} variant="body2">
                  {formatDate(ext.approvalDate)}: Gültig bis {formatDate(ext.validUntil)}
                </Typography>
              ))}
            </Box>
          )}
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}>
            {role === "Admin" && (
              <>
                <Chip
                  label={entry.status === "Aktiv" ? "Deaktivieren" : "Aktivieren"}
                  onClick={handleToggleStatus}
                  color={entry.status === "Aktiv" ? "error" : "success"}
                  size="small"
                  disabled={isLoading}
                />
                <Chip
                  label={entry.paymentStatus === "Gezahlt" ? "Nicht gezahlt setzen" : "Gezahlt setzen"}
                  onClick={handleTogglePayment}
                  color={entry.paymentStatus === "Gezahlt" ? "error" : "success"}
                  size="small"
                  disabled={isLoading}
                />
                <Chip
                  label="Bearbeiten"
                  onClick={() => setOpenEditDialog(true)}
                  color="primary"
                  size="small"
                  disabled={isLoading}
                />
              </>
            )}
            {entry.owner === loggedInUser && !entry.extensionRequest?.pending && isExtensionRequestAllowed() && (
              <Chip
                label="Verlängerung anfragen"
                onClick={handleExtensionRequest}
                color="warning"
                size="small"
                disabled={isLoading}
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
          {role === "Admin" && (
            <Select
              fullWidth
              margin="normal"
              value={editedEntry.owner || ""}
              onChange={(e) => setEditedEntry({ ...editedEntry, owner: e.target.value })}
              disabled={isLoading || !owners || owners.length === 0}
            >
              <MenuItem value="" disabled>
                Ersteller auswählen
              </MenuItem>
              {owners && owners.length > 0 ? (
                owners.map((owner) => (
                  <MenuItem key={owner} value={owner}>
                    {owner}
                  </MenuItem>
                ))
              ) : (
                <MenuItem value={loggedInUser}>{loggedInUser}</MenuItem>
              )}
            </Select>
          )}
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
