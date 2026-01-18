import React, { useState, useCallback, useEffect } from "react";
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
import CheckCircleIcon from "@mui/icons-material/CheckCircle"; // ← neu hinzugefügt
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

  // ────────────────────────────────────────────────
  // NEU: Lokales "gesehen"-Flag für neue Einträge (pro Browser)
  // ────────────────────────────────────────────────
  const [seenNewEntries, setSeenNewEntries] = useState(() => {
    try {
      const saved = localStorage.getItem("admin_seen_new_entries");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("admin_seen_new_entries", JSON.stringify([...seenNewEntries]));
    } catch (err) {
      console.warn("localStorage konnte nicht geschrieben werden", err);
    }
  }, [seenNewEntries]);

  // Eintrag gilt als "neu", wenn er < 72 Stunden alt ist UND noch nicht als gesehen markiert wurde
  const isNewForAdmin = useCallback(() => {
    if (role !== "Admin") return false;
    if (!entry?.created_at) return false;
    if (seenNewEntries.has(entry.id)) return false;

    const created = new Date(entry.created_at);
    const now = new Date();
    const hoursDiff = (now - created) / (1000 * 60 * 60);
    return hoursDiff <= 72; // ← hier kannst du die Stunden ändern (24 = 1 Tag, 120 = 5 Tage, ...)
  }, [entry, seenNewEntries, role]);

  const markAsSeen = useCallback(() => {
    if (!entry?.id) return;
    setSeenNewEntries((prev) => {
      const next = new Set(prev);
      next.add(entry.id);
      return next;
    });
    showSnackbar("Als gesehen markiert (lokal im Browser gespeichert)", "success");
  }, [entry, showSnackbar]);

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
      const updatedData = {
        username: editedEntry.username,
        password: editedEntry.password,
        aliasNotes: editedEntry.aliasNotes,
        type: editedEntry.type,
        status: editedEntry.status,
        paymentStatus: editedEntry.paymentStatus,
        validUntil: validUntilDate.toISOString(),
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

      showSnackbar("Eintrag erfolgreich aktualisiert.", "success");
      setOpenEditDialog(false);
    } catch (error) {
      console.error("Fehler beim Aktualisieren:", error);
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [editedEntry, entry.id, setEntries, showSnackbar]);

  const handleDeleteEntry = useCallback(async () => {
    if (!window.confirm("Möchtest du diesen Eintrag wirklich löschen?")) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.from("entries").delete().eq("id", entry.id);
      if (error) throw error;

      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      showSnackbar("Eintrag erfolgreich gelöscht.", "success");
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [entry.id, setEntries, showSnackbar]);

  return (
    <Accordion
      sx={{
        ...(isNewForAdmin() && {
          borderLeft: "6px solid #ef4444",
          backgroundColor: "rgba(254, 226, 226, 0.35)",
          "&:hover": {
            backgroundColor: "rgba(254, 226, 226, 0.55)",
          },
        }),
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%" }}>
          {isNewForAdmin() && (
            <Chip
              label="NEU"
              color="error"
              size="small"
              sx={{ fontWeight: "bold", minWidth: 52 }}
            />
          )}
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            {entry.aliasNotes || entry.username || "Kein Name"}
          </Typography>
          {/* Hier können weitere bestehende Elemente stehen, falls du welche hattest */}
        </Box>
      </AccordionSummary>

      <AccordionDetails>
        {/* Hier stand bisher dein Inhalt – z. B. Typ, Status, Gebühr, Notiz usw. */}
        {/* Ich lasse das bewusst offen, damit du deinen Originalinhalt behältst */}

        {isNewForAdmin() && (
          <Box sx={{ mt: 2, textAlign: "right" }}>
            <Button
              variant="outlined"
              color="success"
              size="small"
              startIcon={<CheckCircleIcon />}
              onClick={markAsSeen}
              disabled={isLoading}
            >
              Als gesehen markieren
            </Button>
          </Box>
        )}

        <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
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
          {entry.owner === loggedInUser && !entry.extensionRequest?.pending && isExtensionRequestAllowed() && (
            <Chip
              label="Verlängerung anfragen"
              onClick={handleExtensionRequest}
              color="warning"
              size="small"
            />
          )}
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
