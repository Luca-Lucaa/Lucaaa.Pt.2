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
    aliasNotes: entry.aliasNotes,
    bougetList: entry.bougetList || "",
    type: entry.type,
    validUntil: new Date(entry.validUntil).toISOString().split("T")[0],
    admin_fee: entry.admin_fee || "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { showSnackbar } = useSnackbar();

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
      showSnackbar(`Status zu ${newStatus} geändert.`);
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
      showSnackbar(`Zahlungsstatus zu ${newPaymentStatus} geändert.`);
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
      showSnackbar("Verlängerungsanfrage gesendet.");
    } catch (error) {
      handleError(error, showSnackbar);
    }
  }, [entry, setEntries, showSnackbar]);

  const updateEntry = useCallback(async () => {
    if (!editedEntry.aliasNotes.trim()) {
      showSnackbar("Spitzname darf nicht leer sein.", "error");
      return;
    }

    const validUntilDate = new Date(editedEntry.validUntil);
    if (isNaN(validUntilDate)) {
      showSnackbar("Bitte ein gültiges Datum eingeben.", "error");
      return;
    }

    const updatedEntry = {
      aliasNotes: editedEntry.aliasNotes,
      bougetList: editedEntry.bougetList || "",
      type: editedEntry.type,
      validUntil: validUntilDate.toISOString(),
      admin_fee: role === "Admin" ? (editedEntry.admin_fee ? parseInt(editedEntry.admin_fee) : null) : entry.admin_fee,
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
      showSnackbar("Abonnent erfolgreich aktualisiert.");
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
          <Typography variant="body2">Status: {entry.status}</Typography>
          <Typography variant="body2">Zahlungsstatus: {entry.paymentStatus}</Typography>
          <Typography variant="body2">Typ: {entry.type}</Typography>
          <Typography variant="body2">Ersteller: {entry.owner}</Typography>
          <Typography variant="body2">Bouget-Liste: {entry.bougetList || "Keine"}</Typography>
          {role === "Admin" && (
            <Typography variant="body2">Admin-Gebühr: {entry.admin_fee ? `${entry.admin_fee} €` : "Keine"}</Typography>
          )}
          <Typography variant="body2">Erstellt am: {formatDate(entry.createdAt)}</Typography>
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
            {(role === "Admin" || entry.owner === loggedInUser) && (
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
              </>
            )}
            {entry.owner === loggedInUser && !entry.extensionRequest?.pending && (
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
          {role === "Admin" && (
            <TextField
              label="Admin-Gebühr (€)"
              fullWidth
              margin="normal"
              value={editedEntry.admin_fee || ""}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, "");
                const numValue = value ? parseInt(value) : "";
                if (numValue > 999) return;
                setEditedEntry({ ...editedEntry, admin_fee: numValue });
              }}
              inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
              disabled={isLoading}
            />
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
