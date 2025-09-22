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
  useMediaQuery,
  useTheme,
} from "@mui/material";
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
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const owners = useMemo(() => [...new Set(entries.map((e) => e.owner))], [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        debouncedSearchTerm === "" ||
        entry.username.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        entry.aliasNotes.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
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
      const { data, error } = await supabase
        .from("entries")
        .insert([{ ...newEntry, owner: loggedInUser }])
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
      <Grid container spacing={2}>
        {filteredEntries.length > 0 ? (
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
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : (
          <Typography>Keine Einträge gefunden.</Typography>
        )}
      </Grid>
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)}>
        <DialogTitle>Neuen Eintrag erstellen</DialogTitle>
        <DialogContent>
          <TextField
            label="Benutzername"
            fullWidth
            margin="normal"
            value={newEntry.username}
            onChange={(e) =>
              setNewEntry({ ...newEntry, username: e.target.value })
            }
          />
          <TextField
            label="Passwort"
            fullWidth
            margin="normal"
            type="password"
            value={newEntry.password}
            onChange={(e) =>
              setNewEntry({ ...newEntry, password: e.target.value })
            }
          />
          <TextField
            label="Spitzname"
            fullWidth
            margin="normal"
            value={newEntry.aliasNotes}
            onChange={(e) =>
              setNewEntry({ ...newEntry, aliasNotes: e.target.value })
            }
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
              onChange={(e) =>
                setNewEntry({ ...newEntry, status: e.target.value })
              }
            >
              <MenuItem value="Aktiv">Aktiv</MenuItem>
              <MenuItem value="Inaktiv">Inaktiv</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Zahlungsstatus</InputLabel>
            <Select
              value={newEntry.paymentStatus}
              onChange={(e) =>
                setNewEntry({ ...newEntry, paymentStatus: e.target.value })
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
            value={newEntry.validUntil}
            onChange={(e) =>
              setNewEntry({ ...newEntry, validUntil: e.target.value })
            }
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
    </Box>
  );
};

export default EntryList;
