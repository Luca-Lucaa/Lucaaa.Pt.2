import React, { useState, useCallback } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Button,
  TextField,
  Box,
  useMediaQuery,
  useTheme,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import PaymentIcon from "@mui/icons-material/Payment";
import { supabase } from "./supabaseClient";
import { formatDate, handleError } from "./utils";
import { useSnackbar } from "./useSnackbar";

const EntryAccordion = ({ entry, role, loggedInUser, setEntries }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editUsername, setEditUsername] = useState(entry.username || "");
  const [editNotes, setEditNotes] = useState(entry.aliasNotes);
  const [editBougetList, setEditBougetList] = useState(entry.bougetList || "");
  const [editAdminFee, setEditAdminFee] = useState(entry.admin_fee || "");
  const [editPassword, setEditPassword] = useState(entry.password || "");
  const [editValidUntil, setEditValidUntil] = useState(
    entry.validUntil ? new Date(entry.validUntil).toISOString().split("T")[0] : ""
  );
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleUpdate = useCallback(async () => {
    setIsLoading(true);
    try {
      const updates = {
        username: role === "Admin" ? editUsername : entry.username,
        aliasNotes: editNotes,
        ...(role === "Admin" && {
          bougetList: editBougetList || null,
          admin_fee: editAdminFee ? parseInt(editAdminFee) : null,
          password: editPassword,
          validUntil: editValidUntil ? new Date(editValidUntil) : entry.validUntil,
        }),
      };
      const { data, error } = await supabase
        .from("entries")
        .update(updates)
        .eq("id", entry.id)
        .select();
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, ...data[0] } : e))
      );
      setIsEditing(false);
      showSnackbar("Eintrag erfolgreich aktualisiert!");
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [
    entry,
    role,
    editUsername,
    editNotes,
    editBougetList,
    editAdminFee,
    editPassword,
    editValidUntil,
    setEntries,
    showSnackbar,
  ]);

  const handleDelete = useCallback(async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("entries")
        .delete()
        .eq("id", entry.id);
      if (error) throw error;
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      showSnackbar("Eintrag erfolgreich gelöscht!");
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
      setIsDeleteDialogOpen(false);
    }
  }, [entry, setEntries, showSnackbar]);

  const handleToggleStatus = useCallback(async () => {
    const newStatus = entry.status === "Aktiv" ? "Inaktiv" : "Aktiv";
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("entries")
        .update({ status: newStatus })
        .eq("id", entry.id)
        .select();
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, ...data[0] } : e))
      );
      showSnackbar(`Status zu "${newStatus}" geändert!`);
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [entry, setEntries, showSnackbar]);

  const handleTogglePayment = useCallback(async () => {
    const newPaymentStatus = entry.paymentStatus === "Gezahlt" ? "Nicht gezahlt" : "Gezahlt";
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("entries")
        .update({ paymentStatus: newPaymentStatus })
        .eq("id", entry.id)
        .select();
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, ...data[0] } : e))
      );
      showSnackbar(`Zahlungsstatus zu "${newPaymentStatus}" geändert!`);
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [entry, setEntries, showSnackbar]);

  const canEdit = role === "Admin" || entry.owner === loggedInUser;

  return (
    <Box>
      <Accordion sx={{ mt: 1, boxShadow: "none", border: "1px solid #e0e0e0", borderRadius: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography sx={{ fontSize: isMobile ? "0.9rem" : "1rem", color: "#1976d2" }}>
            Details anzeigen
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: isMobile ? 1 : 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {/* Status mit Toggle-Button für Admins */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem", fontWeight: "bold" }}>
                Status:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontSize: isMobile ? "0.8rem" : "0.875rem",
                  color: entry.status === "Aktiv" ? "green" : "red",
                }}
              >
                {entry.status === "Aktiv" ? "✅ Aktiv" : "❌ Inaktiv"}
              </Typography>
              {role === "Admin" && (
                <IconButton
                  onClick={handleToggleStatus}
                  disabled={isLoading}
                  size="small"
                  sx={{ ml: "auto" }}
                >
                  {entry.status === "Aktiv" ? (
                    <ToggleOffIcon fontSize="small" />
                  ) : (
                    <ToggleOnIcon fontSize="small" />
                  )}
                </IconButton>
              )}
            </Box>

            {/* Zahlungsstatus mit Toggle-Button für Admins */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem", fontWeight: "bold" }}>
                Zahlung:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontSize: isMobile ? "0.8rem" : "0.875rem",
                  color: entry.paymentStatus === "Gezahlt" ? "green" : "red",
                }}
              >
                {entry.paymentStatus === "Gezahlt" ? "✅ Gezahlt" : "❌ Nicht gezahlt"}
              </Typography>
              {role === "Admin" && (
                <IconButton
                  onClick={handleTogglePayment}
                  disabled={isLoading}
                  size="small"
                  sx={{ ml: "auto" }}
                >
                  <PaymentIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            {/* Benutzername mit Bearbeitung für Admins */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem", fontWeight: "bold" }}>
                Benutzername:
              </Typography>
              {isEditing && role === "Admin" ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
                  <TextField
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    disabled={isLoading}
                    size={isMobile ? "small" : "medium"}
                    sx={{ flex: 1 }}
                  />
                </Box>
              ) : (
                <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}>
                  {entry.username}
                </Typography>
              )}
            </Box>

            {/* Spitzname mit Stift-Symbol */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem", fontWeight: "bold" }}>
                Spitzname:
              </Typography>
              {isEditing ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
                  <TextField
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    disabled={isLoading}
                    size={isMobile ? "small" : "medium"}
                    sx={{ flex: 1 }}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleUpdate}
                    disabled={isLoading}
                    sx={{ py: 0.5, fontSize: "0.75rem", minHeight: 32 }}
                  >
                    {isLoading ? "Speichere..." : "Speichern"}
                  </Button>
                </Box>
              ) : (
                <>
                  <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}>
                    {entry.aliasNotes}
                  </Typography>
                  {canEdit && (
                    <IconButton
                      onClick={() => setIsEditing(true)}
                      disabled={isLoading}
                      size="small"
                      sx={{ ml: "auto" }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  )}
                </>
              )}
            </Box>

            {/* Passwort anzeigen */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem", fontWeight: "bold" }}>
                Passwort:
              </Typography>
              {isEditing && role === "Admin" ? (
                <TextField
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  disabled={isLoading}
                  size={isMobile ? "small" : "medium"}
                  sx={{ flex: 1 }}
                />
              ) : (
                <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}>
                  {entry.password}
                </Typography>
              )}
            </Box>

            {/* Weitere Felder nur anzeigen, wenn sie ausgefüllt sind */}
            {entry.note && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem", fontWeight: "bold" }}>
                  Notiz:
                </Typography>
                <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}>
                  {entry.note}
                </Typography>
              </Box>
            )}
            {entry.bougetList && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem", fontWeight: "bold" }}>
                  Bouget-Liste:
                </Typography>
                {isEditing && role === "Admin" ? (
                  <TextField
                    value={editBougetList}
                    onChange={(e) => setEditBougetList(e.target.value)}
                    disabled={isLoading}
                    size={isMobile ? "small" : "medium"}
                    sx={{ flex: 1 }}
                  />
                ) : (
                  <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}>
                    {entry.bougetList}
                  </Typography>
                )}
              </Box>
            )}
            {role === "Admin" && entry.admin_fee !== null && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem", fontWeight: "bold" }}>
                  Admin-Gebühr:
                </Typography>
                {isEditing ? (
                  <TextField
                    value={editAdminFee}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, "");
                      const numValue = value ? parseInt(value) : "";
                      if (numValue > 999) return;
                      setEditAdminFee(numValue);
                    }}
                    inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                    disabled={isLoading}
                    size={isMobile ? "small" : "medium"}
                    sx={{ flex: 1 }}
                  />
                ) : (
                  <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}>
                    {entry.admin_fee} €
                  </Typography>
                )}
              </Box>
            )}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem", fontWeight: "bold" }}>
                Erstellt am:
              </Typography>
              <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}>
                {formatDate(entry.createdAt)}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem", fontWeight: "bold" }}>
                Gültig bis:
              </Typography>
              {isEditing && role === "Admin" ? (
                <TextField
                  type="date"
                  value={editValidUntil}
                  onChange={(e) => setEditValidUntil(e.target.value)}
                  disabled={isLoading}
                  size={isMobile ? "small" : "medium"}
                  sx={{ flex: 1 }}
                />
              ) : (
                <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}>
                  {formatDate(entry.validUntil)}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem", fontWeight: "bold" }}>
                Ersteller:
              </Typography>
              <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}>
                {entry.owner}
              </Typography>
            </Box>

            {/* Lösch-Button für Admins */}
            {role === "Admin" && (
              <Box sx={{ display: "flex", gap: 1, mt: 1, flexDirection: isMobile ? "column" : "row" }}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={isLoading}
                  sx={{ borderRadius: 2, py: 0.5, fontSize: "0.75rem", minHeight: 32 }}
                  startIcon={<DeleteIcon fontSize="small" />}
                >
                  Löschen
                </Button>
              </Box>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Bestätigungsdialog für das Löschen */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontSize: isMobile ? "1rem" : "1.25rem" }}>
          Eintrag löschen?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: isMobile ? "0.9rem" : "1rem" }}>
            Möchten Sie den Eintrag "{entry.aliasNotes}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setIsDeleteDialogOpen(false)}
            color="secondary"
            disabled={isLoading}
            sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            disabled={isLoading}
            sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}
          >
            {isLoading ? "Lösche..." : "Löschen"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EntryAccordion;
