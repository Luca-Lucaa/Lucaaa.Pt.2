// EntryList.js
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
  Card,
  CardContent,
  Grid,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { supabase } from "./supabaseClient";
import { formatDate, generateUsername, useDebounce, handleError } from "./utils";
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
  const [typeFilter, setTypeFilter] = useState("");
  const [bougetFilter, setBougetFilter] = useState("");
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
    validUntil: new Date(new Date().getFullYear() + 1, 11, 31),
    owner: loggedInUser,
    extensionHistory: [],
    bougetList: "",
    admin_fee: null,
    extensionRequest: null,
  });
  const [manualEntry, setManualEntry] = useState({
    username: "",
    password: "",
    aliasNotes: "",
    type: "Premium",
    validUntil: new Date(new Date().getFullYear() + 1, 11, 31),
    owner: loggedInUser,
    extensionHistory: [],
    bougetList: "",
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
    if (!createdAt) {
      console.warn("isNewEntry: createdAt ist null oder undefiniert");
      return false;
    }
    try {
      const createdDate = new Date(createdAt);
      if (isNaN(createdDate.getTime())) {
        console.warn(`isNewEntry: Ungültiges createdAt-Datum: ${createdAt}`);
        return false;
      }
      const currentDate = new Date();
      const timeDiff = currentDate.getTime() - createdDate.getTime();
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
      return daysDiff <= 5; // Highlight entries created within 5 days
    } catch (error) {
      console.error("Fehler bei isNewEntry:", error, { createdAt });
      return false;
    }
  }, []);

  // Force re-render every day to update isNewEntry (86400000 ms = 24 hours)
  useEffect(() => {
    const interval = setInterval(() => {
      setEntries((prev) => [...prev]); // Trigger re-render by creating a new array reference
    }, 86400000); // Every 24 hours
    return () => clearInterval(interval);
  }, [setEntries]);

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

  // Filtered and sorted entries
  const filteredEntries = useMemo(() => {
    let filtered = entries.filter((entry) => {
      if (role !== "Admin" && entry.owner !== loggedInUser) return false;
      const searchLower = debouncedSearchTerm.toLowerCase();
      const aliasMatch = entry.aliasNotes?.toLowerCase().includes(searchLower);
      const usernameMatch = entry.username?.toLowerCase().includes(searchLower);
      const noteMatch = entry.note?.toLowerCase().includes(searchLower);
      const statusMatch = !statusFilter || entry.status === statusFilter;
      const paymentMatch = !paymentFilter || entry.paymentStatus === paymentFilter;
      const ownerMatch = !ownerFilter || entry.owner === ownerFilter;
      const typeMatch = !typeFilter || entry.type === typeFilter;
      const bougetMatch = !bougetFilter || entry.bougetList?.toLowerCase().includes(bougetFilter.toLowerCase());
      return (aliasMatch || usernameMatch || noteMatch) && statusMatch && paymentMatch && ownerMatch && typeMatch && bougetMatch;
    });

    filtered.sort((a, b) => {
      const dateA = new Date(a.validUntil);
      const dateB = new Date(b.validUntil);
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    return filtered;
  }, [entries, debouncedSearchTerm, statusFilter, paymentFilter, ownerFilter, typeFilter, bougetFilter, sortOrder, role, loggedInUser]);

  const handleAddEntry = useCallback(async () => {
    if (!newEntry.aliasNotes.trim()) {
      showSnackbar("Spitzname darf nicht leer sein.", "error");
      return;
    }

    setIsLoading(true);
    try {
      const username = generateUsername();
      const password = Math.random().toString(36).slice(-8);
      const entryToAdd = {
        ...newEntry,
        username,
        password,
        createdAt: new Date().toISOString(),
        validUntil: newEntry.validUntil.toISOString(),
      };
      const { data, error } = await supabase.from("entries").insert([entryToAdd]).select().single();
      if (error) throw error;
      setEntries((prev) => [...prev, data]);
      showSnackbar("Neuer Eintrag hinzugefügt!", "success");
      setOpenCreateDialog(false);
      setNewEntry((prev) => ({ ...prev, aliasNotes: "", type: "Premium" }));
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [newEntry, setEntries, showSnackbar]);

  const handleAddManualEntry = useCallback(async () => {
    // Validate manual entry
    if (!manualEntry.username.trim() || !manualEntry.password.trim() || !manualEntry.aliasNotes.trim()) {
      showSnackbar("Benutzername, Passwort und Spitzname dürfen nicht leer sein.", "error");
      return;
    }
    const validUntilDate = manualEntry.validUntil;
    if (isNaN(validUntilDate)) {
      showSnackbar("Bitte ein gültiges Datum eingeben.", "error");
      return;
    }
    const adminFee = manualEntry.admin_fee;
    if (adminFee && (isNaN(adminFee) || adminFee < 0 || adminFee > 999)) {
      showSnackbar("Admin-Gebühr muss zwischen 0 und 999 liegen.", "error");
      return;
    }

    setIsLoading(true);
    try {
      const entryToAdd = {
        ...manualEntry,
        createdAt: new Date().toISOString(),
        validUntil: manualEntry.validUntil.toISOString(),
        status: "Inaktiv",
        paymentStatus: "Nicht gezahlt",
      };
      const { data, error } = await supabase.from("entries").insert([entryToAdd]).select().single();
      if (error) throw error;
      setEntries((prev) => [...prev, data]);
      showSnackbar("Manueller Eintrag hinzugefügt!", "success");
      setOpenManualDialog(false);
      setManualEntry({
        username: "",
        password: "",
        aliasNotes: "",
        type: "Premium",
        validUntil: new Date(new Date().getFullYear() + 1, 11, 31),
        owner: loggedInUser,
        extensionHistory: [],
        bougetList: "",
        admin_fee: null,
        extensionRequest: null,
      });
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [manualEntry, loggedInUser, setEntries, showSnackbar]);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Abonnentenliste
      </Typography>
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, mb: 2 }}>
        <TextField
          label="Suche (Spitzname, Benutzername, Notiz)"
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          displayEmpty
          variant="outlined"
          fullWidth
        >
          <MenuItem value="">Alle Status</MenuItem>
          <MenuItem value="Aktiv">Aktiv</MenuItem>
          <MenuItem value="Inaktiv">Inaktiv</MenuItem>
        </Select>
        <Select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          displayEmpty
          variant="outlined"
          fullWidth
        >
          <MenuItem value="">Alle Zahlungsstatus</MenuItem>
          <MenuItem value="Gezahlt">Gezahlt</MenuItem>
          <MenuItem value="Nicht gezahlt">Nicht gezahlt</MenuItem>
        </Select>
        <Select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          displayEmpty
          variant="outlined"
          fullWidth
        >
          <MenuItem value="">Alle Ersteller</MenuItem>
          {owners.map((owner) => (
            <MenuItem key={owner} value={owner}>
              {owner}
            </MenuItem>
          ))}
        </Select>
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          displayEmpty
          variant="outlined"
          fullWidth
        >
          <MenuItem value="">Alle Typen</MenuItem>
          <MenuItem value="Premium">Premium</MenuItem>
          <MenuItem value="Basic">Basic</MenuItem>
        </Select>
        <TextField
          label="Bouget-Liste filtern"
          variant="outlined"
          value={bougetFilter}
          onChange={(e) => setBougetFilter(e.target.value)}
          fullWidth
        />
        <Select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          variant="outlined"
          fullWidth
        >
          <MenuItem value="asc">Gültig bis aufsteigend</MenuItem>
          <MenuItem value="desc">Gültig bis absteigend</MenuItem>
        </Select>
      </Box>
      {(role === "Admin" || role === "Friend") && (
        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setOpenCreateDialog(true)}
            fullWidth
          >
            Neuen Abonnenten anlegen
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={() => setOpenManualDialog(true)}
            fullWidth
          >
            Bestehenden Abonnenten einpflegen
          </Button>
        </Box>
      )}
      {filteredEntries.length === 0 ? (
        <Typography>Keine Einträge gefunden.</Typography>
      ) : (
        <Grid container spacing={2}>
          {filteredEntries.map((entry) => (
            <Grid item xs={12} key={entry.id}>
              <Card
                sx={{
                  bgcolor: OWNER_COLORS[entry.owner] || "#fff",
                  border: isNewEntry(entry.createdAt) ? "2px solid #3b82f6" : "none",
                }}
              >
                <CardContent sx={{ p: 0 }}>
                  <EntryAccordion
                    entry={entry}
                    role={role}
                    loggedInUser={loggedInUser}
                    setEntries={setEntries}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      <Dialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
      >
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
            value={newEntry.type}
            onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value })}
            disabled={isLoading}
            size={isMobile ? "small" : "medium"}
          >
            <MenuItem value="Premium">Premium</MenuItem>
            <MenuItem value="Basic">Basic</MenuItem>
          </Select>
          <TextField
            label="Bouget-Liste (z.B. GER, CH, USA, XXX usw... oder Alles)"
            fullWidth
            margin="normal"
            value={newEntry.bougetList || ""}
            onChange={(e) => setNewEntry({ ...newEntry, bougetList: e.target.value })}
            disabled={isLoading}
            size={isMobile ? "small" : "medium"}
          />
          <TextField
            label="Gültig bis"
            fullWidth
            margin="normal"
            type="date"
            value={newEntry.validUntil.toISOString().split("T")[0]}
            onChange={(e) => setNewEntry({ ...newEntry, validUntil: new Date(e.target.value) })}
            disabled={isLoading}
            InputLabelProps={{ shrink: true }}
            size={isMobile ? "small" : "medium"}
          />
          {role === "Admin" && (
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
          )}
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
          <TextField
            label="Bouget-Liste (z.B. GER, CH, USA, XXX usw... oder Alles)"
            fullWidth
            margin="normal"
            value={manualEntry.bougetList || ""}
            onChange={(e) => setManualEntry({ ...manualEntry, bougetList: e.target.value })}
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
          {role === "Admin" && (
            <>
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
            </>
          )}
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
    </Box>
  );
};

export default EntryList;
