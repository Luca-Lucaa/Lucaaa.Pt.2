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
  Select,
  MenuItem,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExtensionIcon from "@mui/icons-material/Update";
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
  const [editCreatedAt, setEditCreatedAt] = useState(
    entry.createdAt ? new Date(entry.createdAt).toISOString().split("T")[0] : ""
  );
  const [editOwner, setEditOwner] = useState(entry.owner || "");
  const [editStatus, setEditStatus] = useState(entry.status || "Aktiv");
  const [editPaymentStatus, setEditPaymentStatus] = useState(entry.paymentStatus || "Nicht gezahlt");
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Prüfen, ob Verlängerungsanfrage möglich ist (weniger als 60 Tage bis Gültigkeitsdatum)
  const canRequestExtension = useCallback(() => {
    if (!entry.validUntil) return false;
    const validUntilDate = new Date(entry.validUntil);
    const currentDate = new Date();
    const diffInDays = (validUntilDate - currentDate) / (1000 * 60 * 60 * 24);
    return diffInDays <= 60 && diffInDays >= 0;
  }, [entry.validUntil]);

  const handleUpdate = useCallback(async () => {
    setIsLoading(true);
    try {
      // Validierungen
      if (!editUsername || !editNotes || !editOwner) {
        showSnackbar("Pflichtfelder dürfen nicht leer sein.", "error");
        return;
      }
      if (editAdminFee && isNaN(parseInt(editAdminFee))) {
        showSnackbar("Admin-Gebühr muss eine Zahl sein.", "error");
        return;
      }
      if (editValidUntil && new Date(editValidUntil) < new Date()) {
        showSnackbar("Gültigkeitsdatum muss in der Zukunft liegen.", "error");
        return;
      }
      if (editCreatedAt && new Date(editCreatedAt) > new Date()) {
        showSnackbar("Erstellungsdatum darf nicht in der Zukunft liegen.", "error");
        return;
      }

      const updates = {
        username: editUsername,
        aliasNotes: editNotes,
        bougetList: editBougetList || null,
        admin_fee: editAdminFee ? parseInt(editAdminFee) : null,
        password: editPassword,
        validUntil: editValidUntil ? new Date(editValidUntil).toISOString() : null,
        createdAt: editCreatedAt ? new Date(editCreatedAt).toISOString() : null,
        owner: editOwner,
        status: editStatus,
        paymentStatus: editPaymentStatus,
      };

      const { data, error } = await supabase
        .from("entries")
        .update(updates)
        .eq("id", entry.id)
        .select()
        .single();
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, ...data } : e))
      );
      setIsEditing(false);
      showSnackbar("Eintrag erfolgreich aktualisiert!");
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [
    entry.id,
    editUsername,
    editNotes,
    editBougetList,
    editAdminFee,
    editPassword,
    editValidUntil,
    editCreatedAt,
    editOwner,
    editStatus,
    editPaymentStatus,
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
  }, [entry.id, setEntries, showSnackbar]);

  const handleRequestExtension = useCallback(async () => {
    if (!canRequestExtension()) {
      showSnackbar("Verlängerung kann nur beantragt werden, wenn das Gültigkeitsdatum weniger als 60 Tage entfernt ist.", "error");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("entries")
        .update({ extensionRequest: { pending: true, requestedDate: new Date().toISOString() } })
        .eq("id", entry.id);
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? { ...e, extensionRequest: { pending: true, requestedDate: new Date().toISOString() } }
            : e
        )
      );
      showSnackbar("Verlängerungsanfrage erfolgreich gestellt!");
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [entry.id, setEntries, showSnackbar, canRequestExtension]);

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
            {/* Status */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem", fontWeight: "bold" }}>
                Status:
              </Typography>
              {isEditing && role === "Admin" ? (
                <Select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  disabled={isLoading}
                  size="small"
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="Aktiv">Aktiv</MenuItem>
                  <MenuItem value="Inaktiv">Inaktiv</MenuItem>
                </Select>
              ) : (
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: isMobile ? "0.8rem" : "0.875rem",
                    color: entry.status === "Aktiv" ? "green" : "red",
                  }}
                >
                  {entry.status === "Aktiv" ? "✅ Aktiv" : "❌ Inaktiv"}
                </Typography>
              )}
            </Box>

            {/* Zahlungsstatus */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem", fontWeight: "bold" }}>
                Zahlung:
              </Typography>
              {isEditing && role === "Admin" ? (
                <Select
                  value={editPaymentStatus}
                  onChange={(e) => setEditPaymentStatus(e.target.value)}
                  disabled={isLoading}
                  size="small"
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="Gezahlt">Gezahlt</MenuItem>
                  <MenuItem value="Nicht gezahlt">Nicht gezahlt</MenuItem>
                </Select>
              ) : (
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: isMobile ? "0.8rem" : "0.875rem",
                    color: entry.paymentStatus === "Gezahlt" ? "green" : "red",
                  }}
                >
                  {entry.paymentStatus === "Gezahlt" ? "✅ Gezahlt" : "❌ Nicht gezahlt"}
                </Typography>
              )}
            </Box>

            {/* Benutzername */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem", fontWeight: "bold" }}>
                Benutzername:
              </Typography>
              {isEditing && role === "Admin" ? (
                <TextField
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  disabled={isLoading}
                  size={isMobile ? "small" : "medium"}
                  sx={{ flex: 1 }}
                />
              ) : (
                <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}>
                  {entry.username}
                </Typography>
              )}
            </Box>

            {/* Spitzname */}
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
                  {role === "Admin" && (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleUpdate}
                      disabled={isLoading}
                      sx={{ py: 0.5, fontSize: "0.75rem", minHeight: 32 }}
                    >
                      {isLoading ? "Speichere..." : "Speichern"}
                    </Button>
                  )}
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

            {/* Passwort */}
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

            {/* Notiz */}
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

            {/* Bouget-Liste */}
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
                  {entry.bougetList || "-"}
                </Typography>
              )}
            </Box>

            {/* Admin-Gebühr */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem", fontWeight: "bold" }}>
                Admin-Gebühr:
              </Typography>
              {isEditing && role === "Admin" ? (
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
                  {entry.admin_fee ? `${entry.admin_fee} €` : "-"}
                </Typography>
              )}
            </Box>

            {/* Erstellt am */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem", fontWeight: "bold" }}>
                Erstellt am:
              </Typography>
              {isEditing && role === "Admin" ? (
                <TextField
                  type="date"
                  value={editCreatedAt}
                  onChange={(e) => setEditCreatedAt(e.target.value)}
                  disabled={isLoading}
                  size={isMobile ? "small" : "medium"}
                  sx={{ flex: 1 }}
                />
              ) : (
                <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}>
                  {formatDate(entry.createdAt)}
                </Typography>
              )}
            </Box>

            {/* Gültig bis */}
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

            {/* Ersteller */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem", fontWeight: "bold" }}>
                Ersteller:
              </Typography>
              {isEditing && role === "Admin" ? (
                <TextField
                  value={editOwner}
                  onChange={(e) => setEditOwner(e.target.value)}
                  disabled={isLoading}
                  size={isMobile ? "small" : "medium"}
                  sx={{ flex: 1 }}
                />
              ) : (
                <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}>
                  {entry.owner}
                </Typography>
              )}
            </Box>

            {/* Verlängerungsanfrage-Button für Ersteller */}
            {canEdit && entry.owner === loggedInUser && role !== "Admin" && !entry.extensionRequest?.pending && canRequestExtension() && (
              <Box sx={{ display: "flex", gap: 1, mt: 1, flexDirection: isMobile ? "column" : "row" }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleRequestExtension}
                  disabled={isLoading}
                  sx={{ borderRadius: 2, py: 0.5, fontSize: "0.75rem", minHeight: 32 }}
                  startIcon={<ExtensionIcon fontSize="small" />}
                >
                  Verlängerung beantragen
                </Button>
              </Box>
            )}

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
