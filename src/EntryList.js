import React, { useState, useMemo, useCallback, useEffect } from "react";
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
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExtensionIcon from "@mui/icons-material/Extension";
import { supabase } from "./supabaseClient";
import { useSnackbar } from "./useSnackbar";
import { formatDate, handleError } from "./utils";
import { FORM_DEFAULTS, OWNER_COLORS } from "./config";
import { useDebounce } from "use-debounce";

const EntryList = ({
  role,
  loggedInUser,
  entries,
  setEntries,
  openCreateDialog,
  setOpenCreateDialog,
  openManualDialog,
  setOpenManualDialog,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [newEntry, setNewEntry] = useState(FORM_DEFAULTS.newEntry);
  const [editEntry, setEditEntry] = useState(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [openExtensionDialog, setOpenExtensionDialog] = useState(false);
  const [entryForExtension, setEntryForExtension] = useState(null);
  const [newValidUntil, setNewValidUntil] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const owners = useMemo(() => [...new Set(entries.map((e) => e.owner))], [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        debouncedSearchTerm === "" ||
        (entry.username || "").toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (entry.aliasNotes || "").toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesStatus = statusFilter === "" || entry.status === statusFilter;
      const matchesPayment = paymentFilter === "" || entry.paymentStatus === paymentFilter;
      const matchesOwner = ownerFilter === "" || entry.owner === ownerFilter;
      return matchesSearch && matchesStatus && matchesPayment && matchesOwner;
    });
  }, [entries, debouncedSearchTerm, statusFilter, paymentFilter, ownerFilter]);

  const handleAddEntry = useCallback(async () => {
    if (!newEntry.username || !newEntry.password || !newEntry.aliasNotes) {
      showSnackbar("Bitte füllen Sie alle Pflichtfelder aus.", "error");
      return;
    }
    const selectedDate = new Date(newEntry.validUntil);
    const currentDate = new Date();
    if (selectedDate < currentDate) {
      showSnackbar("Das Gültigkeitsdatum muss in der Zukunft liegen.", "error");
      return;
    }
    try {
      const updatedEntry = {
        ...newEntry,
        owner: loggedInUser,
        admin_fee: newEntry.admin_fee ? Number(newEntry.admin_fee) : null,
        validUntil: selectedDate.toISOString(),
        ...(newEntry.paymentStatus === "Gezahlt" && { admin_fee: 0 }),
      };
      const { data, error } = await supabase
        .from("entries")
        .insert([updatedEntry])
        .select()
        .single();
      if (error) throw error;
      setEntries((prev) => [...prev, data]);
      setOpenCreateDialog(false);
      setNewEntry(FORM_DEFAULTS.newEntry);
      showSnackbar("Eintrag erfolgreich erstellt!");
    } catch (error) {
      handleError(error, showSnackbar);
    }
  }, [newEntry, loggedInUser, setEntries, showSnackbar, setOpenCreateDialog]);

  const handleEditEntry = useCallback(async () => {
    if (!editEntry || !editEntry.username || !editEntry.password || !editEntry.aliasNotes) {
      showSnackbar("Bitte füllen Sie alle Pflichtfelder aus.", "error");
      return;
    }
    const selectedDate = new Date(editEntry.validUntil);
    const currentDate = new Date();
    if (selectedDate < currentDate) {
      showSnackbar("Das Gültigkeitsdatum muss in der Zukunft liegen.", "error");
      return;
    }
    try {
      const updatedEntry = {
        ...editEntry,
        admin_fee: editEntry.admin_fee ? Number(editEntry.admin_fee) : null,
        validUntil: selectedDate.toISOString(),
        ...(editEntry.paymentStatus === "Gezahlt" && { admin_fee: 0 }),
      };
      const { data, error } = await supabase
        .from("entries")
        .update(updatedEntry)
        .eq("id", editEntry.id)
        .select()
        .single();
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) => (e.id === editEntry.id ? { ...e, ...data } : e))
      );
      setOpenEditDialog(false);
      setEditEntry(null);
      showSnackbar("Eintrag erfolgreich aktualisiert!");
    } catch (error) {
      handleError(error, showSnackbar);
    }
  }, [editEntry, setEntries, showSnackbar]);

  const handleDeleteEntry = useCallback(async () => {
    if (!entryToDelete) return;
    try {
      const { error } = await supabase
        .from("entries")
        .delete()
        .eq("id", entryToDelete.id);
      if (error) throw error;
      setEntries((prev) => prev.filter((e) => e.id !== entryToDelete.id));
      setOpenDeleteDialog(false);
      setEntryToDelete(null);
      showSnackbar("Eintrag erfolgreich gelöscht!");
    } catch (error) {
      handleError(error, showSnackbar);
    }
  }, [entryToDelete, setEntries, showSnackbar]);

  const handleExtensionRequest = useCallback(async () => {
    if (!entryForExtension || !newValidUntil) {
      showSnackbar("Bitte ein Gültigkeitsdatum auswählen.", "error");
      return;
    }
    const selectedDate = new Date(newValidUntil);
    const currentDate = new Date();
    if (selectedDate < currentDate) {
      showSnackbar("Das Datum muss in der Zukunft liegen.", "error");
      return;
    }
    try {
      const updatedEntry = {
        extensionRequest: {
          pending: true,
          requestedValidUntil: selectedDate.toISOString(),
          requestDate: new Date().toISOString(),
        },
      };
      const { data, error } = await supabase
        .from("entries")
        .update(updatedEntry)
        .eq("id", entryForExtension.id)
        .select()
        .single();
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) => (e.id === entryForExtension.id ? { ...e, ...data } : e))
      );
      setOpenExtensionDialog(false);
      setEntryForExtension(null);
      setNewValidUntil("");
      showSnackbar("Verlängerungsanfrage erfolgreich gesendet!");
    } catch (error) {
      handleError(error, showSnackbar);
    }
  }, [entryForExtension, newValidUntil, setEntries, showSnackbar]);

  const openEditDialog = useCallback((entry) => {
    setEditEntry({
      ...entry,
      validUntil: entry.validUntil ? new Date(entry.validUntil).toISOString().split("T")[0] : "",
    });
    setOpenEditDialog(true);
    setOpenManualDialog(true);
  }, [setOpenManualDialog]);

  const openDeleteDialog = useCallback((entry) => {
    setEntryToDelete(entry);
    setOpenDeleteDialog(true);
  }, []);

  const openExtensionDialog = useCallback((entry) => {
    setEntryForExtension(entry);
    setNewValidUntil(entry.validUntil ? new Date(entry.validUntil).toISOString().split("T")[0] : "");
    setOpenExtensionDialog(true);
  }, []);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Einträge
      </Typography>
      <Grid container spacing={1} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Suche (Benutzername oder Spitzname)"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size={isMobile ? "small" : "medium"}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size={isMobile ? "small" : "medium"}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="">Alle</MenuItem>
              <MenuItem value="Aktiv">Aktiv</MenuItem>
              <MenuItem value="Inaktiv">Inaktiv</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size={isMobile ? "small" : "medium"}>
            <InputLabel>Zahlungsstatus</InputLabel>
            <Select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              label="Zahlungsstatus"
            >
              <MenuItem value="">Alle</MenuItem>
              <MenuItem value="Gezahlt">Gezahlt</MenuItem>
              <MenuItem value="Nicht gezahlt">Nicht gezahlt</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size={isMobile ? "small" : "medium"}>
            <InputLabel>Ersteller</InputLabel>
            <Select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              label="Ersteller"
            >
              <MenuItem value="">Alle</MenuItem>
              {owners.map((owner) => (
                <MenuItem key={owner} value={owner}>
                  {owner}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table size={isMobile ? "small" : "medium"}>
          <TableHead>
            <TableRow>
              <TableCell>Spitzname</TableCell>
              <TableCell>Benutzername</TableCell>
              <TableCell>Typ</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Zahlungsstatus</TableCell>
              <TableCell>Erstellt am</TableCell>
              <TableCell>Gültig bis</TableCell>
              <TableCell>Ersteller</TableCell>
              <TableCell>Admin-Gebühr</TableCell>
              {(role === "Admin" || role === "Friend") && <TableCell>Aktionen</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEntries.length > 0 ? (
              filteredEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.aliasNotes}</TableCell>
                  <TableCell>{entry.username}</TableCell>
                  <TableCell>{entry.type}</TableCell>
                  <TableCell>{entry.status}</TableCell>
                  <TableCell>{entry.paymentStatus}</TableCell>
                  <TableCell>{formatDate(entry.createdAt)}</TableCell>
                  <TableCell>{formatDate(entry.validUntil)}</TableCell>
                  <TableCell>{entry.owner}</TableCell>
                  <TableCell>{entry.admin_fee ? `${entry.admin_fee} €` : "-"}</TableCell>
                  {(role === "Admin" || role === "Friend") && (
                    <TableCell>
                      <Tooltip title="Bearbeiten">
                        <IconButton onClick={() => openEditDialog(entry)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Löschen">
                        <IconButton onClick={() => openDeleteDialog(entry)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Verlängerung anfragen">
                        <IconButton onClick={() => openExtensionDialog(entry)}>
                          <ExtensionIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={role === "Admin" || role === "Friend" ? 10 : 9}>
                  Keine Einträge gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Grid container spacing={2}>
        {filteredEntries.length > 0 &&
          filteredEntries.map((entry) => (
            <Grid item xs={12} sm={6} md={4} key={entry.id}>
              <Card
                sx={{
                  borderRadius: 1,
                  boxShadow: 1,
                  bgcolor: OWNER_COLORS[entry.owner] || "#ffffff",
                }}
              >
                <CardContent>
                  <Typography variant="body2">
                    <strong>{entry.aliasNotes}</strong> ({entry.username})
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Typ: {entry.type}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Status: {entry.status}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Zahlungsstatus: {entry.paymentStatus}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Erstellt am: {formatDate(entry.createdAt)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Gültig bis: {formatDate(entry.validUntil)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Ersteller: {entry.owner}
                  </Typography>
                  {entry.admin_fee && (
                    <Typography variant="body2" color="primary">
                      Admin-Gebühr: {entry.admin_fee} €
                    </Typography>
                  )}
                  {(role === "Admin" || role === "Friend") && (
                    <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => openEditDialog(entry)}
                      >
                        Bearbeiten
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => openDeleteDialog(entry)}
                      >
                        Löschen
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ExtensionIcon />}
                        onClick={() => openExtensionDialog(entry)}
                      >
                        Verlängern
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
      </Grid>
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)}>
        <DialogTitle>Neuen Eintrag erstellen</DialogTitle>
        <DialogContent>
          <TextField
            label="Benutzername"
            fullWidth
            margin="normal"
            value={newEntry.username}
            onChange={(e) => setNewEntry({ ...newEntry, username: e.target.value })}
          />
          <TextField
            label="Passwort"
            fullWidth
            margin="normal"
            type="password"
            value={newEntry.password}
            onChange={(e) => setNewEntry({ ...newEntry, password: e.target.value })}
          />
          <TextField
            label="Spitzname"
            fullWidth
            margin="normal"
            value={newEntry.aliasNotes}
            onChange={(e) => setNewEntry({ ...newEntry, aliasNotes: e.target.value })}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Typ</InputLabel>
            <Select
              value={newEntry.type}
              onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value })}
            >
              <MenuItem value="Premium">Premium</MenuItem>
              <MenuItem value="Basic">Basic</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Status</InputLabel>
            <Select
              value={newEntry.status}
              onChange={(e) => setNewEntry({ ...newEntry, status: e.target.value })}
            >
              <MenuItem value="Aktiv">Aktiv</MenuItem>
              <MenuItem value="Inaktiv">Inaktiv</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Zahlungsstatus</InputLabel>
            <Select
              value={newEntry.paymentStatus}
              onChange={(e) => setNewEntry({ ...newEntry, paymentStatus: e.target.value })}
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
            value={newEntry.validUntil}
            onChange={(e) => setNewEntry({ ...newEntry, validUntil: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Admin-Gebühr (€)"
            fullWidth
            margin="normal"
            value={newEntry.admin_fee || ""}
            onChange={(e) =>
              setNewEntry({
                ...newEntry,
                admin_fee: e.target.value.replace(/[^0-9]/g, ""),
              })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)} color="secondary">
            Abbrechen
          </Button>
          <Button onClick={handleAddEntry} color="primary">
            Erstellen
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
        <DialogTitle>Eintrag bearbeiten</DialogTitle>
        <DialogContent>
          {editEntry && (
            <>
              <TextField
                label="Benutzername"
                fullWidth
                margin="normal"
                value={editEntry.username}
                onChange={(e) => setEditEntry({ ...editEntry, username: e.target.value })}
              />
              <TextField
                label="Passwort"
                fullWidth
                margin="normal"
                type="password"
                value={editEntry.password}
                onChange={(e) => setEditEntry({ ...editEntry, password: e.target.value })}
              />
              <TextField
                label="Spitzname"
                fullWidth
                margin="normal"
                value={editEntry.aliasNotes}
                onChange={(e) => setEditEntry({ ...editEntry, aliasNotes: e.target.value })}
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Typ</InputLabel>
                <Select
                  value={editEntry.type}
                  onChange={(e) => setEditEntry({ ...editEntry, type: e.target.value })}
                >
                  <MenuItem value="Premium">Premium</MenuItem>
                  <MenuItem value="Basic">Basic</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth margin="normal">
                <InputLabel>Status</InputLabel>
                <Select
                  value={editEntry.status}
                  onChange={(e) => setEditEntry({ ...editEntry, status: e.target.value })}
                >
                  <MenuItem value="Aktiv">Aktiv</MenuItem>
                  <MenuItem value="Inaktiv">Inaktiv</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth margin="normal">
                <InputLabel>Zahlungsstatus</InputLabel>
                <Select
                  value={editEntry.paymentStatus}
                  onChange={(e) => setEditEntry({ ...editEntry, paymentStatus: e.target.value })}
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
                value={editEntry.validUntil}
                onChange={(e) => setEditEntry({ ...editEntry, validUntil: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Admin-Gebühr (€)"
                fullWidth
                margin="normal"
                value={editEntry.admin_fee || ""}
                onChange={(e) =>
                  setEditEntry({
                    ...editEntry,
                    admin_fee: e.target.value.replace(/[^0-9]/g, ""),
                  })
                }
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)} color="secondary">
            Abbrechen
          </Button>
          <Button onClick={handleEditEntry} color="primary">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Eintrag löschen</DialogTitle>
        <DialogContent>
          <Typography>
            Möchten Sie den Eintrag <strong>{entryToDelete?.aliasNotes}</strong> wirklich löschen?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)} color="secondary">
            Abbrechen
          </Button>
          <Button onClick={handleDeleteEntry} color="error">
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openExtensionDialog} onClose={() => setOpenExtensionDialog(false)}>
        <DialogTitle>Verlängerung anfragen</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Wählen Sie das neue Gültigkeitsdatum für{" "}
            <strong>{entryForExtension?.aliasNotes}</strong>:
          </Typography>
          <TextField
            label="Neues Gültigkeitsdatum"
            type="date"
            fullWidth
            value={newValidUntil}
            onChange={(e) => setNewValidUntil(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenExtensionDialog(false)} color="secondary">
            Abbrechen
          </Button>
          <Button onClick={handleExtensionRequest} color="primary">
            Anfrage senden
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EntryList;
