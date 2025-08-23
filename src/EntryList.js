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
      result = result.filter((entry) =>
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

  const handleAddEntry = useCallback(async () => {
    if (!newEntry.aliasNotes.trim()) {
      showSnackbar("Spitzname darf nicht leer sein.", "error");
      return;
    }
    setIsLoading(true);
    const createdAt = new Date();
    let validUntil;
    if (createdAt < new Date(createdAt.getFullYear(), 9, 1)) { // Before October 1st
      validUntil = new Date(createdAt.getFullYear(), 11, 31); // December 31st of the current year
    } else {
      validUntil = new Date(createdAt.getFullYear() + 1, 11, 31); // December 31st of the next year
    }
    const daysDiff = Math.ceil((validUntil - createdAt) / (1000 * 60 * 60 * 24)); // Total days
    let adminFee = 0;
    const fullMonths = Math.floor(daysDiff / 30); // Full months (30 days per month)
    const remainingDays = daysDiff % 30; // Remaining days in the last month
    adminFee += fullMonths * 10; // 10 Euro per full month
    if (remainingDays >= 15) {
      adminFee += 5; // 5 Euro for 15 or more days
    } else if (remainingDays > 0) {
      adminFee += 10; // 10 Euro for less than 15 days
    }

    const entryToAdd = {
      ...newEntry,
      username: newEntry.username,
      password: newEntry.password,
      createdAt: createdAt.toISOString(),
      validUntil: validUntil.toISOString(),
      admin_fee: adminFee,
    };
    try {
      const { data, error } = await supabase.from("entries").insert([entryToAdd]).select().single();
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
  }, [newEntry, setEntries, showSnackbar, loggedInUser, setOpenCreateDialog]);

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
    setIsLoading(true);
    const entryToAdd = {
      ...manualEntry,
      createdAt: new Date().toISOString(),
      validUntil: manualEntry.validUntil.toISOString(),
      status: "Inaktiv",
      paymentStatus: "Nicht gezahlt",
    };
    try {
      const { data, error } = await supabase.from("entries").insert([entryToAdd]).select().single();
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
      showSnackbar("Eintrag erfolgreich erstellt!", "success");
    } catch (error) {
      handleError(error, showSnackbar);
    } finally {
      setIsLoading(false);
    }
  }, [manualEntry, setEntries, showSnackbar, loggedInUser, setOpenManualDialog]);

  // Custom username generation based on loggedInUser
  const generateUsername = useCallback(() => {
    const randomNum = Math.floor(100 + Math.random() * 900); // Generates a 3-digit number (100-999)
    if (loggedInUser === "Jamaica05") {
      return `${randomNum}-pricod-4`;
    } else if (loggedInUser === "Scholli") {
      return `${randomNum}-telucod-5`;
    } else {
      return `${randomNum}-admcod-0`; // Default for Admin or other users
    }
  }, [loggedInUser]);

  // Generate username and password when the create dialog opens
  useEffect(() => {
    if (openCreateDialog) {
      const generateCredentials = async () => {
        const newUsername = await generateUsername();
        const newPassword = Math.random().toString(36).slice(-8);
        setNewEntry((prev) => ({ ...prev, username: newUsername, password: newPassword }));
      };
      generateCredentials();
    } else {
      // Reset credentials when dialog is closed
      setNewEntry((prev) => ({ ...prev, username: "", password: "" }));
    }
  }, [openCreateDialog, generateUsername]);

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Abonnenten-Liste
      </Typography>
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          label="Suche nach Spitzname"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          sx={{ flexGrow: 1, maxWidth: 200 }}
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          displayEmpty
          size="small"
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">Alle Status</MenuItem>
          <MenuItem value="Aktiv">Aktiv</MenuItem>
          <MenuItem value="Inaktiv">Inaktiv</MenuItem>
        </Select>
        <Select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          displayEmpty
          size="small"
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">Alle Zahlungen</MenuItem>
          <MenuItem value="Gezahlt">Gezahlt</MenuItem>
          <MenuItem value="Nicht gezahlt">Nicht gezahlt</MenuItem>
        </Select>
        {role === "Admin" && (
          <Select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            displayEmpty
            size="small"
            sx={{ minWidth: 120 }}
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
          size="small"
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="asc">Älteste zuerst</MenuItem>
          <MenuItem value="desc">Neueste zuerst</MenuItem>
        </Select>
      </Box>
      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setOpenCreateDialog(true)}
          sx={{ mr: 1 }}
        >
          Neuen Abonnenten anlegen
        </Button>
        {role === "Admin" && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => setOpenManualDialog(true)}
          >
            Bestehenden Abonnenten einpflegen
          </Button>
        )}
      </Box>
      {filteredEntries.length === 0 ? (
        <Typography>Keine Einträge gefunden.</Typography>
      ) : (
        <Grid container spacing={2}>
          {filteredEntries.map((entry) => (
            <Grid item xs={12} key={entry.id}>
              <EntryAccordion
                entry={entry}
                role={role}
                loggedInUser={loggedInUser}
                setEntries={setEntries}
                isNewEntry={isNewEntry(entry.createdAt)}
              />
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
            label="Benutzername"
            fullWidth
            margin="normal"
            value={newEntry.username || ""}
            disabled
            size={isMobile ? "small" : "medium"}
          />
          <TextField
            label="Passwort"
            fullWidth
            margin="normal"
            value={newEntry.password || ""}
            disabled
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
          {role === "Admin" && (
            <>
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
              <Select
                fullWidth
                value={newEntry.owner || loggedInUser}
                onChange={(e) => setNewEntry({ ...newEntry, owner: e.target.value })}
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
