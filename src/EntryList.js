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
    admin_fee: 0, // Always set to 0
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
    admin_fee: 0, // Always set to 0
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
      const currentDate = new Date();
      const timeDiff = currentDate - createdDate;
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
      return daysDiff <= 5;
    } catch (error) {
      console.error("Error checking new entry:", error);
      return false;
    }
  }, []);

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (role !== "Admin") {
      result = result.filter((entry) => entry.owner === loggedInUser);
    }
    if (debouncedSearchTerm) {
      result = result.filter(
        (entry) =>
          entry.username?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          entry.aliasNotes?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }
    if (statusFilter) {
      result = result.filter((entry) => entry.status === statusFilter);
    }
    if (paymentFilter) {
      result = result.filter((entry) => entry.paymentStatus === paymentFilter);
    }
    if (ownerFilter) {
      result = result.filter((entry) => entry.owner === ownerFilter);
    }
    return result.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });
  }, [entries, debouncedSearchTerm, statusFilter, paymentFilter, ownerFilter, sortOrder, role, loggedInUser]);

  const updateExpiredEntries = useCallback(async () => {
    const currentDate = new Date();
    const updates = entries
      .filter((entry) => entry.status === "Aktiv" && entry.validUntil && new Date(entry.validUntil) < currentDate)
      .map((entry) => ({
        id: entry.id,
        status: "Inaktiv",
      }));

    if (updates.length > 0) {
      try {
        const { error } = await supabase.from("entries").upsert(updates);
        if (error) throw error;
        setEntries((prev) =>
          prev.map((entry) => {
            const updatedEntry = updates.find((u) => u.id === entry.id);
            return updatedEntry ? { ...entry, status: updatedEntry.status } : entry;
          })
        );
      } catch (error) {
        handleError(error, showSnackbar);
      }
    }
  }, [entries, setEntries, showSnackbar]);

  useEffect(() => {
    updateExpiredEntries();
  }, [entries, updateExpiredEntries]);

  const handleAddEntry = async () => {
    if (!newEntry.aliasNotes.trim()) {
      showSnackbar("Spitzname/Notizen dürfen nicht leer sein.", "error");
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("entries")
        .insert([{ ...newEntry, admin_fee: 0 }]) // Ensure admin_fee is 0
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
        admin_fee: 0,
        extensionRequest: null,
      });
      showSnackbar("Eintrag erfolgreich hinzugefügt.", "success");
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddManualEntry = async () => {
    if (!manualEntry.username.trim() || !manualEntry.password.trim() || !manualEntry.aliasNotes.trim()) {
      showSnackbar("Alle Pflichtfelder müssen ausgefüllt sein.", "error");
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("entries")
        .insert([{ ...manualEntry, admin_fee: 0 }]) // Ensure admin_fee is 0
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
        admin_fee: 0,
        extensionRequest: null,
      });
      showSnackbar("Manueller Eintrag erfolgreich hinzugefügt.", "success");
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h5" gutterBottom>
        Abonnenten
      </Typography>
      <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", gap: 2 }}>
        <TextField
          label="Suche nach Benutzername oder Notizen"
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flex: "1 1 200px" }}
          size={isMobile ? "small" : "medium"}
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          displayEmpty
          sx={{ flex: "1 1 150px" }}
          size={isMobile ? "small" : "medium"}
        >
          <MenuItem value="">Alle Status</MenuItem>
          <MenuItem value="Aktiv">Aktiv</MenuItem>
          <MenuItem value="Inaktiv">Inaktiv</MenuItem>
        </Select>
        <Select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          displayEmpty
          sx={{ flex: "1 1 150px" }}
          size={isMobile ? "small" : "medium"}
        >
          <MenuItem value="">Alle Zahlungsstatus</MenuItem>
          <MenuItem value="Gezahlt">Gezahlt</MenuItem>
          <MenuItem value="Nicht gezahlt">Nicht gezahlt</MenuItem>
        </Select>
        {role === "Admin" && (
          <Select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            displayEmpty
            sx={{ flex: "1 1 150px" }}
            size={isMobile ? "small" : "medium"}
          >
            <MenuItem value="">Alle Ersteller</MenuItem>
            {owners.map((owner) => (
              <MenuItem key={owner} value={owner}>
                {owner}
              </MenuItem>
            ))}
          </Select>
        )}
        <Select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          sx={{ flex: "1 1 150px" }}
          size={isMobile ? "small" : "medium"}
        >
          <MenuItem value="asc">Älteste zuerst</MenuItem>
          <MenuItem value="desc">Neueste zuerst</MenuItem>
        </Select>
      </Box>
      {role === "Admin" && (
        <Box sx={{ mb: 2, display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenCreateDialog(true)}
            sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}
          >
            Neuer Abonnent
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenManualDialog(true)}
            sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}
          >
            Bestehender Abonnent
          </Button>
        </Box>
      )}
      {filteredEntries.length === 0 ? (
        <Typography>Keine Einträge gefunden.</Typography>
      ) : (
        filteredEntries.map((entry) => (
          <EntryAccordion
            key={entry.id}
            entry={entry}
            role={role}
            loggedInUser={loggedInUser}
            setEntries={setEntries}
            isNewEntry={isNewEntry(entry.createdAt)}
          />
        ))
      )}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} fullScreen={isMobile}>
        <DialogTitle>Neuen Abonnenten anlegen</DialogTitle>
        <DialogContent>
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
            margin="normal"
            value={newEntry.type}
            onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value })}
            disabled={isLoading}
            size={isMobile ? "small" : "medium"}
          >
            <MenuItem value="Premium">Premium</MenuItem>
            <MenuItem value="Basic">Basic</MenuItem>
          </Select>
          <TextField
            label="Benutzername"
            fullWidth
            margin="normal"
            value={newEntry.username}
            disabled
            size={isMobile ? "small" : "medium"}
          />
          <TextField
            label="Passwort"
            fullWidth
            margin="normal"
            type="password"
            value={newEntry.password}
            disabled
            size={isMobile ? "small" : "medium"}
          />
          <Typography variant="body1" sx={{ mt: 2 }}>
            <strong>Aktuelles Datum:</strong> {formatDate(new Date())}
          </Typography>
          <Typography variant="body1">
            <strong>Gültig bis:</strong> {formatDate(newEntry.validUntil)}
          </Typography>
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
            {isLoading ? "Speichere..." : "Hinzufügen"}
          </Button>
        </DialogActions>
      </Dialog>
      {role === "Admin" && (
        <Dialog open={openManualDialog} onClose={() => setOpenManualDialog(false)} fullScreen={isMobile}>
          <DialogTitle>Bestehenden Abonnenten hinzufügen</DialogTitle>
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
              type="password"
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
              margin="normal"
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
