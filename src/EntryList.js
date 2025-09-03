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
import EntryDialog from "./EntryDialog";

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
    validUntil: new Date(new Date().getFullYear() + 1, 11, 31), // End of next year (2026)
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
    validUntil: new Date(new Date().getFullYear() + 1, 11, 31), // End of next year (2026)
    owner: loggedInUser,
    extensionHistory: [],
    admin_fee: null,
    extensionRequest: null,
  });

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Funktion zur Berechnung der admin_fee
  const calculateAdminFee = (createdAt, validUntil) => {
    const createdDate = new Date(createdAt);
    const validUntilDate = new Date(validUntil);
    const dayOfMonth = createdDate.getDate();

    // Berechnung für den angebrochenen Monat
    let partialMonthFee = 0;
    if (dayOfMonth <= 10) {
      partialMonthFee = 10; // Bis 10. des Monats: 10 €
    } else if (dayOfMonth <= 25) {
      partialMonthFee = 5;  // Vom 11. bis 25.: 5 €
    } else {
      partialMonthFee = 0;  // Nach dem 25.: 0 €
    }

    // Berechnung der vollen Monate
    let fullMonths = 0;
    const startMonth = createdDate.getFullYear() * 12 + createdDate.getMonth() + (dayOfMonth > 25 ? 1 : 0);
    const endMonth = validUntilDate.getFullYear() * 12 + validUntilDate.getMonth();
    fullMonths = Math.max(0, endMonth - startMonth);

    // Gesamtgebühr: Angebrochener Monat + volle Monate * 10 €
    return partialMonthFee + fullMonths * 10;
  };

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
      console.error("Fehler bei isNewEntry:", error);
      return false;
    }
  }, []);

  // Update status and paymentStatus for expired entries
  const updateExpiredEntries = useCallback(async () => {
    if (!loggedInUser) return;
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
      result = result.filter((entry) =>
        entry.aliasNotes.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
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
    return result.sort((a, b) =>
      sortOrder === "asc"
        ? a.createdAt.localeCompare(b.createdAt)
        : b.createdAt.localeCompare(a.createdAt)
    );
  }, [entries, role, loggedInUser, debouncedSearchTerm, statusFilter, paymentFilter, ownerFilter, sortOrder]);

  const handleAddEntry = useCallback(async () => {
    if (!newEntry.username.trim()) {
      showSnackbar("Benutzername darf nicht leer sein.", "error");
      return;
    }
    if (!newEntry.password.trim()) {
      showSnackbar("Passwort darf nicht leer sein.", "error");
      return;
    }
    if (!newEntry.aliasNotes.trim()) {
      showSnackbar("Spitzname darf nicht leer sein.", "error");
      return;
    }
    const validUntilDate = new Date(newEntry.validUntil);
    if (isNaN(validUntilDate)) {
      showSnackbar("Bitte ein gültiges Datum eingeben.", "error");
      return;
    }
    setIsLoading(true);
    try {
      const adminFee = calculateAdminFee(newEntry.createdAt, newEntry.validUntil);
      const newEntryData = {
        ...newEntry,
        validUntil: validUntilDate.toISOString(),
        admin_fee: adminFee,
      };
      const { data, error } = await supabase
        .from("entries")
        .insert([newEntryData])
        .select()
        .single();
      if (error) throw error;
      setEntries((prev) => [...prev, data]);
      showSnackbar("Abonnent erfolgreich hinzugefügt.", "success");
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
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [newEntry, setEntries, showSnackbar, setOpenCreateDialog, loggedInUser]);

  const handleAddManualEntry = useCallback(async () => {
    if (!manualEntry.username.trim()) {
      showSnackbar("Benutzername darf nicht leer sein.", "error");
      return;
    }
    if (!manualEntry.password.trim()) {
      showSnackbar("Passwort darf nicht leer sein.", "error");
      return;
    }
    if (!manualEntry.aliasNotes.trim()) {
      showSnackbar("Spitzname darf nicht leer sein.", "error");
      return;
    }
    const validUntilDate = new Date(manualEntry.validUntil);
    if (isNaN(validUntilDate)) {
      showSnackbar("Bitte ein gültiges Datum eingeben.", "error");
      return;
    }
    setIsLoading(true);
    try {
      const adminFee = calculateAdminFee(new Date(), manualEntry.validUntil);
      const newEntryData = {
        ...manualEntry,
        validUntil: validUntilDate.toISOString(),
        admin_fee: adminFee,
      };
      const { data, error } = await supabase
        .from("entries")
        .insert([newEntryData])
        .select()
        .single();
      if (error) throw error;
      setEntries((prev) => [...prev, data]);
      showSnackbar("Abonnent erfolgreich hinzugefügt.", "success");
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
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [manualEntry, setEntries, showSnackbar, setOpenManualDialog, loggedInUser]);

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Abonnenten
      </Typography>
      {expiredEntries.length > 0 && (
        <Typography color="error" sx={{ mb: 2 }}>
          {expiredEntries.length} Abonnenten sind abgelaufen.
        </Typography>
      )}
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Suche nach Spitzname"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size={isMobile ? "small" : "medium"}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
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
        <Grid item xs={12} sm={6} md={2}>
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
        {role === "Admin" && (
          <Grid item xs={12} sm={6} md={2}>
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
        )}
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
        <Grid item xs={12}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setOpenCreateDialog(true)}
              sx={{ flexGrow: 1 }}
              size={isMobile ? "small" : "medium"}
            >
              Neu
            </Button>
            {role === "Admin" && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setOpenManualDialog(true)}
                sx={{ flexGrow: 1 }}
                size={isMobile ? "small" : "medium"}
              >
                Bestehend
              </Button>
            )}
          </Box>
        </Grid>
      </Grid>
      <Box sx={{ mt: 2 }}>
        {filteredEntries.map((entry) => (
          <EntryAccordion
            key={entry.id}
            entry={entry}
            role={role}
            loggedInUser={loggedInUser}
            setEntries={setEntries}
            isNewEntry={isNewEntry(entry.createdAt)}
          />
        ))}
        {filteredEntries.length === 0 && (
          <Typography>Keine Einträge gefunden.</Typography>
        )}
      </Box>
      <Dialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
      >
        <EntryDialog
          open={openCreateDialog}
          onClose={() => setOpenCreateDialog(false)}
          entryData={newEntry}
          onSave={(updatedEntry) => setNewEntry({ ...newEntry, ...updatedEntry })}
        />
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
