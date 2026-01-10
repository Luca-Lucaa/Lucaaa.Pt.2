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
    if (entries.length > 0 && !isLoading && loggedInUser) {
      updateExpiredEntries();
    }
  }, [entries, updateExpiredEntries, isLoading, loggedInUser]);

  // Calculate expired entries (validUntil before current date)
  const expiredEntries = useMemo(() => {
    const currentDate = new Date();
    return entries.filter((entry) => {
      if (!entry.validUntil) return false;
      try {
        const validUntil = new Date(entry.validUntil);
        return validUntil < currentDate && (role === "Admin" || entry.owner === loggedInUser);
      } catch (error) {
        console.error(`Ungültiges Datum in Eintrag ${entry.id || "unbekannt"}:`, error);
        return false;
      }
    });
  }, [entries, role, loggedInUser]);

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (role !== "Admin") {
      result = result.filter((entry) => entry.owner === loggedInUser);
    }
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase().trim();
      result = result.filter((entry) =>
        (entry.aliasNotes?.toLowerCase() || "").includes(term) ||
        (entry.username?.toLowerCase() || "").includes(term)
      );
    }
    if (statusFilter) {
      result = result.filter((entry) => entry.status === statusFilter);
    }
    if (paymentFilter) {
      result = result.filter((entry) => entry.paymentStatus === paymentFilter);
    }
    if (ownerFilter && role === "Admin") {
      result = result.filter((entry) => entry.owner === ownerFilter);
    }

    result = [...result].sort((a, b) => {
      const dateA = a.validUntil ? new Date(a.validUntil) : new Date(0);
      const dateB = b.validUntil ? new Date(b.validUntil) : new Date(0);
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [
    entries,
    debouncedSearchTerm,
    statusFilter,
    paymentFilter,
    ownerFilter,
    sortOrder,
    role,
    loggedInUser,
  ]);

  const handleAddEntry = async () => {
    setIsLoading(true);
    try {
      const entryToInsert = {
        ...newEntry,
        createdAt: new Date().toISOString(),
        validUntil: newEntry.validUntil.toISOString(),
      };
      const { data, error } = await supabase.from("entries").insert([entryToInsert]).select().single();
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
      showSnackbar("Eintrag erfolgreich erstellt!", "success");
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddManualEntry = async () => {
    setIsLoading(true);
    try {
      const entryToInsert = {
        ...manualEntry,
        createdAt: new Date().toISOString(),
        validUntil: manualEntry.validUntil.toISOString(),
      };
      const { data, error } = await supabase.from("entries").insert([entryToInsert]).select().single();
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
      showSnackbar("Manueller Eintrag erfolgreich hinzugefügt!", "success");
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            label="Suche"
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Grid>

        <Grid item xs={6} sm={3} md={2}>
          <Select
            fullWidth
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            displayEmpty
            variant="outlined"
          >
            <MenuItem value="">Alle Stati</MenuItem>
            <MenuItem value="Aktiv">Aktiv</MenuItem>
            <MenuItem value="Inaktiv">Inaktiv</MenuItem>
          </Select>
        </Grid>

        <Grid item xs={6} sm={3} md={2}>
          <Select
            fullWidth
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            displayEmpty
            variant="outlined"
          >
            <MenuItem value="">Alle Zahlungen</MenuItem>
            <MenuItem value="Gezahlt">Gezahlt</MenuItem>
            <MenuItem value="Nicht gezahlt">Nicht gezahlt</MenuItem>
          </Select>
        </Grid>

        {role === "Admin" && (
          <Grid item xs={12} sm={4} md={2}>
            <Select
              fullWidth
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              displayEmpty
              variant="outlined"
            >
              <MenuItem value="">Alle Ersteller</MenuItem>
              {owners.map((owner) => (
                <MenuItem key={owner} value={owner}>
                  {owner}
                </MenuItem>
              ))}
            </Select>
          </Grid>
        )}

        <Grid item xs={12} sm={4} md={2}>
          <Select
            fullWidth
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            variant="outlined"
          >
            <MenuItem value="asc">Gültig bis ↑</MenuItem>
            <MenuItem value="desc">Gültig bis ↓</MenuItem>
          </Select>
        </Grid>
      </Grid>

      {filteredEntries.length === 0 ? (
        <Typography variant="body1" color="text.secondary" align="center" sx={{ my: 4 }}>
          Keine Einträge gefunden...
        </Typography>
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

      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle sx={{ fontSize: isMobile ? "1rem" : "1.25rem" }}>
          Neuen Abonnenten anlegen
        </DialogTitle>
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
          <TextField
            label="Admin-Gebühr (€)"
            fullWidth
            margin="normal"
            value={loggedInUser === "Admin" ? newEntry.admin_fee || "" : ""}
            placeholder={loggedInUser !== "Admin" ? "Admin bestimmt die Gebühren" : ""}
            onChange={(e) => {
              if (loggedInUser === "Admin") {
                const value = e.target.value.replace(/[^0-9]/g, "");
                setNewEntry({ ...newEntry, admin_fee: value ? parseInt(value) : null });
              }
            }}
            inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
            disabled={loggedInUser !== "Admin" || isLoading}
            size={isMobile ? "small" : "medium"}
          />
          <Typography variant="body1">
            <strong>Aktuelles Datum:</strong> {new Date().toLocaleDateString()}
          </Typography>
          <Typography variant="body1">
            <strong>Gültig bis:</strong>{" "}
            {new Date(new Date().getFullYear() + 1, 11, 31).toLocaleDateString()}
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
          fullScreen={isMobile}
        >
          <DialogTitle sx={{ fontSize: isMobile ? "1rem" : "1.25rem" }}>
            Bestehenden Abonnenten einpflegen
          </DialogTitle>
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
