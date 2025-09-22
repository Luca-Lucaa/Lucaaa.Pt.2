import React, { useMemo, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { supabase } from "./supabaseClient";
import { formatDate, handleError } from "./utils";
import { useSnackbar } from "./useSnackbar";
import { OWNER_COLORS } from "./config";

const AdminDashboard = ({
  entries,
  loggedInUser,
  setOpenCreateDialog,
  setOpenManualDialog,
  setEntries,
}) => {
  const [extensionDialogOpen, setExtensionDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [newValidUntil, setNewValidUntil] = useState("");
  const [openManualDialog, setOpenManualDialogLocal] = useState(false);
  const [selectedEntryForEdit, setSelectedEntryForEdit] = useState(null);
  const [editedEntry, setEditedEntry] = useState(null);
  const { showSnackbar } = useSnackbar();

  const stats = useMemo(() => {
    const owners = [...new Set(entries.map((e) => e.owner))];
    const result = {
      totalEntries: entries.length,
      activeEntries: entries.filter((e) => e.status === "Aktiv").length,
      paidEntries: entries.filter((e) => e.paymentStatus === "Gezahlt").length,
      totalFees: entries.reduce((sum, e) => sum + (e.admin_fee || 0), 0),
      byOwner: owners.map((owner) => ({
        owner,
        count: entries.filter((e) => e.owner === owner).length,
        fees: entries
          .filter((e) => e.owner === owner)
          .reduce((sum, e) => sum + (e.admin_fee || 0), 0),
      })),
      pendingExtensions: entries.filter((e) => e.extensionRequest?.pending),
    };
    return result;
  }, [entries]);

  const handleApproveExtension = useCallback(
    async () => {
      if (!selectedEntry || !newValidUntil) {
        showSnackbar("Bitte ein Gültigkeitsdatum auswählen.", "error");
        return;
      }
      const selectedDate = new Date(newValidUntil);
      const currentDate = new Date();
      if (selectedDate < currentDate) {
        showSnackbar("Das Datum muss in der Zukunft liegen.", "error");
        return;
      }

      const updatedEntry = {
        validUntil: selectedDate.toISOString(),
        extensionRequest: {
          pending: false,
          approved: true,
          approvalDate: new Date().toISOString(),
        },
        extensionHistory: [
          ...(selectedEntry.extensionHistory || []),
          {
            approvalDate: new Date().toISOString(),
            validUntil: selectedDate.toISOString(),
          },
        ],
      };

      try {
        const { data, error } = await supabase
          .from("entries")
          .update(updatedEntry)
          .eq("id", selectedEntry.id)
          .select()
          .single();
        if (error) throw error;
        setEntries((prev) =>
          prev.map((e) => (e.id === selectedEntry.id ? { ...e, ...data } : e))
        );
        showSnackbar("Verlängerung genehmigt.");
        setExtensionDialogOpen(false);
        setSelectedEntry(null);
        setNewValidUntil("");
      } catch (error) {
        handleError(error, showSnackbar);
      }
    },
    [selectedEntry, newValidUntil, setEntries, showSnackbar]
  );

  const handleRejectExtension = useCallback(
    async () => {
      if (!selectedEntry) return;
      try {
        const { error } = await supabase
          .from("entries")
          .update({ extensionRequest: { pending: false, approved: false } })
          .eq("id", selectedEntry.id);
        if (error) throw error;
        setEntries((prev) =>
          prev.map((e) =>
            e.id === selectedEntry.id
              ? { ...e, extensionRequest: { pending: false, approved: false } }
              : e
          )
        );
        showSnackbar("Verlängerung abgelehnt.");
        setExtensionDialogOpen(false);
        setSelectedEntry(null);
        setNewValidUntil("");
      } catch (error) {
        handleError(error, showSnackbar);
      }
    },
    [selectedEntry, setEntries, showSnackbar]
  );

  const handleUpdatePaymentStatus = useCallback(
    async (entry, newStatus) => {
      if (!entry) return;
      try {
        const updatedEntry = {
          paymentStatus: newStatus,
          ...(newStatus === "Gezahlt" && { admin_fee: 0 }), // Setze admin_fee auf 0, wenn Status "Gezahlt" ist
        };
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
        showSnackbar(`Zahlungsstatus auf "${newStatus}" geändert.`);
      } catch (error) {
        handleError(error, showSnackbar);
      }
    },
    [setEntries, showSnackbar]
  );

  const handleOpenManualDialog = useCallback(
    (entry) => {
      setSelectedEntryForEdit(entry);
      setEditedEntry({
        ...entry,
        validUntil: entry.validUntil ? new Date(entry.validUntil).toISOString().split("T")[0] : "",
      });
      setOpenManualDialogLocal(true);
      setOpenManualDialog(true);
    },
    [setOpenManualDialog]
  );

  const handleCloseManualDialog = useCallback(() => {
    setOpenManualDialogLocal(false);
    setOpenManualDialog(false);
    setSelectedEntryForEdit(null);
    setEditedEntry(null);
  }, [setOpenManualDialog]);

  const handleManualEntry = useCallback(
    async () => {
      if (!editedEntry) {
        showSnackbar("Kein Eintrag ausgewählt.", "error");
        return;
      }

      // Validierung
      if (!editedEntry.username || !editedEntry.password || !editedEntry.aliasNotes) {
        showSnackbar("Bitte füllen Sie alle Pflichtfelder aus.", "error");
        return;
      }
      const selectedDate = new Date(editedEntry.validUntil);
      const currentDate = new Date();
      if (selectedDate < currentDate) {
        showSnackbar("Das Gültigkeitsdatum muss in der Zukunft liegen.", "error");
        return;
      }
      if (editedEntry.admin_fee && isNaN(editedEntry.admin_fee)) {
        showSnackbar("Die Gebühr muss eine Zahl sein.", "error");
        return;
      }

      const updatedEntry = {
        ...editedEntry,
        validUntil: selectedDate.toISOString(),
        admin_fee: editedEntry.admin_fee ? Number(editedEntry.admin_fee) : null,
        ...(editedEntry.paymentStatus === "Gezahlt" && { admin_fee: 0 }), // Setze admin_fee auf 0, wenn Status "Gezahlt" ist
      };

      try {
        const { data, error } = await supabase
          .from("entries")
          .update(updatedEntry)
          .eq("id", editedEntry.id)
          .select()
          .single();
        if (error) throw error;
        setEntries((prev) =>
          prev.map((e) => (e.id === editedEntry.id ? { ...e, ...data } : e))
        );
        showSnackbar("Eintrag erfolgreich aktualisiert.");
        handleCloseManualDialog();
      } catch (error) {
        handleError(error, showSnackbar);
      }
    },
    [editedEntry, setEntries, showSnackbar, handleCloseManualDialog]
  );

  return (
    <Box sx={{ p: 2, borderBottom: "1px solid #e0e0e0" }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
        Admin-Dashboard
      </Typography>
      <Grid container spacing={1} alignItems="center">
        <Grid item xs={6} sm={3} md={2}>
          <Card sx={{ borderRadius: 1, boxShadow: 1, p: 1 }}>
            <CardContent sx={{ p: 1 }}>
              <Typography variant="body2" color="textSecondary">
                Gesamt
              </Typography>
              <Typography variant="h6" color="primary">
                {stats.totalEntries}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <Card sx={{ borderRadius: 1, boxShadow: 1, p: 1 }}>
            <CardContent sx={{ p: 1 }}>
              <Typography variant="body2" color="textSecondary">
                Aktiv
              </Typography>
              <Typography variant="h6" color="success.main">
                {stats.activeEntries}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <Card sx={{ borderRadius: 1, boxShadow: 1, p: 1 }}>
            <CardContent sx={{ p: 1 }}>
              <Typography variant="body2" color="textSecondary">
                Gezahlt
              </Typography>
              <Typography variant="h6" color="success.main">
                {stats.paidEntries}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <Card sx={{ borderRadius: 1, boxShadow: 1, p: 1 }}>
            <CardContent sx={{ p: 1 }}>
              <Typography variant="body2" color="textSecondary">
                Gebühren
              </Typography>
              <Typography variant="h6" color="primary">
                {stats.totalFees} €
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setOpenCreateDialog(true)}
              sx={{ borderRadius: 1, flexGrow: 1 }}
            >
              Neu
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<EditIcon />}
              onClick={() => handleOpenManualDialog(null)}
              sx={{ borderRadius: 1, flexGrow: 1 }}
            >
              Bestehend
            </Button>
          </Box>
        </Grid>
      </Grid>
      {/* Section: Fees by Creator */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Gebühren nach Ersteller
        </Typography>
        <Grid container spacing={1}>
          {stats.byOwner
            .filter((owner) => owner.owner !== "Admin")
            .map((owner) => (
              <Grid item xs={12} sm={6} md={4} key={owner.owner}>
                <Card
                  sx={{
                    borderRadius: 1,
                    boxShadow: 1,
                    p: 1,
                    bgcolor: OWNER_COLORS[owner.owner] || "#ffffff",
                  }}
                >
                  <CardContent sx={{ p: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {owner.owner}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Anzahl Einträge: {owner.count}
                    </Typography>
                    <Typography variant="body2" color="primary">
                      Zu zahlende Gebühren: {owner.fees} €
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          {stats.byOwner.filter((owner) => owner.owner !== "Admin").length === 0 && (
            <Typography>Keine Gebühren von Erstellern vorhanden.</Typography>
          )}
        </Grid>
      </Box>
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Ausstehende Verlängerungsanfragen
        </Typography>
        {stats.pendingExtensions.length > 0 ? (
          <Grid container spacing={1}>
            {stats.pendingExtensions.map((entry) => (
              <Grid item xs={12} sm={6} md={4} key={entry.id}>
                <Card sx={{ borderRadius: 1, boxShadow: 1, p: 1 }}>
                  <CardContent sx={{ p: 1 }}>
                    <Typography variant="body2">
                      <strong>{entry.aliasNotes}</strong> ({entry.username})
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Ersteller: {entry.owner}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Gültig bis: {formatDate(entry.validUntil)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Zahlungsstatus: {entry.paymentStatus}
                    </Typography>
                  </CardContent>
                  <Box sx={{ display: "flex", gap: 1, p: 1 }}>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => {
                        setSelectedEntry(entry);
                        setNewValidUntil(
                          new Date(entry.validUntil).toISOString().split("T")[0]
                        );
                        setExtensionDialogOpen(true);
                      }}
                    >
                      Genehmigen
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      size="small"
                      startIcon={<CancelIcon />}
                      onClick={() => {
                        setSelectedEntry(entry);
                        handleRejectExtension();
                      }}
                    >
                      Ablehnen
                    </Button>
                    <Select
                      value={entry.paymentStatus}
                      onChange={(e) => handleUpdatePaymentStatus(entry, e.target.value)}
                      size="small"
                      sx={{ minWidth: 120 }}
                    >
                      <MenuItem value="Gezahlt">Gezahlt</MenuItem>
                      <MenuItem value="Nicht gezahlt">Nicht gezahlt</MenuItem>
                    </Select>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={() => handleOpenManualDialog(entry)}
                    >
                      Bearbeiten
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography>Keine ausstehenden Anfragen.</Typography>
        )}
      </Box>
      <Dialog
        open={extensionDialogOpen}
        onClose={() => setExtensionDialogOpen(false)}
      >
        <DialogTitle>Verlängerung genehmigen</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Wähle das neue Gültigkeitsdatum für{" "}
            <strong>{selectedEntry?.aliasNotes}</strong>:
          </Typography>
          <TextField
            label="Neues Gültigkeitsdatum"
            type="date"
            fullWidth
            value={newValidUntil}
            onChange={(e) => setNewValidUntil(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          {selectedEntry && (
            <Typography variant="body2" sx={{ mt: 2 }}>
              Aktuelles Gültigkeitsdatum: {formatDate(selectedEntry.validUntil)}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setExtensionDialogOpen(false)}
            color="secondary"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleApproveExtension}
            color="success"
          >
            Genehmigen
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={openManualDialog}
        onClose={handleCloseManualDialog}
      >
        <DialogTitle>Eintrag bearbeiten</DialogTitle>
        <DialogContent>
          {selectedEntryForEdit ? (
            <>
              <TextField
                label="Benutzername"
                fullWidth
                margin="normal"
                value={editedEntry?.username || ""}
                onChange={(e) =>
                  setEditedEntry({ ...editedEntry, username: e.target.value })
                }
              />
              <TextField
                label="Passwort"
                fullWidth
                margin="normal"
                type="password"
                value={editedEntry?.password || ""}
                onChange={(e) =>
                  setEditedEntry({ ...editedEntry, password: e.target.value })
                }
              />
              <TextField
                label="Spitzname"
                fullWidth
                margin="normal"
                value={editedEntry?.aliasNotes || ""}
                onChange={(e) =>
                  setEditedEntry({ ...editedEntry, aliasNotes: e.target.value })
                }
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Typ</InputLabel>
                <Select
                  value={editedEntry?.type || "Premium"}
                  onChange={(e) =>
                    setEditedEntry({ ...editedEntry, type: e.target.value })
                  }
                >
                  <MenuItem value="Premium">Premium</MenuItem>
                  <MenuItem value="Basic">Basic</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth margin="normal">
                <InputLabel>Status</InputLabel>
                <Select
                  value={editedEntry?.status || "Inaktiv"}
                  onChange={(e) =>
                    setEditedEntry({ ...editedEntry, status: e.target.value })
                  }
                >
                  <MenuItem value="Aktiv">Aktiv</MenuItem>
                  <MenuItem value="Inaktiv">Inaktiv</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth margin="normal">
                <InputLabel>Zahlungsstatus</InputLabel>
                <Select
                  value={editedEntry?.paymentStatus || "Nicht gezahlt"}
                  onChange={(e) =>
                    setEditedEntry({ ...editedEntry, paymentStatus: e.target.value })
                  }
                >
                  <MenuItem value="Gezahlt">Gezahlt</MenuItem>
                  <MenuItem value="Nicht gezahlt">Nicht gezahlt</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Gültig bis"
                type="date"
                fullWidth
                margin="normal"
                value={editedEntry?.validUntil || ""}
                onChange={(e) =>
                  setEditedEntry({ ...editedEntry, validUntil: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Ersteller"
                fullWidth
                margin="normal"
                value={editedEntry?.owner || ""}
                onChange={(e) =>
                  setEditedEntry({ ...editedEntry, owner: e.target.value })
                }
              />
              <TextField
                label="Admin-Gebühr (€)"
                fullWidth
                margin="normal"
                value={editedEntry?.admin_fee || ""}
                onChange={(e) =>
                  setEditedEntry({
                    ...editedEntry,
                    admin_fee: e.target.value.replace(/[^0-9]/g, ""),
                  })
                }
              />
            </>
          ) : (
            <Box>
              <Typography sx={{ mb: 2 }}>Wählen Sie einen Eintrag aus:</Typography>
              <Select
                fullWidth
                value={selectedEntryForEdit?.id || ""}
                onChange={(e) => {
                  const entry = entries.find((e) => e.id === e.target.value);
                  setSelectedEntryForEdit(entry);
                  setEditedEntry({
                    ...entry,
                    validUntil: entry.validUntil
                      ? new Date(entry.validUntil).toISOString().split("T")[0]
                      : "",
                  });
                }}
              >
                <MenuItem value="" disabled>
                  Eintrag auswählen
                </MenuItem>
                {entries.map((entry) => (
                  <MenuItem key={entry.id} value={entry.id}>
                    {entry.aliasNotes} ({entry.username})
                  </MenuItem>
                ))}
              </Select>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseManualDialog} color="secondary">
            Abbrechen
          </Button>
          <Button
            onClick={handleManualEntry}
            color="primary"
            disabled={!selectedEntryForEdit}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;
