import React, { useState, useCallback } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { supabase } from "./supabaseClient";
import { formatDate, handleError } from "./utils";
import { useSnackbar } from "./useSnackbar";

const EntryAccordion = ({ entry, role, loggedInUser, setEntries, owners }) => {
  const [expanded, setExpanded] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editedEntry, setEditedEntry] = useState({
    username: entry.username || "",
    password: entry.password || "",
    aliasNotes: entry.aliasNotes || "",
    type: entry.type || "Premium",
    validUntil: entry.validUntil ? new Date(entry.validUntil).toISOString().split("T")[0] : "",
    admin_fee: entry.admin_fee != null ? entry.admin_fee.toString() : "",
    note: entry.note || "",
    owner: entry.owner || loggedInUser,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const isExtensionRequestAllowed = useCallback(() => {
    if (!entry.validUntil) return false;
    const validUntilDate = new Date(entry.validUntil);
    const currentDate = new Date();
    const timeDiff = validUntilDate - currentDate;
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24); // Convert milliseconds to days
    return daysDiff <= 30; // Allow extension request if within 30 days
  }, [entry.validUntil]);

  const handleDelete = useCallback(async () => {
    if (window.confirm("Möchten Sie diesen Eintrag wirklich löschen?")) {
      setIsLoading(true);
      try {
        const { error } = await supabase.from("entries").delete().eq("id", entry.id);
        if (error) throw error;
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
        showSnackbar("Eintrag erfolgreich gelöscht!");
      } catch (error) {
        handleError(error, showSnackbar);
      } finally {
        setIsLoading(false);
      }
    }
  }, [entry.id, setEntries, showSnackbar]);

  const handleSaveEdit = useCallback(async () => {
    if (!editedEntry.aliasNotes.trim()) {
      showSnackbar("Bitte Spitzname eingeben.", "error");
      return;
    }
    setIsLoading(true);
    const validUntilDate = new Date(editedEntry.validUntil);
    if (isNaN(validUntilDate)) {
      showSnackbar("Bitte ein gültiges Datum eingeben.", "error");
      setIsLoading(false);
      return;
    }
    const adminFee = editedEntry.admin_fee ? parseInt(editedEntry.admin_fee) : null;
    if (adminFee && adminFee > 999) {
      showSnackbar("Admin-Gebühr darf 999 € nicht überschreiten.", "error");
      setIsLoading(false);
      return;
    }
    const updatedEntry = {
      username: editedEntry.username,
      password: editedEntry.password,
      aliasNotes: editedEntry.aliasNotes.trim(),
      type: editedEntry.type,
      validUntil: validUntilDate.toISOString(),
      admin_fee: adminFee,
      note: editedEntry.note ? editedEntry.note.trim() : "",
      owner: editedEntry.owner,
    };
    try {
      const { error } = await supabase.from("entries").update(updatedEntry).eq("id", entry.id);
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, ...updatedEntry } : e))
      );
      setOpenEditDialog(false);
      showSnackbar("Eintrag erfolgreich aktualisiert!");
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [editedEntry, entry.id, setEntries, showSnackbar]);

  const handleRequestExtension = useCallback(async () => {
    if (!isExtensionRequestAllowed()) {
      showSnackbar("Verlängerungsanfrage nicht erlaubt. Mindestens 30 Tage vor Ablauf möglich.", "error");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("entries")
        .update({ extensionRequest: true })
        .eq("id", entry.id);
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, extensionRequest: true } : e
        )
      );
      showSnackbar("Verlängerungsanfrage erfolgreich gesendet!");
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [entry.id, isExtensionRequestAllowed, setEntries, showSnackbar]);

  return (
    <Accordion
      expanded={expanded}
      onChange={() => setExpanded(!expanded)}
      sx={{ borderRadius: 2, boxShadow: 2 }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="body1" sx={{ fontSize: isMobile ? "0.9rem" : "1rem" }}>
          Typ: {entry.type}
        </Typography>
        {role === "Admin" && (
          <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
            <IconButton
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                setOpenEditDialog(true);
              }}
              disabled={isLoading}
              size="small"
            >
              <EditIcon />
            </IconButton>
            <IconButton
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              disabled={isLoading}
              size="small"
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        )}
        {role !== "Admin" && isExtensionRequestAllowed() && !entry.extensionRequest && (
          <Button
            variant="contained"
            color="primary"
            onClick={(e) => {
              e.stopPropagation();
              handleRequestExtension();
            }}
            disabled={isLoading}
            size="small"
            sx={{ ml: "auto" }}
          >
            Verlängerung anfragen
          </Button>
        )}
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2" sx={{ mb: 1, fontSize: isMobile ? "0.8rem" : "0.875rem" }}>
          Benutzername: {entry.username}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1, fontSize: isMobile ? "0.8rem" : "0.875rem" }}>
          Passwort: {entry.password}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1, fontSize: isMobile ? "0.8rem" : "0.875rem" }}>
          Gültig bis: {formatDate(entry.validUntil)}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1, fontSize: isMobile ? "0.8rem" : "0.875rem" }}>
          Ersteller: {entry.owner}
        </Typography>
        {entry.note && (
          <Typography variant="body2" sx={{ mb: 1, fontSize: isMobile ? "0.8rem" : "0.875rem" }}>
            Notiz: {entry.note}
          </Typography>
        )}
        {entry.admin_fee != null && (
          <Typography variant="body2" sx={{ mb: 1, fontSize: isMobile ? "0.8rem" : "0.875rem" }}>
            Admin-Gebühr: {entry.admin_fee} €
          </Typography>
        )}
        {entry.extensionRequest && (
          <Typography variant="body2" color="primary" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}>
            Verlängerungsanfrage gesendet.
          </Typography>
        )}
      </AccordionDetails>
      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontSize: isMobile ? "1rem" : "1.25rem" }}>
          Eintrag bearbeiten
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Benutzername"
            fullWidth
            margin="normal"
            value={editedEntry.username}
            onChange={(e) => setEditedEntry({ ...editedEntry, username: e.target.value })}
            disabled={isLoading}
            size={isMobile ? "small" : "medium"}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Passwort"
            fullWidth
            margin="normal"
            type="text"
            value={editedEntry.password}
            onChange={(e) => setEditedEntry({ ...editedEntry, password: e.target.value })}
            disabled={isLoading}
            size={isMobile ? "small" : "medium"}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Spitzname, Notizen etc."
            fullWidth
            margin="normal"
            value={editedEntry.aliasNotes}
            onChange={(e) => setEditedEntry({ ...editedEntry, aliasNotes: e.target.value })}
            disabled={isLoading}
            size={isMobile ? "small" : "medium"}
            InputLabelProps={{ shrink: true }}
          />
          <Select
            fullWidth
            margin="normal"
            value={editedEntry.type}
            onChange={(e) => setEditedEntry({ ...editedEntry, type: e.target.value })}
            disabled={isLoading}
            size={isMobile ? "small" : "medium"}
          >
            <MenuItem value="Premium">Premium</MenuItem>
            <MenuItem value="Basic">Basic</MenuItem>
          </Select>
          <TextField
            label="Gültig bis"
            fullWidth
            margin="normal"
            type="date"
            value={editedEntry.validUntil}
            onChange={(e) => setEditedEntry({ ...editedEntry, validUntil: e.target.value })}
            disabled={isLoading}
            size={isMobile ? "small" : "medium"}
            InputLabelProps={{ shrink: true }}
          />
          {role === "Admin" && (
            <>
              <TextField
                label="Admin-Gebühr (€)"
                fullWidth
                margin="normal"
                value={editedEntry.admin_fee}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "");
                  if (value && parseInt(value) > 999) return;
                  setEditedEntry({ ...editedEntry, admin_fee: value });
                }}
                inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                disabled={isLoading}
                size={isMobile ? "small" : "medium"}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Notiz"
                fullWidth
                margin="normal"
                value={editedEntry.note}
                onChange={(e) => setEditedEntry({ ...editedEntry, note: e.target.value })}
                disabled={isLoading}
                size={isMobile ? "small" : "medium"}
                InputLabelProps={{ shrink: true }}
              />
              <Select
                fullWidth
                margin="normal"
                value={editedEntry.owner}
                onChange={(e) => setEditedEntry({ ...editedEntry, owner: e.target.value })}
                disabled={isLoading}
                size={isMobile ? "small" : "medium"}
              >
                {owners.map((owner) => (
                  <MenuItem key={owner} value={owner}>
                    {owner}
                  </MenuItem>
                ))}
              </Select>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenEditDialog(false)}
            color="secondary"
            disabled={isLoading}
            sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSaveEdit}
            color="primary"
            disabled={isLoading}
            sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}
          >
            {isLoading ? "Speichere..." : "Speichern"}
          </Button>
        </DialogActions>
      </Dialog>
    </Accordion>
  );
};

export default EntryAccordion;
