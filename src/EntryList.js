import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Select,
  MenuItem,
  Grid,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { supabase } from "./supabaseClient";
import { formatDate, useDebounce, handleError } from "./utils";
import { useSnackbar } from "./useSnackbar";
import { OWNER_COLORS } from "./config";
import EntryAccordion from "./EntryAccordion";

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
  const [sortOrder, setSortOrder] = useState("asc");
  const [isLoading, setIsLoading] = useState(false);
  const [newEntry, setNewEntry] = useState({
    username: "",
    password: "",
    aliasNotes: "",
    type: "Premium",
    status: "Inaktiv",
    paymentStatus: "Nicht gezahlt",
    createdAt: new Date(),
    validUntil: new Date(new Date().getFullYear() + 1, 11, 31), // Set to end of next year (2026)
    owner: loggedInUser,
    extensionHistory: [],
    admin_fee: null,
    extensionRequest: null,
  });
  const [manualEntry, setManualEntry] = useState({
    username: "",
    password: "",
    aliasNotes: "",
    type: "Premium",
    validUntil: new Date(new Date().getFullYear() + 1, 11, 31), // Set to end of next year (2026)
    owner: loggedInUser,
    extensionHistory: [],
    admin_fee: null,
    extensionRequest: null,
  });

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const owners = useMemo(() => {
    const uniqueOwners = [...new Set(entries.map((entry) => entry.owner).filter(Boolean))];
    return uniqueOwners.sort();
  }, [entries]);

  // Check if an entry is new (created within the last 5 days)
  const isNewEntry = useCallback((createdAt) => {
    if (!createdAt) return false;
    try {
      const createdDate = new Date(createdAt);
      const currentDate = new Date(); // Use current date dynamically
      const timeDiff = currentDate - createdDate;
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24); // Convert milliseconds to days
      return daysDiff <= 5; // Highlight entries created within 5 days
    } catch (error) {
      console.error("Fehler bei isNewEntry:", error);
      return false;
    }
  }, []);

  // Update status and paymentStatus for expired entries
  const updateExpiredEntries = useCallback(async () => {
    if (!loggedInUser) return; // Prevent updates if no user is logged in
    const currentDate = new Date();
    const expiredEntries = entries.filter((entry) => {
      if (!entry.validUntil || !entry.id) return false;
      try {
        const validUntil = new Date(entry.validUntil);
        return validUntil < currentDate && (entry.status !== "Inaktiv" || entry.paymentStatus !== "Nicht gezahlt");
      } catch (error) {
        console.error(`Ungültiges Datum in Eintrag ${entry.id || "unbekannt"}:`, error);
        return false;
      }
    });

    for (const entry of expiredEntries) {
      try {
        const { data, error } = await supabase
          .from("entries")
          .update({ status: "Inaktiv", paymentStatus: "Nicht gezahlt" })
          .eq("id", entry.id)
          .select()
          .single();
        if (error) throw error;
        setEntries((prev) =>
          prev.map((e) => (e.id === entry.id ? { ...e, status: "Inaktiv", paymentStatus: "Nicht gezahlt" } : e))
        );
      } catch (error) {
        handleError(error, showSnackbar);
      }
    }
  }, [entries, setEntries, showSnackbar, loggedInUser]);

  useEffect(() => {
    if (entries.length > 0 && !isLoading) {
      updateExpiredEntries();
    }
  }, [entries, updateExpiredEntries, isLoading]);

  const filteredEntries = useMemo(() => {
    return entries
      .filter((entry) => {
        const matchesSearch =
          debouncedSearchTerm === "" ||
          (entry.username || "").toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          (entry.aliasNotes || "").toLowerCase().includes(debouncedSearchTerm.toLowerCase());
        const matchesStatus = statusFilter === "" || entry.status === statusFilter;
        const matchesPayment = paymentFilter === "" || entry.paymentStatus === paymentFilter;
        const matchesOwner = ownerFilter === "" || entry.owner === ownerFilter;
        return matchesSearch && matchesStatus && matchesPayment && matchesOwner;
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      });
  }, [entries, debouncedSearchTerm, statusFilter, paymentFilter, ownerFilter, sortOrder]);

  const handleAddEntry = async () => {
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
    setIsLoading(true);
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
      setNewEntry({
        username: "",
        password: "",
        aliasNotes: "",
        type: "Premium",
        status: "Inaktiv",
        paymentStatus: "Nicht gezahlt",
        createdAt: new Date(),
        validUntil: new Date(new Date().getFullYear() + 1, 11, 31),
        owner: loggedInUser,
        extensionHistory: [],
        admin_fee: null,
        extensionRequest: null,
      });
      showSnackbar("Eintrag erfolgreich erstellt!");
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddManualEntry = async () => {
    if (!manualEntry.username || !manualEntry.password || !manualEntry.aliasNotes) {
      showSnackbar("Bitte füllen Sie alle Pflichtfelder aus.", "error");
      return;
    }
    const selectedDate = new Date(manualEntry.validUntil);
    const currentDate = new Date();
    if (selectedDate < currentDate) {
      showSnackbar("Das Gültigkeitsdatum muss in der Zukunft liegen.", "error");
      return;
    }
    setIsLoading(true);
    try {
      const updatedEntry = {
        ...manualEntry,
        admin_fee: manualEntry.admin_fee ? Number(manualEntry.admin_fee) : null,
        validUntil: selectedDate.toISOString(),
        ...(manualEntry.paymentStatus === "Gezahlt" && { admin_fee: 0 }),
      };
      const { data, error } = await supabase
        .from("entries")
        .insert([updatedEntry])
        .select()
        .single();
      if (error) throw error;
      setEntries((prev) => [...prev, data]);
      setOpenManualDialog(false);
      setManualEntry({
        username: "",
        password: "",
        aliasNotes: "",
        type: "Premium",
        validUntil: new Date(new Date().getFullYear() + 1, 11, 31),
        owner: loggedInUser,
        extensionHistory: [],
        admin_fee: null,
        extensionRequest: null,
      });
      showSnackbar("Manueller Eintrag erfolgreich erstellt!");
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ p: isMobile ? 1 : 2 }}>
      <Typography variant={isMobile ? "h6" : "h5"} gutterBottom sx={{ mb: 2 }}>
        Einträge
      </Typography>
      <Grid container spacing={isMobile ? 1 : 2} sx={{ mb: isMobile ? 1 : 2 }}>
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
          <Select
            fullWidth
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            displayEmpty
            size={isMobile ? "small" : "medium"}
          >
            <MenuItem value="">Alle Status</MenuItem>
            <MenuItem value="Aktiv">Aktiv</MenuItem>
            <MenuItem value="Inaktiv">Inaktiv</MenuItem>
          </Select>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Select
            fullWidth
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            displayEmpty
            size={isMobile ? "small" : "medium"}
          >
            <MenuItem value="">Alle Zahlungsstatus</MenuItem>
            <MenuItem value="Gezahlt">Gezahlt</MenuItem>
            <MenuItem value="Nicht gezahlt">Nicht gezahlt</MenuItem>
          </Select>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Select
            fullWidth
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            displayEmpty
            size={isMobile ? "small" : "medium"}
          >
            <MenuItem value="">Alle Ersteller</MenuItem>
            {owners.map((owner) => (
              <MenuItem key={owner} value={owner}>
                {owner}
              </MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Select
            fullWidth
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            size={isMobile ? "small" : "medium"}
          >
            <MenuItem value="asc">Älteste zuerst</MenuItem>
            <MenuItem value="desc">Neueste zuerst</MenuItem>
          </Select>
        </Grid>
      </Grid>
      <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
        {role === "Admin" && (
          <>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenCreateDialog(true)}
              sx={{ mr: 1, fontSize: isMobile ? "0.8rem" : "0.875rem" }}
              disabled={isLoading}
            >
              Neuer Eintrag
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenManualDialog(true)}
              sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}
              disabled={isLoading}
            >
              Manueller Eintrag
            </Button>
          </>
        )}
      </Box>
      <Box>
        {filteredEntries.length > 0 ? (
          filteredEntries.map((entry) => (
            <EntryAccordion
              key={entry.id}
              entry={entry}
              role={role}
              loggedInUser={loggedInUser}
              setEntries={setEntries}
              isNew={isNewEntry(entry.createdAt)}
              ownerColors={OWNER_COLORS}
              isMobile={isMobile}
            />
          ))
        ) : (
          <Typography>Keine Einträge gefunden.</Typography>
        )}
      </Box>
      <Dialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Neuen Eintrag erstellen</DialogTitle>
        <DialogContent>
          <TextField
            label="Benutzername"
            fullWidth
            margin="normal"
            value={newEntry.username}
            onChange={(e) => setNewEntry({ ...newEntry, username: e.target.value })}
            disabled={isLoading}
            size={isMobile ? "small" : "medium"}
          />
          <TextField
            label="Passwort"
            fullWidth
            margin="normal"
            type="text"
            value={newEntry.password}
            onChange={(e) => setNewEntry({ ...newEntry, password: e.target.value })}
            disabled={isLoading}
            size={isMobile ? "small" : "medium"}
          />
          <TextField
            label="Spitzname, Notizen etc."
            fullWidth
            margin="normal"
            value={newEntry.aliasNotes}
            onChange={(e) => setNewEntry({ ...newEntry, aliasNotes: e.target.value })}
            disabled={isLoading}
            size={isMobile ? "small" : "medium"}
          />
          <Select
            fullWidth
            value={newEntry.type}
            onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value })}
            disabled={isLoading}
            size={isMobile ? "small" : "medium"}
          >
            <MenuItem value="Premium">Premium</MenuItem>
            <MenuItem value="Basic">Basic</MenuItem>
          </Select>
          <Select
            fullWidth
            value={newEntry.status}
            onChange={(e) => setNewEntry({ ...newEntry, status: e.target.value })}
            disabled={isLoading}
            size={isMobile ? "small" : "medium"}
          >
            <MenuItem value="Aktiv">Aktiv</MenuItem>
            <MenuItem value="Inaktiv">Inaktiv</MenuItem>
          </Select>
          <Select
            fullWidth
            value={newEntry.paymentStatus}
            onChange={(e) => setNewEntry({ ...newEntry, paymentStatus: e.target.value })}
            disabled={isLoading}
            size={isMobile ? "small" : "medium"}
          >
            <MenuItem value="Gezahlt">Gezahlt</MenuItem>
            <MenuItem value="Nicht gezahlt">Nicht gezahlt</MenuItem>
          </Select>
          <TextField
            label="Gültig bis"
            fullWidth
            margin="normal"
            type="date"
            value={
              newEntry.validUntil
                ? new Date(newEntry.validUntil).toISOString().split("T")[0]
                : ""
            }
            onChange={(e) =>
              setNewEntry({ ...newEntry, validUntil: new Date(e.target.value) })
            }
            disabled={isLoading}
            size={isMobile ? "small" : "medium"}
          />
          <TextField
            label="Admin-Gebühr (€)"
            fullWidth
            margin="normal"
            value={newEntry.admin_fee || ""}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, "");
              const numValue = value ? parseInt(value) : null;
              if (numValue && numValue > 999) return;
              setNewEntry({ ...newEntry, admin_fee: numValue });
            }}
            inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
            disabled={isLoading}
            size={isMobile ? "small" : "medium"}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenCreateDialog(false)}
            color="secondary"
            disabled={isLoading}
            sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleAddEntry}
            color="primary"
            disabled={isLoading}
            sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}
          >
            {isLoading ? "Speichere..." : "Erstellen"}
          </Button>
        </DialogActions>
      </Dialog>
      {role === "Admin" && (
        <Dialog
          open={openManualDialog}
          onClose={() => setOpenManualDialog(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Manuellen Eintrag erstellen</DialogTitle>
          <DialogContent>
            <TextField
              label="Benutzername"
              fullWidth
              margin="normal"
              value={manualEntry.username}
              onChange={(e) => setManualEntry({ ...manualEntry, username: e.target.value })}
              disabled={isLoading}
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="Passwort"
              fullWidth
              margin="normal"
              type="text"
              value={manualEntry.password}
              onChange={(e) => setManualEntry({ ...manualEntry, password: e.target.value })}
              disabled={isLoading}
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="Spitzname, Notizen etc."
              fullWidth
              margin="normal"
              value={manualEntry.aliasNotes}
              onChange={(e) => setManualEntry({ ...manualEntry, aliasNotes: e.target.value })}
              disabled={isLoading}
              size={isMobile ? "small" : "medium"}
            />
            <Select
              fullWidth
              value={manualEntry.type}
              onChange={(e) => setManualEntry({ ...manualEntry, type: e.target.value })}
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
              value={
                manualEntry.validUntil
                  ? new Date(manualEntry.validUntil).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) =>
                setManualEntry({ ...manualEntry, validUntil: new Date(e.target.value) })
              }
              disabled={isLoading}
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="Admin-Gebühr (€)"
              fullWidth
              margin="normal"
              value={manualEntry.admin_fee || ""}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, "");
                const numValue = value ? parseInt(value) : null;
                if (numValue && numValue > 999) return;
                setManualEntry({ ...manualEntry, admin_fee: numValue });
              }}
              inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
              disabled={isLoading}
              size={isMobile ? "small" : "medium"}
            />
            <Select
              fullWidth
              value={manualEntry.owner || loggedInUser}
              onChange={(e) => setManualEntry({ ...manualEntry, owner: e.target.value })}
              disabled={isLoading}
              size={isMobile ? "small" : "medium"}
              displayEmpty
            >
              <MenuItem value={loggedInUser}>{loggedInUser}</MenuItem>
              {owners
                .filter((owner) => owner !== loggedInUser)
                .map((owner) => (
                  <MenuItem key={owner} value={owner}>
                    {owner}
                  </MenuItem>
                ))}
            </Select>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setOpenManualDialog(false)}
              color="secondary"
              disabled={isLoading}
              sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleAddManualEntry}
              color="primary"
              disabled={isLoading}
              sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}
            >
              {isLoading ? "Speichere..." : "Hinzufügen"}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default EntryList;
