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
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { supabase } from "./supabaseClient";
import { formatDate, handleError } from "./utils";
import { useSnackbar } from "./useSnackbar";

const EntryAccordion = ({ entry, role, loggedInUser, setEntries }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [editNotes, setEditNotes] = useState(entry.aliasNotes);
  const [editBougetList, setEditBougetList] = useState(entry.bougetList || "");
  const [editAdminFee, setEditAdminFee] = useState(entry.admin_fee || "");
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleUpdate = useCallback(async () => {
    setIsLoading(true);
    try {
      const updates = {
        aliasNotes: editNotes,
        bougetList: editBougetList || null,
        admin_fee: role === "Admin" && editAdminFee ? parseInt(editAdminFee) : entry.admin_fee,
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
      showSnackbar("Eintrag erfolgreich aktualisiert!");
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [entry, role, editNotes, editBougetList, editAdminFee, setEntries, showSnackbar]);

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
    <Accordion sx={{ mt: 1, boxShadow: "none", border: "1px solid #e0e0e0", borderRadius: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ fontSize: isMobile ? "0.9rem" : "1rem", color: "#1976d2" }}>
          Details anzeigen
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: isMobile ? 1 : 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {/* Status und Zahlungsstatus mit Symbolen */}
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
          </Box>
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
              <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}>
                {entry.bougetList}
              </Typography>
            </Box>
          )}
          {role === "Admin" && entry.admin_fee !== null && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem", fontWeight: "bold" }}>
                Admin-Gebühr:
              </Typography>
              <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}>
                {entry.admin_fee} €
              </Typography>
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
              Ersteller:
            </Typography>
            <Typography variant="body2" sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}>
              {entry.owner}
            </Typography>
          </Box>

          {/* Bearbeitungsfelder */}
          {canEdit && (
            <>
              <TextField
                label="Spitzname, Notizen etc."
                fullWidth
                margin="dense"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                disabled={isLoading}
                size={isMobile ? "small" : "medium"}
              />
              <TextField
                label="Bouget-Liste (z.B. GER, CH, USA, XXX usw... oder Alles)"
                fullWidth
                margin="dense"
                value={editBougetList}
                onChange={(e) => setEditBougetList(e.target.value)}
                disabled={isLoading}
                size={isMobile ? "small" : "medium"}
              />
              {role === "Admin" && (
                <TextField
                  label="Admin-Gebühr (€)"
                  fullWidth
                  margin="dense"
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
                />
              )}
              <Box sx={{ display: "flex", gap: 1, mt: 1, flexDirection: isMobile ? "column" : "row" }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleUpdate}
                  disabled={isLoading}
                  sx={{ borderRadius: 2, py: isMobile ? 1.5 : 1, minHeight: isMobile ? 48 : 36 }}
                >
                  {isLoading ? "Speichere..." : "Speichern"}
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleToggleStatus}
                  disabled={isLoading}
                  sx={{ borderRadius: 2, py: isMobile ? 1.5 : 1, minHeight: isMobile ? 48 : 36 }}
                >
                  {entry.status === "Aktiv" ? "Deaktivieren" : "Aktivieren"}
                </Button>
                <Button
                  variant="outlined"
                  color={entry.paymentStatus === "Gezahlt" ? "error" : "success"}
                  onClick={handleTogglePayment}
                  disabled={isLoading}
                  sx={{ borderRadius: 2, py: isMobile ? 1.5 : 1, minHeight: isMobile ? 48 : 36 }}
                >
                  {entry.paymentStatus === "Gezahlt" ? "Nicht gezahlt" : "Gezahlt"}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default EntryAccordion;
