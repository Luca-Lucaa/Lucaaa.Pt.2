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
  }, [entry.id, entry.status, setEntries, showSnackbar]);

  const handleDelete = useCallback(async () => {
    try {
      const { error } = await supabase.from("entries").delete().eq("id", entry.id);
      if (error) throw error;
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      showSnackbar("Eintrag erfolgreich gelöscht.", "success");
    } catch (error) {
      console.error("Error deleting entry:", error);
      handleError(error, showSnackbar);
      showSnackbar(`Fehler beim Löschen: ${error.message || "Unbekannter Fehler"}`, "error");
    }
  }, [entry.id, setEntries, showSnackbar]);

  const updateEntry = useCallback(async () => {
    if (!editedEntry.aliasNotes.trim()) {
      showSnackbar("Spitzname/Notizen dürfen nicht leer sein.", "error");
      return;
    }
    setIsLoading(true);
    try {
      const updatedData = {
        ...editedEntry,
        admin_fee: role === "Admin" ? parseInt(editedEntry.admin_fee) || 0 : entry.admin_fee,
        validUntil: new Date(editedEntry.validUntil).toISOString(),
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
      setOpenEditDialog(false);
      showSnackbar("Eintrag erfolgreich aktualisiert.", "success");
    } catch (error) {
      console.error("Error updating entry:", error);
      handleError(error, showSnackbar);
      showSnackbar(`Fehler beim Aktualisieren: ${error.message || "Unbekannter Fehler"}`, "error");
    } finally {
      setIsLoading(false);
    }
  }, [editedEntry, entry.id, entry.admin_fee, role, setEntries, showSnackbar]);

  const handleExtensionRequest = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("entries")
        .update({
          extensionRequest: {
            pending: true,
            requestedAt: new Date().toISOString(),
          },
        })
        .eq("id", entry.id)
        .select()
        .single();
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, extensionRequest: data.extensionRequest } : e))
      );
      showSnackbar("Verlängerungsantrag erfolgreich gesendet.", "success");
    } catch (error) {
      console.error("Error requesting extension:", error);
      handleError(error, showSnackbar);
      showSnackbar(`Fehler beim Antrag: ${error.message || "Unbekannter Fehler"}`, "error");
    }
  }, [entry.id, setEntries, showSnackbar]);

  return (
    <Accordion sx={{ backgroundColor: OWNER_COLORS[entry.owner] || "#fff" }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ flex: 1 }}>
          {entry.aliasNotes} ({entry.username})
        </Typography>
        {isNewEntry && <Chip label="Neu" color="success" size="small" />}
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography>
            <strong>Typ:</strong> {entry.type}
          </Typography>
          <Typography>
            <strong>Status:</strong> {entry.status}
          </Typography>
          <Typography>
            <strong>Zahlungsstatus:</strong> {entry.paymentStatus}
          </Typography>
          <Typography>
            <strong>Ersteller:</strong> {entry.owner}
          </Typography>
          <Typography>
            <strong>Erstellt am:</strong> {formatDate(entry.createdAt)}
          </Typography>
          <Typography>
            <strong>Gültig bis:</strong> {formatDate(entry.validUntil)}
          </Typography>
          <Typography>
            <strong>Admin-Gebühr:</strong> {entry.admin_fee || 0} €
          </Typography>
          {entry.note && (
            <Typography>
              <strong>Notiz:</strong> {entry.note}
            </Typography>
          )}
          {(role === "Admin" || entry.owner === loggedInUser) && (
            <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setOpenEditDialog(true)}
                disabled={isLoading}
              >
                Bearbeiten
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDelete}
                disabled={isLoading}
              >
                Löschen
              </Button>
              {isExtensionRequestAllowed() && !entry.extensionRequest?.pending && (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleExtensionRequest}
                  disabled={isLoading}
                >
                  Verlängerung anfragen
                </Button>
              )}
            </Box>
          )}
        </Box>
      </AccordionDetails>
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
        <DialogTitle>Eintrag bearbeiten</DialogTitle>
        <DialogContent>
          <TextField
            label="Spitzname, Notizen etc."
            fullWidth
            margin="normal"
            value={editedEntry.aliasNotes}
            onChange={(e) => setEditedEntry({ ...editedEntry, aliasNotes: e.target.value })}
            disabled={isLoading}
          />
          <TextField
            label="Benutzername"
            fullWidth
            margin="normal"
            value={editedEntry.username}
            onChange={(e) => setEditedEntry({ ...editedEntry, username: e.target.value })}
            disabled={isLoading || role !== "Admin"}
          />
          <TextField
            label="Passwort"
            fullWidth
            margin="normal"
            type="password"
            value={editedEntry.password}
            onChange={(e) => setEditedEntry({ ...editedEntry, password: e.target.value })}
            disabled={isLoading || role !== "Admin"}
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
            disabled={isLoading || role !== "Admin"} // Only Admin can edit admin_fee
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
